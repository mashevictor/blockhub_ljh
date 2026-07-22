import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  content: string
  player_name: string
  status: string
  reporter_name?: string
}

function normalizeCategory(raw: string): 'faq' | 'ticket' {
  return raw === 'faq' ? 'faq' : 'ticket'
}

export function GameSupportWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const defaultCat = normalizeCategory(String(node.props?.default_category || 'ticket'))
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || '',
  ).trim()
  const sceneLocked = Boolean(node.props?.default_category)
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: defaultCat })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#a855f7'
  const openCount = items.filter((t) => t.status === 'open').length

  useEffect(() => {
    setValues({ category: defaultCat })
    setResetKey((k) => k + 1)
    setMsg('')
  }, [defaultCat, node.id])

  const steps: GtgtStep[] = useMemo(() => {
    const categoryStep: GtgtStep = {
      key: 'category',
      label: '类型',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">
          <button
            type="button"
            className={(value || 'ticket') === 'faq' ? 'btn' : 'btn btn-ghost'}
            style={(value || 'ticket') === 'faq' ? { background: a } : undefined}
            onClick={() => setValue('faq')}
            disabled={sceneLocked}
          >
            FAQ/攻略
          </button>
          <button
            type="button"
            className={(value || 'ticket') === 'ticket' ? 'btn' : 'btn btn-ghost'}
            style={(value || 'ticket') === 'ticket' ? { background: a } : undefined}
            onClick={() => setValue('ticket')}
            disabled={sceneLocked}
          >
            客服工单
          </button>
        </div>
      ),
    }
    const rest: GtgtStep[] = [
      { key: 'player_name', label: '玩家昵称', placeholder: user?.display_name || '', optional: true },
      {
        key: 'title',
        label: '标题',
        placeholder: defaultCat === 'faq' ? '活动规则 / 掉落说明…' : '掉线 / 充值 / 封号反馈…',
      },
      {
        key: 'content',
        label: '详细内容',
        placeholder: defaultCat === 'faq' ? '规则说明要点…' : '问题复现步骤…',
        optional: true,
      },
    ]
    return sceneLocked ? rest : [categoryStep, ...rest]
  }, [user?.display_name, sceneLocked, defaultCat])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/game-support/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.title?.trim()) return
    setBusy(true)
    setMsg('')
    const category = normalizeCategory(values.category || defaultCat)
    try {
      await apiFetch('/api/v1/game-support/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          title: values.title.trim(),
          content: (values.content || '').trim(),
          player_name: (values.player_name || '').trim() || user?.display_name || '',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: defaultCat })
      setResetKey((k) => k + 1)
      setMsg(category === 'faq' ? 'FAQ 已入库' : '客服工单已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const closeRec = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/game-support/records/${id}/close`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`关闭失败：${String(e)}`)
    }
  }

  const formTitle =
    sceneTitle ||
    (entrySource === 'im' ? '玩家支持协作' : defaultCat === 'faq' ? '玩家 FAQ' : '客服工单')

  const visibleItems = sceneLocked
    ? items.filter((t) => t.category === defaultCat)
    : items

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>
          {defaultCat === 'faq' ? '新建 FAQ' : '新建工单'}
        </button>
      ) : (
        <GtgtStepComposer
          title={formTitle}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`${defaultCat === 'faq' ? 'FAQ' : '工单'}入库 → 跟进 → 关闭${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 处理中 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && visibleItems.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {visibleItems.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>
                {t.record_no} · {t.title}
              </strong>
              <span className="tag">
                {t.category === 'faq' ? 'FAQ' : '工单'} · {t.status === 'open' ? '处理中' : '已关闭'}
              </span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {t.player_name} · {t.reporter_name || '—'}
            </p>
            {t.content && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.content}</p>}
            {t.status === 'open' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => void closeRec(t.id)}
              >
                关闭
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
