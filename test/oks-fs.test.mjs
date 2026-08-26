import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import test from 'node:test'
import { createVfsRunnerRef, listVfsFiles, parseOksFsTree, probeOksFs } from '../src/oks-fs.ts'
import { createDynamicSettingsHooks } from '../src/oks-config.ts'
import { listRawBundles } from '../src/raw-browser.ts'
import { getWikiPage, listWikiPages } from '../src/wiki-browser.ts'

function treeJson(files, truncated = false) {
  return JSON.stringify({
    schema_version: 'oks-fs-response/v1',
    operation: 'tree',
    uri: 'oks://wiki/',
    result: {
      uri: 'oks://wiki/',
      entries: [
        ...files.map(uri => ({ name: uri.split('/').at(-1) ?? '', type: 'file', uri })),
        ...(truncated ? [] : []),
      ],
      truncated,
    },
  })
}

test('parseOksFsTree accepts a valid tree and rejects malformed payloads', () => {
  const ok = parseOksFsTree(JSON.stringify({
    schema_version: 'oks-fs-response/v1', operation: 'tree', uri: 'oks://wiki/',
    result: { uri: 'oks://wiki/', truncated: true, entries: [
      { name: 'a.md', type: 'file', uri: 'oks://wiki/a.md' },
      { name: 'sub', type: 'directory', uri: 'oks://wiki/sub/' },
    ] },
  }))
  assert.deepEqual(ok?.files, ['oks://wiki/a.md'])
  assert.deepEqual(ok?.directories, ['oks://wiki/sub/'])
  assert.equal(ok?.truncated, true)

  assert.equal(parseOksFsTree('not json'), null)
  assert.equal(parseOksFsTree('{"foo":1}'), null)
  assert.equal(parseOksFsTree(JSON.stringify({ schema_version: 'oks-fs-response/v1', operation: 'ls', result: { entries: [] } })), null)
  assert.equal(parseOksFsTree(JSON.stringify({ schema_version: 'oks-fs-response/v1', operation: 'tree', result: { entries: 'nope' } })), null)
})

test('listVfsFiles maps VFS file URIs relative to its root and reports truncation', async () => {
  const run = async () => JSON.stringify({
    schema_version: 'oks-fs-response/v1', operation: 'tree', uri: 'oks://wiki/',
    result: { uri: 'oks://wiki/', truncated: true, entries: [
      { name: 'welcome.md', type: 'file', uri: 'oks://wiki/welcome.md' },
      { name: 'eng', type: 'directory', uri: 'oks://wiki/eng/' },
      { name: 'rpc.md', type: 'file', uri: 'oks://wiki/eng/rpc.md' },
    ] },
  })
  const result = await listVfsFiles(run, 'oks://wiki/')
  assert.deepEqual(result?.files, ['welcome.md', 'eng/rpc.md'])
  assert.equal(result?.truncated, true)
})

test('listVfsFiles drops traversal and absolute paths that could escape the root', async () => {
  const run = async () => JSON.stringify({
    schema_version: 'oks-fs-response/v1', operation: 'tree', uri: 'oks://wiki/',
    result: { uri: 'oks://wiki/', truncated: false, entries: [
      { name: 'ok.md', type: 'file', uri: 'oks://wiki/ok.md' },
      { name: 'esc', type: 'file', uri: 'oks://wiki/../secrets/.env' },
      { name: 'abs', type: 'file', uri: 'oks://wiki/C:/Windows/win.ini' },
      { name: 'slash', type: 'file', uri: 'oks://wiki//etc/passwd' },
      { name: 'dot', type: 'file', uri: 'oks://wiki/./loop.md' },
    ] },
  })
  const result = await listVfsFiles(run, 'oks://wiki/')
  assert.deepEqual(result?.files, ['ok.md'])
})

test('listVfsFiles URL-decodes non-ASCII filenames and drops malformed escapes', async () => {
  const run = async () => JSON.stringify({
    schema_version: 'oks-fs-response/v1', operation: 'tree', uri: 'oks://wiki/',
    result: { uri: 'oks://wiki/', truncated: false, entries: [
      { name: 'cn.md', type: 'file', uri: 'oks://wiki/20260810-%E6%9D%8E%20%E6%98%B1.md' },
      { name: 'enc-decoy', type: 'file', uri: 'oks://wiki/%2e%2e%2fsecret.md' },
      { name: 'bad', type: 'file', uri: 'oks://wiki/%zz-invalid.md' },
      { name: 'plain.md', type: 'file', uri: 'oks://wiki/plain.md' },
    ] },
  })
  const result = await listVfsFiles(run, 'oks://wiki/')
  assert.deepEqual(result?.files, ['20260810-李 昱.md', 'plain.md'])
})

test('probeOksFs detects a supported oks fs command', async () => {
  assert.equal(await probeOksFs(async () => 'ok'), true)
  assert.equal(await probeOksFs(async () => { throw new Error('no such command') }), false)
})

test('probeOksFs rejects a runner whose fs subcommand errors', async () => {
  const fail = async () => { throw new Error('exit 2') }
  assert.equal(await probeOksFs(fail), false)
})

test('wiki browser lists pages through a VFS runner while reading via fs', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-vfs-wiki-')))
  try {
    await mkdir(join(root, 'wiki', 'eng'), { recursive: true })
    await writeFile(join(root, 'wiki', 'welcome.md'), ['---', 'title: Welcome', 'type: concept', 'area: teamwork', 'created: 2026-08-18', '---', '', 'Hello KB.'].join('\n'), 'utf8')
    await writeFile(join(root, 'wiki', 'eng', 'rpc.md'), ['---', 'title: RPC boundary', 'type: strategy', 'area: engineering', 'created: 2026-08-19', '---', '', 'Deep keyword: boundary-proof.'].join('\n'), 'utf8')
    const run = async () => treeJson(['oks://wiki/welcome.md', 'oks://wiki/eng/rpc.md'])
    const all = await listWikiPages(root, {}, run)
    assert.equal(all.total, 2)
    assert.deepEqual(all.items.map(page => page.slug), ['eng/rpc', 'welcome'])
    assert.equal(all.areas.includes('engineering'), true)
    const detail = await getWikiPage(root, 'eng/rpc', run)
    assert.equal(detail?.title, 'RPC boundary')
    assert.match(detail?.body ?? '', /boundary-proof/)
  } finally {
    const rel = relative(resolve(tmpdir()), root)
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) await rm(root, { recursive: true, force: true })
  }
})

test('raw browser discovers bundles through a VFS runner', async () => {
  const root = resolve(await mkdtemp(join(tmpdir(), 'dsh-oks-vfs-raw-')))
  try {
    const first = join(root, 'raw', '2026', '08', '19', 'agent-capture', 'bundle-a')
    await mkdir(first, { recursive: true })
    await writeFile(join(first, 'bundle.json'), JSON.stringify({ bundle_id: 'bundle:a', capture_id: 'capture-a', processing_status: 'complete', files: { content: 'content.md' }, sources: [{ media_type: 'text/markdown' }] }), 'utf8')
    await writeFile(join(first, 'content.md'), '# Raw A', 'utf8')
    const run = async () => JSON.stringify({
      schema_version: 'oks-fs-response/v1', operation: 'tree', uri: 'oks://raw/',
      result: { uri: 'oks://raw/', truncated: false, entries: [
        { name: '2026', type: 'directory', uri: 'oks://raw/2026/' },
        { name: '08', type: 'directory', uri: 'oks://raw/2026/08/' },
        { name: '19', type: 'directory', uri: 'oks://raw/2026/08/19/' },
        { name: 'agent-capture', type: 'directory', uri: 'oks://raw/2026/08/19/agent-capture/' },
        { name: 'bundle-a', type: 'directory', uri: 'oks://raw/2026/08/19/agent-capture/bundle-a/' },
        { name: 'bundle.json', type: 'file', uri: 'oks://raw/2026/08/19/agent-capture/bundle-a/bundle.json' },
        { name: 'content.md', type: 'file', uri: 'oks://raw/2026/08/19/agent-capture/bundle-a/content.md' },
      ] },
    })
    const all = await listRawBundles(root, {}, run)
    assert.equal(all.total, 1)
    assert.equal(all.items[0].captureId, 'capture-a')
    assert.equal(all.items[0].id, '2026/08/19/agent-capture/bundle-a')
  } finally {
    const rel = relative(resolve(tmpdir()), root)
    if (rel && !rel.startsWith('..') && !isAbsolute(rel)) await rm(root, { recursive: true, force: true })
  }
})

test('createVfsRunnerRef applies a runtime toggle immediately and caches the probe', async () => {
  let enabled = false
  let probes = 0
  const probe = async () => { probes++; return { probe: true } }
  const browserRun = createVfsRunnerRef(() => enabled, probe)

  assert.equal(await browserRun(), undefined)
  assert.equal(probes, 0, 'disabled backend must not spawn a probe')

  enabled = true            // user flips the switch at runtime (no reload)
  assert.equal(probes, 0, 'toggling on alone must not probe eagerly')
  const first = await browserRun()
  assert.equal(first?.probe, true, 'toggle must take effect on the next call')
  assert.equal(probes, 1)

  assert.equal(await browserRun(), first, 'successful probe is cached')
  assert.equal(probes, 1)

  enabled = false           // flipping off must disable immediately too
  assert.equal(await browserRun(), undefined)
})

test('a framework settings swap (setSource) flips the browser source on the next call', async () => {
  // apply() wires the live decision to settingsHooks.getCurrent(); installSettingsSection
  // swaps the live source via setSource when the resolved scope changes at runtime.
  const hooks = createDynamicSettingsHooks({ vfs_enabled: false }, () => {})
  let probes = 0
  const probe = async () => { probes++; return { probe: true } }
  const browserRun = createVfsRunnerRef(() => hooks.getCurrent().vfs_enabled === true, probe)

  assert.equal(await browserRun(), undefined)
  assert.equal(probes, 0)

  hooks.setSource(() => ({ vfs_enabled: true }))     // runtime scope replacement
  const first = await browserRun()
  assert.equal(first?.probe, true, 'switch must be live, not captured at init')
  assert.equal(probes, 1)
})