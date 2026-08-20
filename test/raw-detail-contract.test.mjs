import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Raw detail client contract does not consume private file-name arrays', async () => {
  const source = await readFile(new URL('../src/client/WikiBrowser.tsx', import.meta.url), 'utf8')
  const rawContract = await readFile(new URL('../src/raw-browser.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /selected\.files/)
  const detailInterface = rawContract.match(/export interface RawBundleDetail extends RawBundleSummary \{([\\s\\S]*?)\\n\}/)?.[1] ?? ''
  assert.doesNotMatch(detailInterface, /\\bfiles\\s*:/)
})
