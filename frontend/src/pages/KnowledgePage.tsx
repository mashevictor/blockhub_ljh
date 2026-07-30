import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

  const tabs = useMemo((): [Tab, string][] => [
    ['bases', t('admin.knowledge.tab.bases')],
    ['documents', t('admin.knowledge.tab.documents')],
    ['search', t('admin.knowledge.tab.search')],
  ], [t])

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
      setUploadMsg(t('admin.knowledge.err.select_kb'))
      return
    }
    setUploading(true)
    setUploadMsg('')
    try {
      await uploadKbDocument(uploadKbId, file)
      setUploadMsg(t('admin.knowledge.upload_ok', { name: file.name }))
      setTab('documents')
      load()
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : t('admin.knowledge.upload_failed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleReindex = async (docId: string) => {
    await reindexKbDocument(docId)
    setUploadMsg(t('admin.knowledge.reindex_submitted'))
    load()
  }

  const statusLabel = (s: string) => {
    if (s === 'indexed') return t('admin.knowledge.status.indexed')
    if (s === 'processing' || s === 'pending') return t('admin.knowledge.status.processing')
    if (s === 'failed') return t('admin.knowledge.status.failed')
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
          {t('admin.knowledge.new_kb')}
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <input className="search-input" placeholder={t('admin.knowledge.name_ph')} value={newKbName} onChange={(e) => setNewKbName(e.target.value)} />
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary-dark" onClick={handleCreate}>{t('admin.knowledge.create')}</button>
            <button type="button" className="btn btn-ghost-dark" onClick={() => setShowCreate(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13 }}>
            {t('admin.knowledge.upload_to')}
            <select
              className="model-select"
              style={{ marginLeft: 8 }}
              value={uploadKbId}
              onChange={(e) => setUploadKbId(e.target.value)}
            >
              <option value="">{t('admin.knowledge.select_ph')}</option>
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
            {uploading ? t('admin.knowledge.uploading') : t('admin.knowledge.upload_btn')}
          </button>
          {uploadMsg && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{uploadMsg}</span>}
        </div>
        {stats && !stats.embedding_configured && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            {t('admin.knowledge.embedding_hint')}
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
        <div className="summary-pill"><div className="n">{stats?.knowledge_bases ?? '—'}</div><div className="l">{t('admin.knowledge.stat.bases')}</div></div>
        <div className="summary-pill"><div className="n">{stats?.documents ?? '—'}</div><div className="l">{t('admin.knowledge.stat.documents')}</div></div>
        <div className="summary-pill"><div className="n">{stats?.chunks ?? '—'}</div><div className="l">{t('admin.knowledge.stat.chunks')}</div></div>
        <div className="summary-pill"><div className="n">{stats?.indexed ?? '—'}</div><div className="l">{t('admin.knowledge.stat.indexed')}</div></div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        {tabs.map(([k, label]) => (
          <button key={k} type="button" className={`filter-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'bases' && (
        <div className="kb-grid">
          {bases.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>{t('admin.knowledge.empty_bases')}</p>
          ) : bases.map((kb) => (
            <div key={kb.id} className="kb-card">
              <div className="kb-card-icon">📚</div>
              <h4>{kb.name}</h4>
              <p>{kb.description || '—'}</p>
              <div className="kb-meta">
                {t('admin.knowledge.meta_docs', { docs: kb.doc_count, chunks: kb.chunk_count })}
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
              <tr>
                <th>{t('admin.knowledge.col.name')}</th>
                <th>{t('admin.knowledge.col.size')}</th>
                <th>{t('admin.knowledge.col.chunks')}</th>
                <th>{t('admin.knowledge.col.status')}</th>
                <th>{t('admin.knowledge.col.actions')}</th>
              </tr>
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
                      {t('admin.knowledge.reindex')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && <p style={{ padding: 16, color: 'var(--muted)' }}>{t('admin.knowledge.empty_docs')}</p>}
        </div>
      )}

      {tab === 'search' && (
        <div className="card">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="model-select" value={searchKbId} onChange={(e) => setSearchKbId(e.target.value)}>
              <option value="">{t('admin.knowledge.all_bases')}</option>
              {bases.map((kb) => (
                <option key={kb.id} value={kb.id}>{kb.name}</option>
              ))}
            </select>
            <input
              className="search-input"
              style={{ flex: 1, minWidth: 200 }}
              placeholder={t('admin.knowledge.search_ph')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            />
            <button type="button" className="btn btn-primary-dark" onClick={() => void handleSearch()}>{t('admin.knowledge.search_btn')}</button>
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
