import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('..', import.meta.url)
const read = (file) => readFile(new URL(file, root), 'utf8')
const zh = (...codes) => String.fromCodePoint(...codes)

test('client UI keeps Chinese navigation and safe settings bindings', async () => {
  const [panel, browser, params, clientIndex] = await Promise.all([
    read('src/client/OksPanel.tsx'),
    read('src/client/WikiBrowser.tsx'),
    read('src/client/RecallParamsCard.tsx'),
    read('src/client/index.ts'),
  ])

  assert.ok(panel.includes(zh(30693, 35782)))
  assert.ok(panel.includes(zh(31995, 32479, 35774, 32622)))
  assert.ok(panel.includes("scope.set('prestep_enabled', next)"))
  assert.match(clientIndex, /name: 'settings\.plugin\.item', key: 'oks'/)

  assert.ok(browser.includes(zh(8592, 32, 36820, 22238, 21015, 34920)))
  assert.ok(browser.includes('onClick={() => setSelected(undefined)}'))
  assert.ok(browser.includes(zh(25105, 30340)))
  assert.ok(browser.includes(zh(20010, 25991)))
  assert.equal(browser.includes(' files'), false)
  assert.ok(browser.includes(zh(21152, 36733)))
  assert.ok(browser.includes('AI 生成候选 · 等待人工审核'))
  assert.ok(browser.includes('Wiki 是已审核知识'))
  assert.ok(browser.includes('此内容没有可预览的文本。'))
  assert.ok(browser.includes('证据包：'))

  for (const key of ['knowledge_base_path', 'recall_floor', 'recall_topn', 'prestep_floor', 'posttool_mode', 'search_backend']) {
    assert.ok(params.includes(`v.${key}`) || params.includes(`up('${key}'`) || params.includes(`String(v.${key})`))
  }
})
