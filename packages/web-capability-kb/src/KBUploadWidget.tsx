import { useCallback, useEffect, useRef, useState } from 'react'
import {
  apiFetch,
  GtgtStepComposer,
  useRuntime,
  type GtgtStep,
  type SchemaNode,
} from '@blockhub/web-core'

interface KbBase {
  id: string
  name: string
  description?: string
  document_count?: number
  doc_count?: number
  status?: string
}

interface KbDoc {
  id: string
  name: string
  status: string
  size?: string
  chunks?: number
  error_message?: string
}

interface SearchHit {
  doc_name: string
  snippet: string
  score: number
}

const ALLOWED = '.pdf,.txt,.md,.markdown'

export default function KBUploadWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, entrySource } = useRuntime()
  const lockedName = String(node.props?.kb_name || '').trim()
  const lockedDesc = String(node.props?.kb_description || '').trim()
  const lockKb = Boolean(node.props?.lock_kb || lockedName)
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || lockedName || '知识库',
  ).trim()

  const [bases, setBases] = useState<KbBase[]>([])
  const [kbId, setKbId] = useState('')
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [hits, setHits] = useState<SearchHit[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [resetKey, setResetKey] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = primaryColor || '#0d9488'

  const loadDocs = useCallback(
    async (id: string) => {
      if (!token || !id) {
        setDocs([])
        return
      }
      try {
        const d = await apiFetch<{ items: KbDoc[] }>(
          `/api/v1/kb/documents?kb_id=${encodeURIComponent(id)}`,
          token,
        )
        setDocs(d.items || [])
      } catch (e) {
        setDocs([])
        setErr(`文档列表失败：${String(e)}`)
      }
    },
    [token],
  )

  const resolveBases = useCallback(async () => {
    setErr('')
    if (!token) {
      setBases([])
      setErr('未登录，无法加载知识库')
      return
    }
    try {
      if (lockedName) {
        // 锁定库：只解析本库，绝不拉全租户列表塞进下拉
        const d = await apiFetch<{ items: KbBase[] }>('/api/v1/kb/bases', token)
        let hit = (d.items || []).find((b) => b.name === lockedName)
        if (!hit) {
          const created = await apiFetch<{ kb?: KbBase } & KbBase>('/api/v1/kb/bases', token, {
            method: 'POST',
            body: JSON.stringify({ name: lockedName, description: lockedDesc }),
          })
          hit = created.kb || created
        }
        setBases([hit])
        setKbId(hit.id)
        await loadDocs(hit.id)
        return
      }

      const d = await apiFetch<{ items: KbBase[] }>('/api/v1/kb/bases', token)
      const items = (d.items || []).filter((b) => !String(b.name || '').includes('冒烟'))
      setBases(items)
      const first = items[0]
      if (first) {
        setKbId(first.id)
        await loadDocs(first.id)
      } else {
        setKbId('')
        setDocs([])
      }
    } catch (e) {
      setBases([])
      setKbId('')
      setDocs([])
      setErr(`知识库接口失败：${String(e)}`)
    }
  }, [token, lockedName, lockedDesc, loadDocs])

  useEffect(() => {
    void resolveBases()
  }, [resolveBases])

  useEffect(() => {
    if (!kbId || !token) return
    const pending = docs.some((d) => d.status === 'processing' || d.status === 'pending')
    if (!pending) return
    const t = window.setInterval(() => {
      void loadDocs(kbId)
    }, 2500)
    return () => window.clearInterval(t)
  }, [docs, kbId, token, loadDocs])

  const handleUpload = async (file: File | null) => {
    if (!file || !token || !kbId) return
    setMsg('')
    setErr('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('kb_id', kbId)
      fd.append('file', file)
      const res = await apiFetch<{ document?: KbDoc }>('/api/v1/kb/documents/upload', token, {
        method: 'POST',
        body: fd,
      })
      setMsg(`已上传「${res.document?.name || file.name}」，后台建索引中…`)
      await loadDocs(kbId)
    } catch (e) {
      setErr(`上传失败：${String(e)}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleReindex = async (docId: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/kb/documents/${docId}/reindex`, token, { method: 'POST', body: '{}' })
      setMsg('已触发重新索引')
      if (kbId) await loadDocs(kbId)
    } catch (e) {
      setErr(`重索引失败：${String(e)}`)
    }
  }

  const runSearch = async () => {
    const query = (values.query || '').trim()
    if (!query || !token || !kbId) return
    setMsg('')
    setErr('')
    setBusy(true)
    try {
      const res = await apiFetch<{ items: SearchHit[] }>('/api/v1/kb/search', token, {
        method: 'POST',
        body: JSON.stringify({ query, kb_id: kbId, top_k: 5 }),
      })
      setHits(res.items || [])
      if (!res.items?.length) {
        setMsg(docs.length ? '未检索到相关片段，可换关键词或等索引完成' : '库内暂无文档，请先上传')
      } else {
        setMsg(`命中 ${res.items.length} 条`)
      }
      setResetKey((k) => k + 1)
      setValues({})
    } catch (e) {
      setErr(`检索失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const searchSteps: GtgtStep[] = [
    {
      key: 'query',
      label: '检索词',
      placeholder: '例如：手卫生、危急值、高警示药品…',
      hint: 'Enter 确认后执行向量/全文检索',
    },
  ]

  const active = bases.find((b) => b.id === kbId)
  const docN = active?.document_count ?? active?.doc_count ?? docs.length

  const statusLabel = (s: string) => {
    if (s === 'indexed') return '已索引'
    if (s === 'processing' || s === 'pending') return '索引中'
    if (s === 'failed') return '失败'
    return s || '—'
  }

  return (
    <div className="widget kb-widget" style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0f172a', fontWeight: 700 }}>{sceneTitle}</h3>
        <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
          {lockKb ? '行业专属知识库 · 已锁定本库' : '知识库'}
          {lockedDesc ? ` · ${lockedDesc}` : ''}
          {` · ${docN} 篇文档`}
          <br />
          RAG 检索仅供辅助，不替代执业医师 / 药师 / 护士判断。空库空列表；上传后自动建索引。
        </p>
      </div>

      {err && (
        <p style={{ color: '#b91c1c', fontSize: 13, margin: '0 0 12px' }} role="alert">
          {err}
        </p>
      )}

      {!lockKb && bases.length > 0 && (
        <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          知识库
          <select
            className="input"
            value={kbId}
            onChange={(e) => {
              const id = e.target.value
              setKbId(id)
              void loadDocs(id)
            }}
          >
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.document_count ?? b.doc_count ?? 0} 篇)
              </option>
            ))}
          </select>
        </label>
      )}

      {kbId ? (
        <GtgtStepComposer
          title={lockKb ? '检索本库' : '知识库检索'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint="输入关键词 → 确认检索 → 查看引用片段"
          steps={searchSteps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={runSearch}
          busy={busy}
          resetKey={resetKey}
          submitLabel={busy ? '检索中…' : '检索'}
        />
      ) : null}

      {msg && <p className="status-msg muted">{msg}</p>}

      {hits.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>检索结果</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {hits.map((h, i) => (
              <li key={`${h.doc_name}-${i}`} className="list-card">
                <strong>《{h.doc_name}》</strong>
                <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                  相关度 {(h.score * 100).toFixed(0)}%
                </span>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 }}>{h.snippet}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          marginTop: 18,
          padding: '14px 16px',
          borderRadius: 10,
          background: 'linear-gradient(180deg, #f0fdfa 0%, #f8fafc 100%)',
          border: '1px solid #ccfbf1',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#0f766e' }}>上传文档到本库</div>
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED}
          disabled={!kbId || uploading || !token}
          onChange={(e) => void handleUpload(e.target.files?.[0] || null)}
        />
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
          PDF / TXT / Markdown，≤20MB。上传后自动分段与索引。
          {uploading ? ' 上传中…' : ''}
        </p>
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>本库文档 · {docs.length}</h4>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 12 }}
            disabled={!kbId || !token}
            onClick={() => void loadDocs(kbId)}
          >
            刷新
          </button>
        </div>
        {!docs.length && kbId && !err && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            暂无文档。上传后会出现在此，并可被上方检索。
          </p>
        )}
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
          {docs.map((d) => (
            <li key={d.id} className="list-card">
              <div className="list-card-head" style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{d.name}</strong>
                <span className="tag" style={{ fontSize: 11 }}>
                  {statusLabel(d.status)}
                  {d.size ? ` · ${d.size}` : ''}
                  {typeof d.chunks === 'number' ? ` · ${d.chunks} 块` : ''}
                </span>
              </div>
              {d.error_message ? (
                <p style={{ color: '#b91c1c', fontSize: 12, margin: '4px 0 0' }}>{d.error_message}</p>
              ) : null}
              {(d.status === 'failed' || d.status === 'indexed') && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => void handleReindex(d.id)}
                >
                  重新索引
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
