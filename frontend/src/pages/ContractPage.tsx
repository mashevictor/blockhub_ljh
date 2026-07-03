import { useCallback, useEffect, useRef, useState } from 'react'
import {
  aiDraftContract,
  aiReviewContract,
  createContract,
  createDefaultSeal,
  deleteContract,
  downloadSignedPdfBlob,
  fetchContract,
  fetchContractPreviewBlob,
  fetchContracts,
  fetchContractsConfig,
  signContract,
  updateContract,
  updateContractPlacements,
  uploadContractAsset,
  type ContractAsset,
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
    ctx.lineWidth = 2
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

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="sig-pad">
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
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
        <button type="button" className="btn btn-ghost-dark" onClick={clear}>清除</button>
        <button type="button" className="btn btn-primary-dark" onClick={save}>保存签名</button>
      </div>
    </div>
  )
}

export default function ContractPage() {
  const [config, setConfig] = useState<{ llm_configured?: boolean; templates?: { key: string; name: string }[] } | null>(null)
  const [items, setItems] = useState<ContractRecord[]>([])
  const [selected, setSelected] = useState<ContractRecord | null>(null)
  const [tab, setTab] = useState<'edit' | 'sign' | 'preview'>('edit')
  const [title, setTitle] = useState('')
  const [partyA, setPartyA] = useState('')
  const [partyB, setPartyB] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [templateKey, setTemplateKey] = useState('blank')
  const [draftPrompt, setDraftPrompt] = useState('请根据甲乙双方信息起草一份完整合同')
  const [reviewNotes, setReviewNotes] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const loadList = useCallback(() => {
    fetchContracts().then(setItems).catch(() => {})
  }, [])

  const loadOne = useCallback(async (id: string) => {
    const c = await fetchContract(id)
    setSelected(c)
    setTitle(c.title)
    setPartyA(c.parties?.party_a || '')
    setPartyB(c.parties?.party_b || '')
    setBodyHtml(c.body_html)
    setTemplateKey(c.template_key)
    setReviewNotes(c.review_notes || '')
  }, [])

  useEffect(() => {
    fetchContractsConfig().then(setConfig)
    loadList()
  }, [loadList])

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
      const c = await createContract({
        title: '新合同',
        template_key: templateKey,
        parties: { party_a: partyA, party_b: partyB },
      })
      await loadList()
      await loadOne(c.id)
      setTab('edit')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setBusy(true)
    setMsg('')
    try {
      const c = await updateContract(selected.id, {
        title,
        body_html: bodyHtml,
        parties: { party_a: partyA, party_b: partyB },
        template_key: templateKey,
      })
      setSelected(c)
      loadList()
      setMsg('已保存')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '保存失败')
    } finally {
      setBusy(false)
    }
  }

  const handleTemplateChange = async (key: string) => {
    setTemplateKey(key)
    if (!selected) return
    const tpl = config?.templates?.find((t) => t.key === key)
    if (tpl && window.confirm(`应用模板「${tpl.name}」将覆盖当前正文，继续？`)) {
      setBusy(true)
      try {
        const c = await updateContract(selected.id, { template_key: key, title: tpl.name })
        await loadOne(c.id)
      } finally {
        setBusy(false)
      }
    }
  }

  const handleDraft = async () => {
    if (!selected) return
    setBusy(true)
    setMsg('')
    try {
      await handleSave()
      const c = await aiDraftContract(selected.id, draftPrompt)
      await loadOne(c.id)
      setMsg('AI 起草完成')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'AI 起草失败')
    } finally {
      setBusy(false)
    }
  }

  const handleReview = async () => {
    if (!selected) return
    setBusy(true)
    setMsg('')
    try {
      await handleSave()
      const c = await aiReviewContract(selected.id)
      await loadOne(c.id)
      setMsg('法务审阅完成')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '审阅失败')
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

  const handleDefaultSeal = async () => {
    if (!selected) return
    setBusy(true)
    try {
      const c = await createDefaultSeal(selected.id)
      await loadOne(c.id)
      setMsg('已生成默认电子章')
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
    if (!selected) return
    if (!window.confirm('确认签署并生成 PDF？签署后不可再编辑。')) return
    setBusy(true)
    setMsg('')
    try {
      await handleSave()
      const c = await signContract(selected.id)
      await loadOne(c.id)
      loadList()
      setTab('preview')
      setMsg('签署成功，可下载 PDF')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '签署失败，请先保存手写签名')
    } finally {
      setBusy(false)
    }
  }

  const handleDownload = async () => {
    if (!selected) return
    const blob = await downloadSignedPdfBlob(selected.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || '合同'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!selected || !window.confirm('确定删除此合同？')) return
    await deleteContract(selected.id)
    setSelected(null)
    loadList()
  }

  const sigAsset = selected?.assets?.find((a) => a.asset_type === 'signature')
  const sealAsset = selected?.assets?.find((a) => a.asset_type === 'seal')

  return (
    <div className="contract-page">
      <div className="page-header">
        <h1>合同盖章</h1>
        <p>自定义文本合同 · 手写签名 · 电子公章 · AI 起草审阅 · 一键生成 PDF</p>
        {config && (
          <span className={`contract-llm-badge${config.llm_configured ? ' on' : ''}`}>
            {config.llm_configured ? 'DeepSeek 已连接' : 'LLM 未配置（AI 功能不可用）'}
          </span>
        )}
      </div>

      <div className="contract-layout">
        <aside className="contract-list-panel">
          <button type="button" className="btn btn-primary-dark" style={{ width: '100%' }} onClick={handleNew} disabled={busy}>
            + 新建合同
          </button>
          <div className="contract-list">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`contract-list-item${selected?.id === c.id ? ' active' : ''}`}
                onClick={() => { loadOne(c.id); setTab('edit') }}
              >
                <strong>{c.title}</strong>
                <span>{STATUS_LABEL[c.status] || c.status}</span>
                <small>{c.updated_at?.slice(0, 10)}</small>
              </button>
            ))}
            {items.length === 0 && <p className="contract-empty">暂无合同，点击上方新建</p>}
          </div>
        </aside>

        <section className="contract-main">
          {!selected ? (
            <div className="contract-placeholder">
              <p>选择左侧合同，或新建一份合同开始编辑</p>
            </div>
          ) : (
            <>
              <div className="contract-tabs">
                {(['edit', 'sign', 'preview'] as const).map((t) => (
                  <button key={t} type="button" className={`filter-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                    {t === 'edit' ? '编辑正文' : t === 'sign' ? '签名盖章' : '预览下载'}
                  </button>
                ))}
                <span className="contract-status-tag">{STATUS_LABEL[selected.status] || selected.status}</span>
              </div>

              {msg && <div className="contract-msg">{msg}</div>}

              {tab === 'edit' && (
                <div className="contract-edit">
                  <div className="contract-form-row">
                    <label>合同标题<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                    <label>模板
                      <select value={templateKey} onChange={(e) => handleTemplateChange(e.target.value)}>
                        {(config?.templates || []).map((t) => (
                          <option key={t.key} value={t.key}>{t.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="contract-form-row">
                    <label>甲方<input value={partyA} onChange={(e) => setPartyA(e.target.value)} placeholder="甲方名称" /></label>
                    <label>乙方<input value={partyB} onChange={(e) => setPartyB(e.target.value)} placeholder="乙方名称" /></label>
                  </div>
                  <label className="contract-body-label">合同正文（支持 HTML 段落）
                    <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={16} disabled={selected.status === 'signed'} />
                  </label>
                  {config?.llm_configured && selected.status !== 'signed' && (
                    <div className="contract-ai-row">
                      <input value={draftPrompt} onChange={(e) => setDraftPrompt(e.target.value)} placeholder="AI 起草要求" />
                      <button type="button" className="btn btn-ghost-dark" onClick={handleDraft} disabled={busy}>AI 起草</button>
                      <button type="button" className="btn btn-ghost-dark" onClick={handleReview} disabled={busy}>法务审阅</button>
                    </div>
                  )}
                  {reviewNotes && (
                    <div className="contract-review">
                      <h4>审阅意见</h4>
                      <pre>{reviewNotes}</pre>
                    </div>
                  )}
                  <div className="contract-actions">
                    <button type="button" className="btn btn-primary-dark" onClick={handleSave} disabled={busy || selected.status === 'signed'}>保存</button>
                    <button type="button" className="btn btn-ghost-dark" onClick={handleDelete}>删除</button>
                  </div>
                </div>
              )}

              {tab === 'sign' && (
                <div className="contract-sign">
                  {selected.status === 'signed' ? (
                    <p>合同已签署，请在「预览下载」页下载 PDF。</p>
                  ) : (
                    <>
                      <div className="contract-sign-block">
                        <h3>手写签名</h3>
                        <p className="muted">在下方画布手写签名后点击保存</p>
                        <SignaturePad onSave={handleSaveSignature} />
                        {sigAsset && <p className="ok-text">✓ 已保存签名</p>}
                      </div>
                      <div className="contract-sign-block">
                        <h3>电子公章</h3>
                        <p className="muted">上传 PNG 透明底公章，或一键生成默认章</p>
                        <div className="contract-seal-actions">
                          <label className="btn btn-ghost-dark file-btn">
                            上传公章
                            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => handleSealFile(e.target.files?.[0] || null)} />
                          </label>
                          <button type="button" className="btn btn-ghost-dark" onClick={handleDefaultSeal} disabled={busy}>生成默认章</button>
                        </div>
                        {sealAsset && <img src={sealAsset.file_url} alt="电子章" className="seal-preview" />}
                      </div>
                      {(sigAsset || sealAsset) && (
                        <div className="contract-sign-block">
                          <h3>签章位置</h3>
                          {sigAsset && placementControl(sigAsset, '签名位置')}
                          {sealAsset && placementControl(sealAsset, '公章位置')}
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
                  {previewUrl ? (
                    <iframe title="合同预览" src={previewUrl} className="contract-pdf-frame" />
                  ) : (
                    <p>加载预览中…</p>
                  )}
                  {selected.status === 'signed' && (
                    <button type="button" className="btn btn-primary-dark" onClick={handleDownload}>下载已签署 PDF</button>
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
