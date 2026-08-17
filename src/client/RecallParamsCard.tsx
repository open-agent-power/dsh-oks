/**
 * OKS settings card — browser half.
 *
 * Visualizes and edits settings/recall.yaml params: floor, topn, posttool
 * mode, search backend. Changes write back through the settings service;
 * oks reads settings/recall.yaml at call time, so the next recall honors
 * the new value without restart.
 */
import { useState, useEffect } from 'react'
import { useSettings } from '@deepseek-ai/dsh-client-settings'
import type { OksConfig } from '../index.ts'

export default function RecallParamsCard() {
  const [config, setConfig] = useState<OksConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const settings = useSettings()

  useEffect(() => {
    settings.get('oks').then(setConfig).catch(() => setConfig({} as OksConfig))
  }, [settings])

  if (!config) return <p>加载 OKS 配置中…</p>

  const update = (patch: Partial<OksConfig>) =>
    setConfig((c) => (c ? { ...c, ...patch } : c))

  const save = async () => {
    setSaving(true)
    try {
      await settings.set('oks', config)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="oks-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <h3 style={{ margin: '0 0 0.25rem' }}>OKS recall 参数</h3>
        <p style={{ margin: 0, color: '#888', fontSize: '0.85rem' }}>
          settings/recall.yaml 唯一真源 → git 同步 → 走到哪带到哪
        </p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        recall.floor（召回阈值，低于此值不注入）
        <input
          type="number" step="0.05" min="0" max="1"
          value={config.recall_floor ?? 0.7}
          onChange={(e) => update({ recall_floor: parseFloat(e.target.value) })}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        recall.topn（每次注入最多 N 条）
        <input
          type="number" step="1" min="1" max="10"
          value={config.recall_topn ?? 3}
          onChange={(e) => update({ recall_topn: parseInt(e.target.value, 10) })}
        />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        posttool.mode（PostToolUse 模式）
        <select
          value={config.posttool_mode ?? 'signal'}
          onChange={(e) => update({ posttool_mode: e.target.value })}
        >
          <option value="signal">signal（只 slug+rel，默认）</option>
          <option value="full">full（注入 body）</option>
        </select>
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        search_backend（搜索后端）
        <select
          value={config.search_backend ?? 'native'}
          onChange={(e) => update({ search_backend: e.target.value })}
        >
          <option value="native">native（6+1 因子，默认）</option>
          <option value="fts5">fts5（SQLite FTS5 + BM25）</option>
          <option value="fusion">fusion（native + fts5 补盲）</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存到 settings/recall.yaml'}
        </button>
        {saved && <span style={{ color: '#080' }}>✓ 已保存</span>}
      </div>
    </div>
  )
}
