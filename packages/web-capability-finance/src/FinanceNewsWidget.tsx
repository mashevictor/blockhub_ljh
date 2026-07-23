import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

type Scope = 'all' | 'macro_cn' | 'macro_global' | 'micro'
type BriefKind = 'industry' | 'company' | 'macro'

interface SymbolChip {
  code?: string
  name?: string
  chg?: string
}

interface NewsItem {
  id: string
  vertical: string
  scope: string
  title: string
  summary: string
  symbols: SymbolChip[]
  source: string
  heat: number
  is_demo: boolean
  published_at: string
}

const SCOPE_TABS: Array<{ key: Scope; label: string }> = [
  { key: 'all', label: '全部热议' },
  { key: 'macro_cn', label: '国内宏观' },
  { key: 'macro_global', label: '全球宏观' },
  { key: 'micro', label: '微观/个股' },
]

const VERTICAL_LABEL: Record<string, string> = {
  bank: '银行',
  securities: '券商',
  insurance: '保险',
  fund: '基金',
  fintech: '消金',
}

export function FinanceNewsWidget({ node }: { node?: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const accent = primaryColor || '#0f766e'
  const vertical = String(node?.props?.vertical || 'bank').trim() || 'bank'
  const heading =
    String(node?.props?.form_headline || node?.props?.scene_label || '').trim() ||
    `${VERTICAL_LABEL[vertical] || vertical}·行业新闻 Agent`

  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [showSource, setShowSource] = useState(false)
  const [sourceForm, setSourceForm] = useState<Record<string, string>>({ provider: 'public_cn' })
  const [sourceReset, setSourceReset] = useState(0)
  const [brief, setBrief] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const qs = new URLSearchParams({ vertical })
      if (appId) qs.set('app_id', appId)
      if (scope !== 'all') qs.set('scope', scope)
      const data = await apiFetch<{ items: NewsItem[] }>(`/api/v1/finance-news/items?${qs}`, token)
      setItems(data.items || [])
      setMsg('')
    } catch (e) {
      setMsg(String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId, vertical, scope])

  useEffect(() => {
    void load()
  }, [load])

  const relatedSymbols = useMemo(() => {
    const map = new Map<string, SymbolChip>()
    for (const it of items) {
      for (const s of it.symbols || []) {
        const key = String(s.code || s.name || '').trim()
        if (key && !map.has(key)) map.set(key, s)
      }
    }
    return Array.from(map.values()).slice(0, 12)
  }, [items])

  const seedDemo = async (refresh = false) => {
    if (!token) return
    setBusy(true)
    setMsg('')
    try {
      const res = await apiFetch<{ message?: string; inserted?: number; skipped?: boolean }>(
        '/api/v1/finance-news/demo-seed',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ vertical, app_public_id: appId || '', refresh }),
        },
      )
      setMsg(res.message || (res.skipped ? '已有演示样本' : `已写入 ${res.inserted || 0} 条`))
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const sourceSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'provider',
        label: '源类型',
        placeholder: 'tushare 或 public_cn',
        render: ({
          value,
          setValue,
          accent: a,
        }: {
          value: string
          setValue: (v: string) => void
          accent: string
        }) => (
          <div className="row-actions">
            {[
              { value: 'public_cn', label: '公开中文源（免 Token）' },
              { value: 'tushare', label: 'Tushare（需 Token）' },
            ].map((c) => (
              <button
                key={c.value}
                type="button"
                className={(value || '') === c.value ? 'btn' : 'btn btn-ghost'}
                style={(value || '') === c.value ? { background: a } : undefined}
                onClick={() => setValue(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'token',
        label: 'Tushare Token',
        placeholder: '仅 tushare 需要；public_cn 可填 - 或留空',
        optional: true,
      },
    ],
    [],
  )

  const connectSource = async () => {
    if (!token) return
    setBusy(true)
    setMsg('')
    const provider = (sourceForm.provider || 'public_cn').trim().toLowerCase()
    const tok = (sourceForm.token || '').trim()
    try {
      if (provider === 'tushare') {
        if (!tok || tok === '-') {
          throw new Error('选择 Tushare 时请填写 Token（不会写入代码仓）')
        }
        await apiFetch('/api/v1/finance-news/source-config', token, {
          method: 'POST',
          body: JSON.stringify({ provider: 'tushare', token: tok, enabled: true }),
        })
      }
      const res = await apiFetch<{ message?: string; inserted?: number }>('/api/v1/finance-news/sync', token, {
        method: 'POST',
        body: JSON.stringify({
          provider,
          vertical,
          app_public_id: appId || '',
          limit: 20,
        }),
      })
      setMsg(res.message || `已同步 ${res.inserted || 0} 条`)
      setShowSource(false)
      setSourceForm({ provider: 'public_cn' })
      setSourceReset((k) => k + 1)
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const genBrief = async (kind: BriefKind) => {
    if (!token) return
    setBusy(true)
    setMsg('')
    setBrief('')
    try {
      const res = await apiFetch<{ brief: string; based_on: number }>('/api/v1/finance-news/brief', token, {
        method: 'POST',
        body: JSON.stringify({ vertical, kind }),
      })
      setBrief(res.brief || '')
      setMsg(`已基于 ${res.based_on} 条入库新闻生成`)
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cap-page" style={{ ['--accent' as string]: accent }}>
      <header className="cap-head" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{heading}</h2>
        <p style={{ margin: '6px 0 0', opacity: 0.72, fontSize: 13 }}>
          空库为空列表。演示样本带「演示」徽章；真源需显式接入，不会静默假造行情。
        </p>
      </header>

      <div className="row-actions" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void seedDemo(false)}>
          写入演示样本
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void seedDemo(true)}>
          刷新演示样本
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => {
            setShowSource((v) => !v)
            setSourceForm({ provider: 'public_cn' })
            setSourceReset((k) => k + 1)
          }}
        >
          {showSource ? '收起真源' : '接入真源'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void genBrief('industry')}>
          行业一页纸
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void genBrief('company')}>
          公司一页纸
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void genBrief('macro')}>
          宏观速览
        </button>
      </div>

      {showSource ? (
        <div style={{ marginBottom: 16, padding: 12, border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)', borderRadius: 8 }}>
          <GtgtStepComposer
            key={sourceReset}
            title="接入真源"
            meta="Gtgt · Soft"
            flowHint=">> 源类型 → Token（仅 tushare）→ 同步入库"
            accent={accent}
            variant="soft"
            steps={sourceSteps}
            values={sourceForm}
            onChange={(k, v) => setSourceForm((s) => ({ ...s, [k]: v }))}
            onComplete={connectSource}
            busy={busy}
            resetKey={sourceReset}
            submitLabel="保存并同步"
          />
        </div>
      ) : null}

      {msg ? (
        <div style={{ marginBottom: 10, fontSize: 13, color: msg.includes('Error') || msg.includes('失败') || msg.includes('拒绝') ? '#b91c1c' : '#0f766e' }}>
          {msg}
        </div>
      ) : null}

      {brief ? (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 13,
            lineHeight: 1.55,
            padding: 12,
            marginBottom: 14,
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            borderRadius: 8,
            maxHeight: 280,
            overflow: 'auto',
          }}
        >
          {brief}
        </pre>
      ) : null}

      <div className="row-actions" style={{ gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        {SCOPE_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={scope === t.key ? 'btn' : 'btn btn-ghost'}
            style={scope === t.key ? { background: accent } : undefined}
            onClick={() => setScope(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {relatedSymbols.length > 0 ? (
        <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.65, alignSelf: 'center' }}>相关标的</span>
          {relatedSymbols.map((s) => (
            <span
              key={String(s.code || s.name)}
              style={{
                fontSize: 12,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              }}
            >
              {s.name || s.code}
              {s.chg ? ` ${s.chg}` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p style={{ opacity: 0.6 }}>加载中…</p>
      ) : items.length === 0 ? (
        <p style={{ opacity: 0.65 }}>暂无新闻。请点击「写入演示样本」或「接入真源」。</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((it) => (
            <li
              key={it.id}
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: it.is_demo ? '#fef3c7' : 'color-mix(in srgb, var(--accent) 16%, transparent)',
                    color: it.is_demo ? '#92400e' : undefined,
                  }}
                >
                  {it.is_demo ? '演示' : it.source}
                </span>
                <span style={{ fontSize: 11, opacity: 0.55 }}>{it.scope}</span>
                <span style={{ fontSize: 11, opacity: 0.45, marginLeft: 'auto' }}>
                  {it.published_at ? it.published_at.slice(0, 16).replace('T', ' ') : ''}
                </span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{it.title}</div>
              <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.5 }}>{it.summary}</div>
              {(it.symbols || []).length > 0 ? (
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {it.symbols.map((s) => (
                    <span
                      key={`${it.id}-${s.code || s.name}`}
                      style={{ fontSize: 12, padding: '1px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.04)' }}
                    >
                      {s.name || s.code}
                      {s.chg ? ` ${s.chg}` : ''}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
