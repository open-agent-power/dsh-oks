/** Compact OKS launcher with an opt-in knowledge workspace. */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { RecallParamsCard, type OksScope } from './RecallParamsCard.tsx'
import { WikiBrowser } from './WikiBrowser.tsx'
import { callOksRpc, type OksConnectionRpc } from './rpc.ts'

export interface OksPanelProps { scope: OksScope; rpc: OksConnectionRpc; openSidebar?: () => boolean }

export type WorkspaceView = 'overview' | 'knowledge' | 'trace' | 'activity' | 'settings'
interface ActivityEvent { id: string; at: string; kind: string; label: string; detail: string; status: 'ok' | 'info' | 'error' }
interface ActivityList { items: ActivityEvent[]; truncated: boolean }
interface RecallTrace { id: string; at: string; phase: string; status: 'ok' | 'info' | 'empty' | 'error'; candidateCount: number; matches: string[]; topRelevance?: number; threshold?: number }
interface RecallTraceList { items: RecallTrace[]; truncated: boolean }
interface OverviewSummary { wikiCount: number; draftCount: number; rawFileCount: number; rawBundleCount: number; truncated?: boolean }

interface OksSurfaceState { open: boolean; view: Exclude<WorkspaceView, 'settings'> }
interface LauncherPosition { top: number; right: number }
interface LauncherDrag { pointerId: number; startX: number; startY: number; startTop: number; startRight: number; moved: boolean }

const launcherPositionKey = 'dsh-oks.launcher-position.v1'
const defaultLauncherPosition: LauncherPosition = { top: 72, right: 18 }

function readLauncherPosition(): LauncherPosition {
  if (typeof window === 'undefined') return defaultLauncherPosition
  try {
    const raw = window.localStorage.getItem(launcherPositionKey)
    if (!raw) return defaultLauncherPosition
    const parsed = JSON.parse(raw) as Partial<LauncherPosition>
    if (typeof parsed.top !== 'number' || typeof parsed.right !== 'number') return defaultLauncherPosition
    return { top: Math.max(12, parsed.top), right: Math.max(12, parsed.right) }
  } catch { return defaultLauncherPosition }
}

function writeLauncherPosition(position: LauncherPosition): void {
  try { window.localStorage.setItem(launcherPositionKey, JSON.stringify(position)) } catch { /* storage is optional */ }
}
const surfaceListeners = new Set<() => void>()
let surfaceState: OksSurfaceState = { open: false, view: 'overview' }

export function openOksSurface(view: Exclude<WorkspaceView, 'settings'> = 'overview'): void {
  surfaceState = { open: true, view }
  surfaceListeners.forEach(listener => listener())
}

export function closeOksSurface(): void {
  if (!surfaceState.open) return
  surfaceState = { ...surfaceState, open: false }
  surfaceListeners.forEach(listener => listener())
}

const oksSurfaceStore = {
  subscribe(listener: () => void) { surfaceListeners.add(listener); return () => surfaceListeners.delete(listener) },
  getSnapshot() { return surfaceState },
}

const T = {
  border: 'var(--dsw-alias-border-l2)', borderSoft: 'var(--dsw-alias-border-l1)',
  bgBase: 'var(--dsw-alias-bg-base)', bgLayer1: 'var(--dsw-alias-bg-layer-1)', bgLayer2: 'var(--dsw-alias-bg-layer-2)', bgLayer3: 'var(--dsw-alias-bg-layer-3)',
  labelPrimary: 'var(--dsw-alias-label-primary)', labelSecondary: 'var(--dsw-alias-label-secondary)',
  brand: 'var(--dsw-alias-brand-primary)', brandSoft: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent)',
  brandBorder: 'color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, var(--dsw-alias-border-l2))',
  success: '#16a36b', warning: '#b9852f', danger: '#b54747', shadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
}

const navButton = (active: boolean): CSSProperties => ({
  display: 'flex', width: '100%', alignItems: 'center', gap: 9, border: 0,
  borderLeft: active ? `3px solid ${T.brand}` : '3px solid transparent', borderRadius: 7,
  padding: '9px 10px', background: active ? T.bgLayer2 : 'transparent',
  color: active ? T.labelPrimary : T.labelSecondary, cursor: 'pointer', fontSize: 13,
  fontWeight: active ? 600 : 500, textAlign: 'left',
})

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

function asActivityList(value: unknown): ActivityList {
  if (!value || typeof value !== 'object') return { items: [], truncated: false }
  const data = value as Partial<ActivityList>
  return { items: Array.isArray(data.items) ? data.items as ActivityEvent[] : [], truncated: data.truncated === true }
}

function ActivityPanel({ rpc, compact = false }: { rpc: OksConnectionRpc; compact?: boolean }): ReactNode {
  const [data, setData] = useState<ActivityList>({ items: [], truncated: false })
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const load = () => {
      setLoading(true)
      void callOksRpc(rpc, '/oks', 'activity', { limit: compact ? 5 : 12 }, controller.signal)
        .then(result => { if (!controller.signal.aborted && result.ok) setData(asActivityList(result.value)) })
        .catch(() => undefined)
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [compact, rpc])
  const items = data.items
  return <section aria-label="活动时间线" style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.bgLayer3, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '11px 12px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ color: T.labelPrimary, fontSize: 13, fontWeight: 600 }}>活动时间线</div>
      <span style={{ color: T.labelSecondary, fontSize: 11 }}>{loading ? '同步中…' : '当前进程'}</span>
    </div>
    {items.length === 0 ? <p style={{ margin: 0, padding: 12, color: T.labelSecondary, fontSize: 12, lineHeight: 1.5 }}>暂无活动记录。开始一次召回或打开知识条目后，这里会显示真实的 OKS/Host 事件。</p> : <div>
      {items.map(item => <div key={item.id} style={{ padding: '11px 12px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <strong style={{ color: item.status === 'error' ? '#b54747' : T.labelPrimary, fontSize: 12 }}>{item.label}</strong>
          <time style={{ color: T.labelSecondary, fontSize: 11 }}>{new Date(item.at).toLocaleTimeString()}</time>
        </div>
        <div style={{ marginTop: 4, color: T.labelSecondary, fontSize: 11, lineHeight: 1.45 }}>{item.detail}</div>
      </div>)}
      {data.truncated ? <div style={{ padding: '8px 12px', color: T.labelSecondary, fontSize: 11 }}>仅显示最近的有界记录。</div> : null}
    </div>}
  </section>
}

function asTraceList(value: unknown): RecallTraceList {
  if (!value || typeof value !== 'object') return { items: [], truncated: false }
  const data = value as Partial<RecallTraceList>
  return { items: Array.isArray(data.items) ? data.items as RecallTrace[] : [], truncated: data.truncated === true }
}

function RecallTracePanel({ rpc, compact = false }: { rpc: OksConnectionRpc; compact?: boolean }): ReactNode {
  const [data, setData] = useState<RecallTraceList>({ items: [], truncated: false })
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    const load = () => {
      setLoading(true)
      void callOksRpc(rpc, '/oks', 'recall-trace', { limit: compact ? 5 : 12 }, controller.signal)
        .then(result => { if (!controller.signal.aborted && result.ok) setData(asTraceList(result.value)) })
        .catch(() => undefined)
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [rpc])
  return <section aria-label="召回轨迹" style={{ border: `1px solid ${T.border}`, borderRadius: 10, background: T.bgLayer3, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '11px 12px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ color: T.labelPrimary, fontSize: 13, fontWeight: 600 }}>召回轨迹</div>
      <span style={{ color: T.labelSecondary, fontSize: 11 }}>{loading ? '同步中…' : compact ? '最近 5 条' : '仅显示摘要'}</span>
    </div>
    {data.items.length === 0 ? <p style={{ margin: 0, padding: 12, color: T.labelSecondary, fontSize: 12, lineHeight: 1.5 }}>暂无召回记录。下一次自动召回、工具召回或工具后提示会出现在这里。</p> : <div>
      {data.items.map(item => <div key={item.id} style={{ padding: '11px 12px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <strong style={{ color: item.status === 'error' ? '#b54747' : T.labelPrimary, fontSize: 12 }}>{item.phase} · {item.status}</strong>
          <time style={{ color: T.labelSecondary, fontSize: 11 }}>{new Date(item.at).toLocaleTimeString()}</time>
        </div>
        <div style={{ marginTop: 4, color: T.labelSecondary, fontSize: 11, lineHeight: 1.45 }}>
          候选 {item.candidateCount} 个{typeof item.threshold === 'number' ? ` · 阈值 ${item.threshold}` : ''}{typeof item.topRelevance === 'number' ? ` · 最高相关度 ${item.topRelevance.toFixed(2)}` : ''}
        </div>
        {item.matches.length ? <div style={{ marginTop: 4, color: T.labelSecondary, fontSize: 11, lineHeight: 1.45 }}>命中：{item.matches.join('、')}</div> : null}
      </div>)}
      {data.truncated ? <div style={{ padding: '8px 12px', color: T.labelSecondary, fontSize: 11 }}>仅显示最近的有界记录。</div> : null}
    </div>}
  </section>
}

function asOverview(value: unknown): OverviewSummary {
  if (!value || typeof value !== 'object') return { wikiCount: 0, draftCount: 0, rawFileCount: 0, rawBundleCount: 0 }
  const data = value as Partial<OverviewSummary>
  return {
    wikiCount: typeof data.wikiCount === 'number' ? data.wikiCount : 0,
    draftCount: typeof data.draftCount === 'number' ? data.draftCount : 0,
    rawFileCount: typeof data.rawFileCount === 'number' ? data.rawFileCount : 0,
    rawBundleCount: typeof data.rawBundleCount === 'number' ? data.rawBundleCount : 0,
    truncated: data.truncated === true,
  }
}

function WorkspaceOverview({ scope, rpc, onOpen, openSidebar }: { scope: OksScope; rpc: OksConnectionRpc; onOpen: (view: WorkspaceView) => void; openSidebar?: () => boolean }): ReactNode {
  const [summary, setSummary] = useState<OverviewSummary>({ wikiCount: 0, draftCount: 0, rawFileCount: 0, rawBundleCount: 0 })
  useEffect(() => {
    const controller = new AbortController()
    void callOksRpc(rpc, '/oks', 'overview', {}, controller.signal).then(result => {
      if (!controller.signal.aborted && result.ok) setSummary(asOverview(result.value))
    }).catch(() => undefined)
    return () => controller.abort()
  }, [rpc])
  return <div>
    <div style={{ marginBottom: 12, padding: '14px 16px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.bgLayer3 }}>
      <div style={{ color: T.labelPrimary, fontSize: 18, fontWeight: 650 }}>OKS 上下文工作区</div>
      <p style={{ margin: '6px 0 0', color: T.labelSecondary, fontSize: 12, lineHeight: 1.55 }}>集中查看知识生命周期、召回活动和设置。工作区只在你需要时展开，不改变 DSH 原有聊天体验。</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={() => { if (!openSidebar?.()) openOksSurface('overview') }} style={{ border: `1px solid ${T.brandBorder}`, borderRadius: 7, padding: '7px 10px', background: T.brandSoft, color: T.brand, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>在侧边栏打开</button>
        <button type="button" onClick={() => onOpen('knowledge')} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12 }}>浏览知识库</button>
        <button type="button" onClick={() => onOpen('activity')} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12 }}>查看活动</button>
        <button type="button" onClick={() => onOpen('settings')} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '7px 10px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12 }}>打开设置</button>
      </div>
    </div>
    <div aria-label="知识库摘要" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8, marginBottom: 12 }}>
      {[['Wiki', summary.wikiCount], ['草稿', summary.draftCount], ['Raw 文件', summary.rawFileCount], ['Raw 包', summary.rawBundleCount]].map(([label, count]) => <div key={String(label)} style={{ padding: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 9, background: T.bgLayer3 }}><div style={{ color: T.labelSecondary, fontSize: 11 }}>{label}</div><strong style={{ display: 'block', marginTop: 4, color: T.labelPrimary, fontSize: 18 }}>{count}</strong></div>)}
    </div>
    {summary.truncated ? <div style={{ marginBottom: 12, color: T.labelSecondary, fontSize: 11 }}>统计已达到扫描上限，进入知识库查看完整列表。</div> : null}
    <WikiBrowser rpc={rpc} onOpenSettings={() => onOpen('settings')} />
  </div>
}

function SurfaceTab({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }): ReactNode {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} style={{
    flex: '1 1 0', minWidth: 0, border: 0, borderBottom: `2px solid ${active ? T.brand : 'transparent'}`,
    padding: '10px 6px 9px', background: 'transparent', color: active ? T.labelPrimary : T.labelSecondary,
    cursor: 'pointer', fontSize: 12, fontWeight: active ? 650 : 500, whiteSpace: 'nowrap',
  }}>{children}</button>
}

function CompactOverview({ scope, rpc, onView }: { scope: OksScope; rpc: OksConnectionRpc; onView: (view: Exclude<WorkspaceView, 'settings'>) => void }): ReactNode {
  const snap = useSyncExternalStore(
    (listener: () => void) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const [summary, setSummary] = useState<OverviewSummary>({ wikiCount: 0, draftCount: 0, rawFileCount: 0, rawBundleCount: 0 })
  useEffect(() => {
    const controller = new AbortController()
    void callOksRpc(rpc, '/oks', 'overview', {}, controller.signal).then(result => {
      if (!controller.signal.aborted && result.ok) setSummary(asOverview(result.value))
    }).catch(() => undefined)
    return () => controller.abort()
  }, [rpc])
  const connected = snap.status === 'ready'
  const stats = [['Wiki', summary.wikiCount], ['草稿', summary.draftCount], ['Raw 文件', summary.rawFileCount], ['Raw 包', summary.rawBundleCount]] as const
  const metricMeta: Record<string, { glyph: string; tint: string }> = {
    Wiki: { glyph: 'W', tint: T.brand },
    草稿: { glyph: 'D', tint: T.warning },
    'Raw 文件': { glyph: 'R', tint: T.success },
    'Raw 包': { glyph: 'B', tint: '#8068c7' },
  }
  return <div>
    <div style={{ marginBottom: 14, padding: '16px 15px 15px', border: `1px solid ${T.brandBorder}`, borderRadius: 14, background: T.bgLayer1, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
      <div style={{ color: T.brand, fontSize: 10, letterSpacing: '0.12em', fontWeight: 700 }}>OPEN KNOWLEDGE STUDIO</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8 }}>
        <strong style={{ color: T.labelPrimary, fontSize: 18, letterSpacing: '-0.02em' }}>上下文概览</strong>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${connected ? 'color-mix(in srgb, #16a36b 30%, transparent)' : T.border}`, borderRadius: 999, padding: '4px 8px', background: connected ? 'color-mix(in srgb, #16a36b 8%, transparent)' : T.bgLayer2, color: connected ? T.success : T.labelSecondary, fontSize: 11, fontWeight: 600 }}><span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? T.success : T.warning }} />{connected ? '已连接' : snap.status === 'loading' ? '加载中' : '需检查'}</span>
      </div>
      <p style={{ margin: '7px 0 0', color: T.labelSecondary, fontSize: 12, lineHeight: 1.55 }}>把知识、召回和活动收拢到当前对话旁边。</p>
      <div style={{ display: 'flex', gap: 7, marginTop: 13 }}>
        <button type="button" onClick={() => onView('knowledge')} style={{ border: `1px solid ${T.brandBorder}`, borderRadius: 7, padding: '7px 10px', background: T.brandSoft, color: T.brand, cursor: 'pointer', fontSize: 12, fontWeight: 650 }}>浏览知识库</button>
        <button type="button" onClick={() => onView('trace')} style={{ border: `1px solid ${T.borderSoft}`, borderRadius: 7, padding: '7px 10px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12 }}>看召回</button>
      </div>
    </div>
    <KnowledgeRecallSwitch scope={scope} />
    <div aria-label="知识库摘要" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 14 }}>
      {stats.map(([label, count]) => <div key={label} style={{ position: 'relative', minWidth: 0, padding: '11px 12px 10px 15px', border: `1px solid ${T.borderSoft}`, borderRadius: 10, background: T.bgLayer2, overflow: 'hidden' }}><span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: metricMeta[label].tint }} /><div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.labelSecondary, fontSize: 11 }}><span aria-hidden="true" style={{ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, borderRadius: 6, background: `color-mix(in srgb, ${metricMeta[label].tint} 12%, transparent)`, color: metricMeta[label].tint, fontSize: 10, fontWeight: 700 }}>{metricMeta[label].glyph}</span>{label}</div><strong style={{ display: 'block', marginTop: 6, color: T.labelPrimary, fontSize: 20, letterSpacing: '-0.03em' }}>{count}</strong></div>)}
    </div>
    {summary.truncated ? <div style={{ marginBottom: 12, padding: '8px 10px', borderRadius: 8, background: T.bgLayer2, color: T.labelSecondary, fontSize: 11 }}>统计已达到扫描上限，进入知识库查看完整列表。</div> : null}
    <div style={{ display: 'grid', gap: 10 }}>
      <RecallTracePanel rpc compact />
      <ActivityPanel rpc compact />
    </div>
    <button type="button" onClick={() => onView('knowledge')} style={{ width: '100%', marginTop: 12, border: `1px solid ${T.border}`, borderRadius: 9, padding: '9px 12px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>进入完整知识库</button>
  </div>
}

function SidebarTab({ scope, rpc }: OksPanelProps): ReactNode {
  const [view, setView] = useState<Exclude<WorkspaceView, 'settings'>>('overview')
  const snap = useSyncExternalStore(
    (listener: () => void) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const connected = snap.status === 'ready'
  return <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: T.bgBase, color: T.labelPrimary }}>
    <header style={{ flex: '0 0 auto', padding: '18px 16px 14px', borderBottom: `1px solid ${T.borderSoft}`, background: T.bgLayer1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? T.success : T.warning }} /><div style={{ color: T.brand, fontSize: 10, letterSpacing: '0.12em', fontWeight: 700 }}>OKS CONTEXT</div></div>
      <h1 style={{ margin: '8px 0 4px', color: T.labelPrimary, fontSize: 20, letterSpacing: '-0.03em' }}>知识上下文</h1>
      <p style={{ margin: 0, color: T.labelSecondary, fontSize: 12, lineHeight: 1.5 }}>{connected ? '已连接到本地知识库' : '连接状态需要检查'}</p>
    </header>
    <nav role="tablist" aria-label="OKS 侧边栏视图" style={{ flex: '0 0 auto', display: 'flex', gap: 2, padding: '0 8px', borderBottom: `1px solid ${T.borderSoft}`, background: T.bgLayer1 }}>
      <SurfaceTab active={view === 'overview'} onClick={() => setView('overview')}>概览</SurfaceTab>
      <SurfaceTab active={view === 'knowledge'} onClick={() => setView('knowledge')}>知识库</SurfaceTab>
      <SurfaceTab active={view === 'trace'} onClick={() => setView('trace')}>召回</SurfaceTab>
      <SurfaceTab active={view === 'activity'} onClick={() => setView('activity')}>活动</SurfaceTab>
    </nav>
    <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 12 }}>
      {view === 'overview' ? <CompactOverview scope={scope} rpc={rpc} onView={setView} /> : null}
      {view === 'knowledge' ? <WikiBrowser rpc={rpc} /> : null}
      {view === 'trace' ? <RecallTracePanel rpc={rpc} /> : null}
      {view === 'activity' ? <ActivityPanel rpc={rpc} /> : null}
    </div>
  </div>
}

export function OksSidebarTab({ scope, rpc }: OksPanelProps): ReactNode {
  return <SidebarTab scope={scope} rpc={rpc} />
}

export function OksGlobalSurface({ scope, rpc, openSidebar }: OksPanelProps): ReactNode {
  const surface = useSyncExternalStore(oksSurfaceStore.subscribe, oksSurfaceStore.getSnapshot, oksSurfaceStore.getSnapshot)
  const snap = useSyncExternalStore(
    (listener: () => void) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const launcherRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition>(readLauncherPosition)
  const [launcherDragging, setLauncherDragging] = useState(false)
  const launcherDragRef = useRef<LauncherDrag | null>(null)
  const launcherMovedRef = useRef(false)
  const connected = snap.status === 'ready'
  const rpcShape = rpc as unknown as Record<string, unknown> | null | undefined
  const rpcAvailable = Boolean(rpcShape && typeof rpcShape.call === 'function')
  useEffect(() => {
    if (surface.open) closeRef.current?.focus()
    else launcherRef.current?.focus()
  }, [surface.open])
  useEffect(() => {
    if (!surface.open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeOksSurface() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [surface.open])
  const toggle = () => {
    if (surface.open) return closeOksSurface()
    if (openSidebar?.()) return
    openOksSurface(surface.view)
  }
  const onLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    launcherMovedRef.current = false
    launcherDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTop: launcherPosition.top,
      startRight: launcherPosition.right,
      moved: false,
    }
    setLauncherDragging(true)
  }
  const onLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      drag.moved = true
      launcherMovedRef.current = true
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const next = {
      top: Math.min(Math.max(12, drag.startTop + dy), Math.max(12, window.innerHeight - bounds.height - 12)),
      right: Math.min(Math.max(12, drag.startRight - dx), Math.max(12, window.innerWidth - bounds.width - 12)),
    }
    setLauncherPosition(next)
    writeLauncherPosition(next)
  }
  const onLauncherPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!launcherDragRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    launcherDragRef.current = null
    setLauncherDragging(false)
  }
  const onLauncherClick = () => {
    if (launcherMovedRef.current) { launcherMovedRef.current = false; return }
    toggle()
  }
  return <div style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }}>
    {!surface.open ? <button ref={launcherRef} type="button" aria-expanded="false" aria-controls="oks-context-panel" aria-label="展开 OKS 上下文面板" title="拖动移动 OKS 入口，点击展开" onClick={onLauncherClick} onPointerDown={onLauncherPointerDown} onPointerMove={onLauncherPointerMove} onPointerUp={onLauncherPointerUp} onPointerCancel={onLauncherPointerUp} style={{
      pointerEvents: 'auto', position: 'absolute', top: launcherPosition.top, right: launcherPosition.right, display: 'inline-flex', alignItems: 'center', gap: 8,
      border: `1px solid ${T.brandBorder}`, borderRadius: 999, padding: '9px 13px', background: T.bgLayer1,
      color: T.labelPrimary, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)', cursor: launcherDragging ? 'grabbing' : 'grab', fontSize: 12, fontWeight: 650, touchAction: 'none', userSelect: 'none',
    }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? T.success : T.warning }} />
      <span>OKS</span><span style={{ color: T.labelSecondary, fontWeight: 500 }}>{connected ? '上下文' : '检查设置'}</span><span aria-hidden="true" style={{ color: T.brand, fontSize: 14 }}>›</span>
    </button> : <section id="oks-context-panel" role="dialog" aria-labelledby="oks-context-title" style={{
      pointerEvents: 'auto', position: 'absolute', top: 16, right: 12, bottom: 12, width: 'min(390px, calc(100vw - 24px))',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', border: `1px solid ${T.brandBorder}`, borderRadius: 16,
      background: T.bgBase, boxShadow: T.shadow,
    }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 15px 12px', borderBottom: `1px solid ${T.borderSoft}`, background: T.bgLayer1 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? T.success : T.warning }} /><strong id="oks-context-title" style={{ color: T.labelPrimary, fontSize: 15 }}>OKS 上下文</strong></div>
          <div style={{ marginTop: 4, color: T.labelSecondary, fontSize: 11 }}>{connected ? '知识库已连接 · 实时摘要' : '连接状态需要检查'}</div>
        </div>
        <button ref={closeRef} type="button" aria-expanded="true" aria-controls="oks-context-panel" aria-label="收起 OKS 上下文面板" onClick={closeOksSurface} style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 9px', background: T.bgLayer2, color: T.labelSecondary, cursor: 'pointer', fontSize: 12 }}>收起</button>
      </header>
      <nav role="tablist" aria-label="OKS 上下文视图" style={{ display: 'flex', gap: 2, padding: '0 8px', borderBottom: `1px solid ${T.borderSoft}`, background: T.bgLayer1 }}>
        <SurfaceTab active={surface.view === 'overview'} onClick={() => openOksSurface('overview')}>概览</SurfaceTab>
        <SurfaceTab active={surface.view === 'knowledge'} onClick={() => openOksSurface('knowledge')}>知识库</SurfaceTab>
        <SurfaceTab active={surface.view === 'trace'} onClick={() => openOksSurface('trace')}>召回</SurfaceTab>
        <SurfaceTab active={surface.view === 'activity'} onClick={() => openOksSurface('activity')}>活动</SurfaceTab>
      </nav>
      <div style={{ minHeight: 0, flex: 1, overflowY: 'auto', padding: 12, background: T.bgBase }}>
        {!rpcAvailable ? <div role="status" style={{ padding: 14, border: `1px solid ${T.border}`, borderRadius: 10, background: T.bgLayer2, color: T.labelSecondary, fontSize: 12, lineHeight: 1.55 }}>
          <strong style={{ display: 'block', marginBottom: 5, color: T.labelPrimary }}>OKS 连接接口暂不可用</strong>
          当前 DSH 连接正在初始化，面板已保持安全降级，不会影响原有对话。请刷新页面后重试。
        </div> : null}
        {rpcAvailable && surface.view === 'overview' ? <CompactOverview scope={scope} rpc={rpc} onView={openOksSurface} /> : null}
        {rpcAvailable && surface.view === 'knowledge' ? <WikiBrowser rpc={rpc} onOpenSettings={() => openOksSurface('overview')} /> : null}
        {rpcAvailable && surface.view === 'trace' ? <RecallTracePanel rpc={rpc} /> : null}
        {rpcAvailable && surface.view === 'activity' ? <ActivityPanel rpc={rpc} /> : null}
      </div>
    </section>}
  </div>
}

export function OksPanel({ scope, rpc, openSidebar }: OksPanelProps): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<WorkspaceView>('overview')
  const [narrow, setNarrow] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const snap = useSyncExternalStore(
    (listener: () => void) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  useEffect(() => {
    if (!expanded) launcherRef.current?.focus()
  }, [expanded])
  useEffect(() => {
    if (!expanded) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded])
  useEffect(() => {
    if (!expanded) { setNarrow(false); return }
    const element = workspaceRef.current
    if (!element) return
    const update = () => setNarrow(element.getBoundingClientRect().width < 900)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [expanded])

  const open = (next: WorkspaceView) => { setView(next); setExpanded(true) }
  const connected = snap.status === 'ready'
  if (!expanded) return <button ref={launcherRef} type="button" aria-expanded="false" aria-controls="oks-workspace" aria-label="展开 OKS 工作区" onClick={() => setExpanded(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: `1px solid ${T.border}`, borderRadius: 999, padding: '7px 11px', background: T.bgLayer3, color: T.labelPrimary, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
    <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#16a36b' : '#b9a15a' }} />
    <span>OKS</span>
    <span style={{ color: T.labelSecondary, fontWeight: 500 }}>{connected ? '已连接' : snap.status === 'loading' ? '加载中' : '检查设置'}</span>
    <span aria-hidden="true" style={{ color: T.labelSecondary }}>展开</span>
  </button>

  return <div ref={workspaceRef} id="oks-workspace" role="region" aria-label="OKS 上下文工作区" style={{ border: `1px solid ${T.border}`, borderRadius: 12, background: T.bgLayer2, overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '10px 12px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#16a36b' : '#b9a15a' }} /><strong style={{ color: T.labelPrimary, fontSize: 14 }}>OKS 上下文工作区</strong><span style={{ color: T.labelSecondary, fontSize: 11 }}>{connected ? '已连接' : '需检查设置'}</span></div>
      <button type="button" aria-expanded="true" aria-controls="oks-workspace" aria-label="收起 OKS 工作区" onClick={() => setExpanded(false)} style={{ border: `1px solid ${T.border}`, borderRadius: 7, padding: '5px 8px', background: T.bgLayer3, color: T.labelSecondary, cursor: 'pointer', fontSize: 12 }}>收起</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : '150px minmax(0, 1fr) minmax(220px, 280px)', gap: 12, padding: 12, alignItems: 'start' }}>
      <nav aria-label="OKS 工作区导航" style={{ display: narrow ? 'flex' : 'grid', flexWrap: 'wrap', gap: 4 }}>
        <button type="button" aria-current={view === 'overview' ? 'page' : undefined} onClick={() => setView('overview')} style={{ ...navButton(view === 'overview'), ...(narrow ? { width: 'auto', flex: '1 1 110px' } : {}) }}>◈ <span>概览</span></button>
        <button type="button" aria-current={view === 'knowledge' ? 'page' : undefined} onClick={() => setView('knowledge')} style={{ ...navButton(view === 'knowledge'), ...(narrow ? { width: 'auto', flex: '1 1 110px' } : {}) }}>▤ <span>知识库</span></button>
        <button type="button" aria-current={view === 'trace' ? 'page' : undefined} onClick={() => setView('trace')} style={{ ...navButton(view === 'trace'), ...(narrow ? { width: 'auto', flex: '1 1 110px' } : {}) }}>⌁ <span>召回轨迹</span></button>
        <button type="button" aria-current={view === 'activity' ? 'page' : undefined} onClick={() => setView('activity')} style={{ ...navButton(view === 'activity'), ...(narrow ? { width: 'auto', flex: '1 1 110px' } : {}) }}>⌁ <span>活动</span></button>
        <button type="button" aria-current={view === 'settings' ? 'page' : undefined} onClick={() => setView('settings')} style={{ ...navButton(view === 'settings'), ...(narrow ? { width: 'auto', flex: '1 1 110px' } : {}) }}>⚙ <span>系统设置</span></button>
      </nav>
      <main style={{ minWidth: 0 }}>
        {view === 'overview' ? <WorkspaceOverview scope={scope} rpc={rpc} onOpen={open} openSidebar={openSidebar} /> : null}
        {view === 'knowledge' ? <><KnowledgeRecallSwitch scope={scope} /><WikiBrowser rpc={rpc} onOpenSettings={() => setView('settings')} /></> : null}
        {view === 'trace' ? <RecallTracePanel rpc={rpc} /> : null}
        {view === 'activity' ? <ActivityPanel rpc={rpc} /> : null}
        {view === 'settings' ? <RecallParamsCard scope={scope} /> : null}
      </main>
      {view === 'activity' ? null : <aside><ActivityPanel rpc={rpc} compact /></aside>}
    </div>
  </div>
}
