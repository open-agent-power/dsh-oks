import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import { createDynamicSettingsHooks, parseOksKnowledgeBasePath, writeRecallYaml } from '../src/oks-config.ts'

const frame = '\u2502'
const expectedPath = 'C:\\oks-fixture\\knowledge-base'
const table = [
  frame + ' Knowledge Base                                                     ' + frame,
  frame + '   ' + expectedPath + '     ' + frame,
  frame + '                                                                    ' + frame,
  frame + ' Strategy                                                           ' + frame,
].join('\n')

test('parses Windows drive, UNC, and extended paths without table padding', () => {
  assert.equal(parseOksKnowledgeBasePath(table), expectedPath)
  for (const path of ['\\\\server\\share\\oks', '\\\\?\\C:\\oks', '\\\\?\\UNC\\server\\share\\oks']) {
    const text = ['Knowledge Base', '  ' + path + '   ', 'Strategy'].join('\n')
    assert.equal(parseOksKnowledgeBasePath(text), path)
  }
})

test('dynamic settings hooks establish a baseline, serialize changes, and report changed keys', async () => {
  const seen = []
  let latest = { recall_floor: 0.7, posttool_topn: 2 }
  const hooks = createDynamicSettingsHooks(latest, async (cfg, changed) => {
    if (cfg.recall_floor === 0.65) await new Promise(done => setTimeout(done, 10))
    seen.push({ floor: cfg.recall_floor, changed: [...changed].sort() })
  })
  hooks.setSource(() => latest)
  await hooks.onChange()
  assert.deepEqual(seen, [])

  latest = { recall_floor: 0.65, posttool_topn: 2 }
  hooks.onChange()
  latest = { recall_floor: 0.7, posttool_topn: 3 }
  hooks.onChange()
  await hooks.whenIdle()
  assert.deepEqual(seen, [
    { floor: 0.65, changed: ['recall_floor'] },
    { floor: 0.7, changed: ['posttool_topn', 'recall_floor'] },
  ])
  assert.equal(hooks.getCurrent().posttool_topn, 3)
})

test('dynamic settings hooks recover after a failed write', async () => {
  const seen = []
  let latest = { recall_floor: 0.7 }
  const hooks = createDynamicSettingsHooks(latest, async cfg => {
    seen.push(cfg.recall_floor)
    if (cfg.recall_floor === 0.65) throw new Error('simulated write failure')
  })
  hooks.setSource(() => latest)
  await hooks.onChange()
  latest = { recall_floor: 0.65 }
  await hooks.onChange()
  latest = { recall_floor: 0.6 }
  await hooks.onChange()
  assert.deepEqual(seen, [0.65, 0.6])
})

test('patches only changed recall.yaml keys and preserves owner content', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-test-')))
  try {
    const target = join(root, 'settings', 'recall.yaml')
    await mkdir(join(root, 'settings'), { recursive: true })
    await writeFile(target, [
      '# owner comment',
      'recall:',
      '  floor: 0.70 # preserve this comment',
      '  topn: 9',
      '  user_owned: true',
      'inject:',
      '  budget_chars: 9000',
      '  custom_mode: owner',
      'posttool:',
      '  floor: 0.95',
      '  recall: 0',
      'custom_section:',
      '  untouched: yes',
      'search_backend: fts5 # owner choice',
      '',
    ].join('\n'), 'utf8')
    writeRecallYaml(root, { recall_floor: 0.65, posttool_mode: 'full', search_backend: 'native' }, new Set(['recall_floor', 'posttool_mode', 'search_backend']))
    const out = await readFile(target, 'utf8')
    assert.match(out, /floor: 0\.65 # preserve this comment/)
    assert.match(out, /topn: 9/)
    assert.match(out, /user_owned: true/)
    assert.match(out, /budget_chars: 9000/)
    assert.match(out, /custom_mode: owner/)
    assert.match(out, /recall: 0/)
    assert.match(out, /mode: full/)
    assert.match(out, /custom_section:\n  untouched: yes/)
    assert.match(out, /search_backend: native # owner choice/)
    assert.deepEqual((await readdir(join(root, 'settings'))).sort(), ['recall.yaml'])
  } finally {
    if (root.startsWith(resolve(tmpdir()) + '\\')) await rm(root, { recursive: true, force: true })
  }
})

test('creates a complete default recall.yaml including inject configuration', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-test-')))
  try {
    writeRecallYaml(root, { recall_floor: 0.65 })
    const out = await readFile(join(root, 'settings', 'recall.yaml'), 'utf8')
    assert.match(out, /recall:\n  floor: 0\.65/)
    assert.match(out, /inject:\n  budget_chars: 4000/)
    assert.match(out, /prestep:\n  enabled: true/)
    assert.match(out, /posttool:/)
    assert.match(out, /userprompt:/)
    assert.match(out, /conflict:/)
    assert.match(out, /search_backend: native/)
  } finally {
    if (root.startsWith(resolve(tmpdir()) + '\\')) await rm(root, { recursive: true, force: true })
  }
})


test('patches the user-facing prestep enabled switch without disturbing other settings', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-test-')))
  try {
    writeRecallYaml(root, { prestep_enabled: false }, new Set(['prestep_enabled']))
    const out = await readFile(join(root, 'settings', 'recall.yaml'), 'utf8')
    assert.match(out, /prestep:\n  enabled: false/)
    assert.match(out, /recall:\n  floor: 0\.7/)
    assert.match(out, /posttool:/)
  } finally {
    if (root.startsWith(resolve(tmpdir()) + '\\')) await rm(root, { recursive: true, force: true })
  }
})
