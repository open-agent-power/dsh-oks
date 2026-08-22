import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import test from 'node:test'

const run = promisify(execFile)

test('built plugin entrypoint is plain Node-loadable JavaScript', async () => {
  const entry = resolve('lib/index.mjs')
  const { stderr } = await run(process.execPath, ['--check', entry], { cwd: resolve('.') })
  assert.equal(stderr, '')
})
