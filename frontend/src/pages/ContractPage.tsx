import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  aiGenerateContract,
  aiReviewContract,
  createContract,
  createDefaultSeal,
  downloadSignedPdfBlob,
  fetchContract,
  fetchContractPreviewBlob,
  fetchContracts,
  fetchContractsConfig,
  fetchContractTemplate,
  renderContractFields,
  signContract,
  updateContract,
  updateContractPlacements,
  uploadContractAsset,
  type ContractAsset,
  type ContractFieldDef,
  type ContractRecord,
} from '../api/client'

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  reviewing: '审阅中',
  signed: '已签署',
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function SignaturePad({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
  }, [])

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true
    const ctx = canvasRef.current?.getContext('2d')
    const p = pos(e)
    ctx?.beginPath()
    ctx?.moveTo(p.x, p.y)
  }

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const p = pos(e)
    ctx?.lineTo(p.x, p.y)
    ctx?.stroke()
  }

  const end = () => { drawing.current = false }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="sig-pad">
      <canvas
        ref={canvasRef}
        width={520}
        height={180}
        className="sig-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="sig-actions">
        <button type="button" className="btn btn-ghost-dark" onClick={clear}>清除重签</button>
        <button type="button" className="btn btn-primary-dark" onClick={() => canvasRef.current && onSave(canvasRef.current.toDataURL('image/png'))}>
          保存手写签名
        </button>
      </div>
    </div>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ContractFieldDef
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value),
    placeholder: field.placeholder || '',
    disabled,
  }
  if (field.type === 'textarea') {
    return <textarea {...common} rows={3} />
  }
  if (field.type === 'select' && field.options?.length) {
    return (
      <select {...common}>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  const inputType = field.type === 'date' ? 'date' : field.type === 'number' || field.type === 'money' ? 'number' : 'text'
  return <input type={inputType} {...common} />
}

export default function ContractPage() {
  const [config, setConfig] = useState<{
    llm_configured?: boolean
    templates?: { key: string; name: string; description?: string; category?: string }[]
    opensource_refs?: { name: string; url: string; note: string }[]
  } | null>(null)
  const [items, setItems] = useState<ContractRecord[]>([])
  const [selected, setSelected] = useState<ContractRecord | null>(null)
  const [tab, setTab] = useState<'fill' | 'body' | 'sign' | 'preview'>('fill')
  const [title, setTitle] = useState('')
  const [templateKey, setTemplateKey] = useState('labor')
  const [fields, setFields] = useState<ContractFieldDef[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [bodyHtml, setBodyHtml] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sealText, setSealText] = useState('合同专用章')
  const [sealStyle, setSealStyle] = useState<'round' | 'square'>('round')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const sections = useMemo(() => {
    const map = new Map<string, ContractFieldDef[]>()
    for (const f of fields) {
      const s = f.section || '其他'
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(f)
    }
    return [...map.entries()]
  }, [fields])

  const loadTemplateFields = useCallback(async (key: string) => {
    const tpl = await fetchContractTemplate(key)
    setFields(tpl.fields)
    const defaults: Record<string, string> = {}
    for (const f of tpl.fields) {
      if (f.default) defaults[f.key] = f.default
    }
    setFieldValues((prev) => ({ ...defaults, ...prev }))
    if (!title) setTitle(tpl.name)
  }, [title])

  const loadList = useCallback(() => {
    fetchContracts().then(setItems).catch(() => {})
  }, [])

  const loadOne = useCallback(async (id: string) => {
    const c = await fetchContract(id)
    setSelected(c)
    setTitle(c.title)
    setBodyHtml(c.body_html)
    setTemplateKey(c.template_key)
    setReviewNotes(c.review_notes || '')
    const fv = c.field_values || {
      party_a: c.parties?.party_a || '',
      party_b: c.parties?.party_b || '',
      ...(c.parties?.fields || {}),
    }
    setFieldValues(fv)
    const tpl = await fetchContractTemplate(c.template_key)
    setFields(tpl.fields)
  }, [])

  useEffect(() => {
    fetchContractsConfig().then(setConfig)
    loadList()
    loadTemplateFields('labor').catch(() => {})
  }, [loadList, loadTemplateFields])

  useEffect(() => {
    if (!selected?.id) {
      setPreviewUrl(null)
      return
    }
    let revoked: string | null = null
    fetchContractPreviewBlob(selected.id)
      .then((blob) => {
        revoked = URL.createObjectURL(blob)
        setPreviewUrl(revoked)
      })
      .catch(() => setPreviewUrl(null))
    return () => { if (revoked) URL.revokeObjectURL(revoked) }
  }, [selected?.id, selected?.assets, selected?.status, bodyHtml])

  const handleNew = async () => {
    setBusy(true)
    setMsg('')
    try {
      const c = await createContract({ template_key: templateKey, field_values: fieldValues, title: title || undefined })
      await loadList()
      await loadOne(c.id)
      setTab('fill')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleTemplateChange = async (key: string) => {
    setTemplateKey(key)
    await loadTemplateFields(key)
    if (!selected) return
    if (!window.confirm('切换模板将重新渲染正文，继续？')) return
    setBusy(true)
    try {
      const c = await updateContract(selected.id, { template_key: key })
      const rendered = await renderContractFields(c.id, fieldValues)
      await loadOne(rendered.id)
    } finally {
      setBusy(false)
    }
  }

  const handleApplyTemplate = async () => {
    if (!selected) return
    setBusy(true)
    setMsg('')
    try {
      const c = await renderContractFields(selected.id, fieldValues)
      await loadOne(c.id)
      setMsg('已根据表单生成合同正文')
      setTab('body')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '生成失败')
    } finally {
      setBusy(false)
    }
  }

  const handleAiGenerate = async () => {
    if (!selected) return
    setBusy(true)
    setMsg('')
    try {
      await renderContractFields(selected.id, fieldValues, false)
      const c = await aiGenerateContract(selected.id)
      await loadOne(c.id)
      setMsg('已生成完整合同')
      setTab('body')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'AI 生成失败')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveBody = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const c = await updateContract(selected.id, { title, body_html: bodyHtml, field_values: fieldValues })
      setSelected(c)
      loadList()
      setMsg('已保存')
    } finally {
      setBusy(false)
    }
  }

  const handleReview = async () => {
    if (!selected) return
    setBusy(true)
    try {
      await handleSaveBody()
      const c = await aiReviewContract(selected.id)
      await loadOne(c.id)
      setMsg('法务审阅完成')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveSignature = async (dataUrl: string) => {
    if (!selected) return
    setBusy(true)
    try {
      const c = await uploadContractAsset(selected.id, { asset_type: 'signature', data_url: dataUrl, label: '手写签名' })
      await loadOne(c.id)
      setMsg('签名已保存')
    } finally {
      setBusy(false)
    }
  }

  const handleSealFile = async (file: File | null) => {
    if (!selected || !file) return
    setBusy(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const c = await uploadContractAsset(selected.id, { asset_type: 'seal', data_url: dataUrl, label: file.name })
      await loadOne(c.id)
      setMsg('电子章已上传')
    } finally {
      setBusy(false)
    }
  }

  const handleSimSeal = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const company = fieldValues.seal_company || fieldValues.party_a || ''
      const c = await createDefaultSeal(selected.id, {
        company_name: company,
        seal_text: sealText,
        style: sealStyle,
      })
      await loadOne(c.id)
      setMsg('模拟电子章已生成')
    } finally {
      setBusy(false)
    }
  }

  const placementControl = (asset: ContractAsset, label: string) => (
    <div key={asset.id} className="placement-block">
      <strong>{label}</strong>
      <div className="placement-sliders">
        {(['x_pct', 'y_pct', 'width_pct', 'height_pct'] as const).map((k) => (
          <label key={k}>
            {k === 'x_pct' ? '水平' : k === 'y_pct' ? '垂直' : k === 'width_pct' ? '宽度' : '高度'}
            <input
              type="range"
              min={5}
              max={90}
              value={asset.placement?.[k] ?? 20}
              onChange={async (e) => {
                if (!selected) return
                const placement = { ...asset.placement, [k]: Number(e.target.value) }
                const c = await updateContractPlacements(selected.id, [{ id: asset.id, placement }])
                setSelected(c)
              }}
            />
            <span>{asset.placement?.[k] ?? 20}%</span>
          </label>
        ))}
      </div>
      <img src={asset.file_url} alt={label} className="asset-thumb" />
    </div>
  )

  const handleSign = async () => {
    if (!selected || !window.confirm('确认签署并生成 PDF？签署后不可再编辑。')) return
    setBusy(true)
    try {
      await renderContractFields(selected.id, fieldValues)
      const c = await signContract(selected.id)
      await loadOne(c.id)
      loadList()
      setTab('preview')
      setMsg('签署成功')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '签署失败')
    } finally {
      setBusy(false)
    }
  }

  const sigAsset = selected?.assets?.find((a) => a.asset_type === 'signature')
  const sealAsset = selected?.assets?.find((a) => a.asset_type === 'seal')

  return (
    <div className="contract-page">
      <div className="page-header">
        <h1>合同盖章</h1>
        <p>完整劳动合同模板 · 表单填空 · 智能生成 · 手写签名 · 上传/模拟电子章</p>
        {config && (
          <span className={`contract-llm-badge${config.llm_configured ? ' on' : ''}`}>
            {config.llm_configured ? '智能生成已就绪' : '配置后可使用智能生成'}
          </span>
        )}
      </div>

      <div className="contract-layout">
        <aside className="contract-list-panel">
          <button type="button" className="btn btn-primary-dark" style={{ width: '100%' }} onClick={handleNew} disabled={busy}>
            + 新建劳动合同
          </button>
          <label className="contract-new-template">
            模板
            <select value={templateKey} onChange={(e) => { setTemplateKey(e.target.value); loadTemplateFields(e.target.value) }}>
              {(config?.templates || []).map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </label>
          <div className="contract-list">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`contract-list-item${selected?.id === c.id ? ' active' : ''}`}
                onClick={() => { loadOne(c.id); setTab('fill') }}
              >
                <strong>{c.title}</strong>
                <span>{STATUS_LABEL[c.status] || c.status}</span>
                <small>{c.updated_at?.slice(0, 10)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="contract-main">
          {!selected ? (
            <div className="contract-placeholder">
              <p>选择合同或点击「新建劳动合同」</p>
              <p className="muted">推荐流程：填写信息 → 应用模板/AI生成 → 签名盖章 → 下载 PDF</p>
            </div>
          ) : (
            <>
              <div className="contract-tabs">
                {([
                  ['fill', '① 填写信息'],
                  ['body', '② 合同正文'],
                  ['sign', '③ 签名盖章'],
                  ['preview', '④ 预览下载'],
                ] as const).map(([t, label]) => (
                  <button key={t} type="button" className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                    {label}
                  </button>
                ))}
                <span className="contract-status-tag">{STATUS_LABEL[selected.status] || selected.status}</span>
              </div>

              {msg && <div className="contract-msg">{msg}</div>}

              {tab === 'fill' && (
                <div className="contract-fill">
                  <div className="contract-form-row">
                    <label>合同标题<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                    <label>模板
                      <select value={templateKey} onChange={(e) => handleTemplateChange(e.target.value)} disabled={selected.status === 'signed'}>
                        {(config?.templates || []).map((t) => (
                          <option key={t.key} value={t.key}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {sections.map(([section, sectionFields]) => (
                    <div key={section} className="contract-section">
                      <h3>{section}</h3>
                      <div className="contract-field-grid">
                        {sectionFields.map((f) => (
                          <label key={f.key} className={f.type === 'textarea' ? 'span-2' : ''}>
                            {f.label}{f.required ? ' *' : ''}
                            <FieldInput
                              field={f}
                              value={fieldValues[f.key] || ''}
                              onChange={(v) => setFieldValues((prev) => ({ ...prev, [f.key]: v }))}
                              disabled={selected.status === 'signed'}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="contract-actions">
                    <button type="button" className="btn btn-primary-dark" onClick={handleApplyTemplate} disabled={busy || selected.status === 'signed'}>
                      应用模板填空
                    </button>
                    {config?.llm_configured && (
                      <button type="button" className="btn btn-ghost-dark" onClick={handleAiGenerate} disabled={busy || selected.status === 'signed'}>
                        智能生成完整合同
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost-dark" onClick={() => setTab('body')}>下一步：查看正文 →</button>
                  </div>
                </div>
              )}

              {tab === 'body' && (
                <div className="contract-edit">
                  <div className="contract-body-preview" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
                  <details className="contract-advanced">
                    <summary>高级：编辑 HTML 源码</summary>
                    <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={12} disabled={selected.status === 'signed'} />
                  </details>
                  {config?.llm_configured && selected.status !== 'signed' && (
                    <button type="button" className="btn btn-ghost-dark" onClick={handleReview} disabled={busy}>智能法务审阅</button>
                  )}
                  {reviewNotes && (
                    <div className="contract-review"><h4>审阅意见</h4><pre>{reviewNotes}</pre></div>
                  )}
                  <div className="contract-actions">
                    <button type="button" className="btn btn-primary-dark" onClick={handleSaveBody} disabled={busy || selected.status === 'signed'}>保存正文</button>
                    <button type="button" className="btn btn-ghost-dark" onClick={() => setTab('sign')}>下一步：签名盖章 →</button>
                  </div>
                </div>
              )}

              {tab === 'sign' && (
                <div className="contract-sign">
                  {selected.status === 'signed' ? (
                    <p>已签署，请到「预览下载」页下载 PDF。</p>
                  ) : (
                    <>
                      <div className="contract-sign-block">
                        <h3>手写签名</h3>
                        <p className="muted">请在下方手写签名（参考开放签手写面板交互）</p>
                        <SignaturePad onSave={handleSaveSignature} />
                        {sigAsset && <p className="ok-text">✓ 已保存签名</p>}
                      </div>
                      <div className="contract-sign-block">
                        <h3>电子公章</h3>
                        <div className="contract-seal-actions">
                          <label className="btn btn-ghost-dark file-btn">
                            上传公章 PNG
                            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handleSealFile(e.target.files?.[0] || null)} />
                          </label>
                        </div>
                        <div className="contract-seal-sim">
                          <h4>模拟电子章（演示用）</h4>
                          <div className="contract-form-row">
                            <label>章面文字<input value={sealText} onChange={(e) => setSealText(e.target.value)} placeholder="合同专用章" /></label>
                            <label>样式
                              <select value={sealStyle} onChange={(e) => setSealStyle(e.target.value as 'round' | 'square')}>
                                <option value="round">圆形公章</option>
                                <option value="square">方形章</option>
                              </select>
                            </label>
                          </div>
                          <button type="button" className="btn btn-ghost-dark" onClick={handleSimSeal} disabled={busy}>生成模拟电子章</button>
                        </div>
                        {sealAsset && <img src={sealAsset.file_url} alt="电子章" className="seal-preview" />}
                      </div>
                      {(sigAsset || sealAsset) && (
                        <div className="contract-sign-block">
                          <h3>签章位置</h3>
                          {sigAsset && placementControl(sigAsset, '签名')}
                          {sealAsset && placementControl(sealAsset, '公章')}
                        </div>
                      )}
                      <button type="button" className="btn btn-primary-dark btn-lg" onClick={handleSign} disabled={busy}>
                        确认签署并生成 PDF
                      </button>
                    </>
                  )}
                </div>
              )}

              {tab === 'preview' && (
                <div className="contract-preview">
                  {previewUrl ? <iframe title="合同预览" src={previewUrl} className="contract-pdf-frame" /> : <p>加载中…</p>}
                  {selected.status === 'signed' && (
                    <button type="button" className="btn btn-primary-dark" onClick={async () => {
                      const blob = await downloadSignedPdfBlob(selected.id)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `${title || 'contract'}.pdf`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}>下载已签署 PDF</button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
