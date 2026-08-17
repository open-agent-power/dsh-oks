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
import { readFile, writeFileSync, mkdirSync } from 'node:fs'
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

/** Parse `oks recall --format json` → compact <recalled-memory> text, or '' . */
function parseRecall(stdout: string): string {
  try {
    const data = JSON.parse(stdout) as Array<{ slug?: string; title?: string; type?: string; rel?: number; body?: string }>
    if (!Array.isArray(data) || data.length === 0) return ''
    const lines = data.map(m =>
      `- [${m.type ?? 'memory'}] ${m.title ?? m.slug ?? ''} (${m.slug ?? '?'}) rel=${m.rel ?? 0}\n${(m.body ?? '').slice(0, 600)}`)
    return `## 相关记忆\n相关已沉淀记忆（引用时用 slug）：\n${lines.join('\n\n')}`
  } catch { return '' }
}

/** A short post-tool signal: just slug + rel, no body (mode 'signal'). */
function parseSignal(stdout: string): string {
  try {
    const data = JSON.parse(stdout) as Array<{ slug?: string; title?: string; rel?: number }>
    if (!Array.isArray(data) || data.length === 0) return ''
    const lines = data.map(m => `- ${m.title ?? m.slug ?? ''} (${m.slug ?? '?'}) rel=${m.rel ?? 0}`)
    return `[oks post-tool signal] 可能相关：\n${lines.join('\n')}`
  } catch { return '' }
}

/** Build a UserMessage carrying context text, tagged with our plugin source. */
function contextMessage(text: string): UserMessage {
  return createUserMessage({ content: [{ type: 'text', text }], source: PLUGIN_SOURCE })
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
      return runOks(['metrics'])
    },
  }))

  // ── Hook: agent/pre-step — deterministic per-turn recall (UserPromptSubmit) ──
  // DELEGATE then prepend: a later listener may still reject; we only attach
  // context to a downstream 'enter'. query < minlen or oks failure → no-op.
  ctx.on('agent/pre-step', async ({ messages }, next): Promise<PreStepDecision> => {
    const query = extractQuery(messages)
    if (query.length < 6) return next()
    let out = ''
    try { out = await runOks(['recall', escapeQuery(query), '--format', 'json', '--limit', '3']) }
    catch { return next() }
    const recalled = parseRecall(out)
    if (!recalled) return next()
    const downstream = await next()
    if (downstream.kind !== 'enter') return downstream
    return { kind: 'enter', messages: [...downstream.messages, contextMessage(recalled)] }
  })

  // ── Hook: tools/post-execute — post-tool memory signal (PostToolUse) ──
  // Only signal for read/write/edit/bash/grep/glob; oks failure → no-op.
  ctx.on('tools/post-execute', async (exec: ToolExecution, _result: Readonly<ToolExecutionResult>, next): Promise<PostToolDecision> => {
    if (!SIGNAL_TOOLS.has(exec.name)) return next()
    const query = deriveQuery(exec)
    if (query.length < 6) return next()
    let out = ''
    try { out = await runOks(['recall', escapeQuery(query), '--format', 'json', '--limit', '2']) }
    catch { return next() }
    const signal = parseSignal(out)
    if (!signal) return next()
    const downstream = await next()
    return { ...downstream, additionalContexts: [contextMessage(signal), ...(downstream.additionalContexts ?? [])] }
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
