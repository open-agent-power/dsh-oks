/**
 * dsh-oks — DeepSeek Harness plugin for OKS knowledge base.
 *
 * Host half: registers model-facing tools (oks_recall/status/wiki_use/metrics),
 * a settings namespace for the browser card (RecallParamsCard), and a runtime
 * skill that tells the model when to recall.
 *
 * Integration: calls `oks` CLI via subprocess — dsh (Node) and oks (Python)
 * stay decoupled, each upgrades independently.
 */
import { readFile } from 'node:fs/promises'
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContentBlock, MessageSource } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { PostToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

/** Settings namespace — the join key between Host half and browser card. */
export const OKS_NS = settingsNamespace('oks')

export interface OksConfig {
  knowledge_base_path?: string
  recall_floor?: number
  recall_topn?: number
  recall_minlen?: number
  recall_cooldown?: number
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

/** Resolve the oks binary. Override with OKS_BIN env for non-PATH installs. */
function oksBin(): string {
  return process.env.OKS_BIN || 'oks'
}

/** Sync the namespace value to oks's own stores: knowledge_base_path →
 * `oks config set` (writes ~/.oks/config.json); recall/posttool/search →
 * settings/recall.yaml (hand-rolled YAML so we need no dep). */
async function syncOksConfig(cfg: OksConfig): Promise<void> {
  try {
    if (cfg.knowledge_base_path) {
      await execAsync(`${oksBin()} config set knowledge_base_path "${cfg.knowledge_base_path.replace(/"/g, '\\"')}"`)
        .catch(() => {})
    }
    const kbPath = cfg.knowledge_base_path || (await readOksKnowledgeBasePath())
    if (kbPath) writeRecallYaml(kbPath, cfg)
  } catch { /* best-effort; settings UI must not crash the host */ }
}

/** Read the current knowledge_base_path from `oks config show` output. */
async function readOksKnowledgeBasePath(): Promise<string> {
  try {
    const { stdout } = await execAsync(`${oksBin()} config show`, { encoding: 'utf-8', timeout: 5000 })
    const m = stdout.match(/\/\S+/)
    return m ? m[0] : ''
  } catch { return '' }
}

/** Write settings/recall.yaml from the namespace value. Preserves every field
 * the recall.yaml schema owns so an overwrite never drops a key. */
function writeRecallYaml(kbPath: string, cfg: OksConfig): void {
  const yaml = [
    '# OKS recall 参数 — managed by dsh-oks plugin',
    'recall:',
    `  floor: ${cfg.recall_floor ?? 0.7}`,
    `  topn: ${cfg.recall_topn ?? 3}`,
    `  minlen: ${cfg.recall_minlen ?? 6}`,
    `  cooldown: ${cfg.recall_cooldown ?? 10}`,
    'posttool:',
    `  floor: ${cfg.posttool_floor ?? 0.9}`,
    `  topn: ${cfg.posttool_topn ?? 2}`,
    `  mode: ${cfg.posttool_mode ?? 'signal'}`,
    '  recall: 1',
    `  signal_rel_floor: ${cfg.posttool_signal_rel_floor ?? 2.5}`,
    'userprompt:',
    `  floor: ${cfg.recall_floor ?? 0.7}`,
    `  topn: ${cfg.recall_topn ?? 3}`,
    `  cooldown: ${cfg.recall_cooldown ?? 10}`,
    'conflict:',
    '  window: 300',
    `search_backend: ${cfg.search_backend ?? 'native'}`,
    'mail_topn: 3',
    '',
  ].join('\n')
  const dir = join(kbPath, 'settings')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'recall.yaml'), yaml, 'utf-8')
}

/** Run `oks <args>` and return stdout. Throws on non-zero exit. */
async function runOks(args: string[]): Promise<string> {
  const cmd = `${oksBin()} ${args.join(' ')}`
  const { stdout } = await execAsync(cmd, {
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env },
  })
  return stdout
}

/** Shell-escape a query string for safe interpolation into the oks CLI. */
function escapeQuery(q: string): string {
  return `"${q.replace(/"/g, '\\"')}"`
}

export const name = 'dsh-oks'
export const inject = ['tools']

/** Source label for hook-injected messages — lets downstream see who spoke. */
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

/** Parse `oks recall --format json` → context text + slugs + inject_id, or null.
 * Mirrors pi's user-prompt-recall.py template: <recalled-memory source="oks">
 * wrapper + body_preview single-line [:160] + [自评闭环] guidance. */
function parseRecall(stdout: string): ParsedRecall | null {
  try {
    const data = JSON.parse(stdout) as { knowledge?: RecallHit[]; episodic?: EpisodicHit[] }
    const items = [...(data.knowledge ?? []), ...(data.episodic ?? [])]
    if (items.length === 0) return null
    const lines = ['## 相关记忆', '相关已沉淀记忆（引用时用 slug；与当前事实冲突以最新为准）：']
    for (const m of items) {
      if ('slug' in m) {
        lines.push(`- [${m.type ?? ''}] ${m.title ?? m.slug ?? ''} (${m.slug ?? ''}) rel=${(m.relevance ?? 0).toFixed(2)}`)
        const preview = String(m.body_preview ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
        if (preview) lines.push(`    ${preview}`)
      } else {
        lines.push(`- [episodic] ${(m as EpisodicHit).source_path ?? ''} rel=${((m as EpisodicHit).relevance ?? 0).toFixed(2)}`)
        const snip = String((m as EpisodicHit).snippet ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)
        if (snip) lines.push(`    ${snip}`)
      }
    }
    const slugs = items.map(m => 'slug' in m ? (m.slug ?? '') : (m as EpisodicHit).source_path ?? '').filter(Boolean)
    const injectId = randomUUID().slice(0, 8)
    const out = ['<recalled-memory source="oks">', lines.join('\n'), '',
      '[自评闭环] 埋点由你（AI）代填（人类懒惰不手动）：\n' +
      '1. 你实际引用了的记忆 → 调 `oks wiki use <slug>`（标 used + access_count++）\n' +
      '2. 观察用户后续回复——用户接受/引用了某条 → 代调 `oks wiki use <slug>`；' +
      '用户明确拒绝（"不要"/"错了"）→ 不调（默认未采纳）\n' +
      '无用忽略——下次 cooldown 换别的。信号都在对话里，你代人类完成。',
      `<!-- inject_id:${injectId} slugs:${slugs.join(',')} -->`,
      '</recalled-memory>']
    return { text: out.join('\n'), injectId, slugs }
  } catch { return null }
}

/** A short post-tool signal: mirrors pi's post-tool-edit.py signal mode.
 * <oks-memory-signal source="oks-posttool"> + slug:/rel: colon format + 详情引导. */
function parseSignal(stdout: string, query: string, floor: number): ParsedRecall | null {
  try {
    const data = JSON.parse(stdout) as { knowledge?: RecallHit[]; episodic?: EpisodicHit[] }
    const items = [...(data.knowledge ?? []), ...(data.episodic ?? [])]
    if (items.length === 0) return null
    const lines = [`<!-- query="${query}" floor=${floor} (signal: slugs only, no body) -->`]
    for (const m of items) {
      if ('slug' in m) {
        lines.push(`- [${m.type ?? ''}] ${m.title ?? m.slug ?? ''} (slug: ${m.slug ?? ''}, rel: ${(m.relevance ?? 0).toFixed(2)})`)
      } else {
        lines.push(`- [episodic] ${(m as EpisodicHit).source_path ?? ''} (rel: ${((m as EpisodicHit).relevance ?? 0).toFixed(2)})`)
      }
    }
    lines.push(`  需要详情: oks recall "${query}" --explain`)
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

export function apply(ctx: Context, config: OksConfig = {}) {
  // ── Settings namespace (Host half) — pairs with browser RecallParamsCard ──
  let current: OksConfig = config
  installSettingsSection(ctx, OKS_NS, OksConfigSchema, config, {
    setSource: (src) => { current = src() },
    onChange: () => { syncOksConfig(current) },
  })

  // ── Tool: oks_recall ────────────────────────────────────────────────
  ctx.tools.register(defineTool({
    name: 'oks_recall',
    description:
      'Recall relevant memories from the OKS knowledge base. ' +
      'Use when the task involves uncertain concepts, historical decisions, ' +
      'or competitor comparison. Query with task intent, not tool operations.',
    parameters: {
      query: {
        type: 'string', required: true,
        description: 'Task-intent query. E.g. "OKS memory system vs ai-book chapter 3"',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: recall.topn from settings, or 3)',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      const limit = args.limit ?? 3
      return runOks(['recall', escapeQuery(args.query), '--format', 'json', '--limit', String(limit)])
    },
  }))

  // ── Tool: oks_status ─────────────────────────────────────────────────
  ctx.tools.register(defineTool({
    name: 'oks_status',
    description: 'Show OKS knowledge base status: wiki count, tier distribution, drafts.',
    parameters: {},
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute() {
      return runOks(['status'])
    },
  }))

  // ── Tool: oks_wiki_use ───────────────────────────────────────────────
  ctx.tools.register(defineTool({
    name: 'oks_wiki_use',
    description:
      'Mark a wiki page as used (access_count++). Call this when you actually ' +
      'cited or applied a recalled memory — it is the self-evaluation signal.',
    parameters: {
      slug: { type: 'string', required: true, description: 'Wiki page slug' },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    async execute(args) {
      return runOks(['wiki', 'use', args.slug])
    },
  }))

  // ── Tool: oks_metrics ────────────────────────────────────────────────
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
      const injectBlock = `\n--- 注入质量（dsh-oks feedback）---\n总计 ${s.total} 次反馈 | useful ${s.useful} (${s.total ? Math.round(s.useful / s.total * 100) : 0}%) | noise ${s.noise} | irrelevant ${s.irrelevant} | useful 率 ${rate}%`
      const topSlugs = Object.entries(s.bySlug).sort((a, b) => (b[1].useful + b[1].noise) - (a[1].useful + a[1].noise)).slice(0, 5)
      const slugLines = topSlugs.length ? topSlugs.map(([slug, c]) => `  ${slug}: useful ${c.useful} / noise ${c.noise}`).join('\n') : '  （暂无）'
      return base + injectBlock + '\n按 slug：\n' + slugLines
    },
  }))

  // ── Tool: oks_inject_stats — injection-quality summary ───────────────
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
      if (s.total === 0) return '暂无注入反馈记录。AI 答完后调 oks_inject_feedback 累积数据。'
      return JSON.stringify(s, null, 2)
    },
  }))

  // ── Tool: oks_inject_feedback — AI rates an injection (closed-loop) ─────
  // The pre-step/post-execute hooks tag every injection with an inject_id.
  // After answering, the model calls this to record whether the injected
  // memories were useful — feeding oks metrics a quality signal.
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

  // ── Hook: agent/pre-step — deterministic per-turn recall (UserPromptSubmit) ──
  // DELEGATE then prepend: a later listener may still reject; we only attach
  // context to a downstream 'enter'. query < 10 / oks failure → no-op.
  // Higher floor (0.85) + knowledge-only to avoid noisy recall on greetings.
  ctx.on('agent/pre-step', async ({ messages }, next): Promise<PreStepDecision> => {
    const query = extractQuery(messages)
    if (query.length < 10) return next()
    const args = ['recall', escapeQuery(query), '--format', 'json', '--limit', '2', '--floor', String(config.prestep_floor ?? 0.85)]
    if (config.prestep_knowledge_only ?? true) args.push('--knowledge-only')
    let out = ''
    try { out = await runOks(args) }
    catch { return next() }
    const recalled = parseRecall(out)
    if (!recalled) return next()
    const downstream = await next()
    if (downstream.kind !== 'enter') return downstream
    return { kind: 'enter', messages: [...downstream.messages, contextMessage(recalled.text)] }
  })

  // ── Hook: tools/post-execute — post-tool memory signal (PostToolUse) ──
  // Only signal for read/write/edit/bash/grep/glob; oks failure → no-op.
  ctx.on('tools/post-execute', async (exec: ToolExecution, _result: Readonly<ToolExecutionResult>, next): Promise<PostToolDecision> => {
    if (!SIGNAL_TOOLS.has(exec.name)) return next()
    const query = deriveQuery(exec)
    if (query.length < 6) return next()
    const floor = config.posttool_floor ?? 0.9
    let out = ''
    try { out = await runOks(['recall', escapeQuery(query), '--format', 'json', '--limit', '2', '--floor', String(floor)]) }
    catch { return next() }
    const signal = parseSignal(out, query, floor)
    if (!signal) return next()
    const downstream = await next()
    return { ...downstream, additionalContexts: [contextMessage(signal.text), ...(downstream.additionalContexts ?? [])] }
  })

  // ── Skill (optional service — use ctx.get, not inject) ──────────────
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
        // skill file missing — silent skip
      })
  }
}
