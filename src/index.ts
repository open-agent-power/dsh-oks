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

const execAsync = promisify(exec)
const __dirname = dirname(fileURLToPath(import.meta.url))

/** Resolve the oks binary. Override with OKS_BIN env for non-PATH installs. */
function oksBin(): string {
  return process.env.OKS_BIN || 'oks'
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

export function apply(ctx: Context) {
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
