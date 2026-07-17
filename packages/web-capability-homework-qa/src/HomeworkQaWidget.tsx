import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  content: string
  student_name: string
  subject: string
  category: string
  status: string
}

export function HomeworkQaWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#6366f1'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'title',
        label: '哪道题卡住了？',
        placeholder: '例：数学练习册 P12 第 3 题 · 分数应用题',
        hint: '写清书名/页码/题号，老师批改时一眼能对上。也可以写「语文课课练 Unit2 阅读」。',
      },
      {
        key: 'content',
        label: '哪里不懂？（可空）',
        optional: true,
        inputType: 'textarea',
        placeholder: '例：不会列方程；已算到一半，卡在约分',
        hint: '说说你已经试过什么、卡在哪一步。越具体，批改越有用。',
      },
      {
        key: 'subject',
        label: '科目（可空）',
        optional: true,
        placeholder: '数学 / 语文 / 英语…',
        hint: '方便按科目筛选待批改列表。',
      },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/homework-qa/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(String(e))
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
    try {
      await apiFetch('/api/v1/homework-qa/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          content: (values.content || '').trim(),
          student_name: user?.display_name || '',
          subject: (values.subject || '').trim(),
          category: 'homework',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已提问 · 等待老师批改（真库）')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const review = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/homework-qa/records/${id}/review`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <GtgtStepComposer
        title="作业答疑"
        meta="学生提问 · Soft 步进"
        accent={accent}
        variant="soft"
        flowHint="写清题目 → 补充卡点（可跳过）→ 选科目 → 提交真库"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="提交问题"
      />
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>
        待批改{open.length ? ` · ${open.length}` : ''}
      </h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && open.length === 0 && (
        <p className="muted">空库无待批改 — 上方提交后会出现在这里</p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <strong>{t.title}</strong>
            {t.content ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.content}</p> : null}
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              {[t.student_name, t.subject].filter(Boolean).join(' · ')}
            </p>
            <button
              type="button"
              className="btn"
              style={{ background: accent, marginTop: 8 }}
              onClick={() => void review(t.id)}
            >
              标记已批改
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
