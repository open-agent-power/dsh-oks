/**
 * OKS settings card — browser half component.
 *
 * Owns its own chrome (the bundle-purity gate forbids importing the section's
 * PluginCard). Reads through scope.getSnapshot() (status field, not available),
 * subscribes for changes, and writes one field per change via scope.set.
 * oks reads settings/recall.yaml at call time, so the next recall honors the
 * new value without restart.
 */
import { useState, useEffect, useSyncExternalStore, type ReactNode } from 'react'

export interface OksScope {
  getSnapshot: () => {
    status: 'loading' | 'ready' | 'unavailable'
    value?: {
      recall_floor?: number
      recall_topn?: number
      posttool_mode?: string
      search_backend?: string
    }
    writable: boolean
  }
  subscribe: (listener: () => void) => () => void
  set: (field: string, value: unknown) => Promise<void>
}

export interface RecallParamsCardProps {
  scope: OksScope
  t?: (key: string) => string
  children?: ReactNode
}

const FALLBACK = { recall_floor: 0.7, recall_topn: 3, posttool_mode: 'signal', search_backend: 'native' }

export function RecallParamsCard(props: RecallParamsCardProps): ReactNode {
  const { scope } = props
  // useSyncExternalStore: the dsh scope is an external store (getSnapshot + subscribe).
  const snap = useSyncExternalStore(scope.subscribe, scope.getSnapshot, scope.getSnapshot)
  const [saved, setSaved] = useState(false)

  if (snap.status === 'loading') return <p style={{ padding: '0.5rem 0', color: '#888' }}>加载 OKS 配置中…</p>
  if (snap.status === 'unavailable') return null
  const value = { ...FALLBACK, ...snap.value }

  const update = (field: string, v: unknown) => {
    void scope.set(field, v).then(() => {
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  const t = props.t ?? ((k: string) => k)

  return (
    <section style={{ borderBottom: '1px solid var(--dsw-border, #ddd)', padding: '0.75rem 0' }}>
      <header style={{ marginBottom: '0.5rem' }}>
        <strong style={{ fontSize: '0.95rem' }}>{t('oksTitle') || 'OKS recall 参数'}</strong>
        <p style={{ margin: 0, color: 'var(--dsw-muted, #888)', fontSize: '0.8rem' }}>
          {t('oksDescription') || 'settings/recall.yaml 唯一真源 → git 同步 → 走到哪带到哪'}
        </p>
      </header>

      {!snap.writable ? (
        <p role="status" style={{ color: 'var(--dsw-muted, #888)' }}>{t('readOnly') || '只读'}</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.8rem' }}>recall.floor（召回阈值）</span>
            <input
              type="number" step="0.05" min="0" max="1"
              value={value.recall_floor ?? 0.7}
              onChange={(e) => update('recall_floor', parseFloat(e.target.value))}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.8rem' }}>recall.topn（注入最多 N 条）</span>
            <input
              type="number" step="1" min="1" max="10"
              value={value.recall_topn ?? 3}
              onChange={(e) => update('recall_topn', parseInt(e.target.value, 10))}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.8rem' }}>posttool.mode</span>
            <select
              value={value.posttool_mode ?? 'signal'}
              onChange={(e) => update('posttool_mode', e.target.value)}
            >
              <option value="signal">signal（只 slug+rel）</option>
              <option value="full">full（注入 body）</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontSize: '0.8rem' }}>search_backend</span>
            <select
              value={value.search_backend ?? 'native'}
              onChange={(e) => update('search_backend', e.target.value)}
            >
              <option value="native">native（6+1 因子）</option>
              <option value="fts5">fts5（SQLite FTS5）</option>
              <option value="fusion">fusion（native + fts5）</option>
            </select>
          </label>

          {saved ? <span style={{ color: 'var(--dsw-success, #080)', fontSize: '0.75rem' }}>✓ 已保存</span> : null}
        </div>
      )}
    </section>
  )
}
