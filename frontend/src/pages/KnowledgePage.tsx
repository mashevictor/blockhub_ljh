import { useEffect, useState } from 'react'
import {
  createKbBase,
  fetchKbBases,
  fetchKbDocuments,
  fetchKbPipeline,
  fetchKbStats,
  searchKb,
} from '../api/client'

type Tab = 'bases' | 'documents' | 'search'

export default function KnowledgePage() {
  const [stats, setStats] = useState<{ knowledge_bases: number; documents: number; chunks: number; indexed: number } | null>(null)
  const [pipeline, setPipeline] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('bases')
  const [bases, setBases] = useState<Array<{ id: string; name: string; description: string; doc_count: number; chunk_count: number; status: string }>>([])
  const [documents, setDocuments] = useState<Array<{ id: string; name: string; size: string; chunks: number; status: string }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ doc_name: string; snippet: string; score: number }>>([])
  const [newKbName, setNewKbName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = () => {
    fetchKbStats().then(setStats)
    fetchKbPipeline().then((d) => setPipeline(d.steps))
    fetchKbBases().then(setBases)
    fetchKbDocuments().then(setDocuments)
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newKbName.trim()) return
    await createKbBase(newKbName)
    setNewKbName('')
    setShowCreate(false)
    load()
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const res = await searchKb(searchQuery)
    setSearchResults(res.items)
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>知识库</h1>
          <p>上传制度、手册等文档，供智能问答检索引用</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={() => setShowCreate(true)}>
          + 新建知识库
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <input className="search-input" placeholder="知识库名称" value={newKbName} onChange={(e) => setNewKbName(e.target.value)} />
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary-dark" onClick={handleCreate}>创建</button>
            <button type="button" className="btn btn-ghost-dark" onClick={() => setShowCreate(false)}>取消</button>
          </div>
        </div>
      )}

      <div className="pipeline-flow">
        {pipeline.map((step, i) => (
          <span key={step} className="pipeline-step">
            {step}
            {i < pipeline.length - 1 && <span className="pipeline-arrow">→</span>}
          </span>
        ))}
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{stats?.knowledge_bases ?? '—'}</div><div className="l">知识库</div></div>
        <div className="summary-pill"><div className="n">{stats?.documents ?? '—'}</div><div className="l">文档</div></div>
        <div className="summary-pill"><div className="n">{stats?.chunks ?? '—'}</div><div className="l">内容片段</div></div>
        <div className="summary-pill"><div className="n">{stats?.indexed ?? '—'}</div><div className="l">可检索</div></div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {([['bases', '知识库列表'], ['documents', '文档管理'], ['search', '智能搜索']] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" className={`filter-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'bases' && (
        <div className="kb-grid">
          {bases.map((kb) => (
            <div key={kb.id} className="kb-card">
              <div className="kb-card-icon">📚</div>
              <h4>{kb.name}</h4>
              <p>{kb.description}</p>
              <div className="kb-meta">{kb.doc_count} 份文档 · {kb.chunk_count} 个片段 · <span className="tag-ok">{kb.status === 'indexed' ? '已就绪' : '可用'}</span></div>
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          <table className="catalog-table">
            <thead><tr><th>文档名</th><th>大小</th><th>片段数</th><th>状态</th></tr></thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.size}</td>
                  <td>{d.chunks}</td>
                  <td><span className="tag-ok">{d.status === 'indexed' ? '已就绪' : d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'search' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="search-input" style={{ flex: 1 }} placeholder="输入检索关键词…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <button type="button" className="btn btn-primary-dark" onClick={handleSearch}>检索</button>
          </div>
          {searchResults.map((r, i) => (
            <div key={i} className="search-result">
              <div className="search-result-title">{r.doc_name} <span className="search-score">{r.score}</span></div>
              <div className="search-result-snippet">{r.snippet}</div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
