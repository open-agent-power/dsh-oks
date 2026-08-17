/**
 * OKS settings card — browser half component.
 *
 * Grouped form: 知识库地址 / 召回 / PostToolUse / 搜索后端.
 * knowledge_base_path writes ~/.oks/config.json (via oks config set in
 * the Host half's onChange); the rest write settings/recall.yaml.
 */
import { useSyncExternalStore, type ReactNode } from 'react'

export interface OksScope {
  getSnapshot: () => {
    status: 'loading' | 'ready' | 'unavailable'
    value?: {
      knowledge_base_path?: string
      recall_floor?: number
      recall_topn?: number
      recall_minlen?: number
      recall_cooldown?: number
      posttool_mode?: string
      posttool_floor?: number
      posttool_topn?: number
      posttool_signal_rel_floor?: number
      search_backend?: string
    }
    writable: boolean
  }
  subscribe: (listener: () => void) => () => void
  set: (field: string, value: unknown) => Promise<void>
}

export interface RecallParamsCardProps {
  scope?: OksScope
  t?: (key: string) => string
  children?: ReactNode
}

const FALLBACK = {
  knowledge_base_path: '',
  recall_floor: 0.7, recall_topn: 3, recall_minlen: 6, recall_cooldown: 10,
  posttool_mode: 'signal', posttool_floor: 0.9, posttool_topn: 2, posttool_signal_rel_floor: 2.5,
  search_backend: 'native',
}

const field = (label: string, control: ReactNode): ReactNode => (
  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
    <span style={{ fontSize: '0.8rem' }}>{label}</span>
    {control}
  </label>
)

export function RecallParamsCard(props: RecallParamsCardProps): ReactNode {
  const scope = props.scope
  if (!scope) return <p style={{ color: '#888' }}>scope 未绑定</p>
  const snap = useSyncExternalStore(
    (cb: () => void) => scope.subscribe(cb),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )

  if (snap.status === 'loading') return <p style={{ padding: '0.5rem 0', color: '#888' }}>加载 OKS 配置中…</p>
  if (snap.status === 'unavailable') return null
  const v = { ...FALLBACK, ...snap.value }
  const update = (f: string, val: unknown) => { void scope.set(f, val) }

  return (
    <section style={{ padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <strong style={{ fontSize: '1rem' }}>OKS 知识库配置</strong>
        <p style={{ margin: 0, color: '#888', fontSize: '0.8rem' }}>
          改 → 自动写 ~/.oks/config.json + settings/recall.yaml → 下次生效
        </p>
      </header>

      {!snap.writable ? <p style={{ color: '#888' }}>只读</p> : (
        <>
          {/* 知识库 */}
          <fieldset style={groupStyle}>
            <legend style={legendStyle}>📦 知识库</legend>
            {field('knowledge_base_path（知识库地址，写 ~/.oks/config.json）', (
              <input type="text" style={inputStyle} value={v.knowledge_base_path ?? ''}
                placeholder="~/Desktop/school/repo/xinhai-knowledge-studio"
                onChange={(e) => update('knowledge_base_path', e.target.value)} />
            ))}
          </fieldset>

          {/* 召回 */}
          <fieldset style={groupStyle}>
            <legend style={legendStyle}>🔍 召回 (recall)</legend>
            {field('floor（召回阈值，rel 低于此不注入）', (
              <input type="number" step="0.05" min="0" max="1" style={inputStyle}
                value={v.recall_floor ?? 0.7}
                onChange={(e) => update('recall_floor', parseFloat(e.target.value))} />
            ))}
            {field('topn（每次注入最多 N 条）', (
              <input type="number" step="1" min="1" max="10" style={inputStyle}
                value={v.recall_topn ?? 3}
                onChange={(e) => update('recall_topn', parseInt(e.target.value, 10))} />
            ))}
            {field('minlen（query 短于此跳过）', (
              <input type="number" step="1" min="1" max="50" style={inputStyle}
                value={v.recall_minlen ?? 6}
                onChange={(e) => update('recall_minlen', parseInt(e.target.value, 10))} />
            ))}
            {field('cooldown（同 query N 轮不重复）', (
              <input type="number" step="1" min="0" max="100" style={inputStyle}
                value={v.recall_cooldown ?? 10}
                onChange={(e) => update('recall_cooldown', parseInt(e.target.value, 10))} />
            ))}
          </fieldset>

          {/* PostToolUse */}
          <fieldset style={groupStyle}>
            <legend style={legendStyle}>⚡ PostToolUse（工具后补提醒）</legend>
            {field('mode（注入模式）', (
              <select style={inputStyle} value={v.posttool_mode ?? 'signal'}
                onChange={(e) => update('posttool_mode', e.target.value)}>
                <option value="signal">signal（只 slug+rel，默认）</option>
                <option value="full">full（注入 body）</option>
              </select>
            ))}
            {field('signal_rel_floor（J 模式 rel 门槛，极高才注入）', (
              <input type="number" step="0.1" min="0" max="10" style={inputStyle}
                value={v.posttool_signal_rel_floor ?? 2.5}
                onChange={(e) => update('posttool_signal_rel_floor', parseFloat(e.target.value))} />
            ))}
            {field('floor（工具 query 的召回阈值）', (
              <input type="number" step="0.05" min="0" max="1" style={inputStyle}
                value={v.posttool_floor ?? 0.9}
                onChange={(e) => update('posttool_floor', parseFloat(e.target.value))} />
            ))}
            {field('topn（PostToolUse 注入最多 N 条）', (
              <input type="number" step="1" min="1" max="10" style={inputStyle}
                value={v.posttool_topn ?? 2}
                onChange={(e) => update('posttool_topn', parseInt(e.target.value, 10))} />
            ))}
          </fieldset>

          {/* 搜索后端 */}
          <fieldset style={groupStyle}>
            <legend style={legendStyle}>🔎 搜索后端</legend>
            {field('search_backend', (
              <select style={inputStyle} value={v.search_backend ?? 'native'}
                onChange={(e) => update('search_backend', e.target.value)}>
                <option value="native">native（6+1 因子，默认）</option>
                <option value="fts5">fts5（SQLite FTS5 + BM25）</option>
                <option value="fusion">fusion（native + fts5 补盲）</option>
              </select>
            ))}
          </fieldset>
        </>
      )}
    </section>
  )
}

const groupStyle: React.CSSProperties = { border: '1px solid #ddd', padding: '0.5rem 0.75rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }
const legendStyle: React.CSSProperties = { fontWeight: 600, fontSize: '0.85rem', padding: '0 0.4rem' }
const inputStyle: React.CSSProperties = { padding: '0.25rem 0.4rem', fontSize: '0.85rem' }
