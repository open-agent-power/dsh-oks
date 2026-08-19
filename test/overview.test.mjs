import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { getOksDiagnostics, getOksOverview } from '../src/oks-overview.ts'
import { isPrestepRecallEnabled } from '../src/prestep-control.ts'

test('counts Wiki, Draft, and Raw lifecycle files without exposing paths', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-oks-overview-'))
  try {
    await mkdir(join(root, 'wiki', 'computing'), { recursive: true })
    await mkdir(join(root, 'drafts'), { recursive: true })
    await mkdir(join(root, 'raw', '2026', '08'), { recursive: true })
    await writeFile(join(root, 'wiki', 'computing', 'one.md'), '# one')
    await writeFile(join(root, 'wiki', 'two.txt'), 'ignored')
    await writeFile(join(root, 'drafts', 'candidate.md'), '# draft')
    await writeFile(join(root, 'drafts', 'notes.txt'), 'ignored')
    await writeFile(join(root, 'raw', '2026', '08', 'source.json'), '{}')
    await writeFile(join(root, 'raw', '2026', '08', 'source.md'), '# raw')
    await writeFile(join(root, 'raw', '.gitkeep'), '')
    const overview = await getOksOverview(root)
    assert.deepEqual(overview, { connected: true, wikiCount: 1, draftCount: 1, rawFileCount: 2, rawBundleCount: 0 })
    assert.equal(JSON.stringify(overview).includes(root), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('automatic pre-step recall defaults on and can be disabled', () => {
  assert.equal(isPrestepRecallEnabled({}), true)
  assert.equal(isPrestepRecallEnabled({ prestep_enabled: true }), true)
  assert.equal(isPrestepRecallEnabled({ prestep_enabled: false }), false)
})

test('diagnostics classifies missing CLI and unconfigured knowledge base without paths', async () => {
  const missingCli = await getOksDiagnostics('', false)
  assert.equal(missingCli.status, 'oks-not-installed')
  assert.equal(missingCli.connected, false)
  assert.equal(JSON.stringify(missingCli).includes('knowledge_base_path'), false)

  const notConfigured = await getOksDiagnostics('', true)
  assert.equal(notConfigured.status, 'not-configured')
  assert.equal(notConfigured.connected, false)
})

test('diagnostics reports a complete local OKS root and current counts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-oks-diagnostics-'))
  try {
    await mkdir(join(root, 'wiki'), { recursive: true })
    await mkdir(join(root, 'drafts'), { recursive: true })
    await mkdir(join(root, 'raw'), { recursive: true })
    await writeFile(join(root, 'wiki', 'one.md'), '# one')
    await writeFile(join(root, 'drafts', 'one.md'), '# draft')
    await writeFile(join(root, 'raw', 'one.json'), '{}')
    const diagnostics = await getOksDiagnostics(root, true)
    assert.equal(diagnostics.status, 'connected')
    assert.equal(diagnostics.connected, true)
    assert.deepEqual([diagnostics.wikiCount, diagnostics.draftCount, diagnostics.rawFileCount, diagnostics.rawBundleCount], [1, 1, 1, 0])
    assert.equal(JSON.stringify(diagnostics).includes(root), false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
