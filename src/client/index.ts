/**
 * dsh-oks browser half.
 *
 * The standard Plugins card remains the compatibility entry for advanced
 * configuration. The dedicated sidebar entry is now a small product page:
 * read-only Wiki browser first, system settings second.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: declares the ctx.slots + ctx.settingsScope Context merges.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { RecallParamsCard, type OksScope } from './RecallParamsCard.tsx'
import { OksPanel } from './OksPanel.tsx'

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  const scope: OksScope = ctx.settingsScope.bind({ namespace: 'oks' })
  const settingsCard = (props: unknown) =>
    RecallParamsCard({ scope, ...(props as Record<string, unknown>) })
  const panel = (props: unknown) =>
    OksPanel({ scope, rpc: ctx.connection.rpc, ...(props as Record<string, unknown>) })

  // 1. Compatibility card under Settings → Plugins.
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    { name: 'settings.plugin.item', id: 'oks', label: () => 'OKS', inject: () => ({}) },
    settingsCard,
  ))

  // 2. Dedicated OKS sidebar page: defaults to the simple knowledge browser.
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'oks', order: 20, label: () => 'OKS', inject: () => ({}) },
    panel,
  ))
}
