import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('browser entry remains namespaced and removable without host DOM coupling', async () => {
  const source = await readFile(new URL('../src/client/index.ts', import.meta.url), 'utf8')
  assert.match(source, /settings\.plugin\.item/)
  assert.match(source, /settings\.section/)
  assert.match(source, /namespace: 'oks'/)
  assert.doesNotMatch(source, /document\.(querySelector|getElementById|body)/)
  assert.doesNotMatch(source, /window\.(location|history)\./)
})

test('host activity surface is bounded and does not expose raw prompt paths', async () => {
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
  assert.match(source, /endpoint === 'activity'/)
  assert.match(source, /events\.length = 50/)
  assert.match(source, /replace\(\/\[\\r\\n\]\+\/g, ' '\)/)
  assert.match(source, /safeTraceLabel/)
  assert.doesNotMatch(source, /traces\[0\]/)
  assert.match(source, /updateTrace\(traceId/)
  assert.doesNotMatch(source, /return \{ ok: true, value: .*messages/)
})
