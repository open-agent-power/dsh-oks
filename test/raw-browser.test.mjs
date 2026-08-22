import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { getRawBundle, listRawBundles } from '../src/raw-browser.ts'

async function createFixture() {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-raw-test-')))
  const first = join(root, 'raw', '2026', '08', '19', 'agent-capture', 'bundle-a')
  const second = join(root, 'raw', '2026', '08', '18', 'web', 'bundle-b')
  await mkdir(first, { recursive: true })
  await mkdir(second, { recursive: true })
  await writeFile(join(first, 'bundle.json'), JSON.stringify({ bundle_id: 'bundle:a', capture_id: 'capture-a', processing_status: 'complete', files: { content: 'content.md' }, sources: [{ media_type: 'text/markdown' }] }), 'utf8')
  await writeFile(join(first, 'content.md'), '# Raw A\n\nSensitive local-path text is not a response field.', 'utf8')
  await writeFile(join(first, 'evidence.jsonl'), '{}\n', 'utf8')
  await writeFile(join(second, 'bundle.json'), JSON.stringify({ bundle_id: 'bundle:b', capture_id: 'capture-b', processing_status: 'pending', files: { content: 'raw.md' }, sources: [{ snapshot_kind: 'content' }] }), 'utf8')
  await writeFile(join(second, 'raw.md'), '# Raw B\n\nAwaiting processing.', 'utf8')
  return root
}
async function cleanup(root) {
  const rel = relative(resolve(tmpdir()), root)
  if (rel && !rel.startsWith('..') && !isAbsolute(rel)) await rm(root, { recursive: true, force: true })
}

test('lists Raw Bundle v0.2 evidence by bundle rather than raw file', async () => {
  const root = await createFixture()
  try {
    const all = await listRawBundles(root)
    assert.equal(all.total, 2)
    assert.deepEqual(all.items.map(item => item.captureId), ['capture-a', 'capture-b'])
    assert.deepEqual(all.items.map(item => item.fileCount), [3, 2])
    assert.deepEqual(all.statuses, ['complete', 'pending'])
    assert.equal(JSON.stringify(all).includes(root), false)
    assert.deepEqual((await listRawBundles(root, { query: 'capture-b' })).items.map(item => item.bundleId), ['bundle:b'])
    assert.deepEqual((await listRawBundles(root, { status: 'complete' })).items.map(item => item.captureId), ['capture-a'])
  } finally { await cleanup(root) }
})

test('reads only a server-discovered Raw Bundle and rejects traversal', async () => {
  const root = await createFixture()
  try {
    const listed = await listRawBundles(root)
    const detail = await getRawBundle(root, listed.items[0].id)
    assert.equal(detail?.captureId, 'capture-a')
    assert.match(detail?.body ?? '', /Raw A/)
    assert.equal('files' in (detail ?? {}), false)
    assert.equal(JSON.stringify(detail).includes(root), false)
    assert.equal(await getRawBundle(root, '../wiki/secret'), undefined)
    assert.equal(await getRawBundle(root, '2026/08/19/agent-capture/../bundle-a'), undefined)
    assert.equal(await getRawBundle(root, 'C:/anything'), undefined)
  } finally { await cleanup(root) }
})

test('bounds Raw preview reads while preserving detail truncation semantics', async () => {
  const root = await createFixture()
  try {
    const bundle = join(root, 'raw', '2026', '08', '19', 'agent-capture', 'bundle-a')
    await writeFile(join(bundle, 'content.md'), 'A'.repeat(140_000), 'utf8')
    const listed = await listRawBundles(root)
    assert.equal(listed.items[0].summary.length <= 220, true)
    const detail = await getRawBundle(root, listed.items[0].id)
    assert.equal(detail?.body.length, 60_000)
    assert.equal(detail?.bodyTruncated, true)
  } finally { await cleanup(root) }
})
test('bounds Raw Bundle discovery and marks a truncated scan', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-raw-bound-test-')))
  try {
    for (let index = 0; index < 251; index += 1) {
      const bundle = join(root, 'raw', '2026', '08', '19', 'bulk', `bundle-${String(index).padStart(3, '0')}`)
      await mkdir(bundle, { recursive: true })
      await writeFile(join(bundle, 'bundle.json'), JSON.stringify({ bundle_id: `bundle:${index}`, capture_id: `capture-${index}`, processing_status: 'complete', files: { content: 'content.md' } }), 'utf8')
      await writeFile(join(bundle, 'content.md'), 'bounded fixture', 'utf8')
    }
    const listed = await listRawBundles(root)
    assert.equal(listed.total, 250)
    assert.equal(listed.items.length, 250)
    assert.equal(listed.truncated, true)
  } finally { await cleanup(root) }
})

test('skips an oversized Raw manifest instead of reading it unbounded', async () => {
  const root = await createFixture()
  try {
    const bundle = join(root, 'raw', '2026', '08', '20', 'oversized', 'bundle-c')
    await mkdir(bundle, { recursive: true })
    await writeFile(join(bundle, 'bundle.json'), `{"bundle_id":"oversized","padding":"${'x'.repeat(300_000)}"}`, 'utf8')
    const listed = await listRawBundles(root)
    assert.equal(listed.items.some(item => item.captureId === 'oversized'), false)
  } finally { await cleanup(root) }
})
