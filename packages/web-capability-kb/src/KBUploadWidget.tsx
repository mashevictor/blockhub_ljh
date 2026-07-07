import { useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface KbBase {
  id: string
  name: string
  document_count: number
}

export default function KBUploadWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor } = useRuntime()
  const [bases, setBases] = useState<KbBase[]>([])
  const [kbId, setKbId] = useState('')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Array<{ doc_name: string; snippet: string; score: number }>>([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    apiFetch<{ items: KbBase[] }>('/api/v1/kb/bases', token)
      .then((d) => {
        setBases(d.items)
        if (d.items[0]) setKbId(d.items[0].id)
      })
      .catch(() => setBases([]))
  }, [token])

  const handleSearch = async () => {
    if (!query.trim()) return
    setMsg('')
    try {
      const res = await apiFetch<{ items: Array<{ doc_name: string; snippet: string; score: number }> }>(
        '/api/v1/kb/search',
        token,
        { method: 'POST', body: JSON.stringify({ query, kb_id: kbId || undefined, top_k: 5 }) },
      )
      setHits(res.items || [])
      if (!res.items?.length) setMsg('未检索到相关内容')
    } catch (e) {
      setMsg(`检索失败：${String(e)}`)
    }
  }

  return (
    <div className="widget kb-widget">
      <h3>知识库检索</h3>
      {bases.length > 0 && (
        <label>
          知识库
          <select className="input" value={kbId} onChange={(e) => setKbId(e.target.value)}>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>{b.name} ({b.document_count} 篇)</option>
            ))}
          </select>
        </label>
      )}
      <div className="row-actions">
        <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="输入检索关键词…" />
        <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => void handleSearch()}>检索</button>
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
