/**
 * dsh-oks -- DeepSeek Harness plugin for the OKS knowledge base.
 *
 * Host half: registers model-facing tools (oks_recall/status/wiki_use/metrics),
 * a settings namespace for the browser card (RecallParamsCard), and a runtime
 * skill that tells the model when to recall.
 *
 * Integration: calls the `oks` CLI via subprocess; dsh (Node) and oks (Python)
 * stay decoupled, each upgrades independently.
 */
import { readFile } from 'node:fs/promises'
import { readFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join } from 'node:path'
import { getDraftPage, getWikiPage, listDraftPages, listWikiPages } from './wiki-browser.ts'
import { getRawBundle, listRawBundles } from './raw-browser.ts'
import { getOksDiagnostics, getOksOverview } from './oks-overview.ts'
import { isPrestepRecallEnabled } from './prestep-control.ts'
import { resolveOksBin } from './oks-runtime.ts'
import { clearOksKnowledgeBasePath, createDynamicSettingsHooks, parseOksKnowledgeBasePath, writeRecallYaml } from './oks-config.ts'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { RpcResult } from '@deepseek-ai/dsh-client-connection'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, MessageSource } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'

const execAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))

/** Settings namespace shared by the Host half and the browser card. */
export const OKS_NS = settingsNamespace('oks')

export interface OksConfig {
  knowledge_base_path?: string
  recall_floor?: number
  recall_topn?: number
  recall_minlen?: number
  recall_cooldown?: number
  prestep_enabled?: boolean
  prestep_floor?: number
  prestep_knowledge_only?: boolean
  posttool_mode?: string
  posttool_floor?: number
  posttool_topn?: number
  posttool_signal_rel_floor?: number
  search_backend?: string
}

/** Schema for the settings card. knowledge_base_path writes ~/.oks/config.json
 * (via `oks config set`); the rest write settings/recall.yaml. */
export const OksConfigSchema: z<OksConfig> = z.object({
  knowledge_base_path: z.string().default(''),
  recall_floor: z.number().min(0).max(1).step(0.05).default(0.7),
  recall_topn: z.number().step(1).min(1).max(10).default(3),
  recall_minlen: z.number().step(1).min(1).max(50).default(6),
  recall_cooldown: z.number().step(1).min(0).max(100).default(10),
  prestep_enabled: z.boolean().default(true),
  // pre-step hook uses a higher floor + knowledge-only to avoid noisy recall
  // on every casual greeting (the deterministic-injection path is stricter).
  prestep_floor: z.number().min(0).max(1).step(0.05).default(0.85),
  prestep_knowledge_only: z.boolean().default(true),
  posttool_mode: z.union(['signal', 'full']).default('signal'),
  posttool_floor: z.number().min(0).max(1).step(0.05).default(0.9),
  posttool_topn: z.number().step(1).min(1).max(10).default(2),
  posttool_signal_rel_floor: z.number().min(0).max(10).step(0.1).default(2.5),
  search_backend: z.union(['native', 'fts5', 'fusion']).default('native'),
})

/** Resolve the OKS binary even when DSH was launched without the user's PATH. */
function oksBin(): string {
  return resolveOksBin()
}

/** Log sync failures without making the settings UI fail silently. */
function warnSync(stage: string, error: unknown): void {
  console.warn(`[dsh-oks] ${stage} failed`, error)
}

/** Sync namespace values to OKS-owned stores: knowledge_base_path uses `oks config set`
 * (~/.oks/config.json); recall/posttool/search values use settings/recall.yaml.
 */
async function syncOksConfig(cfg: OksConfig, changed: ReadonlySet<string>): Promise<void> {
  if (changed.has('knowledge_base_path')) {
    const knowledgeBasePath = cfg.knowledge_base_path?.trim() ?? ''
    try {
      if (knowledgeBasePath) {
        await execAsync(oksBin(), ['config', 'set', 'knowledge_base_path', knowledgeBasePath])
      } else {
        // The CLI resolves an empty positional path to cwd, so disconnect by
        // atomically clearing only the global config pointer instead.
        clearOksKnowledgeBasePath()
      }
    } catch (error) {
      warnSync('knowledge_base_path update', error)
    }
  }

  const recallChanged = new Set([...changed].filter(key => key !== 'knowledge_base_path'))
  if (recallChanged.size === 0) return

  // A path change is authoritative: an explicit empty value means disconnected
  // and must not fall back to the previous global path. For ordinary recall
  // changes, however, the Host may omit knowledge_base_path from its snapshot;
  // use the existing OKS global pointer so recall.yaml still gets updated.
  const pathChanged = changed.has('knowledge_base_path')
  const kbPath = cfg.knowledge_base_path?.trim()
    || (!pathChanged ? await readOksKnowledgeBasePath() : '')
  if (!kbPath) {
    console.warn('[dsh-oks] recall.yaml write skipped: knowledge base path is empty')
    return
  }

  try {
    writeRecallYaml(kbPath, cfg, recallChanged)
  } catch (error) {
    warnSync('recall.yaml write', error)
  }
}

/** Read the current knowledge_base_path from `oks config show` output. */
async function readOksKnowledgeBasePath(): Promise<string> {
  try {
    const { stdout } = await execAsync(oksBin(), ['config', 'show'], { encoding: 'utf-8', timeout: 5000 })
    return parseOksKnowledgeBasePath(stdout)
  } catch (error) {
    warnSync('knowledge_base_path read', error)
    return ''
  }
}

/** Run `oks <args>` and return stdout. Uses execFile (no shell) so args like
 * `;rm -rf /` are passed literally to oks, never parsed by a shell. */
async function runOks(args: string[]): Promise<string> {
  const { stdout } = await execAsync(oksBin(), args, {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
  })
  return stdout
}

export const name = 'dsh-oks'
/** Browser Wiki panel depends on the DSH Connection RPC host seam. */
export const inject = ['settings', 'tools', 'connection']

/** Source label for hook-injected messages; lets downstream see who spoke. */
const PLUGIN_SOURCE: MessageSource = { kind: 'plugin', plugin: 'dsh-oks' }

/** Tools whose results are worth a post-tool memory signal. */
const SIGNAL_TOOLS = new Set(['read', 'write', 'edit', 'bash', 'grep', 'glob'])

/** Pull the plain-text query out of the last user message's content blocks. */
function extractQuery(messages: readonly { content?: readonly ContentBlock[] }[]): string {
  const last = messages[messages.length - 1]
  if (!last?.content) return ''
  return last.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text' && 'text' in b)
    .map(b => b.text)
    .join(' ')
    .trim()
}

interface RecallHit { slug?: string; title?: string; type?: string; relevance?: number; body_preview?: string }
interface EpisodicHit { source_path?: string; snippet?: string; relevance?: number }

/** A parsed recall result: the context text to inject + the slugs it cited,
 * tagged with an inject_id so the model can later rate the injection. */
interface ParsedRecall {
  text: string
  injectId: string
  slugs: string[]
}

/** Parse `oks recall --format json` into context text, cited slugs, and inject_id, or null.
 * Mirrors pi's user-prompt-recall.py template: <recalled-memory source="oks">
 * The wrapper includes a concise body preview and guidance for stronger evidence. */
function parseRecall(stdout: string): ParsedRecall | null {
  try {
    const data = JSON.parse(stdout) as { knowledge?: RecallHit[]; episodic?: EpisodicHit[] }
    const items = [...(data.knowledge ?? []), ...(data.episodic ?? [])]
    if (items.length === 0) return null
    const lines = ['## Relevant OKS memory', 'Use this evidence as context. If it conflicts with current facts, verify before relying on it.']
    for (const item of items) {
      if ('slug' in item) {
        lines.push(`- [${item.type ?? ''}] ${item.title ?? item.slug ?? ''} (${item.slug ?? ''}) rel=${(item.relevance ?? 0).toFixed(2)}`)
        const preview = String(item.body_preview ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
        if (preview) lines.push(`    ${preview}`)
      } else {
        lines.push(`- [episodic] ${(item as EpisodicHit).source_path ?? ''} rel=${((item as EpisodicHit).relevance ?? 0).toFixed(2)}`)
        const snippet = String((item as EpisodicHit).snippet ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
        if (snippet) lines.push(`    ${snippet}`)
      }
    }
    const slugs = items.map(item => 'slug' in item ? (item.slug ?? '') : (item as EpisodicHit).source_path ?? '').filter(Boolean)
    const injectId = randomUUID().slice(0, 8)
    const out = [
      '<recalled-memory source="oks">',
      lines.join('\n'),
      '',
      'If the task needs stronger evidence, call oks_recall or oks recall before making a claim.',
      `<!-- inject_id:${injectId} slugs:${slugs.join(',')} -->`,
      '</recalled-memory>',
    ]
    return { text: out.join('\n'), injectId, slugs }
  } catch { return null }
}
/** A short post-tool signal: mirrors pi's post-tool-edit.py signal mode.
 * The signal contains slugs and relevance only; the model can call oks_recall for details. */
export function parseSignal(stdout: string, query: string, floor: number, signalRelFloor = 0): ParsedRecall | null {
  try {
    const data = JSON.parse(stdout) as { knowledge?: RecallHit[]; episodic?: EpisodicHit[] }
    const items = [...(data.knowledge ?? []), ...(data.episodic ?? [])]
    if (items.length === 0) return null
    const topRelevance = items[0]?.relevance
    if (typeof topRelevance === 'number' && topRelevance < signalRelFloor) return null
    const lines = [`<!-- query="${query}" floor=${floor} signal_rel_floor=${signalRelFloor} (signal: slugs only, no body) -->`]
    for (const m of items) {
      if ('slug' in m) {
        lines.push(`- [${m.type ?? ''}] ${m.title ?? m.slug ?? ''} (slug: ${m.slug ?? ''}, rel: ${(m.relevance ?? 0).toFixed(2)})`)
      } else {
        lines.push(`- [episodic] ${(m as EpisodicHit).source_path ?? ''} (rel: ${((m as EpisodicHit).relevance ?? 0).toFixed(2)})`)
      }
    }
    lines.push(`  如需更强证据，请调用 oks_recall 或执行 oks recall "${query}" --explain`)
    const slugs = items.map(m => 'slug' in m ? (m.slug ?? '') : (m as EpisodicHit).source_path ?? '').filter(Boolean)
    const injectId = randomUUID().slice(0, 8)
    lines.push(`<!-- inject_id:${injectId} slugs:${slugs.join(',')} -->`)
    const out = ['<oks-memory-signal source="oks-posttool">', ...lines, '</oks-memory-signal>']
    return { text: out.join('\n'), injectId, slugs }
  } catch { return null }
}

/** Build a UserMessage carrying context text, tagged with our plugin source. */
function contextMessage(text: string): UserMessage {
  return createUserMessage({ content: [{ type: 'text', text }], source: PLUGIN_SOURCE })
}

/** Path to the inject-feedback JSONL log (under ~/.oks/, the global config dir). */
function feedbackLogPath(): string {
  return join(process.env.HOME ?? '/tmp', '.oks', 'inject_feedback.log')
}

/** Append a feedback record as one JSONL line. Best-effort; never throws. */
function appendFeedback(record: Record<string, unknown>): void {
  try {
    const line = JSON.stringify({ ...record, ts: new Date().toISOString() })
    const dir = dirname(feedbackLogPath())
    mkdirSync(dir, { recursive: true })
    appendFileSync(feedbackLogPath(), line + '\n', 'utf-8')
  } catch { /* best-effort: feedback must not crash the host */ }
}

/** Parse oks recall JSON to a plain {knowledge, episodic} object (no prompt text).
 * Used by the multi-query fan-out in oks_recall. */
function parseRecallJson(stdout: string): { knowledge: unknown[]; episodic: unknown[] } {
  try {
    const d = JSON.parse(stdout) as { knowledge?: unknown[]; episodic?: unknown[] }
    return { knowledge: d.knowledge ?? [], episodic: d.episodic ?? [] }
  } catch { return { knowledge: [], episodic: [] } }
}

/** Read ~/.oks/inject_feedback.log and tally ratings. Best-effort; never throws. */
function readInjectStats(): { total: number; useful: number; noise: number; irrelevant: number; bySlug: Record<string, { useful: number; noise: number; irrelevant: number }> } {
  const empty = { total: 0, useful: 0, noise: 0, irrelevant: 0, bySlug: {} as Record<string, { useful: number; noise: number; irrelevant: number }> }
  try {
    const raw = readFileSync(feedbackLogPath(), 'utf-8').trim()
    if (!raw) return empty
    for (const line of raw.split('\n')) {
      try {
        const r = JSON.parse(line) as { rating?: string; slugs?: string }
        const rating = r.rating as 'useful' | 'noise' | 'irrelevant' | undefined
        if (!rating || !(rating in empty)) continue
        empty[rating]++
        empty.total++
        const slugs = String(r.slugs ?? '').split(',').map(s => s.trim()).filter(Boolean)
        for (const s of slugs) {
          empty.bySlug[s] ??= { useful: 0, noise: 0, irrelevant: 0 }
          empty.bySlug[s][rating]++
        }
      } catch { /* skip malformed line */ }
    }
  } catch { /* file missing */ }
  return empty
}

/** Derive a recall query from a tool execution: its name + stringified args. */
function deriveQuery(exec: ToolExecution): string {
  const args = Object.entries(exec.args ?? {} as Record<string, unknown>)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ')
  return `${exec.name} ${args}`.slice(0, 200)
}

interface OksRecallTrace {
  id: string
  at: string
  phase: string
  status: 'ok' | 'info' | 'empty' | 'error'
  candidateCount: number
  matches: string[]
  topRelevance?: number
  threshold?: number
}

/** Extract UI-safe recall facts without exposing prompts, snippets, or paths. */
function parseRecallStats(stdout: string): { candidateCount: number; matches: string[]; topRelevance?: number } {
  try {
    const data = JSON.parse(stdout) as { knowledge?: RecallHit[]; episodic?: EpisodicHit[] }
    const knowledge = data.knowledge ?? []
    const episodic = data.episodic ?? []
    const items = [...knowledge, ...episodic]
    const matches = [
      ...knowledge.map(item => safeTraceLabel(item.slug)).filter(value => value !== '[知识条目]'),
      ...episodic.map(() => 'episodic'),
    ].slice(0, 12)
    const relevance = items.map(item => item.relevance).find(value => typeof value === 'number' && Number.isFinite(value))
    return { candidateCount: items.length, matches, topRelevance: relevance }
  } catch {
    return { candidateCount: 0, matches: [] }
  }
}

interface OksActivityEvent {
  id: string
  at: string
  kind: string
  label: string
  detail: string
  status: 'ok' | 'info' | 'error'
  traceId?: string
}

/** Trace labels are identifiers only; never surface arbitrary OKS title text. */
function safeTraceLabel(value: unknown): string {
  const label = String(value ?? '').trim()
  return /^[-_\.\p{L}\p{N}]{1,120}$/u.test(label) ? label : '[知识条目]'
}

/** Keep only short, sanitized, process-local activity facts for the browser. */
function pushActivity(events: OksActivityEvent[], kind: string, label: string, detail: string, status: OksActivityEvent['status'] = 'info', traceId?: string): void {
  events.unshift({
    id: randomUUID(), at: new Date().toISOString(), kind, label,
    detail: detail.replace(/[\r\n]+/g, ' ').replace(/[A-Za-z]:\\[^ ]+|\/(?:Users|home|tmp)\/[^ ]+/g, '[本地路径已隐藏]').replace(/(?:api[_-]?key|token|secret|password)\s*[:=]\s*[^ ]+/ig, '[敏感值已隐藏]').slice(0, 180), status, traceId,
  })
  if (events.length > 50) events.length = 50
}

export function apply(ctx: Context, config: OksConfig = {}) {
  const activity: OksActivityEvent[] = []
  const traces: OksRecallTrace[] = []
  const recordActivity = (kind: string, label: string, detail: string, status: OksActivityEvent['status'] = 'info', traceId?: string) => pushActivity(activity, kind, label, detail, status, traceId)
  const recordTrace = (phase: string, stdout: string, threshold?: number, status: OksRecallTrace['status'] = 'ok'): string => {
    const traceId = randomUUID().slice(0, 12)
    const stats = parseRecallStats(stdout)
    traces.unshift({ id: traceId, at: new Date().toISOString(), phase, status, candidateCount: stats.candidateCount, matches: stats.matches, topRelevance: stats.topRelevance, threshold })
    if (traces.length > 50) traces.length = 50
    return traceId
  }
  const updateTrace = (traceId: string, status: OksRecallTrace['status']): OksRecallTrace | undefined => {
    const trace = traces.find(item => item.id === traceId)
    if (trace) trace.status = status
    return trace
  }
  // Settings namespace (Host half) pairs with the browser RecallParamsCard.
  const settingsHooks = createDynamicSettingsHooks(config, async (cfg, changed) => {
    await syncOksConfig(cfg, changed)
    recordActivity('settings', '设置更新', `${changed.size} 项设置已同步`, 'ok')
  })
  installSettingsSection(ctx, OKS_NS, OksConfigSchema, config, settingsHooks)

  // Read-only Web lifecycle browser API; the client receives sanitized data only.
  // Browser code calls /oks/wiki-list and /oks/wiki-get.  It never receives a
  // local path, and a detail request is resolved only from files discovered
  // underneath the configured <knowledge_base_path>/wiki root.
  ctx.connection.rpc.handle('/oks', async (endpoint, payload): Promise<RpcResult<unknown>> => {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    const activeConfig = settingsHooks.getCurrent()
    const configuredPath = activeConfig.knowledge_base_path || await readOksKnowledgeBasePath()
    if (endpoint === 'activity') {
      const requested = typeof body.limit === 'number' && Number.isFinite(body.limit) ? Math.floor(body.limit) : 12
      const limit = Math.max(1, Math.min(20, requested))
      return { ok: true, value: { items: activity.slice(0, limit), truncated: activity.length > limit } }
    }
    if (endpoint === 'recall-trace') {
      const requested = typeof body.limit === 'number' && Number.isFinite(body.limit) ? Math.floor(body.limit) : 12
      const limit = Math.max(1, Math.min(20, requested))
      return { ok: true, value: { items: traces.slice(0, limit), truncated: traces.length > limit } }
    }
    const endpointLabels: Record<string, string> = {
      diagnostics: '读取连接诊断', overview: '读取知识库概览', 'wiki-list': '浏览 Wiki 知识', 'wiki-get': '打开 Wiki 详情',
      'draft-list': '浏览审核草稿', 'draft-get': '打开草稿详情', 'raw-list': '浏览 Raw 资料', 'raw-get': '打开 Raw 详情',
    }
    if (endpointLabels[endpoint]) recordActivity('browser', endpointLabels[endpoint], '来自 OKS 工作区的只读请求')
    if (endpoint === 'diagnostics') {
      let oksCliAvailable = true
      try {
        await execAsync(oksBin(), ['--version'], { timeout: 5000 })
      } catch {
        oksCliAvailable = false
      }
      try {
        return { ok: true, value: await getOksDiagnostics(configuredPath, oksCliAvailable) }
      } catch (error) {
        warnSync('OKS diagnostics', error)
        return {
          ok: true,
          value: {
            connected: false,
            status: 'read-error',
            message: 'Unable to read OKS knowledge-base data.',
            oksCliAvailable,
            knowledgeBaseConfigured: Boolean(configuredPath),
            wikiDirectory: false,
            draftsDirectory: false,
            rawDirectory: false,
            wikiCount: 0,
            draftCount: 0,
            rawFileCount: 0,
            rawBundleCount: 0,
          },
        }
      }
    }
    if (!configuredPath) {
      return { ok: false, error: { code: 'internal', message: 'OKS knowledge_base_path is not configured.', details: {} } }
    }
    try {
      if (endpoint === 'overview') {
        const value = await getOksOverview(configuredPath)
        return { ok: true, value }
      }
      if (endpoint === 'raw-list') {
        const value = await listRawBundles(configuredPath, {
          query: typeof body.query === 'string' ? body.query : undefined,
          status: typeof body.status === 'string' ? body.status : undefined,
        })
        return { ok: true, value }
      }
      if (endpoint === 'raw-get') {
        const value = await getRawBundle(configuredPath, body.id)
        if (!value) {
          return { ok: false, error: { code: 'internal', message: 'The requested Raw Bundle was not found.', details: {} } }
        }
        return { ok: true, value }
      }
      if (endpoint === 'draft-list') {
        const value = await listDraftPages(configuredPath, {
          query: typeof body.query === 'string' ? body.query : undefined,
          area: typeof body.area === 'string' ? body.area : undefined,
          type: typeof body.type === 'string' ? body.type : undefined,
        })
        return { ok: true, value }
      }
      if (endpoint === 'draft-get') {
        const value = await getDraftPage(configuredPath, body.slug)
        if (!value) {
          return { ok: false, error: { code: 'internal', message: 'The requested Draft was not found.', details: {} } }
        }
        return { ok: true, value }
      }
      if (endpoint === 'wiki-list') {
        const value = await listWikiPages(configuredPath, {
          query: typeof body.query === 'string' ? body.query : undefined,
          area: typeof body.area === 'string' ? body.area : undefined,
          type: typeof body.type === 'string' ? body.type : undefined,
        })
        return { ok: true, value }
      }
      if (endpoint === 'wiki-get') {
        const value = await getWikiPage(configuredPath, body.slug)
        if (!value) {
          return { ok: false, error: { code: 'internal', message: 'The requested Wiki page was not found.', details: {} } }
        }
        return { ok: true, value }
      }
      return { ok: false, error: { code: 'internal', message: 'Unknown dsh-oks browser endpoint.', details: {} } }
    } catch (error) {
      warnSync(`OKS lifecycle browser ${endpoint}`, error)
      return { ok: false, error: { code: 'internal', message: 'Unable to read the requested OKS lifecycle data.', details: {} } }
    }
  }, { authority: 'trusted-host' })
  // Tool: oks_recall -- recall relevant OKS knowledge.
  ctx.tools.register(defineTool({
    name: 'oks_recall',
    description:
      'Recall relevant memories from the OKS knowledge base. ' +
      'Use when the task involves uncertain concepts, historical decisions, ' +
      'or competitor comparison. Query with task intent, not tool operations. ' +
      'Pass `queries` (5-6 guesses) to fan out: each is recalled in parallel ' +
      'and results merged + deduped by slug for richer coverage for ambiguous tasks.',
    parameters: {
      query: {
        type: 'string', required: true,
        description: 'Task-intent query. E.g. "OKS memory system vs ai-book chapter 3"',
      },
      queries: {
        type: 'array',
        description: 'Optional 5-6 alternative phrasings; fanned out in parallel and deduped. ' +
          'E.g. ["git branch naming", "branch strategy", "trunk-based development"].',
      },
      limit: {
        type: 'number',
        description: 'Max results per query (default: recall.topn from settings, or 3)',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const limit = args.limit ?? 3
      const all = [args.query, ...(args.queries ?? [])].filter(Boolean)
      if (all.length <= 1) {
        try {
          const out = await runOks(['recall', args.query, '--format', 'json', '--limit', String(limit)])
          const traceId = recordTrace('tool', out, limit)
          const trace = updateTrace(traceId, 'ok')
          recordActivity('tool', 'oks_recall', `返回 ${trace?.candidateCount ?? 0} 个候选`, 'ok', traceId)
          return out
        } catch (error) {
          const traceId = recordTrace('tool', '', limit, 'error')
          recordActivity('tool', 'oks_recall 失败', 'OKS CLI 未返回可用结果', 'error', traceId)
          throw error
        }
      }
      // Fan out: parallel recall per query, merge + dedupe by slug.
      const outs = await Promise.all(all.map(q =>
        runOks(['recall', q, '--format', 'json', '--limit', String(limit)])
          .then(parseRecallJson).catch(() => ({ knowledge: [], episodic: [] }))))
      const seen = new Set<string>()
      const knowledge: unknown[] = []
      const episodic: unknown[] = []
      for (const o of outs) {
        for (const h of o.knowledge ?? []) {
          const slug = String((h as Record<string, unknown>).slug ?? '')
          if (slug && !seen.has(slug)) { seen.add(slug); knowledge.push(h) }
        }
        for (const h of o.episodic ?? []) {
          const p = String((h as Record<string, unknown>).source_path ?? '')
          if (p && !seen.has(p)) { seen.add(p); episodic.push(h) }
        }
      }
      const out = JSON.stringify({ schema_version: 'recall-response/v1-multi', query: args.query, knowledge, episodic })
      const traceId = recordTrace('tool', out, limit)
      const trace = updateTrace(traceId, 'ok')
      recordActivity('tool', 'oks_recall 多查询', `合并 ${trace?.candidateCount ?? 0} 个候选`, 'ok', traceId)
      return out
    },
  }))

  // Tool: oks_status -- show current OKS status.
  ctx.tools.register(defineTool({
    name: 'oks_status',
    description: 'Show OKS knowledge base status: wiki count, tier distribution, drafts.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      try {
        const out = await runOks(['status'])
        recordActivity('tool', 'oks_status', '读取知识库状态', 'ok')
        return out
      } catch (error) {
        recordActivity('tool', 'oks_status 失败', 'OKS CLI 未返回状态', 'error')
        throw error
      }
    },
  }))

  // Tool: oks_wiki_use -- record explicit Wiki usage.
  ctx.tools.register(defineTool({
    name: 'oks_wiki_use',
    description:
      'Mark a wiki page as used (access_count++). Call this when you actually ' +
      'cited or applied a recalled memory; it is the self-evaluation signal.',
    parameters: {
      slug: { type: 'string', required: true, description: 'Wiki page slug' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      try {
        const out = await runOks(['wiki', 'use', args.slug])
        recordActivity('tool', 'oks_wiki_use', '记录 Wiki 使用信号', 'ok')
        return out
      } catch (error) {
        recordActivity('tool', 'oks_wiki_use 失败', 'Wiki 使用信号记录失败', 'error')
        throw error
      }
    },
  }))

  // Tool: oks_metrics -- show knowledge and injection metrics.
  ctx.tools.register(defineTool({
    name: 'oks_metrics',
    description:
      'Show OKS 4-dimension knowledge metrics (scale, vitality, value, ' +
      'credibility) plus injection stats and current recall params.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const base = await runOks(['metrics'])
      const s = readInjectStats()
      const rate = s.total > 0 ? Math.round((s.useful / s.total) * 100) : 0
      const injectBlock = `\n--- OKS injection feedback ---\nTotal: ${s.total} | useful ${s.useful} (${s.total ? Math.round(s.useful / s.total * 100) : 0}%) | noise ${s.noise} | irrelevant ${s.irrelevant} | useful rate ${rate}%`
      const topSlugs = Object.entries(s.bySlug).sort((a, b) => (b[1].useful + b[1].noise) - (a[1].useful + a[1].noise)).slice(0, 5)
      const slugLines = topSlugs.length ? topSlugs.map(([slug, c]) => `  ${slug}: useful ${c.useful} / noise ${c.noise}`).join('\n') : '  No per-slug feedback yet.'
      return base + injectBlock + '\nTop slugs:\n' + slugLines
    },
  }))

  // Tool: oks_inject_stats -- summarize injection quality.
  ctx.tools.register(defineTool({
    name: 'oks_inject_stats',
    description:
      'Show OKS injection-quality stats: total feedback count, useful/noise/' +
      'irrelevant breakdown, and per-slug ratings. Use to decide whether to ' +
      'raise prestep_floor (more noise) or lower it (missed useful).',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      const s = readInjectStats()
      if (s.total === 0) return 'No OKS injection feedback recorded yet.'
      return JSON.stringify(s, null, 2)
    },
  }))

  // Tool: oks_inject_feedback -- rate an injection for the closed loop.
  // The pre-step/post-execute hooks tag every injection with an inject_id.
  // After answering, the model calls this to record whether the injected
  // The rating feeds OKS metrics as a quality signal.
  ctx.tools.register(defineTool({
    name: 'oks_inject_feedback',
    description:
      'Rate a prior OKS memory injection by its inject_id. Call this after ' +
      'answering when an injected <recalled-memory> or <oks-memory-signal> ' +
      'block carried a <!-- inject_id:xxx slugs:a,b --> tag. ' +
      'useful = cited/applied the memory; noise = irrelevant clutter; ' +
      'irrelevant = on-topic but not needed this turn. This feeds the ' +
      'injection-quality metric used to tune recall floors.',
    parameters: {
      inject_id: { type: 'string', required: true, description: 'inject_id from the injection tag' },
      rating: { type: 'string', required: true, description: 'one of: useful | noise | irrelevant' },
      slugs: { type: 'string', description: 'comma-list of slugs that were in the injection (optional)' },
      reason: { type: 'string', description: 'one-line why (optional)' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const rating = String(args.rating)
      if (!['useful', 'noise', 'irrelevant'].includes(rating)) {
        return `error: rating must be useful|noise|irrelevant, got '${rating}'`
      }
      appendFeedback({
        inject_id: args.inject_id,
        rating,
        slugs: args.slugs ?? '',
        reason: args.reason ?? '',
      })
      return `recorded: inject_id=${args.inject_id} rating=${rating}`
    },
  }))

  // Hook: agent/pre-step -- deterministic per-turn recall (UserPromptSubmit).
  // DELEGATE then prepend: a later listener may still reject; we only attach
  // Short queries and OKS failures are no-ops.
  // Higher floor (0.85) + knowledge-only to avoid noisy recall on greetings.
  ctx.on('agent/pre-step', async ({ messages }, next): Promise<PreStepDecision> => {
    const activeConfig = settingsHooks.getCurrent()
    if (!isPrestepRecallEnabled(activeConfig)) return next()
    const query = extractQuery(messages)
    if (query.length < 10) return next()
    const args = ['recall', query, '--format', 'json', '--limit', '2', '--floor', String(activeConfig.prestep_floor ?? 0.85)]
    if (activeConfig.prestep_knowledge_only ?? true) args.push('--knowledge-only')
    let out = ''
    try { out = await runOks(args) }
    catch { const traceId = recordTrace('pre-step', '', activeConfig.prestep_floor ?? 0.85, 'error'); recordActivity('prestep', 'Pre-step 召回失败', 'OKS CLI 未返回可用结果', 'error', traceId); return next() }
    const traceId = recordTrace('pre-step', out, activeConfig.prestep_floor ?? 0.85)
    const recalled = parseRecall(out)
    if (!recalled) { const trace = updateTrace(traceId, 'empty'); recordActivity('prestep', 'Pre-step 召回', `未命中可注入的知识（${trace?.candidateCount ?? 0} 个候选）`, 'info', traceId); return next() }
    const trace = updateTrace(traceId, 'ok')
    recordActivity('prestep', 'Pre-step 召回', `已生成脱敏上下文注入（${trace?.candidateCount ?? 0} 个候选）`, 'ok', traceId)
    const downstream = await next()
    if (downstream.kind !== 'enter') return downstream
    return { kind: 'enter', messages: [...downstream.messages, contextMessage(recalled.text)] }
  })

  // Hook: tools/post-execute -- post-tool memory signal (PostToolUse).
  // Only signal for read/write/edit/bash/grep/glob; OKS failures are no-ops.
  ctx.on('tools/post-execute', async (exec: ToolExecution, _result: Readonly<ToolExecutionResult>, next): Promise<PostToolDecision> => {
    if (!SIGNAL_TOOLS.has(exec.name)) return next()
    const query = deriveQuery(exec)
    if (query.length < 6) return next()
    const activeConfig = settingsHooks.getCurrent()
    const floor = activeConfig.posttool_floor ?? 0.9
    const topn = activeConfig.posttool_topn ?? 2
    let out = ''
    try { out = await runOks(['recall', query, '--format', 'json', '--limit', String(topn), '--floor', String(floor)]) }
    catch { const traceId = recordTrace('post-tool', '', floor, 'error'); recordActivity('posttool', 'Post-tool 召回失败', `工具 ${exec.name} 未返回可用结果`, 'error', traceId); return next() }
    const traceId = recordTrace('post-tool', out, floor)
    const mode = activeConfig.posttool_mode === 'full' ? 'full' : 'signal'
    const signal = mode === 'full'
      ? parseRecall(out)
      : parseSignal(out, query, floor, activeConfig.posttool_signal_rel_floor ?? 2.5)
    if (!signal) { updateTrace(traceId, 'empty'); recordActivity('posttool', 'Post-tool 信号', `工具 ${exec.name} 未命中相关知识`, 'info', traceId); return next() }
    recordActivity('posttool', 'Post-tool 信号', `工具 ${exec.name} 生成脱敏记忆提示`, 'ok', traceId)
    const downstream = await next()
    return { ...downstream, additionalContexts: [contextMessage(signal.text), ...(downstream.additionalContexts ?? [])] }
  })

  // Skill is an optional service; use ctx.get rather than inject.
  const skills = ctx.get('skills')
  if (skills) {
    readFile(join(__dirname, '..', 'skills', 'SKILL.md'), 'utf8')
      .then((content) => {
        skills.register({
          name: 'oks-recall',
          description: 'Recall OKS memories when facing uncertain concepts or historical decisions',
          content,
          source: 'runtime',
          provider: 'dsh-oks',
        })
      })
      .catch(() => {
        // Missing skill file: silently skip.
      })
  }
}
