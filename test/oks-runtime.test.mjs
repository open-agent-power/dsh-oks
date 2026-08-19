import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveOksBin } from '../src/oks-runtime.ts'

test('resolves an explicit OKS_BIN override first', () => {
  assert.equal(resolveOksBin({ OKS_BIN: 'C:\\custom\\oks.exe' }, 'win32', 'C:\\Users\\tester', () => false), 'C:\\custom\\oks.exe')
})

test('resolves the standard Windows per-user OKS shim without PATH', () => {
  const home = 'C:\\Users\\tester'
  const resolved = resolveOksBin({}, 'win32', home, candidate => candidate.endsWith('\\.local\\bin\\oks.exe'))
  assert.equal(resolved, 'C:\\Users\\tester\\.local\\bin\\oks.exe')
})

test('falls back to PATH when the Windows shim is absent', () => {
  assert.equal(resolveOksBin({}, 'win32', 'C:\\Users\\tester', () => false), 'oks')
})

test('keeps PATH lookup fallback for non-Windows installs', () => {
  assert.equal(resolveOksBin({}, 'linux', '/home/tester', () => false), 'oks')
})