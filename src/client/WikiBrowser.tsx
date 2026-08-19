/** Read-only browser for the three OKS lifecycle layers: Wiki, Draft, and Raw. */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

interface RpcResult<T> { ok: boolean; value?: T; error?: { message?: string } }
export interface OksConnectionRpc { call(channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<RpcResult<unknown>> }
interface PageSummary { slug: string; title: string; area: string; type: string; summary: string; created: string }
interface PageList { total: number; items: PageSummary[]; areas: string[]; types: string[] }
interface PageDetail extends PageSummary { body: string; bodyTruncated: boolean }
interface RawSummary { id: string; bundleId: string; captureId: string; capturedAt: string; status: string; sourceType: string; fileCount: number; summary: string }
interface RawList { total: number; items: RawSummary[]; statuses: string[]; truncated?: boolean }
interface RawDetail extends RawSummary { body: string; bodyTruncated: boolean }
interface OksCounts { wikiCount: number; draftCount: number; rawFileCount: number; rawBundleCount: number }
interface OksOverview extends OksCounts { connected: true }
interface OksDiagnostics extends OksCounts { connected: boolean; status: string; message: string }
export interface WikiBrowserProps { rpc: OksConnectionRpc; onOpenSettings?: () => void }
type LibraryTab = 'wiki' | 'drafts' | 'raw'
type Detail = PageDetail | RawDetail

const T = {
  border: 'var(--dsw-alias-border-l2)',
  bgLayer3: 'var(--dsw-alias-bg-layer-3)',
  bgLayer2: 'var(--dsw-alias-bg-layer-2)',
  labelPrimary: 'var(--dsw-alias-label-primary)',
  labelSecondary: 'var(--dsw-alias-label-secondary)',
  brand: 'var(--dsw-alias-brand-primary)',
}
const card: CSSProperties = { border: `1px solid ${T.border}`, borderRadius: 12, background: T.bgLayer3, overflow: 'hidden' }
const input: CSSProperties = { padding: '8px 10px', fontSize: 13, lineHeight: 1.5, color: T.labelPrimary, background: T.bgLayer2, border: `1px solid ${T.border}`, borderRadius: 7, boxSizing: 'border-box' }
const button: CSSProperties = { border: `1px solid ${T.border}`, borderRadius: 7, padding: '6px 9px', background: T.bgLayer2, color: T.labelPrimary, cursor: 'pointer', fontSize: 12 }

function asPageList(value: unknown): PageList | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Partial<PageList>
  if (!Array.isArray(data.items) || typeof data.total !== 'number') return undefined
  return { total: data.total, items: data.items as PageSummary[], areas: Array.isArray(data.areas) ? data.areas as string[] : [], types: Array.isArray(data.types) ? data.types as string[] : [] }
}
function asRawList(value: unknown): RawList | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Partial<RawList>
  if (!Array.isArray(data.items) || typeof data.total !== 'number') return undefined
  return { total: data.total, items: data.items as RawSummary[], statuses: Array.isArray(data.statuses) ? data.statuses as string[] : [], truncated: data.truncated === true }
}
function asOverview(value: unknown): OksOverview | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Partial<OksOverview>
  if (data.connected !== true) return undefined
  if (typeof data.wikiCount !== 'number' || typeof data.draftCount !== 'number' || typeof data.rawFileCount !== 'number' || typeof data.rawBundleCount !== 'number') return undefined
  return data as OksOverview
}
function asDiagnostics(value: unknown): OksDiagnostics | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Partial<OksDiagnostics>
  if (typeof data.status !== 'string' || typeof data.message !== 'string') return undefined
  if (typeof data.wikiCount !== 'number' || typeof data.draftCount !== 'number' || typeof data.rawFileCount !== 'number' || typeof data.rawBundleCount !== 'number') return undefined
  return data as OksDiagnostics
}
function asDetail(value: unknown): Detail | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Partial<Detail>
  if (typeof data.body !== 'string' || typeof data.bodyTruncated !== 'boolean') return undefined
  const raw = data as Partial<RawDetail>
  if (
    typeof raw.id === 'string' && typeof raw.bundleId === 'string' && typeof raw.captureId === 'string' &&
    typeof raw.capturedAt === 'string' && typeof raw.status === 'string' && typeof raw.sourceType === 'string' &&
    typeof raw.fileCount === 'number' && typeof raw.summary === 'string'
  ) return data as RawDetail
  const page = data as Partial<PageDetail>
  if (
    typeof page.slug === 'string' && typeof page.title === 'string' && typeof page.area === 'string' &&
    typeof page.type === 'string' && typeof page.summary === 'string' && typeof page.created === 'string'
  ) return data as PageDetail
  return undefined
}
function isRawDetail(detail: Detail): detail is RawDetail { return 'id' in detail }
function tabLabel(tab: LibraryTab): string { return tab === 'wiki' ? 'Wiki 知识' : tab === 'drafts' ? '审核草稿' : 'Raw 原始资料' }
function readError(tab: LibraryTab): string { return `无法读取 OKS ${tabLabel(tab)}，请稍后重试。` }

export function WikiBrowser({ rpc, onOpenSettings }: WikiBrowserProps): ReactNode {
  const [tab, setTab] = useState<LibraryTab>('wiki')
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('')
  const [type, setType] = useState('')
  const [rawStatus, setRawStatus] = useState('')
  const [pageData, setPageData] = useState<PageList>()
  const [rawData, setRawData] = useState<RawList>()
  const [overview, setOverview] = useState<OksOverview>()
  const [diagnostics, setDiagnostics] = useState<OksDiagnostics>()
  const [selected, setSelected] = useState<Detail>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>()
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    const endpoint = tab === 'raw' ? 'raw-list' : tab === 'drafts' ? 'draft-list' : 'wiki-list'
    const payload = tab === 'raw' ? { query, status: rawStatus } : { query, area, type }
    void rpc.call('/oks', endpoint, payload, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        if (tab === 'raw') {
          const next = result.ok ? asRawList(result.value) : undefined
          if (!next) setError(result.error?.message || readError(tab))
          else setRawData(next)
        } else {
          const next = result.ok ? asPageList(result.value) : undefined
          if (!next) setError(result.error?.message || readError(tab))
          else setPageData(next)
        }
        setLastUpdated(new Date())
      })
      .catch(() => { if (!controller.signal.aborted) setError(readError(tab)) })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false) } })
    return () => controller.abort()
  }, [rpc, tab, query, area, type, rawStatus, refreshNonce])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      rpc.call('/oks', 'overview', {}, controller.signal),
      rpc.call('/oks', 'diagnostics', {}, controller.signal),
    ]).then(([overviewResult, diagnosticsResult]) => {
      if (controller.signal.aborted) return
      const nextOverview = overviewResult.ok ? asOverview(overviewResult.value) : undefined
      const nextDiagnostics = diagnosticsResult.ok ? asDiagnostics(diagnosticsResult.value) : undefined
      if (nextOverview) setOverview(nextOverview)
      if (nextDiagnostics) setDiagnostics(nextDiagnostics)
    }).catch(() => undefined)
    return () => controller.abort()
  }, [rpc, refreshNonce])

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshNonce(value => value + 1), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const refresh = () => { setRefreshing(true); setRefreshNonce(value => value + 1) }
  const changeTab = (next: LibraryTab) => {
    setTab(next); setSelected(undefined); setError(''); setPageData(undefined); setRawData(undefined)
    setQuery(''); setArea(''); setType(''); setRawStatus('')
  }
  const open = async (id: string) => {
    setLoading(true); setError('')
    try {
      const endpoint = tab === 'wiki' ? 'wiki-get' : tab === 'drafts' ? 'draft-get' : 'raw-get'
      const result = await rpc.call('/oks', endpoint, tab === 'raw' ? { id } : { slug: id })
      const detail = result.ok ? asDetail(result.value) : undefined
      if (!detail) setError(result.error?.message || `无法打开此${tabLabel(tab)}条目。`)
      else setSelected(detail)
    } catch {
      setError(`无法打开此${tabLabel(tab)}条目。`)
    } finally {
      setLoading(false)
    }
  }

  if (selected) {
    const raw = isRawDetail(selected)
    return <div style={card}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
        <button type="button" onClick={() => setSelected(undefined)} style={{ border: 0, padding: 0, background: 'transparent', color: T.brand, cursor: 'pointer', fontSize: 13 }}>← 返回列表</button>
        <h2 style={{ margin: '12px 0 4px', fontSize: 17, lineHeight: 1.4, color: T.labelPrimary }}>{raw ? selected.captureId : selected.title}</h2>
        <p style={{ margin: 0, color: T.labelSecondary, fontSize: 12 }}>{raw ? `${selected.status} · ${selected.sourceType}${selected.capturedAt ? ` · ${selected.capturedAt}` : ''}` : `${selected.area} · ${selected.type}`}</p>
        {tab === 'drafts' ? <p style={{ margin: '8px 0 0', color: '#b27616', fontSize: 12 }}>AI 生成候选 · 等待人工审核 · 不会自动晋升为正式召回知识。</p> : null}
        {raw ? <p style={{ margin: '8px 0 0', color: T.labelSecondary, fontSize: 12 }}>原始证据包 · 只读预览 · episodic 使用取决于现有 OKS 查询与 Hook 配置。</p> : null}
      </div>
      {raw ? <div style={{ margin: '12px 16px 0', padding: '10px', borderRadius: 8, background: T.bgLayer2, color: T.labelSecondary, fontSize: 12, lineHeight: 1.55 }}>证据包：{selected.bundleId}<br />包内文件数：{selected.fileCount}</div> : null}
      <article style={{ padding: '16px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: T.labelPrimary, fontSize: 13, lineHeight: 1.7 }}>{selected.body || '此内容没有可预览的文本。'}</article>
      {selected.bodyTruncated ? <p style={{ margin: '0 16px 16px', color: T.labelSecondary, fontSize: 12 }}>预览最多显示前 60,000 个字符。</p> : null}
    </div>
  }

  const pageItems = pageData?.items ?? []
  const rawItems = rawData?.items ?? []
  const items = tab === 'raw' ? rawItems : pageItems
  const total = tab === 'raw' ? rawData?.total : pageData?.total
  return <div style={card}>
    <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, color: T.labelPrimary, fontSize: 17 }}>我的 OKS 知识库</h2>
          <p style={{ margin: '5px 0 0', color: T.labelSecondary, fontSize: 12 }}>Wiki 是已审核知识；Draft 需要人工审核；Raw 是原始证据。</p>
        </div>
        <button type="button" onClick={refresh} disabled={refreshing} style={{ ...button, opacity: refreshing ? 0.6 : 1 }}>{refreshing ? '刷新中…' : '刷新'}</button>
      </div>
      {diagnostics ? <div style={{ marginTop: 10, padding: '9px 10px', background: T.bgLayer2, borderRadius: 8, color: T.labelSecondary, fontSize: 12, lineHeight: 1.55 }}>
        <strong style={{ color: T.labelPrimary }}>{diagnostics.connected ? '已连接' : diagnostics.status}</strong>: {diagnostics.message}<br />
        Wiki {diagnostics.wikiCount} · 审核草稿 {diagnostics.draftCount} · Raw 证据包 {diagnostics.rawBundleCount} · Raw 文件 {diagnostics.rawFileCount}
        {!diagnostics.connected && onOpenSettings ? <><br /><button type="button" onClick={onOpenSettings} style={{ ...button, marginTop: 8 }}>打开系统设置</button></> : null}
      </div> : null}
      {lastUpdated ? <div style={{ marginTop: 7, color: T.labelSecondary, fontSize: 11 }}>最近更新： {lastUpdated.toLocaleTimeString()}</div> : null}
    </div>
    <div style={{ display: 'flex', gap: 18, padding: '0 16px', borderBottom: `1px solid ${T.border}`, background: T.bgLayer2 }}>
      {([['wiki', 'Wiki 知识'], ['drafts', '审核草稿'], ['raw', 'Raw 原始资料']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => changeTab(value)} style={{ border: 0, borderBottom: tab === value ? `2px solid ${T.brand}` : '2px solid transparent', padding: '10px 2px 8px', background: 'transparent', color: tab === value ? T.labelPrimary : T.labelSecondary, cursor: 'pointer', fontSize: 13, fontWeight: tab === value ? 600 : 500 }}>{label}</button>)}
    </div>
    <div style={{ display: 'grid', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
      <input aria-label="搜索知识" value={query} onChange={event => setQuery(event.target.value)} placeholder={tab === 'wiki' ? '搜索 Wiki' : tab === 'drafts' ? '搜索草稿' : '搜索 Raw 原始资料'} style={input} />
      {tab === 'raw'
        ? <select aria-label="Raw 处理状态" value={rawStatus} onChange={event => setRawStatus(event.target.value)} style={input}><option value="">全部状态</option>{(rawData?.statuses ?? []).map(value => <option key={value} value={value}>{value}</option>)}</select>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><select aria-label="知识领域" value={area} onChange={event => setArea(event.target.value)} style={input}><option value="">全部领域</option>{(pageData?.areas ?? []).map(value => <option key={value} value={value}>{value}</option>)}</select><select aria-label="知识类型" value={type} onChange={event => setType(event.target.value)} style={input}><option value="">全部类型</option>{(pageData?.types ?? []).map(value => <option key={value} value={value}>{value}</option>)}</select></div>}
    </div>
    {loading && total === undefined ? <p style={{ margin: 0, padding: '16px', color: T.labelSecondary, fontSize: 13 }}>正在加载 {tabLabel(tab)}…</p> : null}
    {error ? <p style={{ margin: 0, padding: '16px', color: T.labelSecondary, fontSize: 13 }}>{error}</p> : null}
    {!loading && !error && items.length === 0 ? <p style={{ margin: 0, padding: '16px', color: T.labelSecondary, fontSize: 13 }}>暂无匹配内容。</p> : null}
    {tab === 'raw' && rawData?.truncated ? <p style={{ margin: 0, padding: '12px 16px', color: T.labelSecondary, fontSize: 12 }}>Raw 目录较大；当前仅显示首个安全扫描窗口。</p> : null}
    {items.map(item => tab === 'raw'
      ? <button type="button" key={(item as RawSummary).id} onClick={() => void open((item as RawSummary).id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px', border: 0, borderBottom: `1px solid ${T.border}`, background: 'transparent', color: T.labelPrimary, cursor: 'pointer' }}><div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{(item as RawSummary).captureId}</div><div style={{ marginTop: 3, color: T.labelSecondary, fontSize: 12 }}>{(item as RawSummary).status} · {(item as RawSummary).sourceType}{(item as RawSummary).capturedAt ? ` · ${(item as RawSummary).capturedAt}` : ''} · {(item as RawSummary).fileCount} 个文件</div><p style={{ margin: '7px 0 0', color: T.labelSecondary, fontSize: 12, lineHeight: 1.5 }}>{(item as RawSummary).summary}</p></button>
      : <button type="button" key={(item as PageSummary).slug} onClick={() => void open((item as PageSummary).slug)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '14px 16px', border: 0, borderBottom: `1px solid ${T.border}`, background: 'transparent', color: T.labelPrimary, cursor: 'pointer' }}><div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{(item as PageSummary).title}</div><div style={{ marginTop: 3, color: T.labelSecondary, fontSize: 12 }}>{(item as PageSummary).area} · {(item as PageSummary).type}{(item as PageSummary).created ? ` · ${(item as PageSummary).created}` : ''}</div><p style={{ margin: '7px 0 0', color: T.labelSecondary, fontSize: 12, lineHeight: 1.5 }}>{(item as PageSummary).summary}</p></button>)}
  </div>
}
