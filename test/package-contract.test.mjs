import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import test from 'node:test'

test('package contract ships built host and client entries', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(packageJson.main, 'lib/index.mjs')
  assert.equal(packageJson.exports['.'].default, './lib/index.mjs')
  assert.ok(packageJson.files.includes('src/**/*.ts'))
  assert.ok(packageJson.files.includes('src/**/*.tsx'))
  assert.ok(packageJson.files.includes('lib/client.js'))
  assert.ok(packageJson.files.includes('lib/index.mjs'))
  assert.ok(packageJson.files.includes('SKILL.md'))
  assert.ok(packageJson.files.includes('skills/oks-case-init/SKILL.md'))
  assert.ok(!packageJson.files.includes('lib/client.js.map'))
  assert.ok(!packageJson.files.includes('docs/**/*.md'))
  assert.ok(!packageJson.files.includes('skills/**/*.md'))
  assert.ok(!packageJson.files.includes('lib/index.js'))
  await access(new URL('../src/index.ts', import.meta.url))
  await access(new URL('../src/client/WikiBrowser.tsx', import.meta.url))
  await access(new URL('../lib/client.js', import.meta.url))
  await access(new URL('../lib/index.mjs', import.meta.url))
})
