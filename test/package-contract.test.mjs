import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

test('package contract ships a portable source host entry and built client', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(packageJson.main, 'src/index.ts')
  assert.ok(packageJson.files.includes('src/**/*.ts'))
  assert.ok(packageJson.files.includes('src/**/*.tsx'))
  assert.ok(packageJson.files.includes('lib/client.js'))
  assert.ok(!packageJson.files.includes('lib/index.js'))
  assert.ok(!packageJson.files.includes('lib/client.js.map'))
  assert.ok(!packageJson.files.includes('docs/**/*.md'))
  assert.ok(!packageJson.files.includes('skills/**/*.md'))
  await access(new URL('../src/index.ts', import.meta.url))
  await access(new URL('../lib/client.js', import.meta.url))
})