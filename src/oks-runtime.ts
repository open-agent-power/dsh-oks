import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, win32 } from 'node:path'

export interface OksRuntimeEnv {
  OKS_BIN?: string
}

type Exists = (path: string) => boolean

/**
 * Resolve the OKS executable for a long-running DSH host process.
 *
 * Windows GUI/autostart processes do not always inherit the interactive user's
 * PATH. Prefer the explicit override, then the standard per-user pipx shim,
 * and finally let execFile report PATH-based installations on other systems.
 */
export function resolveOksBin(
  env: OksRuntimeEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  home = homedir(),
  exists: Exists = existsSync,
): string {
  const override = env.OKS_BIN?.trim()
  if (override) return override

  if (platform === 'win32') {
    const pathJoin = win32.join
    const candidates = [
      pathJoin(home, '.local', 'bin', 'oks.exe'),
      pathJoin(home, '.local', 'bin', 'oks'),
    ]
    const found = candidates.find(candidate => exists(candidate))
    if (found) return found
  }

  return 'oks'
}