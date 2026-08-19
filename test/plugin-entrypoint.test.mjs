import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import test from 'node:test'

const run = promisify(execFile)

test('plugin entrypoint can be parsed and imported by Node TypeScript stripping', async () => {
  const entryUrl = pathToFileURL(resolve('src/index.ts')).href
  const script = `import(${JSON.stringify(entryUrl)}).then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1) })`
  const { stderr } = await run(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], { cwd: resolve('.') })
  assert.equal(stderr, '')
})
