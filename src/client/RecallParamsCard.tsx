/**
 * OKS settings card — browser half component.
 *
 * Visual style mirrors the native dsh PluginCard/ValueField: a rounded
 * layer-3 card, disclosure header, fields separated by border-top. All
 * colors come from dsh's --dsw-alias-* design tokens so we match the host
 * theme (light/dark) with zero CSS of our own.
 *
 * Groups: 知识库 / 召回 / PostToolUse / 搜索后端. Each field writes via
 * scope.set → Host half onChange syncs to ~/.oks/config.json + recall.yaml.
 */
import { useSyncExternalStore, type ReactNode } from 'react'

export interface OksScope {
  getSnapshot: () => {
    status: 'loading' | 'ready' | 'unavailable'
    value?: Record<string, unknown>
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
  prestep_floor: 0.85, prestep_knowledge_only: true,
  posttool_mode: 'signal', posttool_floor: 0.9, posttool_topn: 2, posttool_signal_rel_floor: 2.5,
  search_backend: 'native',
}

// ── dsh design tokens (mirror PluginCard.module.css / fields.module.css) ──
const T = {
  border: 'var(--dsw-alias-border-l2)',
  borderHover: 'var(--dsw-alias-label-dimmed)',
  bgLayer3: 'var(--dsw-alias-bg-layer-3)',
  bgLayer2: 'var(--dsw-alias-bg-layer-2)',
  labelPrimary: 'var(--dsw-alias-label-primary)',
  labelSecondary: 'var(--dsw-alias-label-secondary)',
  brand: 'var(--dsw-alias-brand-primary)',
}

const card: React.CSSProperties = {
  listStyle: 'none', border: `1px solid ${T.border}`, borderRadius: 12,
  background: T.bgLayer3, transition: 'border-color .16s, background .16s',
  overflow: 'hidden',
}
const group: React.CSSProperties = {
  padding: '4px 16px 0',
}
const groupTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: T.labelPrimary,
  padding: '12px 0 4px',
}
const field: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 0',
  borderTop: `1px solid ${T.border}`,
}
const label: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, lineHeight: 1.5, color: T.labelPrimary, flex: 1, minWidth: 0,
}
const hint: React.CSSProperties = {
  fontSize: 11, lineHeight: 1.45, color: T.labelSecondary,
}
const input: React.CSSProperties = {
  padding: '6px 8px', fontSize: 13, lineHeight: 1.5, color: T.labelPrimary,
  background: T.bgLayer2, border: `1px solid ${T.border}`, borderRadius: 6,
  width: '100%', boxSizing: 'border-box', outline: 'none',
}

function Field({ id, lab, h, children }: { id: string; lab: string; h: string; children: ReactNode }) {
  return (
    <div style={field}>
      <label style={label} htmlFor={id}>{lab}</label>
      {children}
      <span style={hint}>{h}</span>
    </div>
  )
}

export function RecallParamsCard(props: RecallParamsCardProps): ReactNode {
  const scope = props.scope
  if (!scope) return <p style={{ color: T.labelSecondary }}>scope 未绑定</p>
  const snap = useSyncExternalStore(
    (cb: () => void) => scope.subscribe(cb),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )

  if (snap.status === 'loading') {
    return (
      <div style={{ ...card, padding: '14px 16px' }}>
        <p style={{ margin: 0, color: T.labelSecondary, fontSize: 13 }}>加载 OKS 配置中…</p>
      </div>
    )
  }
  if (snap.status === 'unavailable') return null
  const v = { ...FALLBACK, ...(snap.value ?? {}) } as Record<string, unknown>
  const up = (f: string, val: unknown) => { void scope.set(f, val) }
  const gid = (s: string) => `oks-${s}`

  return (
    <div style={card}>
      {/* Header — mirror PluginCard.header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: T.labelPrimary }}>OKS 知识库配置</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: T.labelSecondary }}>
            改 → 自动写 ~/.oks/config.json + settings/recall.yaml
          </div>
        </div>
      </div>

      {!snap.writable ? (
        <div style={{ padding: '0 16px 14px' }}>
          <p style={{ margin: 0, color: T.labelSecondary, fontSize: 13 }}>只读</p>
        </div>
      ) : (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {/* 📦 知识库 */}
          <div style={group}>
            <div style={groupTitle}>📦 知识库</div>
            <Field id={gid('kbp')} lab="knowledge_base_path" h="知识库地址，写 ~/.oks/config.json">
              <input id={gid('kbp')} style={input} type="text"
                value={String(v.knowledge_base_path ?? '')}
                placeholder="~/Desktop/school/repo/xinhai-knowledge-studio"
                onChange={(e) => up('knowledge_base_path', e.target.value)} />
            </Field>
          </div>

          {/* 🔍 召回 */}
          <div style={group}>
            <div style={groupTitle}>🔍 召回 (recall)</div>
            <Field id={gid('rf')} lab="floor" h="召回阈值，rel 低于此不注入">
              <input id={gid('rf')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.recall_floor ?? 0.7)}
                onChange={(e) => up('recall_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('rt')} lab="topn" h="每次注入最多 N 条">
              <input id={gid('rt')} style={input} type="number" step="1" min="1" max="10"
                value={Number(v.recall_topn ?? 3)}
                onChange={(e) => up('recall_topn', parseInt(e.target.value, 10))} />
            </Field>
            <Field id={gid('rm')} lab="minlen" h="query 短于此跳过">
              <input id={gid('rm')} style={input} type="number" step="1" min="1" max="50"
                value={Number(v.recall_minlen ?? 6)}
                onChange={(e) => up('recall_minlen', parseInt(e.target.value, 10))} />
            </Field>
            <Field id={gid('rc')} lab="cooldown" h="同 query N 轮不重复">
              <input id={gid('rc')} style={input} type="number" step="1" min="0" max="100"
                value={Number(v.recall_cooldown ?? 10)}
                onChange={(e) => up('recall_cooldown', parseInt(e.target.value, 10))} />
            </Field>
          </div>

          {/* ⚡ pre-step hook（确定性每轮注入） */}
          <div style={group}>
            <div style={groupTitle}>⚡ pre-step hook（确定性每轮注入）</div>
            <Field id={gid('pf')} lab="prestep_floor" h="pre-step 专用更高门槛，过滤噪音（默认 0.85）">
              <input id={gid('pf')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.prestep_floor ?? 0.85)}
                onChange={(e) => up('prestep_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pk')} lab="prestep_knowledge_only" h="只注入 wiki，不注入 episodic raw">
              <input id={gid('pk')} type="checkbox" checked={Boolean(v.prestep_knowledge_only ?? true)}
                onChange={(e) => up('prestep_knowledge_only', e.target.checked)} />
            </Field>
          </div>

          {/* 🛠 PostToolUse */}
          <div style={group}>
            <div style={groupTitle}>🛠 PostToolUse（工具后补提醒）</div>
            <Field id={gid('pm')} lab="mode" h="注入模式">
              <select id={gid('pm')} style={input} value={String(v.posttool_mode ?? 'signal')}
                onChange={(e) => up('posttool_mode', e.target.value)}>
                <option value="signal">signal（只 slug+rel，默认）</option>
                <option value="full">full（注入 body）</option>
              </select>
            </Field>
            <Field id={gid('ps')} lab="signal_rel_floor" h="J 模式 rel 门槛，极高才注入">
              <input id={gid('ps')} style={input} type="number" step="0.1" min="0" max="10"
                value={Number(v.posttool_signal_rel_floor ?? 2.5)}
                onChange={(e) => up('posttool_signal_rel_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pfl')} lab="floor" h="工具 query 的召回阈值">
              <input id={gid('pfl')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.posttool_floor ?? 0.9)}
                onChange={(e) => up('posttool_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pt')} lab="topn" h="PostToolUse 注入最多 N 条">
              <input id={gid('pt')} style={input} type="number" step="1" min="1" max="10"
                value={Number(v.posttool_topn ?? 2)}
                onChange={(e) => up('posttool_topn', parseInt(e.target.value, 10))} />
            </Field>
          </div>

          {/* 🔎 搜索后端 */}
          <div style={group}>
            <div style={groupTitle}>🔎 搜索后端</div>
            <Field id={gid('sb')} lab="search_backend" h="召回后端引擎">
              <select id={gid('sb')} style={input} value={String(v.search_backend ?? 'native')}
                onChange={(e) => up('search_backend', e.target.value)}>
                <option value="native">native（6+1 因子，默认）</option>
                <option value="fts5">fts5（SQLite FTS5 + BM25）</option>
                <option value="fusion">fusion（native + fts5 补盲）</option>
              </select>
            </Field>
          </div>
          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  )
}
