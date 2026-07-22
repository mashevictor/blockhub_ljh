import { useCallback, useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface KbBase {
  id: string
  name: string
  description?: string
  document_count?: number
  doc_count?: number
}

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
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Array<{ doc_name: string; snippet: string; score: number }>>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const accent = primaryColor || '#4338ca'

  const resolveBases = useCallback(async () => {
    if (!token) {
      setBases([])
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
      } else {
        setBases(items)
        if (items[0]) setKbId(items[0].id)
      }
    } catch {
      setBases([])
    }
  }, [token, lockedName, lockedDesc, lockKb])

  useEffect(() => {
    void resolveBases()
  }, [resolveBases])

  const handleSearch = async () => {
    if (!query.trim() || !token) return
    setMsg('')
    setBusy(true)
    try {
      const res = await apiFetch<{ items: Array<{ doc_name: string; snippet: string; score: number }> }>(
        '/api/v1/kb/search',
        token,
        { method: 'POST', body: JSON.stringify({ query, kb_id: kbId || undefined, top_k: 5 }) },
      )
      setHits(res.items || [])
      if (!res.items?.length) setMsg('未检索到相关内容（空库或未建索引）')
    } catch (e) {
      setMsg(`检索失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const active = bases.find((b) => b.id === kbId)
  const docN = active?.document_count ?? active?.doc_count ?? 0

  return (
    <div className="widget kb-widget">
      <h3 style={{ margin: '0 0 6px' }}>{sceneTitle}</h3>
      {lockedName ? (
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>
          行业专属知识库 · RAG 向量检索
          {lockedDesc ? ` · ${lockedDesc}` : ''}
          {` · ${docN} 篇文档`}
          <br />
          空库空列表；上传 PDF/MD 后可检索。AI 仅辅助检索，不替代专业判断。
        </p>
      ) : (
        <h3 style={{ display: 'none' }}>知识库检索</h3>
      )}

      {!lockKb && bases.length > 0 && (
        <label>
          知识库
          <select className="input" value={kbId} onChange={(e) => setKbId(e.target.value)}>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.document_count ?? b.doc_count ?? 0} 篇)
              </option>
            ))}
          </select>
        </label>
      )}

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
      {!hits.length && !msg && kbId && (
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          可在知识库管理端上传文档并建索引后，在此检索。
        </p>
      )}
    </div>
  )
}
