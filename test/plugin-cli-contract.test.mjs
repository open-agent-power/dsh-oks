import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('uses execFile binary and argument vectors for OKS config CLI operations', async () => {
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
  assert.match(source, /execAsync\(oksBin\(\), \['config', 'set', 'knowledge_base_path', cfg\.knowledge_base_path\], \{ timeout: 5000 \}\)/)
  assert.match(source, /execAsync\(oksBin\(\), \['config', 'show'\], \{ encoding: 'utf-8', timeout: 5000 \}\)/)
  assert.doesNotMatch(source, /execAsync\(`\$\{oksBin\(\)\} config/)
})
