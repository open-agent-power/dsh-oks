import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export interface RecallConfig {
  recall_floor?: number
  recall_topn?: number
  recall_minlen?: number
  recall_cooldown?: number
  posttool_floor?: number
  posttool_topn?: number
  posttool_mode?: string
  posttool_signal_rel_floor?: number
  prestep_enabled?: boolean
  search_backend?: string
}

/** Parse the Knowledge Base path from the box-drawn oks config show table. */
export function parseOksKnowledgeBasePath(stdout: string): string {
  const lines = stdout.split(/\r?\n/)
  const heading = lines.findIndex(line => line.includes('Knowledge Base'))
  if (heading < 0) return ''

  for (const line of lines.slice(heading + 1)) {
    const candidate = line
      .trim()
      .replace(/^(?:\u2502|\|)\s*/, '')
      .replace(/\s*(?:\u2502|\|).*$/, '')
      .trim()
    if (/^(?:[A-Za-z]:[\\/]|\\\\|\\\\\?\\\\|\/)/.test(candidate)) return candidate
    if (candidate.startsWith('Strategy')) break
  }
  return ''
}

/** Return the global config path used by the OKS CLI. */
export function oksConfigPath(home = homedir()): string {
  return join(home, '.oks', 'config.json')
}

/**
 * Clear the active knowledge-base pointer without invoking oks config set.
 * The CLI treats an empty positional value as the current directory, which is
 * unsafe for a settings "disconnect" action. Preserve all other config keys
 * and use an atomic replacement so a failed write cannot leave a partial file.
 */
export function clearOksKnowledgeBasePath(configPath = oksConfigPath()): void {
  let config: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) config = parsed as Record<string, unknown>
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  config.knowledge_base_path = ''
  const directory = dirname(configPath)
  mkdirSync(directory, { recursive: true })
  const temporary = join(directory, '.config.' + process.pid + '.' + randomUUID() + '.tmp')
  let fd: number | undefined
  try {
    fd = openSync(temporary, 'wx')
    writeFileSync(fd, JSON.stringify(config, null, 2) + '\n', 'utf8')
    fsyncSync(fd)
    closeSync(fd)
    fd = undefined
    renameSync(temporary, configPath)
  } finally {
    if (fd !== undefined) closeSync(fd)
    try { unlinkSync(temporary) } catch { /* already renamed or never created */ }
  }
}

// Shared across plugin instances so a provider reload cannot let old and new
// settings scopes write recall.yaml out of order.
let sharedWriteTail: Promise<void> = Promise.resolve()

/** Keep the settings source live as dsh-settings replaces its resolved scope. */
export function createDynamicSettingsHooks<T extends object>(
  entry: T,
  sync: (value: T, changed: ReadonlySet<string>) => unknown,
) {
  let source = () => entry
  let previous: Record<string, unknown> | undefined
  let suppressNextChange = true
  let pending = sharedWriteTail

  const snapshot = (value: T): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value)) out[key] = (value as Record<string, unknown>)[key]
    return out
  }

  return {
    setSource(next: () => T) {
      source = next
      suppressNextChange = true
    },
    getCurrent(): T {
      return source()
    },
    onChange(): Promise<void> {
      const value = source()
      const current = snapshot(value)
      if (previous === undefined || suppressNextChange) {
        previous = current
        suppressNextChange = false
        return pending
      }

      const changed = new Set<string>()
      const keys = new Set([...Object.keys(previous), ...Object.keys(current)])
      for (const key of keys) {
        if (!Object.is(previous[key], current[key])) changed.add(key)
      }
      previous = current
      if (changed.size === 0) return pending

      const run = sharedWriteTail
        .catch(() => undefined)
        .then(() => sync(value, changed))
        .then(() => undefined)
      sharedWriteTail = run.catch(() => undefined)
      pending = sharedWriteTail
      return pending
    },
    whenIdle() { return pending },
  }
}

const managedValues: Record<string, Record<string, (cfg: RecallConfig) => unknown>> = {
  recall: {
    floor: cfg => cfg.recall_floor ?? 0.7,
    topn: cfg => cfg.recall_topn ?? 3,
    minlen: cfg => cfg.recall_minlen ?? 6,
    cooldown: cfg => cfg.recall_cooldown ?? 10,
  },
  posttool: {
    floor: cfg => cfg.posttool_floor ?? 0.9,
    topn: cfg => cfg.posttool_topn ?? 2,
    mode: cfg => cfg.posttool_mode ?? 'signal',
    signal_rel_floor: cfg => cfg.posttool_signal_rel_floor ?? 2.5,
  },
  prestep: {
    enabled: cfg => cfg.prestep_enabled ?? true,
  },
  userprompt: {
    floor: cfg => cfg.recall_floor ?? 0.7,
    topn: cfg => cfg.recall_topn ?? 3,
    cooldown: cfg => cfg.recall_cooldown ?? 10,
  },
}

const managedByKey: Record<string, { section: string; key: string }> = {
  recall_floor: { section: 'recall', key: 'floor' },
  recall_topn: { section: 'recall', key: 'topn' },
  recall_minlen: { section: 'recall', key: 'minlen' },
  recall_cooldown: { section: 'recall', key: 'cooldown' },
  posttool_floor: { section: 'posttool', key: 'floor' },
  posttool_topn: { section: 'posttool', key: 'topn' },
  posttool_mode: { section: 'posttool', key: 'mode' },
  posttool_signal_rel_floor: { section: 'posttool', key: 'signal_rel_floor' },
  prestep_enabled: { section: 'prestep', key: 'enabled' },
  search_backend: { section: '__root__', key: 'search_backend' },
}

function yamlValue(value: unknown): string {
  if (typeof value === 'string') return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value)
  return String(value)
}

function defaultRecallYaml(cfg: RecallConfig): string {
  return [
    '# OKS recall parameters - managed by dsh-oks plugin',
    'recall:',
    '  floor: ' + managedValues.recall.floor(cfg),
    '  topn: ' + managedValues.recall.topn(cfg),
    '  minlen: ' + managedValues.recall.minlen(cfg),
    '  cooldown: ' + managedValues.recall.cooldown(cfg),
    'inject:',
    '  budget_chars: 4000',
    '  per_page_chars: 200',
    '  title_only_floor: 0.5',
    'prestep:',
    '  enabled: ' + managedValues.prestep.enabled(cfg),
    'posttool:',
    '  floor: ' + managedValues.posttool.floor(cfg),
    '  topn: ' + managedValues.posttool.topn(cfg),
    '  mode: ' + managedValues.posttool.mode(cfg),
    '  recall: 1',
    '  signal_rel_floor: ' + managedValues.posttool.signal_rel_floor(cfg),
    'userprompt:',
    '  floor: ' + managedValues.userprompt.floor(cfg),
    '  topn: ' + managedValues.userprompt.topn(cfg),
    '  cooldown: ' + managedValues.userprompt.cooldown(cfg),
    'conflict:',
    '  window: 300',
    'search_backend: ' + yamlValue(cfg.search_backend ?? 'native'),
    'mail_topn: 3',
    '',
  ].join('\n')
}

function patchRecallYaml(existing: string, cfg: RecallConfig, changed: ReadonlySet<string>): string {
  const lines = existing.replace(/\r\n/g, '\n').split('\n')
  if (lines.length && lines[lines.length - 1] === '') lines.pop()
  const sectionStarts = new Map<string, number>()
  for (let i = 0; i < lines.length; i++) {
    const match = /^(?<indent>\s*)(?<section>[A-Za-z_][\w-]*):\s*(?:#.*)?$/.exec(lines[i])
    if (match?.groups?.indent === '' && match.groups.section) sectionStarts.set(match.groups.section, i)
  }

  const sectionEnd = (start: number): number => {
    for (let i = start + 1; i < lines.length; i++) {
      if (/^[A-Za-z_][\w-]*:\s*(?:#.*)?$/.test(lines[i])) return i
    }
    return lines.length
  }

  const patchSectionKey = (section: string, key: string, value: unknown): void => {
    const start = sectionStarts.get(section)
    if (start === undefined) {
      lines.push(section + ':', '  ' + key + ': ' + yamlValue(value))
      sectionStarts.set(section, lines.length - 2)
      return
    }
    const end = sectionEnd(start)
    const keyPattern = new RegExp('^(\\s{2}' + key + ':\\s*)(.*?)(\\s+#.*)?$')
    for (let i = start + 1; i < end; i++) {
      const match = keyPattern.exec(lines[i])
      if (match) {
        lines[i] = match[1] + yamlValue(value) + (match[3] ?? '')
        return
      }
    }
    lines.splice(end, 0, '  ' + key + ': ' + yamlValue(value))
    for (const [name, index] of sectionStarts) if (index >= end) sectionStarts.set(name, index + 1)
  }

  for (const [key, mapped] of Object.entries(managedByKey)) {
    if (!changed.has(key)) continue
    if (mapped.section === '__root__') {
      const pattern = /^(search_backend:\s*)(.*?)(\s+#.*)?$/
      const index = lines.findIndex(line => pattern.test(line))
      if (index >= 0) {
        const match = pattern.exec(lines[index])!
        lines[index] = match[1] + yamlValue(cfg.search_backend ?? 'native') + (match[3] ?? '')
      } else {
        lines.push('search_backend: ' + yamlValue(cfg.search_backend ?? 'native'))
      }
    } else {
      patchSectionKey(mapped.section, mapped.key, managedValues[mapped.section][mapped.key](cfg))
    }
  }
  return lines.join('\n') + '\n'
}

/** Atomically patch settings/recall.yaml while preserving unknown sections,
 * keys, comments, and user-owned values. Missing files get the full template. */
export function writeRecallYaml(kbPath: string, cfg: RecallConfig, changed?: ReadonlySet<string>): void {
  const dir = join(kbPath, 'settings')
  const target = join(dir, 'recall.yaml')
  mkdirSync(dir, { recursive: true })
  let yaml: string
  try {
    const existing = readFileSync(target, 'utf8')
    yaml = changed && changed.size > 0 ? patchRecallYaml(existing, cfg, changed) : existing
  } catch {
    yaml = defaultRecallYaml(cfg)
  }
  if (changed && changed.size === 0) return

  const temporary = join(dir, '.recall.yaml.' + process.pid + '.' + Date.now() + '.' + randomUUID() + '.tmp')
  let fd: number | undefined
  try {
    fd = openSync(temporary, 'wx')
    writeFileSync(fd, yaml, 'utf8')
    fsyncSync(fd)
    closeSync(fd)
    fd = undefined
    renameSync(temporary, target)
  } finally {
    if (fd !== undefined) closeSync(fd)
    try { unlinkSync(temporary) } catch { /* already renamed or never created */ }
  }
}
