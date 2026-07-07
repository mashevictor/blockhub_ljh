import { useEffect, useState } from 'react'
import {
  checkFeasibility,
  fetchCreationScenarios,
  fetchCreationWizard,
  publishApp,
  type IndustryPack,
  type WizardStep,
} from '../api/client'

export default function CreationWizardPage() {
  const [steps, setSteps] = useState<WizardStep[]>([])
  const [packs, setPacks] = useState<IndustryPack[]>([])
  const [step, setStep] = useState(1)
  const [industryKey, setIndustryKey] = useState('office')
  const [scenarios, setScenarios] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [feasibility, setFeasibility] = useState<Record<string, unknown> | null>(null)
  const [appName, setAppName] = useState('我的智能应用')
  const [published, setPublished] = useState<Record<string, unknown> | null>(null)

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
      const result = await checkFeasibility(industryKey, [...selected])
      setFeasibility(result)
    }
    if (step === 3) {
      const result = await publishApp(appName, industryKey, [...selected])
      setPublished(result)
    }
    setStep((s) => Math.min(4, s + 1))
  }

  return (
    <>
      <div className="page-header">
        <h1>创建应用</h1>
        <p>选行业 → 勾选需要的功能 → 确认后发布，通过链接或 App 即可使用</p>
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
          <h3 style={{ marginBottom: 6 }}>选择行业方案包</h3>
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
          <h3 style={{ marginBottom: 12 }}>选择场景（已选 {selected.size} 项）</h3>
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

      {step === 3 && feasibility && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>方案评估</h3>
          <div className="feasibility-result">
            <div className="feas-score">{(feasibility.score as number) ?? 92} 分</div>
            <p>{feasibility.summary as string}</p>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>应用名称</label>
              <input
                className="search-input"
                style={{ display: 'block', marginTop: 6, width: '100%' }}
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              将包含：{(feasibility.capabilities as string[])?.join('、')}
            </div>
          </div>
        </div>
      )}

      {step === 4 && published && (
        <div className="card success-card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3>创建完成</h3>
          <p style={{ margin: '8px 0' }}>应用「{(published.app as { name: string })?.name}」已发布，可分享给团队使用</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            访问链接已生成，可在创建页或管理后台查看
          </p>
        </div>
      )}

      <div className="wizard-actions">
        <button type="button" className="btn btn-ghost-dark" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
          上一步
        </button>
        {step < 4 ? (
          <button type="button" className="btn btn-primary-dark" onClick={handleNext}>
            下一步
          </button>
        ) : (
          <button type="button" className="btn btn-primary-dark" onClick={() => { setStep(1); setPublished(null) }}>
            再创建一个
          </button>
        )}
      </div>
    </>
  )
}
