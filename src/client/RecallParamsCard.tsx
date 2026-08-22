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
import { useState, useSyncExternalStore, type ReactNode } from 'react'

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
  prestep_enabled: true,
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
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={card}>
      {/* Header — mirror the host plugin accordion and keep the page compact by default. */}
      <button type="button" aria-expanded={expanded} aria-controls="oks-settings-content"
        onClick={() => setExpanded(value => !value)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', border: 0, padding: '14px 16px', background: 'transparent', color: T.labelPrimary, textAlign: 'left', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: T.labelPrimary }}>OKS 知识库配置</div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: T.labelSecondary }}>
            {expanded ? '改 → 自动写 ~/.oks/config.json + settings/recall.yaml' : `当前：recall ${Number(v.recall_floor ?? 0.7)} · 每次 ${Number(v.recall_topn ?? 3)} 条`}
          </div>
        </div>
        <span aria-hidden="true" style={{ flex: '0 0 auto', color: T.labelSecondary, fontSize: 16 }}>{expanded ? '⌃' : '⌄'}</span>
      </button>

      {expanded ? <div id="oks-settings-content" role="region" aria-label="OKS 知识库配置详情" style={{ borderTop: `1px solid ${T.border}` }}>
        {!snap.writable ? (
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: 0, color: T.labelSecondary, fontSize: 13 }}>只读</p>
          </div>
        ) : (
          <>
          {/* 📦 知识库 */}
          <div style={group}>
            <div style={groupTitle}>📦 知识库</div>
            <Field id={gid('kbp')} lab="知识库地址" h="知识库地址，写 ~/.oks/config.json">
              <input id={gid('kbp')} style={input} type="text"
                value={String(v.knowledge_base_path ?? '')}
                placeholder="~/Desktop/school/repo/xinhai-knowledge-studio"
                onChange={(e) => up('knowledge_base_path', e.target.value)} />
            </Field>
          </div>

          {/* 🔍 召回 */}
          <div style={group}>
            <div style={groupTitle}>🔍 召回 (recall)</div>
            <Field id={gid('rf')} lab="召回门槛" h="召回阈值，rel 低于此不注入">
              <input id={gid('rf')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.recall_floor ?? 0.7)}
                onChange={(e) => up('recall_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('rt')} lab="召回条数" h="每次注入最多 N 条">
              <input id={gid('rt')} style={input} type="number" step="1" min="1" max="10"
                value={Number(v.recall_topn ?? 3)}
                onChange={(e) => up('recall_topn', parseInt(e.target.value, 10))} />
            </Field>
            <Field id={gid('rm')} lab="最短问题长度" h="用户问题短于此长度时跳过召回">
              <input id={gid('rm')} style={input} type="number" step="1" min="1" max="50"
                value={Number(v.recall_minlen ?? 6)}
                onChange={(e) => up('recall_minlen', parseInt(e.target.value, 10))} />
            </Field>
            <Field id={gid('rc')} lab="冷却轮数" h="相同问题在 N 轮内不重复召回">
              <input id={gid('rc')} style={input} type="number" step="1" min="0" max="100"
                value={Number(v.recall_cooldown ?? 10)}
                onChange={(e) => up('recall_cooldown', parseInt(e.target.value, 10))} />
            </Field>
          </div>

          {/* ⚡ pre-step hook（确定性每轮注入） */}
          <div style={group}>
            <div style={groupTitle}>⚡ pre-step hook（确定性每轮注入）</div>
            <Field id={gid('pe')} lab="自动召回" h="开启后，每轮回答前自动召回相关 Wiki；关闭后仍可手动调用 oks_recall。">
              <button id={gid('pe')} type="button" role="switch" aria-checked={Boolean(v.prestep_enabled ?? true)}
                onClick={() => up('prestep_enabled', !Boolean(v.prestep_enabled ?? true))}
                style={{ alignSelf: 'flex-start', minWidth: 68, border: 0, borderRadius: 999, padding: '7px 11px', background: Boolean(v.prestep_enabled ?? true) ? T.brand : T.border, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {Boolean(v.prestep_enabled ?? true) ? '已开启' : '已关闭'}
              </button>
            </Field>
            <Field id={gid('pf')} lab="前置召回门槛" h="前置步骤使用更高门槛，过滤噪音（默认 0.85）">
              <input id={gid('pf')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.prestep_floor ?? 0.85)}
                onChange={(e) => up('prestep_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pk')} lab="仅注入 Wiki" h="只注入 Wiki，不注入原始资料（episodic Raw）">
              <input id={gid('pk')} type="checkbox" checked={Boolean(v.prestep_knowledge_only ?? true)}
                onChange={(e) => up('prestep_knowledge_only', e.target.checked)} />
            </Field>
          </div>

          {/* 🛠 PostToolUse */}
          <div style={group}>
            <div style={groupTitle}>🛠 PostToolUse（工具执行后补充提醒）</div>
            <Field id={gid('pm')} lab="注入模式" h="注入模式">
              <select id={gid('pm')} style={input} value={String(v.posttool_mode ?? 'signal')}
                onChange={(e) => up('posttool_mode', e.target.value)}>
                <option value="signal">signal（仅注入 slug 和相关度，默认）</option>
                <option value="full">full（注入正文）</option>
              </select>
            </Field>
            <Field id={gid('ps')} lab="信号门槛" h="信号模式的相关度门槛，达到较高值才注入">
              <input id={gid('ps')} style={input} type="number" step="0.1" min="0" max="10"
                value={Number(v.posttool_signal_rel_floor ?? 2.5)}
                onChange={(e) => up('posttool_signal_rel_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pfl')} lab="工具召回门槛" h="工具查询的召回阈值">
              <input id={gid('pfl')} style={input} type="number" step="0.05" min="0" max="1"
                value={Number(v.posttool_floor ?? 0.9)}
                onChange={(e) => up('posttool_floor', parseFloat(e.target.value))} />
            </Field>
            <Field id={gid('pt')} lab="工具注入条数" h="工具执行后最多注入 N 条">
              <input id={gid('pt')} style={input} type="number" step="1" min="1" max="10"
                value={Number(v.posttool_topn ?? 2)}
                onChange={(e) => up('posttool_topn', parseInt(e.target.value, 10))} />
            </Field>
          </div>

          {/* 🔎 搜索后端 */}
          <div style={group}>
            <div style={groupTitle}>🔎 搜索后端</div>
            <Field id={gid('sb')} lab="搜索后端" h="召回后端引擎">
              <select id={gid('sb')} style={input} value={String(v.search_backend ?? 'native')}
                onChange={(e) => up('search_backend', e.target.value)}>
                <option value="native">native（6+1 因子召回，默认）</option>
                <option value="fts5">fts5（SQLite FTS5 全文检索 + BM25）</option>
                <option value="fusion">fusion（native + fts5 组合补充）</option>
              </select>
            </Field>
          </div>

          {/* 📊 注入质量反馈 */}
          <div style={group}>
            <div style={groupTitle}>📊 注入质量反馈（闭环）</div>
            <div style={{ ...field, borderTop: `1px solid ${T.border}` }}>
              <span style={label}>闭环已启用</span>
              <span style={hint}>
                每次注入带 inject_id 标记 → AI 答完后调 oks_inject_feedback 打分
                （有用/噪声/不相关）→ 写 ~/.oks/inject_feedback.log →
                调 oks_inject_stats 或 oks_metrics 查看统计 → 噪声较多时调高前置召回门槛。
              </span>
            </div>
          </div>
          <div style={{ height: 8 }} />
          </>
        )}
      </div> : null}
    </div>
  )
}
