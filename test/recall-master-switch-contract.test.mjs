import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'

test('master switch gates manual, pre-step, and post-tool recall paths', async () => {
  const source = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
  assert.match(source, /if \(!isOksRecallEnabled\(settingsHooks\.getCurrent\(\)\)\)/)
  assert.match(source, /if \(!isPrestepRecallEnabled\(activeConfig\)\) return next\(\)/)
  assert.match(source, /if \(!isOksRecallEnabled\(activeConfig\)\) return next\(\)/)
})

test('disabled master switch short-circuits the real host registrations', async () => {
  const registeredTools = []
  const hookHandlers = []
  const settings = {
    register(_namespace, _schema, { base }) {
      const value = { ...base }
      return { get: () => value, watch: () => () => {}, update: async patch => Object.assign(value, patch) }
    },
  }
  const ctx = new Context()
  ctx.provide('tools', { register: tool => registeredTools.push(tool) })
  ctx.provide('connection', { rpc: { handle() {} } })
  ctx.provide('settings', settings)
  const originalOn = ctx.on.bind(ctx)
  ctx.on = (name, handler) => {
    hookHandlers.push({ name, handler })
    return originalOn(name, handler)
  }

  apply(ctx, { recall_enabled: false })

  const recall = registeredTools.find(tool => tool.name === 'oks_recall')
  assert.ok(recall, 'oks_recall must be registered even when disabled')
  assert.equal(await recall.execute({ query: 'a sufficiently long recall query' }), 'OKS recall is disabled by the plugin setting.')

  const nextResult = { kind: 'enter', messages: [] }
  const preStep = hookHandlers.find(item => item.name === 'agent/pre-step')?.handler
  assert.ok(preStep)
  assert.deepEqual(await preStep({ messages: [{ content: [{ type: 'text', text: 'a sufficiently long recall query' }] }] }, async () => nextResult), nextResult)

  const postTool = hookHandlers.find(item => item.name === 'tools/post-execute')?.handler
  assert.ok(postTool)
  assert.deepEqual(await postTool({ name: 'read', args: { path: 'a sufficiently long file name' } }, {}, async () => nextResult), nextResult)
})
