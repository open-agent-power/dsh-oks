/** Read-only, bounded inspection of the configured OKS instance. */
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { listRawBundles } from './raw-browser.ts'

export interface OksOverview {
  connected: true
  wikiCount: number
  draftCount: number
  rawFileCount: number
  rawBundleCount: number
  truncated?: boolean
}

export type OksConnectionStatus =
  | 'connected'
  | 'oks-not-installed'
  | 'not-configured'
  | 'not-initialized'
  | 'partial'
  | 'read-error'

export interface OksDiagnostics {
  connected: boolean
  status: OksConnectionStatus
  message: string
  oksCliAvailable: boolean
  knowledgeBaseConfigured: boolean
  wikiDirectory: boolean
  draftsDirectory: boolean
  rawDirectory: boolean
  wikiCount: number
  draftCount: number
  rawFileCount: number
  rawBundleCount: number
  truncated?: boolean
}

const MAX_SCAN_DIRECTORIES = 2_000
const MAX_SCANNED_FILES = 1_000

async function countFiles(root: string, include: (name: string) => boolean): Promise<{ count: number; truncated: boolean }> {
  let count = 0
  let scannedDirectories = 0
  let scannedFiles = 0
  let truncated = false
  const pending = [resolve(root)]
  while (pending.length > 0 && !truncated) {
    const directory = pending.pop()!
    scannedDirectories++
    if (scannedDirectories > MAX_SCAN_DIRECTORIES) {
      truncated = true
      break
    }
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue
      const file = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (scannedDirectories + pending.length < MAX_SCAN_DIRECTORIES) pending.push(file)
        else truncated = true
        continue
      }
      if (!entry.isFile()) continue
      scannedFiles++
      if (scannedFiles > MAX_SCANNED_FILES) {
        truncated = true
        break
      }
      if (include(entry.name)) count++
    }
  }
  return { count, truncated }
}

async function isDirectory(path: string): Promise<boolean> {
  try { return (await stat(path)).isDirectory() }
  catch { return false }
}

/** Count the three lifecycle layers without exposing the local root path. */
export async function getOksOverview(knowledgeBasePath: string): Promise<OksOverview> {
  const [wiki, drafts, raw, rawBundles] = await Promise.all([
    countFiles(join(knowledgeBasePath, 'wiki'), name => name.toLowerCase().endsWith('.md')),
    countFiles(join(knowledgeBasePath, 'drafts'), name => name.toLowerCase().endsWith('.md')),
    countFiles(join(knowledgeBasePath, 'raw'), () => true),
    listRawBundles(knowledgeBasePath),
  ])
  const truncated = wiki.truncated || drafts.truncated || raw.truncated || rawBundles.truncated
  return {
    connected: true,
    wikiCount: wiki.count,
    draftCount: drafts.count,
    rawFileCount: raw.count,
    rawBundleCount: rawBundles.total,
    ...(truncated ? { truncated: true } : {}),
  }
}

/**
 * Classify first-use connectivity without returning the user's local path.
 * The CLI availability is supplied by the Host because only the Host can run
 * the `oks` executable; this function remains deterministic and easy to test.
 */
export async function getOksDiagnostics(knowledgeBasePath: string, oksCliAvailable: boolean): Promise<OksDiagnostics> {
  const empty = {
    wikiCount: 0,
    draftCount: 0,
    rawFileCount: 0,
    rawBundleCount: 0,
    wikiDirectory: false,
    draftsDirectory: false,
    rawDirectory: false,
  }
  if (!oksCliAvailable) {
    return {
      connected: false,
      status: 'oks-not-installed',
      message: '未检测到 OKS 命令。请先安装 OKS CLI，然后重新打开 DSH。',
      oksCliAvailable: false,
      knowledgeBaseConfigured: Boolean(knowledgeBasePath),
      ...empty,
    }
  }
  if (!knowledgeBasePath) {
    return {
      connected: false,
      status: 'not-configured',
      message: '已检测到 OKS，但还没有连接知识库。请在系统设置中配置知识库位置。',
      oksCliAvailable: true,
      knowledgeBaseConfigured: false,
      ...empty,
    }
  }
  const root = resolve(knowledgeBasePath)
  let rootExists = false
  try { rootExists = (await stat(root)).isDirectory() } catch { rootExists = false }
  if (!rootExists) {
    return {
      connected: false,
      status: 'not-initialized',
      message: 'OKS 知识库位置已配置，但目录不存在。请先运行 oks init 创建知识库。',
      oksCliAvailable: true,
      knowledgeBaseConfigured: true,
      ...empty,
    }
  }
  const [wikiDirectory, draftsDirectory, rawDirectory] = await Promise.all([
    isDirectory(join(root, 'wiki')),
    isDirectory(join(root, 'drafts')),
    isDirectory(join(root, 'raw')),
  ])
  const overview = await getOksOverview(root)
  const complete = wikiDirectory && draftsDirectory && rawDirectory
  return {
    ...overview,
    connected: complete,
    status: complete ? 'connected' : 'partial',
    message: complete
      ? 'OKS 知识库已连接。'
      : '已找到 OKS 知识库目录，但目录结构不完整；请运行 oks init --upgrade 修复。',
    oksCliAvailable: true,
    knowledgeBaseConfigured: true,
    wikiDirectory,
    draftsDirectory,
    rawDirectory,
  }
}
