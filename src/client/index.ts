/**
 * dsh-oks browser half — registers the OKS settings card.
 *
 * Pairs with the Host half (src/index.ts) via the `oks` namespace. The card
 * owns its own chrome and reads/writes through `ctx.settingsScope`, which the
 * Plugin Configuration tab dispatches one slot key per served namespace.
 *
 * The bundle is the loader's lazy-CJS factory artifact (see tsdown.config.ts);
 * cross-plugin collaboration goes through cordis services, never a value
 * import (the client bundle-purity gate rejects those).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: declares the ctx.slots + ctx.settingsScope Context merges.
// A value import fails the client bundle-purity gate.
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { RecallParamsCard } from './RecallParamsCard.tsx'

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  // Bind a scope to our namespace — the card reads/writes through it.
  const scope = ctx.settingsScope.bind({ namespace: 'oks' })

  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    {
      name: 'settings.plugin.item',
      key: 'oks',
      locale: 'settings.oks',
      inject: () => ({}),
    },
    (props: unknown) => RecallParamsCard({ scope, ...(props as Record<string, unknown>) }),
  ))
}
