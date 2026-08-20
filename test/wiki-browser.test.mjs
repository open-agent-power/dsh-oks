import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { getDraftPage, getWikiPage, listDraftPages, listWikiPages } from '../src/wiki-browser.ts'

async function createFixture() {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-wiki-test-')))
  await mkdir(join(root, 'wiki', 'engineering'), { recursive: true })
  await writeFile(join(root, 'wiki', 'engineering', 'rpc.md'), ['---', 'title: RPC boundary', 'type: strategy', 'area: engineering', 'created: 2026-08-19', '---', '', '# RPC boundary', '', 'The client cannot receive the local path. Deep evidence keyword: boundary-proof.'].join('\n'), 'utf8')
  await writeFile(join(root, 'wiki', 'welcome.md'), ['---', 'title: Team welcome', 'type: concept', 'area: teamwork', 'created: 2026-08-18', '---', '', 'Welcome to the knowledge base.'].join('\n'), 'utf8')
  return root
}
async function cleanup(root) { await rm(root, { recursive: true, force: true }) }

test('lists Wiki pages with metadata, full-text search, and filters', async () => {
  const root = await createFixture()
  try {
    const all = await listWikiPages(root)
    assert.equal(all.total, 2)
    assert.deepEqual(all.items.map(page => page.slug), ['engineering/rpc', 'welcome'])
    assert.deepEqual(all.areas, ['engineering', 'teamwork'])
    assert.deepEqual(all.types, ['concept', 'strategy'])
    assert.equal(all.items[0].title, 'RPC boundary')
    assert.match(all.items[0].summary, /client cannot receive/)
    assert.deepEqual((await listWikiPages(root, { query: 'boundary-proof' })).items.map(page => page.slug), ['engineering/rpc'])
    assert.deepEqual((await listWikiPages(root, { area: 'teamwork', type: 'concept' })).items.map(page => page.slug), ['welcome'])
  } finally { await cleanup(root) }
})

test('loads a known slug only and prevents traversal', async () => {
  const root = await createFixture()
  try {
    const detail = await getWikiPage(root, 'engineering/rpc')
    assert.equal(detail?.title, 'RPC boundary')
    assert.match(detail?.body ?? '', /boundary-proof/)
    assert.equal(await getWikiPage(root, '../settings/recall'), undefined)
    assert.equal(await getWikiPage(root, 'engineering/rpc.md'), undefined)
  } finally { await cleanup(root) }
})

test('lists and loads Draft pages separately from Wiki', async () => {
  const root = await createFixture()
  try {
    await mkdir(join(root, 'drafts', 'review'), { recursive: true })
    await writeFile(join(root, 'drafts', 'review', 'candidate.md'), ['---', 'title: Candidate', 'type: strategy', 'area: engineering', 'status: provisional', '---', '', '# AI candidate', '', 'Pending human review; not part of formal recall.'].join('\n'), 'utf8')
    const drafts = await listDraftPages(root)
    assert.equal(drafts.total, 1)
    assert.equal(drafts.items[0].slug, 'review/candidate')
    assert.equal(drafts.items[0].title, 'Candidate')
    assert.equal((await getDraftPage(root, 'review/candidate'))?.body.includes('Pending human review'), true)
    assert.equal(await getDraftPage(root, '../wiki/welcome'), undefined)
  } finally { await cleanup(root) }
})

test('returns an empty list without a Wiki directory', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-wiki-test-')))
  try { assert.deepEqual(await listWikiPages(root), { total: 0, items: [], areas: [], types: [] }) } finally { await cleanup(root) }
})

test('truncates a very long page body', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-wiki-test-')))
  try {
    await mkdir(join(root, 'wiki'), { recursive: true })
    await writeFile(join(root, 'wiki', 'long.md'), `---\ntitle: Long page\n---\n\n${'x'.repeat(60_100)}`, 'utf8')
    const detail = await getWikiPage(root, 'long')
    assert.equal(detail?.body.length, 60_000)
    assert.equal(detail?.bodyTruncated, true)
  } finally { await cleanup(root) }
})

test('bounds large markdown reads and exposes a partial-scan marker', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-wiki-limit-')))
  try {
    await mkdir(join(root, 'wiki'), { recursive: true })
    await writeFile(join(root, 'wiki', 'large.md'), `---\ntitle: Large page\n---\n\n${'x'.repeat(600_000)}`, 'utf8')
    const list = await listWikiPages(root)
    assert.equal(list.total, 1)
    assert.equal(list.truncated, true)
    const detail = await getWikiPage(root, 'large')
    assert.equal(detail?.bodyTruncated, true)
    assert.equal(detail?.body.length, 60_000)
  } finally { await cleanup(root) }
})

test('caps page discovery instead of reading an unbounded directory', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-wiki-count-limit-')))
  try {
    await mkdir(join(root, 'wiki'), { recursive: true })
    for (let index = 0; index < 1_005; index++) await writeFile(join(root, 'wiki', `page-${String(index).padStart(4, '0')}.md`), `# page ${index}`, 'utf8')
    const list = await listWikiPages(root)
    assert.equal(list.total, 1_000)
    assert.equal(list.truncated, true)
  } finally { await cleanup(root) }
})
