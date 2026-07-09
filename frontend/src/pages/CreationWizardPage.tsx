import { useEffect, useState } from 'react'
import {
  checkFeasibility,
  fetchCreationScenarios,
  fetchCreationWizard,
  publishApp,
  type IndustryPack,
  type WizardStep,
} from '../api/client'

type DeliverMode = 'web' | 'app' | 'both'

const DELIVER_OPTIONS: { key: DeliverMode; label: string; desc: string }[] = [
  { key: 'web', label: '网页版', desc: '生成 /r/:id 链接，浏览器即可使用' },
  { key: 'app', label: 'App 版', desc: '打包 Android APK，适合内部分发' },
  { key: 'both', label: '网页 + App', desc: '同时提供链接与 APK 下载' },
]

export default function CreationWizardPage() {
  const [steps, setSteps] = useState<WizardStep[]>([])
  const [packs, setPacks] = useState<IndustryPack[]>([])
  const [step, setStep] = useState(1)
  const [industryKey, setIndustryKey] = useState('office')
  const [scenarios, setScenarios] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [feasibility, setFeasibility] = useState<Record<string, unknown> | null>(null)
  const [appName, setAppName] = useState('我的智能应用')
  const [deliver, setDeliver] = useState<DeliverMode>('both')
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [published, setPublished] = useState<Record<string, unknown> | null>(null)

  const maxStep = steps.length || 7

  useEffect(() => {
    fetchCreationWizard().then((d) => {
      setSteps(d.steps)
      setPacks(d.industry_packs)
    })
  }, [])

  useEffect(() => {
    if (step >= 2) {
      fetchCreationScenarios(industryKey).then((d) => {
        setScenarios(d.items)
        setSelected(new Set(d.items.slice(0, Math.min(5, d.items.length)).map((s) => s.id)))
      })
    }
  }, [industryKey, step])

  const currentPack = packs.find((p) => p.key === industryKey)

  const toggleScenario = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNext = async () => {
    if (step === 2) {
      setLoading(true)
      try {
        const result = await checkFeasibility(industryKey, [...selected])
        setFeasibility(result)
      } finally {
        setLoading(false)
      }
    }
    if (step === 6) {
      setPublishing(true)
      setPublishError('')
      try {
        const result = await publishApp(appName, industryKey, { scenarioIds: [...selected], deliver })
        setPublished(result)
        setStep(7)
      } catch {
        setPublishError('发布失败，请稍后重试')
      } finally {
        setPublishing(false)
      }
      return
    }
    setStep((s) => Math.min(maxStep, s + 1))
  }

  const publishedApp = published?.app as { name?: string; id?: string; web_url?: string } | undefined
  const runtime = published?.runtime as { web_url?: string } | undefined
  const webUrl = runtime?.web_url || publishedApp?.web_url

  return (
    <>
      <div className="page-header">
        <h1>创建应用</h1>
        <p>七步向导：选行业 → 勾选场景 → 方案研判 → 命名 → 交付方式 → 确认发布 → 完成</p>
      </div>

      <div className="wizard-steps">
        {steps.map((s) => (
          <div key={s.step} className={`wizard-step${step >= s.step ? ' active' : ''}${step === s.step ? ' current' : ''}`}>
            <div className="wizard-step-num">{s.step}</div>
            <div className="wizard-step-title">{s.title}</div>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>① 选择行业方案包</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            选择行业后，系统将预填推荐场景，您可以在此基础上增减
          </p>
          <div className="industry-grid">
            {packs.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`industry-card${industryKey === p.key ? ' selected' : ''}`}
                onClick={() => setIndustryKey(p.key)}
              >
                <div className="industry-icon">{p.icon}</div>
                <div className="industry-name">{p.name}</div>
                <div className="industry-desc">{p.description}</div>
                {industryKey === p.key && <span className="industry-selected-tag">已选择</span>}
              </button>
            ))}
          </div>
          <div className="preview-box">
            <strong>行业方案包预览</strong>
            <p>{currentPack?.preview}</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>② 选择场景（已选 {selected.size} 项）</h3>
          <div className="scenario-check-grid">
            {scenarios.map((s) => (
              <label key={s.id} className={`scenario-check${selected.has(s.id) ? ' checked' : ''}`}>
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggleScenario(s.id)}
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>③ 方案研判</h3>
          {feasibility ? (
            <div className="feasibility-result">
              <div className="feas-score">{(feasibility.score as number) ?? 92} 分</div>
              <p>{feasibility.summary as string}</p>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                将包含：{(feasibility.capabilities as string[])?.join('、')}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>正在评估方案…</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>④ 应用命名</h3>
          <label style={{ fontSize: 12, fontWeight: 600 }}>应用名称</label>
          <input
            className="search-input"
            style={{ display: 'block', marginTop: 6, width: '100%' }}
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="例如：研发部智能助手"
          />
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            行业：{currentPack?.name} · 已选 {selected.size} 个场景
          </p>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>⑤ 交付方式</h3>
          <div className="industry-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {DELIVER_OPTIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`industry-card${deliver === d.key ? ' selected' : ''}`}
                onClick={() => setDeliver(d.key)}
              >
                <div className="industry-name">{d.label}</div>
                <div className="industry-desc">{d.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>⑥ 确认发布</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>应用名称：<strong>{appName}</strong></li>
            <li>行业方案：{currentPack?.name}</li>
            <li>场景数量：{selected.size} 项</li>
            <li>交付方式：{DELIVER_OPTIONS.find((d) => d.key === deliver)?.label}</li>
            {feasibility && (
              <li>方案评分：{(feasibility.score as number) ?? 92} 分</li>
            )}
          </ul>
          {publishError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{publishError}</p>}
        </div>
      )}

      {step === 7 && published && (
        <div className="card success-card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3>⑦ 创建完成</h3>
          <p style={{ margin: '8px 0' }}>
            应用「{publishedApp?.name ?? appName}」已发布，可分享给团队使用
          </p>
          {webUrl && (
            <p style={{ fontSize: 12, marginTop: 8 }}>
              访问链接：<a href={webUrl} target="_blank" rel="noreferrer">{webUrl}</a>
            </p>
          )}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            runtime-web 与 Flutter 将按同一 schema/manifest 契约渲染
          </p>
        </div>
      )}

      <div className="wizard-actions">
        <button type="button" className="btn btn-ghost-dark" disabled={step === 1 || publishing} onClick={() => setStep((s) => s - 1)}>
          上一步
        </button>
        {step < 6 ? (
          <button type="button" className="btn btn-primary-dark" disabled={(step === 2 && selected.size === 0) || loading} onClick={handleNext}>
            {loading ? '评估中…' : '下一步'}
          </button>
        ) : step === 6 ? (
          <button type="button" className="btn btn-primary-dark" disabled={publishing || !appName.trim()} onClick={handleNext}>
            {publishing ? '发布中…' : '确认发布'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary-dark"
            onClick={() => {
              setStep(1)
              setPublished(null)
              setFeasibility(null)
            }}
          >
            再创建一个
          </button>
        )}
      </div>
    </>
  )
}
