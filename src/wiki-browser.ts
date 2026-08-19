/**
 * File-backed read-only lifecycle browser helpers.
 *
 * The DSH browser never sees a filesystem path. The Host half resolves the
 * configured knowledge-base root, then exposes safe slugs and display data
 * over Connection RPC.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

export interface WikiListFilters { query?: string; area?: string; type?: string }
export interface WikiSummary { slug: string; title: string; area: string; type: string; summary: string; created: string }
export interface WikiDetail extends WikiSummary { body: string; bodyTruncated: boolean }
export interface WikiListResult { total: number; items: WikiSummary[]; areas: string[]; types: string[] }
interface SearchItem { page: WikiSummary; searchText: string }

const MAX_QUERY_CHARS = 120
const MAX_DETAIL_BODY_CHARS = 60_000

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }
function yamlScalar(value: string): string {
  const trimmed = value.trim()
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) return trimmed.slice(1, -1)
  return trimmed.replace(/\s+#.*$/, '').trim()
}
function readFrontmatter(source: string): { meta: Record<string, string>; body: string } {
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) return { meta: {}, body: normalized }
  const closeAt = normalized.indexOf('\n---', 4)
  if (closeAt < 0) return { meta: {}, body: normalized }
  const meta: Record<string, string> = {}
  for (const line of normalized.slice(4, closeAt).split('\n')) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(line)
    if (match) meta[match[1]] = yamlScalar(match[2])
  }
  return { meta, body: normalized.slice(closeAt + 4).replace(/^\n/, '') }
}
function displaySummary(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^[#>*\-+\d.\s]+/gm, ' ')
    .replace(/[|`*_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length <= 220 ? plain : plain.slice(0, 217).trimEnd() + '…'
}
function titleFromBody(body: string): string { return /^#\s+(.+)$/m.exec(body)?.[1]?.trim() ?? '' }
function slugFromPath(root: string, file: string): string { return relative(root, file).split(sep).join('/').replace(/\.md$/i, '') }
async function markdownFiles(root: string): Promise<string[]> {
  const out: string[] = []
  async function visit(directory: string): Promise<void> {
    let entries
    try { entries = await readdir(directory, { withFileTypes: true }) }
    catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error }
    await Promise.all(entries.map(async entry => {
      const file = join(directory, entry.name)
      if (entry.isDirectory()) return visit(file)
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push(file)
    }))
  }
  await visit(root)
  return out
}
function summaryFromSource(root: string, file: string, source: string): SearchItem {
  const { meta, body } = readFrontmatter(source)
  const slug = slugFromPath(root, file)
  const page = {
    slug,
    title: meta.title || titleFromBody(body) || slug.split('/').at(-1) || slug,
    area: meta.area || '未分类',
    type: meta.type || '未分类',
    summary: displaySummary(body) || '暂无正文摘要。',
    created: meta.created || '',
  }
  return { page, searchText: `${page.title}\n${page.area}\n${page.type}\n${body}`.toLocaleLowerCase() }
}
async function readSearchItem(root: string, file: string): Promise<SearchItem> { return summaryFromSource(root, file, await readFile(file, 'utf8')) }
function comparePages(a: WikiSummary, b: WikiSummary): number { return b.created.localeCompare(a.created) || a.title.localeCompare(b.title, 'zh-Hans-CN') }
function normalizeFilter(value: unknown): string { return text(value).slice(0, MAX_QUERY_CHARS) }

/** List markdown pages under one lifecycle directory. */
export async function listMarkdownPages(knowledgeBasePath: string, directory: 'wiki' | 'drafts', filters: WikiListFilters = {}): Promise<WikiListResult> {
  const root = resolve(knowledgeBasePath, directory)
  const pages = await Promise.all((await markdownFiles(root)).map(file => readSearchItem(root, file)))
  pages.sort((a, b) => comparePages(a.page, b.page))
  const query = normalizeFilter(filters.query).toLocaleLowerCase()
  const area = normalizeFilter(filters.area)
  const type = normalizeFilter(filters.type)
  return {
    total: pages.length,
    items: pages.filter(({ page, searchText }) => (!query || searchText.includes(query)) && (!area || page.area === area) && (!type || page.type === type)).map(({ page }) => page),
    areas: [...new Set(pages.map(({ page }) => page.area))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
    types: [...new Set(pages.map(({ page }) => page.type))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')),
  }
}

export async function getMarkdownPage(knowledgeBasePath: string, directory: 'wiki' | 'drafts', requestedSlug: unknown): Promise<WikiDetail | undefined> {
  const slug = normalizeFilter(requestedSlug)
  if (!slug) return undefined
  const root = resolve(knowledgeBasePath, directory)
  const file = (await markdownFiles(root)).find(candidate => slugFromPath(root, candidate) === slug)
  if (!file) return undefined
  const source = await readFile(file, 'utf8')
  const { page } = summaryFromSource(root, file, source)
  const { body } = readFrontmatter(source)
  return { ...page, body: body.slice(0, MAX_DETAIL_BODY_CHARS), bodyTruncated: body.length > MAX_DETAIL_BODY_CHARS }
}

/** Read-only Wiki aliases retained for the existing RPC contract. */
export function listWikiPages(knowledgeBasePath: string, filters: WikiListFilters = {}): Promise<WikiListResult> {
  return listMarkdownPages(knowledgeBasePath, 'wiki', filters)
}
export function getWikiPage(knowledgeBasePath: string, requestedSlug: unknown): Promise<WikiDetail | undefined> {
  return getMarkdownPage(knowledgeBasePath, 'wiki', requestedSlug)
}
export function listDraftPages(knowledgeBasePath: string, filters: WikiListFilters = {}): Promise<WikiListResult> {
  return listMarkdownPages(knowledgeBasePath, 'drafts', filters)
}
export function getDraftPage(knowledgeBasePath: string, requestedSlug: unknown): Promise<WikiDetail | undefined> {
  return getMarkdownPage(knowledgeBasePath, 'drafts', requestedSlug)
}
