import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { apply, mergeRecallResults, parseRecallJson } from '../src/index.ts'

test('multi-query merge preserves partial and total failure counts', () => {
  const partial = mergeRecallResults([
    { status: 'fulfilled', value: { knowledge: [{ slug: 'one' }, { slug: 'one' }], episodic: [] } },
    { status: 'rejected', reason: new Error('OKS unavailable') },
  ])
  assert.deepEqual(partial.knowledge, [{ slug: 'one' }])
  assert.equal(partial.succeeded, 1)
  assert.equal(partial.failed, 1)

  const failed = mergeRecallResults([
    { status: 'rejected', reason: new Error('first') },
    { status: 'rejected', reason: new Error('second') },
  ])
  assert.deepEqual(failed.knowledge, [])
  assert.deepEqual(failed.episodic, [])
  assert.equal(failed.succeeded, 0)
  assert.equal(failed.failed, 2)
})

test('multi-query parser rejects malformed output instead of creating empty success', () => {
  assert.deepEqual(parseRecallJson(JSON.stringify({ knowledge: [], episodic: [] })), { knowledge: [], episodic: [] })
  assert.throws(() => parseRecallJson('{}'), /no result arrays/)
  assert.throws(() => parseRecallJson(JSON.stringify({ knowledge: ['not a candidate'], episodic: [] })), /invalid candidates/)
})

test('oks_recall reports total failure and preserves partial multi-query results', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-oks-recall-cli-'))
  const helper = join(root, 'fake-oks.cjs')
  const previousBin = process.env.OKS_BIN
  const previousNodeOptions = process.env.NODE_OPTIONS
  await writeFile(helper, [
    "const query = process.argv[2] || ''",
    "if (query.includes('fail')) process.exit(7)",
    "console.log(JSON.stringify({ knowledge: [{ slug: query }], episodic: [] }))",
    'process.exit(0)',
  ].join('\n'), 'utf8')
  process.env.OKS_BIN = process.execPath
  process.env.NODE_OPTIONS = `${previousNodeOptions ? `${previousNodeOptions} ` : ''}--require=${helper}`
  try {
    const registeredTools = []
    const ctx = new Context()
    ctx.provide('tools', { register: tool => registeredTools.push(tool) })
    ctx.provide('connection', { rpc: { handle() {} } })
    ctx.provide('settings', { register(_namespace, _schema, { base }) { return { get: () => base, watch: () => () => {}, update: async () => {} } } })
    apply(ctx)
    const recall = registeredTools.find(tool => tool.name === 'oks_recall')
    assert.ok(recall)

    await assert.rejects(() => recall.execute({ query: 'all-fail', queries: ['also-fail'] }), /failed for all queries/)
    const output = JSON.parse(await recall.execute({ query: 'good', queries: ['partial-fail'] }))
    assert.deepEqual(output.knowledge, [{ slug: 'good' }])
  } finally {
    if (previousBin === undefined) delete process.env.OKS_BIN
    else process.env.OKS_BIN = previousBin
    if (previousNodeOptions === undefined) delete process.env.NODE_OPTIONS
    else process.env.NODE_OPTIONS = previousNodeOptions
    await rm(root, { recursive: true, force: true })
  }
})
