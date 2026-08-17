/**
 * dsh-oks browser half — registers the OKS settings card + a dedicated
 * sidebar section.
 *
 * Pairs with the Host half (src/index.ts) via the `oks` namespace. Two
 * registrations:
 * 1. `settings.plugin.item` keyed 'oks' — card under the Plugins tab (standard)
 * 2. `settings.section` id 'oks' — dedicated sidebar entry (like Models/General)
 *
 * The bundle is the loader's lazy-CJS factory artifact (see tsdown.config.ts).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: declares the ctx.slots + ctx.settingsScope Context merges.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { RecallParamsCard, type OksScope } from './RecallParamsCard.tsx'

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  const scope: OksScope = ctx.settingsScope.bind({ namespace: 'oks' })
  const render = (props: unknown) =>
    RecallParamsCard({ scope, ...(props as Record<string, unknown>) })

  // 1. Card under the Plugins tab (keyed by namespace — standard path).
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    { name: 'settings.plugin.item', key: 'oks', locale: 'settings.oks', inject: () => ({}) },
    render,
  ))

  // 2. Dedicated sidebar section (id 'oks', order 20 — after models=10, plugins=15).
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'oks', order: 20, label: () => 'OKS', inject: () => ({}) },
    render,
  ))
}
