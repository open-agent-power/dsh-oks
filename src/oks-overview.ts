/** Read-only, bounded inspection of the configured OKS instance. */
import { readdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { countRawBundles } from './raw-browser.ts'

export interface OksOverview {
  connected: true
  wikiCount: number
  draftCount: number
  rawFileCount: number
  rawBundleCount: number
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
}

async function countFiles(root: string, include: (name: string) => boolean): Promise<number> {
  let total = 0
  async function visit(directory: string): Promise<void> {
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    await Promise.all(entries.map(async entry => {
      if (entry.name === '.gitkeep') return
      const file = join(directory, entry.name)
      if (entry.isDirectory()) return visit(file)
      if (entry.isFile() && include(entry.name)) total++
    }))
  }
  await visit(resolve(root))
  return total
}

async function isDirectory(path: string): Promise<boolean> {
  try { return (await stat(path)).isDirectory() }
  catch { return false }
}

/** Count the three lifecycle layers without exposing the local root path. */
export async function getOksOverview(knowledgeBasePath: string): Promise<OksOverview> {
  const [wikiCount, draftCount, rawFileCount, rawBundleCount] = await Promise.all([
    countFiles(join(knowledgeBasePath, 'wiki'), name => name.toLowerCase().endsWith('.md')),
    countFiles(join(knowledgeBasePath, 'drafts'), name => name.toLowerCase().endsWith('.md')),
    countFiles(join(knowledgeBasePath, 'raw'), () => true),
    countRawBundles(knowledgeBasePath),
  ])
  return { connected: true, wikiCount, draftCount, rawFileCount, rawBundleCount }
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
