import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('cloud deployment skill is executable and keeps the review boundary', async () => {
  const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8')
  for (const command of [
    'pipx install open-knowledge-studio --force',
    'oks init <knowledge-base-path>',
    'oks skills-install',
    'oks status',
    'oks recall',
    'dsh plugin --profile web add github:open-agent-power/dsh-oks#<commit-or-tag>',
    'pnpm run build',
  ]) assert.match(skill, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(skill, /Never promote a draft automatically/)
  assert.match(skill, /human review/)
  assert.match(skill, /lib\/index\.mjs/)
  assert.match(skill, /lib\/client\.js/)
  assert.doesNotMatch(skill, /D:\\|C:\\Users\\|127\.0\.0\.1/)
})

test('case skill points agents to the cloud deployment contract', async () => {
  const skill = await readFile(new URL('../skills/oks-case-init/SKILL.md', import.meta.url), 'utf8')
  assert.match(skill, /repository-root `SKILL\.md`/)
  assert.match(skill, /human review/)
  assert.match(skill, /partial.*failed.*skipped/s)
  assert.match(skill, /remote processing `ask`-by-default/s)
})
