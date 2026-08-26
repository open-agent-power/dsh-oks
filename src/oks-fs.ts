/**
 * Optional OKS VFS enumeration backend.
 *
 * The OKS 0.6.5 `oks fs` family exposes a read-only virtual context filesystem
 * with built-in path-traversal and symlink-escape hardening. When available we
 * use `oks fs tree` to enumerate files and directories instead of hand-written
 * readdir recursion, keeping content reads on `node:fs`. Enabling this backend
 * is a runtime concern only (no global state); callers that pass no runner fall
 * back to the existing filesystem enumeration.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(execFile)
const MAX_BUFFER = 10 * 1024 * 1024

/** Runs `oks <args>` and resolves the raw stdout. Args exclude the binary. */
export type OksFsRun = (args: string[]) => Promise<string>

/** Bound a concrete OKS binary into a callable runner (no shell, no globbing). */
export function makeOksFsRunner(oksBin: string): OksFsRun {
  return async (args) => {
    const { stdout } = await execAsync(oksBin, args, {
      maxBuffer: MAX_BUFFER,
      env: { ...process.env },
    })
    return stdout
  }
}

/** Feature-probe: the `oks fs` subcommand exists (OKS 0.6.5+) and is callable. */
export async function probeOksFs(run: OksFsRun): Promise<boolean> {
  try {
    await run(['fs', '--help'])
    return true
  } catch {
    return false
  }
}

export interface OksFsTreeResult {
  files: string[]
  directories: string[]
  truncated: boolean
  uri: string
}

/**
 * Parse an `oks fs tree --format json` document. Returns null on any malformed
 * or unexpected payload so callers can back off to their fs implementation.
 */
export function parseOksFsTree(stdout: string): OksFsTreeResult | null {
  let data: unknown
  try {
    data = JSON.parse(stdout)
  } catch {
    return null
  }
  const body = data as {
    schema_version?: unknown
    operation?: unknown
    result?: {
      uri?: unknown
      entries?: unknown
      truncated?: unknown
    }
  }
  if (
    body?.schema_version !== 'oks-fs-response/v1'
    || body?.operation !== 'tree'
    || !body.result
    || !Array.isArray(body.result.entries)
  ) {
    return null
  }
  const files: string[] = []
  const directories: string[] = []
  for (const entry of body.result.entries) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as { type?: unknown; uri?: unknown }
    if (typeof item.uri !== 'string' || item.uri === '') continue
    if (item.type === 'file') files.push(item.uri)
    else if (item.type === 'directory') directories.push(item.uri)
  }
  return {
    files,
    directories,
    truncated: body.result.truncated === true,
    uri: String(body.result.uri ?? ''),
  }
}

/**
 * Reject any VFS-relative path that could escape the local root once joined.
 * Operates on the already-decodeURIComponent'd path. This is fail-closed: the
 * OKS CLI is expected to emit only paths under the operation root, but a stray
 * `..`/absolute/backslash segment must never reach `join()` against a
 * caller-controlled root.
 */
function isSafeVfsRel(rel: string): boolean {
  if (rel.length === 0) return false
  if (rel.startsWith('/') || rel.startsWith('\\') || /^[A-Za-z]:/.test(rel)) return false
  if (rel.includes('\\')) return false
  return !rel.split('/').some(part => part === '..' || part === '.')
}

/**
 * List the bounded file tree under a public VFS directory and return the file
 * URIs relative to `rootUri`. `rootUri` must be the operation root (e.g.
 * `oks://wiki/`); entries are mapped by stripping that prefix, URL-decoding
 * each remaining path segment so it can rejoin against the real local root,
 * then fail-closed safety filtering. Returns null when the CLI errors, letting
 * the caller fall back to filesystem enumeration.
 */
export async function listVfsFiles(
  run: OksFsRun,
  rootUri: string,
): Promise<{ files: string[]; truncated: boolean } | null> {
  try {
    const stdout = await run(['fs', 'tree', rootUri, '--depth', '10', '--max-entries', '10000', '--format', 'json'])
    const tree = parseOksFsTree(stdout)
    if (!tree) return null
    const prefix = rootUri.endsWith('/') ? rootUri : rootUri + '/'
    const files = tree.files
      .filter(uri => uri.startsWith(prefix))
      .map((uri) => {
        const raw = uri.slice(prefix.length)
        try {
          return decodeURIComponent(raw)
        } catch {
          return ''
        }
      })
      .filter(rel => rel.length > 0)
      .filter(isSafeVfsRel)
    return { files, truncated: tree.truncated }
  } catch {
    return null
  }
}

/**
 * Bundle the "should we use VFS" decision and the lazy CLI probe into one live
 * callable. `readEnabled` is evaluated on every invocation so it can reflect
 * runtime settings (e.g. `settingsHooks.getCurrent().vfs_enabled`) — toggling
 * the switch takes effect immediately without a plugin reload. The probe stays
 * lazy and cached so a disabled backend never spawns a subprocess.
 */
export function createVfsRunnerRef(
  readEnabled: () => boolean,
  probe: () => Promise<OksFsRun | undefined>,
): () => Promise<OksFsRun | undefined> {
  let cached: Promise<OksFsRun | undefined> | undefined
  return () => {
    if (readEnabled() !== true) return Promise.resolve(undefined)
    cached ??= probe()
    return cached
  }
}