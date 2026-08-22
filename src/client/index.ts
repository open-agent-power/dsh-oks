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
// Type-only: declares the additive frame-wide shell.overlay slot.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { RecallParamsCard, type OksScope } from './RecallParamsCard.tsx'
import { OksGlobalSurface, OksPanel, OksSidebarTab } from './OksPanel.tsx'
import type { OksConnectionRpc } from './rpc.ts'

export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope', 'betterSidebar']

interface BetterSidebarLike {
  registerTab(descriptor: {
    id: string
    title: string
    icon?: string
    order?: number
    single?: boolean
    component: (props: unknown) => unknown
  }): () => void
  openTab(seed: { type: string; title?: string; path?: string }): void
}

function createHttpRpc(): OksConnectionRpc {
  return {
    async call(channel, endpoint, payload, signal) {
      const rpcId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      const response = await fetch(`${channel}/${endpoint}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload }),
        signal,
      })
      if (!response.ok) throw new Error(`OKS 请求失败：HTTP ${response.status}`)
      const result = await response.json() as { rpcId?: string; result?: unknown }
      if (result.rpcId !== rpcId) throw new Error('OKS 请求响应标识不匹配')
      return result.result as Awaited<ReturnType<OksConnectionRpc['call']>>
    },
  }
}

function getOksRpc(ctx: ClientContext): OksConnectionRpc {
  const candidate = ctx.connection.rpc as unknown as Partial<OksConnectionRpc> | null | undefined
  return candidate && typeof candidate.call === 'function' ? candidate as OksConnectionRpc : createHttpRpc()
}

export function apply(ctx: ClientContext): void {
  const scope: OksScope = ctx.settingsScope.bind({ namespace: 'oks' })
  const rpc = getOksRpc(ctx)
  const betterSidebar = (ctx as unknown as { betterSidebar?: BetterSidebarLike }).betterSidebar
  const openSidebar = () => {
    if (!betterSidebar || typeof betterSidebar.openTab !== 'function') return false
    // The host expands the right workbench for content opens. A private
    // virtual path gives this non-file tab the same focus/expand semantics
    // without making the host interpret or fetch a real file.
    betterSidebar.openTab({ type: 'oks:context', title: 'OKS 上下文', path: 'oks://context' })
    return true
  }
  ctx.effect(() => {
    if (!betterSidebar || typeof betterSidebar.registerTab !== 'function') return undefined
    return betterSidebar.registerTab({
      id: 'oks:context',
      title: 'OKS',
      icon: '◌',
      order: 45,
      single: true,
      component: () => OksSidebarTab({ scope, rpc }),
    })
  }, 'dsh-oks: better-sidebar tab')
  const settingsCard = (props: unknown) =>
    RecallParamsCard({ scope, ...(props as Record<string, unknown>) })
  const panel = (props: unknown) =>
    OksPanel({ ...(props as Record<string, unknown>), scope, rpc, openSidebar })
  const globalSurface = (props: unknown) =>
    OksGlobalSurface({ ...(props as Record<string, unknown>), scope, rpc, openSidebar })

  // 1. Compatibility card under Settings → Plugins.
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    // settings.plugin.item is a keyed slot dispatched on `options.key`
    // (tab-store.ts reads entry.options.key; ConfigurablePluginsTab
    // renderSlot(..., { entryKey: ns })). Using `id` here leaves options.key
    // undefined, so the card never reaches the Plugins tab.
    { name: 'settings.plugin.item', key: 'oks', inject: () => ({}) },
    settingsCard,
  ))

  // 2. Dedicated OKS sidebar page: defaults to the simple knowledge browser.
  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'oks', order: 20, label: () => 'OKS', inject: () => ({}) },
    panel,
  ))

  // 3. Additive global entry: the host shell keeps ownership of all columns;
  // the OKS surface only contributes a click-through button/drawer overlay.
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'oks-global', order: 40, inject: () => ({}) },
    globalSurface,
  ))
}
