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
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
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
function syncOksConfig(cfg: OksConfig): void {
  try {
    if (cfg.knowledge_base_path) {
      void execAsync(`${oksBin()} config set knowledge_base_path "${cfg.knowledge_base_path.replace(/"/g, '\\"')}"`)
        .catch(() => {})
    }
    const kbPath = cfg.knowledge_base_path || readOksKnowledgeBasePath()
    if (kbPath) writeRecallYaml(kbPath, cfg)
  } catch { /* best-effort; settings UI must not crash the host */ }
}

/** Read the current knowledge_base_path from `oks config show` output. */
function readOksKnowledgeBasePath(): string {
  try {
    const { stdout } = require('node:child_process').execSync(`${oksBin()} config show`, { encoding: 'utf-8', timeout: 5000 })
    const m = stdout.match(/\/\S+/)
    return m ? m[0] : ''
  } catch { return '' }
}

/** Write settings/recall.yaml from the namespace value (hand-rolled YAML). */
function writeRecallYaml(kbPath: string, cfg: OksConfig): void {
  const yaml = `# OKS recall 参数 — managed by dsh-oks plugin\nrecall:\n  floor: ${cfg.recall_floor ?? 0.7}\n  topn: ${cfg.recall_topn ?? 3}\n  minlen: ${cfg.recall_minlen ?? 6}\n  cooldown: ${cfg.recall_cooldown ?? 10}\nposttool:\n  floor: ${cfg.posttool_floor ?? 0.9}\n  topn: ${cfg.posttool_topn ?? 2}\n  mode: ${cfg.posttool_mode ?? 'signal'}\n  recall: 1\n  signal_rel_floor: ${cfg.posttool_signal_rel_floor ?? 2.5}\nsearch_backend: ${cfg.search_backend ?? 'native'}\n`
  const { writeFileSync, mkdirSync } = require('node:fs')
  const { join } = require('node:path')
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
