import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

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
  created_at?: string
}

const ALLOWED = '.pdf,.txt,.md,.markdown'

export default function KBUploadWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor } = useRuntime()
  const lockedName = String(node.props?.kb_name || '').trim()
  const lockedDesc = String(node.props?.kb_description || '').trim()
  const lockKb = Boolean(node.props?.lock_kb || lockedName)
  const sceneTitle = String(
    node.props?.form_headline || node.props?.scene_label || node.props?.label || lockedName || '知识库',
  ).trim()

  const [bases, setBases] = useState<KbBase[]>([])
  const [kbId, setKbId] = useState('')
  const [docs, setDocs] = useState<KbDoc[]>([])
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Array<{ doc_name: string; snippet: string; score: number }>>([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const accent = primaryColor || '#4338ca'

  const loadDocs = useCallback(
    async (id: string) => {
      if (!token || !id) {
        setDocs([])
        return
      }
      try {
        const d = await apiFetch<{ items: KbDoc[] }>(`/api/v1/kb/documents?kb_id=${encodeURIComponent(id)}`, token)
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
      const d = await apiFetch<{ items: KbBase[] }>('/api/v1/kb/bases', token)
      let items = d.items || []
      if (lockedName) {
        let hit = items.find((b) => b.name === lockedName)
        if (!hit) {
          const created = await apiFetch<{ kb?: KbBase } & KbBase>('/api/v1/kb/bases', token, {
            method: 'POST',
            body: JSON.stringify({ name: lockedName, description: lockedDesc }),
          })
          hit = created.kb || created
          items = [...items, hit]
        }
        setBases(lockKb ? [hit] : items)
        setKbId(hit.id)
        await loadDocs(hit.id)
      } else {
        setBases(items)
        const first = items[0]
        if (first) {
          setKbId(first.id)
          await loadDocs(first.id)
        } else {
          setKbId('')
          setDocs([])
        }
      }
    } catch (e) {
      setBases([])
      setKbId('')
      setDocs([])
      setErr(`知识库接口失败：${String(e)}`)
    }
  }, [token, lockedName, lockedDesc, lockKb, loadDocs])

  useEffect(() => {
    void resolveBases()
  }, [resolveBases])

  // 索引中文档轮询刷新
  useEffect(() => {
    if (!kbId || !token) return
    const pending = docs.some((d) => d.status === 'processing' || d.status === 'pending')
    if (!pending) return
    const t = window.setInterval(() => {
      void loadDocs(kbId)
      void resolveBases()
    }, 2500)
    return () => window.clearInterval(t)
  }, [docs, kbId, token, loadDocs, resolveBases])

  const handleUpload = async (file: File | null) => {
    if (!file || !token || !kbId) return
    setMsg('')
    setErr('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('kb_id', kbId)
      fd.append('file', file)
      const res = await apiFetch<{ success?: boolean; document?: KbDoc }>('/api/v1/kb/documents/upload', token, {
        method: 'POST',
        body: fd,
      })
      setMsg(`已上传「${res.document?.name || file.name}」，后台建索引中…`)
      await loadDocs(kbId)
      await resolveBases()
    } catch (e) {
      setErr(`上传失败：${String(e)}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleReindex = async (docId: string) => {
    if (!token) return
    setErr('')
    try {
      await apiFetch(`/api/v1/kb/documents/${docId}/reindex`, token, { method: 'POST', body: '{}' })
      setMsg('已触发重新索引')
      if (kbId) await loadDocs(kbId)
    } catch (e) {
      setErr(`重索引失败：${String(e)}`)
    }
  }

  const handleSearch = async () => {
    if (!query.trim() || !token) return
    setMsg('')
    setErr('')
    setBusy(true)
    try {
      const res = await apiFetch<{ items: Array<{ doc_name: string; snippet: string; score: number }> }>(
        '/api/v1/kb/search',
        token,
        { method: 'POST', body: JSON.stringify({ query, kb_id: kbId || undefined, top_k: 5 }) },
      )
      setHits(res.items || [])
      if (!res.items?.length) {
        setMsg(docs.length ? '未检索到相关片段（可换关键词，或等索引完成）' : '库内暂无文档：请先上传 PDF / MD / TXT')
      }
    } catch (e) {
      setErr(`检索失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const active = bases.find((b) => b.id === kbId)
  const docN = active?.document_count ?? active?.doc_count ?? docs.length

  const statusLabel = (s: string) => {
    if (s === 'indexed') return '已索引'
    if (s === 'processing' || s === 'pending') return '索引中'
    if (s === 'failed') return '失败'
    return s || '—'
  }

  return (
    <div className="widget kb-widget">
      <h3 style={{ margin: '0 0 6px' }}>{sceneTitle}</h3>
      {lockedName ? (
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>
          行业专属知识库 · RAG 向量检索
          {lockedDesc ? ` · ${lockedDesc}` : ''}
          {` · ${docN} 篇文档`}
          <br />
          空库空列表；本页可上传 PDF/MD/TXT，索引完成后即可检索。AI 仅辅助，不替代专业判断。
        </p>
      ) : null}

      {err && (
        <p style={{ color: '#b91c1c', fontSize: 13, margin: '0 0 10px' }} role="alert">
          {err}
        </p>
      )}

      {!lockKb && bases.length > 0 && (
        <label>
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

      <div
        style={{
          margin: '12px 0',
          padding: '12px',
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          background: '#f8fafc',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>上传文档</div>
        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED}
          disabled={!kbId || uploading || !token}
          onChange={(e) => void handleUpload(e.target.files?.[0] || null)}
        />
        <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
          支持 PDF / TXT / Markdown，单文件 ≤ 20MB。上传后自动建索引。
        </p>
        {uploading && <p className="muted">上传中…</p>}
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <strong style={{ fontSize: 13 }}>文档列表（{docs.length}）</strong>
          <button
            type="button"
            className="btn"
            style={{ background: '#64748b', fontSize: 12, padding: '4px 10px' }}
            disabled={!kbId || !token}
            onClick={() => {
              void loadDocs(kbId)
              void resolveBases()
            }}
          >
            刷新
          </button>
        </div>
        {!docs.length && kbId && !err && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            暂无文档。上传后会出现在此列表，并可被检索。
          </p>
        )}
        {docs.map((d) => (
          <div key={d.id} className="list-card" style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong>{d.name}</strong>
              <span className="muted" style={{ fontSize: 12 }}>
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
                className="btn"
                style={{ marginTop: 6, background: accent, fontSize: 12, padding: '4px 10px' }}
                onClick={() => void handleReindex(d.id)}
              >
                重新索引
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="row-actions">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSearch()
          }}
          placeholder="输入检索关键词…"
        />
        <button
          type="button"
          className="btn"
          style={{ background: accent }}
          disabled={busy || !kbId}
          onClick={() => void handleSearch()}
        >
          {busy ? '检索中…' : '检索'}
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
      {hits.map((h, i) => (
        <div key={i} className="list-card">
          <strong>《{h.doc_name}》</strong>
          <p>{h.snippet}</p>
        </div>
      ))}
    </div>
  )
}
