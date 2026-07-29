import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  createKbBase,
  fetchKbBases,
  fetchKbDocuments,
  fetchKbPipeline,
  fetchKbStats,
  reindexKbDocument,
  searchKb,
  uploadKbDocument,
} from '../api/client'

type Tab = 'bases' | 'documents' | 'search'

type DocRow = {
  id: string
  kb_id: string
  name: string
  size: string
  chunks: number
  status: string
  error_message?: string
}

export default function KnowledgePage() {
  const t = useT()
  const [stats, setStats] = useState<{
    knowledge_bases: number
    documents: number
    chunks: number
    indexed: number
    embedding_configured?: boolean
  } | null>(null)
  const [pipeline, setPipeline] = useState<string[]>([])
  const [tab, setTab] = useState<Tab>('bases')
  const [bases, setBases] = useState<Array<{ id: string; name: string; description: string; doc_count: number; chunk_count: number; status: string }>>([])
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKbId, setSearchKbId] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ doc_name: string; snippet: string; score: number }>>([])
  const [newKbName, setNewKbName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [uploadKbId, setUploadKbId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<number | null>(null)

  const load = useCallback(() => {
    fetchKbStats().then(setStats)
    fetchKbPipeline().then((d) => setPipeline(d.steps))
    fetchKbBases().then((items) => {
      setBases(items)
      if (!uploadKbId && items[0]) setUploadKbId(items[0].id)
      if (!searchKbId && items[0]) setSearchKbId(items[0].id)
    })
    fetchKbDocuments().then(setDocuments)
  }, [uploadKbId, searchKbId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing' || d.status === 'pending')
    if (!hasProcessing) {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
      return
    }
    if (pollRef.current) return
    pollRef.current = window.setInterval(() => {
      fetchKbDocuments().then(setDocuments)
      fetchKbStats().then(setStats)
      fetchKbBases().then(setBases)
    }, 2500)
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [documents])

  const handleCreate = async () => {
    if (!newKbName.trim()) return
    await createKbBase(newKbName)
    setNewKbName('')
    setShowCreate(false)
    load()
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    const res = await searchKb(searchQuery, searchKbId || undefined)
    setSearchResults(res.items)
  }

  const handleUpload = async (file: File) => {
    if (!uploadKbId) {
      setUploadMsg('请先创建并选择知识库')
      return
    }
    setUploading(true)
    setUploadMsg('')
    try {
      await uploadKbDocument(uploadKbId, file)
      setUploadMsg(`已上传「${file.name}」，正在后台解析与建索引…`)
      setTab('documents')
      load()
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleReindex = async (docId: string) => {
    await reindexKbDocument(docId)
    setUploadMsg('已提交重新索引')
    load()
  }

  const statusLabel = (s: string) => {
    if (s === 'indexed') return '已就绪'
    if (s === 'processing' || s === 'pending') return '处理中'
    if (s === 'failed') return '失败'
    return s
  }

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{t('admin.page.knowledge.title')}</h1>
          <p>{t('admin.page.knowledge.desc')}</p>
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
            <button type="button" className="btn btn-ghost-dark" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13 }}>
            上传到知识库
            <select
              className="model-select"
              style={{ marginLeft: 8 }}
              value={uploadKbId}
              onChange={(e) => setUploadKbId(e.target.value)}
            >
              <option value="">请选择</option>
              {bases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleUpload(f)
            }}
          />
          <button
            type="button"
            className="btn btn-primary-dark"
            disabled={uploading || !uploadKbId || bases.length === 0}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? '上传中…' : '上传文档（PDF / TXT / MD）'}
          </button>
          {uploadMsg && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{uploadMsg}</span>}
        </div>
        {stats && !stats.embedding_configured && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            未配置 Embedding API 时将使用全文关键词检索；配置 EMBEDDING_API_KEY 后可启用向量语义搜索。
          </p>
        )}
      </div>

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
        <div className="summary-pill"><div className="n">{stats?.indexed ?? '—'}</div><div className="l">已索引</div></div>
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
          {bases.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>还没有知识库，请先新建并上传文档。</p>
          ) : bases.map((kb) => (
            <div key={kb.id} className="kb-card">
              <div className="kb-card-icon">📚</div>
              <h4>{kb.name}</h4>
              <p>{kb.description || '—'}</p>
              <div className="kb-meta">
                {kb.doc_count} 份文档 · {kb.chunk_count} 个片段 ·{' '}
                <span className={kb.status === 'indexed' ? 'tag-ok' : ''}>{statusLabel(kb.status)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card">
          <table className="catalog-table">
            <thead>
              <tr><th>文档名</th><th>大小</th><th>片段数</th><th>状态</th><th>操作</th></tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.name}</strong>
                    {d.error_message && (
                      <div style={{ fontSize: 11, color: '#dc2626' }}>{d.error_message}</div>
                    )}
                  </td>
                  <td>{d.size}</td>
                  <td>{d.chunks}</td>
                  <td><span className={d.status === 'indexed' ? 'tag-ok' : ''}>{statusLabel(d.status)}</span></td>
                  <td>
                    <button type="button" className="btn btn-ghost-dark" onClick={() => void handleReindex(d.id)}>
                      重新索引
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && <p style={{ padding: 16, color: 'var(--muted)' }}>暂无文档，请上传 PDF 或文本文件。</p>}
        </div>
      )}

      {tab === 'search' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="model-select" value={searchKbId} onChange={(e) => setSearchKbId(e.target.value)}>
              <option value="">全部知识库</option>
              {bases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
            <input
              className="search-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder="输入检索关键词…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            />
            <button type="button" className="btn btn-primary-dark" onClick={() => void handleSearch()}>检索</button>
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
