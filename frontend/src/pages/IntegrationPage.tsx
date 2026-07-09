import { useEffect, useMemo, useState } from 'react'
import {
  createConnector,
  deleteConnector,
  fetchConnectorJobs,
  fetchConnectors,
  syncConnector,
  type Connector,
  type EtlJobItem,
} from '../api/client'

const TYPE_LABEL: Record<string, string> = {
  webhook: 'Webhook',
  database: '数据库',
  api: '开放 API',
  file: '文件同步',
}

export default function IntegrationPage() {
  const [items, setItems] = useState<Connector[]>([])
  const [selected, setSelected] = useState<Connector | null>(null)
  const [jobs, setJobs] = useState<EtlJobItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('webhook')
  const [busy, setBusy] = useState(false)

  const load = () => {
    fetchConnectors().then((d) => {
      setItems(d.items)
      if (!selected && d.items.length) setSelected(d.items[0])
    })
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected) { setJobs([]); return }
    fetchConnectorJobs(selected.id).then((d) => setJobs(d.items)).catch(() => setJobs([]))
  }, [selected])

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    await createConnector({ name: name.trim(), connector_type: type, config: { tables: [] } })
    setBusy(false)
    setName('')
    setType('webhook')
    setShowForm(false)
    load()
  }

  const handleSync = async (c: Connector) => {
    await syncConnector(c.id)
    load()
    if (selected?.id === c.id) {
      const d = await fetchConnectorJobs(c.id)
      setJobs(d.items)
    }
  }

  const handleDelete = async (c: Connector) => {
    if (!confirm(`确认删除连接器「${c.name}」？`)) return
    await deleteConnector(c.id)
    if (selected?.id === c.id) setSelected(null)
    load()
  }

  const timeline = useMemo(() => jobs, [jobs])

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1>系统集成</h1>
          <p>对接企业已有系统，自动同步数据（Webhook / 数据库 / API）</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '取消' : '新建连接器'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="field-label">名称</label>
            <input className="search-input" value={name} placeholder="如：HR 系统" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">类型</label>
            <select className="search-input" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-primary-dark" disabled={busy} onClick={handleCreate}>
            创建
          </button>
        </div>
      )}

      <div className="grid2">
        <div>
          <h3 style={{ marginBottom: 12 }}>连接器</h3>
          {items.length === 0 && <div className="placeholder-page"><p>暂无连接器，点击右上角新建</p></div>}
          {items.map((c) => (
            <div
              key={c.id}
              className={`card connector-card${selected?.id === c.id ? ' active' : ''}`}
              onClick={() => setSelected(c)}
              style={{ cursor: 'pointer', marginBottom: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{c.name}</strong>
                <span className={`tag-${c.status === 'active' ? 'ok' : 'warn'}`}>{c.status === 'active' ? '运行中' : c.status}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {TYPE_LABEL[c.connector_type] ?? c.connector_type}
                {c.last_sync_at ? ` · 最近同步 ${new Date(c.last_sync_at).toLocaleString()}` : ' · 尚未同步'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleSync(c) }}>立即同步</button>
                <button type="button" className="btn btn-sm btn-ghost-dark" onClick={(e) => { e.stopPropagation(); handleDelete(c) }}>删除</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ marginBottom: 12 }}>同步时间线</h3>
          {!selected && <div className="placeholder-page"><p>选择一个连接器查看同步记录</p></div>}
          {selected && (
            <div className="timeline">
              {timeline.length === 0 && <div className="placeholder-page"><p>暂无同步记录，点击「立即同步」</p></div>}
              {timeline.map((j) => (
                <div key={j.id} className="timeline-item">
                  <div className={`timeline-dot ${j.status}`} />
                  <div className="timeline-body">
                    <div className="timeline-title">
                      同步任务
                      <span className={`tag-${j.status === 'success' ? 'ok' : j.status === 'failed' ? 'no' : 'warn'}`}>{j.status}</span>
                    </div>
                    <div className="timeline-meta">
                      {j.ran_at ? new Date(j.ran_at).toLocaleString() : '排队中'}
                      {j.result?.records_synced != null && ` · 同步 ${j.result.records_synced} 条`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
