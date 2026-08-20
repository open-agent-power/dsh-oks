/** Dedicated OKS page: knowledge browser first, advanced settings second. */
import { useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { RecallParamsCard, type OksScope } from './RecallParamsCard.tsx'
import { WikiBrowser, type OksConnectionRpc } from './WikiBrowser.tsx'

export interface OksPanelProps { scope: OksScope; rpc: OksConnectionRpc }

const T = {
  border: 'var(--dsw-alias-border-l2)', bgLayer2: 'var(--dsw-alias-bg-layer-2)',
  labelPrimary: 'var(--dsw-alias-label-primary)', labelSecondary: 'var(--dsw-alias-label-secondary)', brand: 'var(--dsw-alias-brand-primary)',
}

function KnowledgeRecallSwitch({ scope }: { scope: OksScope }): ReactNode {
  const snap = useSyncExternalStore(
    (listener: () => void) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const enabled = (snap.value?.prestep_enabled ?? true) !== false
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = async (next: boolean) => {
    if (!snap.writable || saving) return
    setSaving(true); setError('')
    try { await scope.set('prestep_enabled', next) }
    catch { setError('召回开关保存失败，请稍后重试。') }
    finally { setSaving(false) }
  }
  if (snap.status === 'unavailable') return null
  return <div style={{ margin: '0 0 12px', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.bgLayer2 }}>
    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.labelPrimary }}>回答时自动参考我的知识</div>
        <p style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.5, color: T.labelSecondary }}>当问题相关时，Agent 会优先参考已审核的 Wiki 知识。关闭后不会影响手动召回或工具调用后的记忆提示。</p>
      </div>
      <button type="button" role="switch" aria-checked={enabled} disabled={!snap.writable || saving || snap.status === 'loading'} onClick={() => void update(!enabled)} style={{ flex: '0 0 auto', minWidth: 56, border: 0, borderRadius: 999, padding: '7px 10px', background: enabled ? T.brand : T.border, color: '#fff', cursor: snap.writable && !saving ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 600 }}>
        {saving ? '保存中…' : enabled ? '开启' : '关闭'}
      </button>
    </div>
    {error ? <div style={{ marginTop: 6, fontSize: 11, color: T.labelSecondary }}>{error}</div> : null}
  </div>
}

export function OksPanel({ scope, rpc }: OksPanelProps): ReactNode {
  const [tab, setTab] = useState<'library' | 'settings'>('library')
  const tabStyle = (active: boolean): CSSProperties => ({
    border: 0, borderBottom: active ? `2px solid ${T.brand}` : '2px solid transparent',
    padding: '10px 2px 8px', marginRight: 18, background: 'transparent', color: active ? T.labelPrimary : T.labelSecondary,
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 500,
  })
  return <div>
    <div style={{ marginBottom: 12, borderBottom: `1px solid ${T.border}`, background: T.bgLayer2, padding: '0 12px' }}>
      <button type="button" onClick={() => setTab('library')} style={tabStyle(tab === 'library')}>知识库</button>
      <button type="button" onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}>系统设置</button>
    </div>
    {tab === 'library' ? <><KnowledgeRecallSwitch scope={scope} /><WikiBrowser rpc={rpc} onOpenSettings={() => setTab('settings')} /></> : <RecallParamsCard scope={scope} />}
  </div>
}
