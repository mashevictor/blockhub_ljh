import { useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  checkFeasibility,
  fetchCreationScenarios,
  fetchCreationWizard,
  publishApp,
  type IndustryPack,
  type WizardStep,
} from '../api/client'
import { homeAbsoluteUrl } from '../data/brand'

type DeliverMode = 'web' | 'app' | 'both'

export default function CreationWizardPage() {
  const t = useT()
  const deliverOptions = useMemo((): { key: DeliverMode; label: string; desc: string }[] => [
    { key: 'web', label: t('admin.overview.deliver.web'), desc: t('admin.create.deliver.web.desc') },
    { key: 'app', label: t('admin.overview.deliver.app'), desc: t('admin.create.deliver.app.desc') },
    { key: 'both', label: t('admin.overview.deliver.both'), desc: t('admin.create.deliver.both.desc') },
  ], [t])
  const [steps, setSteps] = useState<WizardStep[]>([])
  const [packs, setPacks] = useState<IndustryPack[]>([])
  const [step, setStep] = useState(1)
  const [industryKey, setIndustryKey] = useState('office')
  const [scenarios, setScenarios] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [feasibility, setFeasibility] = useState<Record<string, unknown> | null>(null)
  const [appName, setAppName] = useState(() => t('admin.create.default_app_name'))
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
        const app = result?.app as { id?: string; web_url?: string } | undefined
        const runtime = result?.runtime as { web_url?: string } | undefined
        const href =
          runtime?.web_url ||
          app?.web_url ||
          (app?.id ? homeAbsoluteUrl(`/r/${encodeURIComponent(app.id)}`) : '')
        if (href) {
          window.location.assign(href)
          return
        }
        setStep(7)
      } catch {
        setPublishError(t('admin.create.publish_failed'))
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
  const selectedDeliver = deliverOptions.find((d) => d.key === deliver)

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.create.title')}</h1>
        <p>{t('admin.page.create.desc')}</p>
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
          <h3 style={{ marginBottom: 6 }}>{t('admin.create.step1.title')}</h3>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            {t('admin.create.step1.lead')}
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
                {industryKey === p.key && <span className="industry-selected-tag">{t('admin.create.selected_tag')}</span>}
              </button>
            ))}
          </div>
          <div className="preview-box">
            <strong>{t('admin.create.pack_preview')}</strong>
            <p>{currentPack?.preview}</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('admin.create.step2.title', { n: selected.size })}</h3>
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
          <h3 style={{ marginBottom: 12 }}>{t('admin.create.step3.title')}</h3>
          {feasibility ? (
            <div className="feasibility-result">
              <div className="feas-score">{t('admin.create.step3.score', { n: (feasibility.score as number) ?? 92 })}</div>
              <p>{feasibility.summary as string}</p>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                {t('admin.create.step3.includes', { list: (feasibility.capabilities as string[])?.join('、') ?? '' })}
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>{t('admin.create.step3.evaluating')}</p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('admin.create.step4.title')}</h3>
          <label style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.create.step4.field_name')}</label>
          <input
            className="search-input"
            style={{ display: 'block', marginTop: 6, width: '100%' }}
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder={t('admin.create.step4.name_ph')}
          />
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
            {t('admin.create.step4.summary', { industry: currentPack?.name ?? '', n: selected.size })}
          </p>
        </div>
      )}

      {step === 5 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t('admin.create.step5.title')}</h3>
          <div className="industry-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {deliverOptions.map((d) => (
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
          <h3 style={{ marginBottom: 12 }}>{t('admin.create.step6.title')}</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>{t('admin.create.step6.app_name')}<strong>{appName}</strong></li>
            <li>{t('admin.create.step6.industry')}{currentPack?.name}</li>
            <li>{t('admin.create.step6.scenes', { n: selected.size })}</li>
            <li>{t('admin.create.step6.deliver')}{selectedDeliver?.label}</li>
            {feasibility && (
              <li>{t('admin.create.step6.score', { n: (feasibility.score as number) ?? 92 })}</li>
            )}
          </ul>
          {publishError && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{publishError}</p>}
        </div>
      )}

      {step === 7 && published && (
        <div className="card success-card">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <h3>{t('admin.create.step7.title')}</h3>
          <p style={{ margin: '8px 0' }}>
            {t('admin.create.step7.published', { name: publishedApp?.name ?? appName })}
          </p>
          {webUrl && (
            <p style={{ fontSize: 12, marginTop: 8 }}>
              {t('admin.create.step7.link')}<a href={webUrl} target="_blank" rel="noreferrer">{webUrl}</a>
            </p>
          )}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            {t('admin.create.step7.manifest_hint')}
          </p>
        </div>
      )}

      <div className="wizard-actions">
        <button type="button" className="btn btn-ghost-dark" disabled={step === 1 || publishing} onClick={() => setStep((s) => s - 1)}>
          {t('common.back')}
        </button>
        {step < 6 ? (
          <button type="button" className="btn btn-primary-dark" disabled={(step === 2 && selected.size === 0) || loading} onClick={handleNext}>
            {loading ? t('admin.create.evaluating') : t('admin.create.next')}
          </button>
        ) : step === 6 ? (
          <button type="button" className="btn btn-primary-dark" disabled={publishing || !appName.trim()} onClick={handleNext}>
            {publishing ? t('admin.create.publishing') : t('admin.create.confirm_publish')}
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
            {t('admin.create.create_another')}
          </button>
        )}
      </div>
    </>
  )
}
