import { useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  createConnector,
  deleteConnector,
  fetchConnectorJobs,
  fetchConnectors,
  syncConnector,
  updateConnector,
  type Connector,
  type EtlJobItem,
} from '../api/client'

const TYPE_LABEL: Record<string, string> = {
  webhook: 'Webhook / CRM',
  database: '数据库',
  api: '开放 API',
  file: '文件同步',
  wecom: '企业微信',
  dingtalk: '钉钉',
  feishu: '飞书',
}

export default function IntegrationPage() {
  const t = useT()
  const [items, setItems] = useState<Connector[]>([])
  const [selected, setSelected] = useState<Connector | null>(null)
  const [jobs, setJobs] = useState<EtlJobItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('webhook')
  const [vendor, setVendor] = useState('generic_crm')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [fieldMapText, setFieldMapText] = useState('{\n  "id": "external_id",\n  "title": "name"\n}')
  const [busy, setBusy] = useState(false)
  const [editMap, setEditMap] = useState('')
  const [editVendor, setEditVendor] = useState('')
  const [editSecret, setEditSecret] = useState('')
  const [saveMsg, setSaveMsg] = useState('')

  const load = () => {
    fetchConnectors().then((d) => {
      setItems(d.items)
      if (!selected && d.items.length) setSelected(d.items[0])
      else if (selected) {
        const fresh = d.items.find((x) => x.id === selected.id)
        if (fresh) setSelected(fresh)
      }
    })
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!selected) { setJobs([]); return }
    fetchConnectorJobs(selected.id).then((d) => setJobs(d.items)).catch(() => setJobs([]))
    const cfg = selected.config || {}
    setEditVendor(String(cfg.vendor || selected.connector_type || ''))
    setEditSecret(String(cfg.webhook_secret || (cfg.auth as { webhook_secret?: string } | undefined)?.webhook_secret || ''))
    setEditMap(JSON.stringify(cfg.field_map || {}, null, 2))
    setSaveMsg('')
  }, [selected?.id])

  const handleCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    let field_map: Record<string, string> = {}
    try {
      field_map = JSON.parse(fieldMapText || '{}') as Record<string, string>
    } catch {
      setBusy(false)
      alert('field_map JSON 无效')
      return
    }
    await createConnector({
      name: name.trim(),
      connector_type: type,
      config: {
        vendor: vendor.trim() || type,
        webhook_secret: webhookSecret.trim(),
        field_map,
        auth: { webhook_secret: webhookSecret.trim() },
      },
    })
    setBusy(false)
    setName('')
    setType('webhook')
    setShowForm(false)
    load()
  }

  const handleSaveConfig = async () => {
    if (!selected) return
    let field_map: Record<string, unknown> = {}
    try {
      field_map = JSON.parse(editMap || '{}') as Record<string, unknown>
    } catch {
      setSaveMsg('field_map JSON 无效')
      return
    }
    const cfg = {
      ...(selected.config || {}),
      vendor: editVendor.trim() || selected.connector_type,
      webhook_secret: editSecret.trim(),
      field_map,
      auth: {
        ...((selected.config?.auth as object) || {}),
        webhook_secret: editSecret.trim(),
      },
    }
    await updateConnector(selected.id, { config: cfg })
    setSaveMsg('已保存 vendor / field_map / webhook_secret')
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
          <h1>{t('admin.page.integrations.title')}</h1>
          <p>{t('admin.page.integrations.desc')}</p>
        </div>
        <button type="button" className="btn btn-primary-dark" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '取消' : '新建连接器'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="field-label">名称</label>
              <input className="search-input" value={name} placeholder="如：自建 CRM" onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">类型</label>
              <select className="search-input" value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">vendor</label>
              <input className="search-input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="generic_crm" />
            </div>
            <div>
              <label className="field-label">Webhook 密钥</label>
              <input className="search-input" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="HMAC secret" />
            </div>
          </div>
          <div>
            <label className="field-label">field_map（JSON）</label>
            <textarea className="search-input" rows={4} style={{ width: '100%', fontFamily: 'monospace' }} value={fieldMapText} onChange={(e) => setFieldMapText(e.target.value)} />
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
                {c.config?.vendor ? ` · vendor=${String(c.config.vendor)}` : ''}
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
          <h3 style={{ marginBottom: 12 }}>配置 / 同步时间线</h3>
          {!selected && <div className="placeholder-page"><p>选择一个连接器</p></div>}
          {selected && (
            <>
              <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
                <strong>映射与密钥</strong>
                <label className="field-label">vendor
                  <input className="search-input" value={editVendor} onChange={(e) => setEditVendor(e.target.value)} />
                </label>
                <label className="field-label">webhook_secret
                  <input className="search-input" value={editSecret} onChange={(e) => setEditSecret(e.target.value)} />
                </label>
                <label className="field-label">field_map JSON
                  <textarea className="search-input" rows={5} style={{ width: '100%', fontFamily: 'monospace' }} value={editMap} onChange={(e) => setEditMap(e.target.value)} />
                </label>
                <button type="button" className="btn btn-sm btn-primary-dark" onClick={() => void handleSaveConfig()}>保存配置</button>
                {saveMsg && <p style={{ fontSize: 12, color: 'var(--ok, #047857)', margin: 0 }}>{saveMsg}</p>}
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                  入站：POST /api/v1/integrations/ingress/webhook?connector_id={selected.id}
                </p>
              </div>
              <div className="timeline">
                {timeline.length === 0 && <div className="placeholder-page"><p>暂无同步记录</p></div>}
                {timeline.map((j) => (
                  <div key={j.id} className="timeline-item">
                    <div className={`timeline-dot ${j.status}`} />
                    <div className="timeline-body">
                      <div className="timeline-title">
                        {j.trigger === 'ingress' ? '入站 Webhook' : '同步任务'}
                        <span className={`tag-${j.status === 'success' ? 'ok' : j.status === 'failed' ? 'no' : 'warn'}`}>{j.status}</span>
                      </div>
                      <div className="timeline-meta">
                        {j.ran_at ? new Date(j.ran_at).toLocaleString() : '排队中'}
                        {j.result?.records_synced != null && ` · 同步 ${String(j.result.records_synced)} 条`}
                        {j.result?.adapter != null && ` · ${String(j.result.adapter)}`}
                      </div>
                      {Array.isArray(j.result?.errors) && (j.result.errors as unknown[]).length > 0 && (
                        <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>
                          {(j.result.errors as string[]).join('; ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
