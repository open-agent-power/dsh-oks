import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { access } from 'node:fs/promises'
import test from 'node:test'

test('package contract ships built host and client entries', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(packageJson.main, 'lib/index.mjs')
  assert.equal(packageJson.exports['.'].default, './lib/index.mjs')
  assert.equal(packageJson.exports['./client'].default, './lib/client.js')
  assert.equal(packageJson.engines.node, '>=22')
  assert.equal(packageJson.peerDependencies['@deepseek-ai/dsh'], '>=0.1.0-rc.8 <0.2.0-0')
  for (const name of [
    '@deepseek-ai/dsh-client-connection',
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-ui-settings-plugins',
    '@deepseek-ai/dsh-llm',
    '@deepseek-ai/dsh-settings',
    '@deepseek-ai/dsh-tools',
  ]) {
    assert.equal(packageJson.peerDependencies[name], '>=0.1.0-rc.8 <0.2.0-0', `${name} must resolve within the supported public DSH RC8+ line`)
  }
  assert.equal(packageJson.peerDependencies['dsh-better-sidebar'], '>=0.14.0 <0.16.0')
  assert.equal(packageJson.peerDependenciesMeta['dsh-better-sidebar'].optional, true)
  assert.equal(packageJson.files.includes('src/**/*.ts'), false)
  assert.equal(packageJson.files.includes('src/**/*.tsx'), false)
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
