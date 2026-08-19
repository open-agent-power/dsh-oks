/** Read-only browser for OKS Raw Bundle v0.2 evidence. */
import { open, readdir } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

export interface RawListFilters { query?: string; status?: string }
export interface RawBundleSummary {
  id: string
  bundleId: string
  captureId: string
  capturedAt: string
  status: string
  sourceType: string
  fileCount: number
  summary: string
}
export interface RawBundleDetail extends RawBundleSummary {
  body: string
  bodyTruncated: boolean
}
export interface RawListResult {
  total: number
  items: RawBundleSummary[]
  statuses: string[]
  truncated: boolean
}

const MAX_QUERY_CHARS = 120
const MAX_DETAIL_BODY_CHARS = 60_000
const MAX_LIST_PREVIEW_BYTES = 16 * 1024
const MAX_DETAIL_BODY_BYTES = 128 * 1024
const MAX_MANIFEST_BYTES = 256 * 1024
const MAX_BUNDLE_DIRECTORIES = 250
const MAX_RAW_SCAN_DIRECTORIES = 10_000
const MAX_FILES_PER_BUNDLE = 2_000

interface ScanResult { files: string[]; truncated: boolean }
interface BundleDirectories { directories: string[]; truncated: boolean }
interface ReadBundleResult {
  summary: RawBundleSummary
  manifest: Record<string, unknown>
  files: string[]
  directory: string
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }
function normalizeFilter(value: unknown): string { return text(value).slice(0, MAX_QUERY_CHARS) }
function relativeId(root: string, directory: string): string { return relative(root, directory).split(sep).join('/') }

async function readTextPreview(path: string, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  const handle = await open(path, 'r')
  try {
    const stat = await handle.stat()
    const bytes = Math.min(stat.size, maxBytes)
    const buffer = Buffer.alloc(bytes)
    if (bytes > 0) await handle.read(buffer, 0, bytes, 0)
    return { text: buffer.toString('utf8'), truncated: stat.size > maxBytes }
  } finally {
    await handle.close()
  }
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
  return plain.length <= 220 ? plain : `${plain.slice(0, 217).trimEnd()}...`
}

function dateFromId(id: string, manifest: Record<string, unknown>): string {
  const match = /(^|\/)(\d{4})\/(\d{2})\/(\d{2})(\/|$)/.exec(id)
  if (match) return `${match[2]}-${match[3]}-${match[4]}`
  const provenance = manifest.provenance
  if (provenance && typeof provenance === 'object' && Array.isArray((provenance as { activities?: unknown }).activities)) {
    const started = (provenance as { activities: Array<{ started_at?: unknown }> }).activities.find(item => typeof item?.started_at === 'string')?.started_at
    if (started) return String(started).slice(0, 10)
  }
  return ''
}

function sourceTypeFromManifest(manifest: Record<string, unknown>): string {
  const sources = manifest.sources
  if (Array.isArray(sources)) {
    const first = sources.find(item => item && typeof item === 'object') as { media_type?: unknown; snapshot_kind?: unknown } | undefined
    const mediaType = text(first?.media_type)
    if (mediaType) return mediaType
    const snapshotKind = text(first?.snapshot_kind)
    if (snapshotKind) return snapshotKind
  }
  return 'unlabeled'
}

async function filesUnder(directory: string): Promise<ScanResult> {
  const out: string[] = []
  const pending = [directory]
  let truncated = false
  while (pending.length > 0 && !truncated) {
    const current = pending.pop()!
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    for (const entry of entries) {
      if (entry.name === '.gitkeep') continue
      const file = join(current, entry.name)
      if (entry.isDirectory()) {
        pending.push(file)
      } else if (entry.isFile()) {
        out.push(relative(directory, file).split(sep).join('/'))
        if (out.length >= MAX_FILES_PER_BUNDLE) {
          truncated = true
          break
        }
      }
    }
  }
  return { files: out.sort((a, b) => a.localeCompare(b)), truncated }
}

async function findBundleDirectories(rawRoot: string): Promise<BundleDirectories> {
  const directories: string[] = []
  const pending = [resolve(rawRoot)]
  let scannedDirectories = 0
  let truncated = false
  while (pending.length > 0 && !truncated) {
    const current = pending.pop()!
    scannedDirectories += 1
    if (scannedDirectories > MAX_RAW_SCAN_DIRECTORIES) {
      truncated = true
      break
    }
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    if (entries.some(entry => entry.isFile() && entry.name.toLowerCase() === 'bundle.json')) {
      directories.push(current)
      if (directories.length >= MAX_BUNDLE_DIRECTORIES) {
        truncated = true
        break
      }
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) pending.push(join(current, entry.name))
    }
  }
  return { directories: directories.sort((a, b) => relativeId(rawRoot, a).localeCompare(relativeId(rawRoot, b))), truncated }
}

function requestedContentPath(directory: string, manifest: Record<string, unknown>, files: string[]): string | undefined {
  const declared = text((manifest.files as Record<string, unknown> | undefined)?.content)
  if (declared && !declared.includes('..') && !declared.includes('\\') && files.includes(declared)) return join(directory, declared)
  if (files.includes('content.md')) return join(directory, 'content.md')
  if (files.includes('raw.md')) return join(directory, 'raw.md')
  return undefined
}

async function readBundle(rawRoot: string, directory: string): Promise<ReadBundleResult | undefined> {
  try {
    const manifestPreview = await readTextPreview(join(directory, 'bundle.json'), MAX_MANIFEST_BYTES)
    if (manifestPreview.truncated) return undefined
    const manifest = JSON.parse(manifestPreview.text) as Record<string, unknown>
    const id = relativeId(rawRoot, directory)
    const bundleId = text(manifest.bundle_id) || id
    const captureId = text(manifest.capture_id) || bundleId
    const status = text(manifest.processing_status) || 'unknown'
    const fileScan = await filesUnder(directory)
    const bodyPath = requestedContentPath(directory, manifest, fileScan.files)
    const body = bodyPath ? (await readTextPreview(bodyPath, MAX_LIST_PREVIEW_BYTES)).text : ''
    const fileCount = fileScan.truncated ? MAX_FILES_PER_BUNDLE : fileScan.files.length
    const summary: RawBundleSummary = {
      id,
      bundleId,
      captureId,
      capturedAt: dateFromId(id, manifest),
      status,
      sourceType: sourceTypeFromManifest(manifest),
      fileCount,
      summary: displaySummary(body) || 'This Raw Bundle has no previewable text.',
    }
    return { summary, manifest, files: fileScan.files, directory }
  } catch {
    return undefined
  }
}

export async function listRawBundles(knowledgeBasePath: string, filters: RawListFilters = {}): Promise<RawListResult> {
  const rawRoot = resolve(knowledgeBasePath, 'raw')
  const found = await findBundleDirectories(rawRoot)
  const bundles: ReadBundleResult[] = []
  for (const directory of found.directories) {
    const bundle = await readBundle(rawRoot, directory)
    if (bundle) bundles.push(bundle)
  }
  bundles.sort((a, b) => b.summary.capturedAt.localeCompare(a.summary.capturedAt) || a.summary.captureId.localeCompare(b.summary.captureId))
  const query = normalizeFilter(filters.query).toLocaleLowerCase()
  const status = normalizeFilter(filters.status)
  const items = bundles
    .map(item => item.summary)
    .filter(item => (!query || `${item.captureId}\n${item.bundleId}\n${item.sourceType}\n${item.status}\n${item.summary}`.toLocaleLowerCase().includes(query)) && (!status || item.status === status))
  return { total: bundles.length, items, statuses: [...new Set(bundles.map(item => item.summary.status))].sort((a, b) => a.localeCompare(b)), truncated: found.truncated }
}

export async function getRawBundle(knowledgeBasePath: string, requestedId: unknown): Promise<RawBundleDetail | undefined> {
  const id = normalizeFilter(requestedId)
  if (!id || id.includes('\\') || id.split('/').some(part => !part || part === '.' || part === '..')) return undefined
  const rawRoot = resolve(knowledgeBasePath, 'raw')
  const found = await findBundleDirectories(rawRoot)
  const directory = found.directories.find(candidate => relativeId(rawRoot, candidate) === id)
  if (!directory) return undefined
  const item = await readBundle(rawRoot, directory)
  if (!item) return undefined
  const bodyPath = requestedContentPath(directory, item.manifest, item.files)
  const preview = bodyPath ? await readTextPreview(bodyPath, MAX_DETAIL_BODY_BYTES) : { text: '', truncated: false }
  const body = preview.text.slice(0, MAX_DETAIL_BODY_CHARS)
  return { ...item.summary, body, bodyTruncated: preview.truncated || preview.text.length > MAX_DETAIL_BODY_CHARS }
}

export async function countRawBundles(knowledgeBasePath: string): Promise<number> {
  return (await listRawBundles(knowledgeBasePath)).total
}
