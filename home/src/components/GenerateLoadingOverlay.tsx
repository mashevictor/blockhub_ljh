import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@blockhub/i18n/react'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { PUBLISH_OVERLAY_PROGRESS_MS } from '../data/publishUi'
import { publishGenerateLabel } from '../i18n/publishLabels'
import ChevronDotLoader from './ChevronDotLoader'

export type GeneratePhase = 'analyze' | 'publish' | 'redirect'

const STEP_KEYS: Exclude<GeneratePhase, 'redirect'>[] = ['analyze', 'publish']

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

interface Props {
  phase: GeneratePhase
  appName?: string
  /** redirect 阶段文案；默认「正在打开我的应用」 */
  redirectHint?: string
}

export default function GenerateLoadingOverlay({ phase, appName, redirectHint }: Props) {
  const t = useT()
  const generateLabel = publishGenerateLabel(t)
  useBodyScrollLock(true)
  const [progress, setProgress] = useState(8)
  const startAt = useRef(performance.now())

  const steps = STEP_KEYS.map((key) => ({
    key,
    label: t(`home.loading.step.${key}`),
  }))

  useEffect(() => {
    if (phase === 'redirect') {
      setProgress(100)
      return
    }

    let raf = 0
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - startAt.current) / PUBLISH_OVERLAY_PROGRESS_MS)
      const next = ratio >= 1 ? 100 : Math.max(8, Math.round(easeOutCubic(ratio) * 100))
      setProgress(next)
      if (ratio < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const phaseIndex = steps.findIndex((s) => s.key === phase)
  const nameHint = appName?.trim()
    ? t('home.loading.name_wrap', { name: appName.trim() })
    : t('home.loading.app_fallback')

  if (phase === 'redirect') {
    return createPortal(
      <div className="loading-overlay loading-overlay-portal loading-overlay-brand" role="alertdialog" aria-busy="true" aria-live="polite">
        <div className="loading-box">
          <ChevronDotLoader variant="converge" size="md" className="loading-chevron" label={t('home.loading.done')} />
          <p className="loading-progress-value">{progress}%</p>
          <div className="loading-progress-track" aria-hidden>
            <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="loading-headline">
            {redirectHint || t('home.loading.redirect', { action: generateLabel })}
          </p>
          <ol className="loading-steps">
            {steps.map((step) => (
              <li key={step.key} className="loading-step done">
                <span className="loading-step-dot" aria-hidden />
                {step.label}
              </li>
            ))}
          </ol>
        </div>
      </div>,
      document.body,
    )
  }

  const headline =
    phase === 'analyze'
      ? t('home.loading.analyze')
      : progress >= 100
        ? t('home.loading.publish_done', { action: generateLabel })
        : t('home.loading.publish_busy', { action: generateLabel, name: nameHint })

  return createPortal(
    <div className="loading-overlay loading-overlay-portal loading-overlay-brand" role="alertdialog" aria-busy="true" aria-live="polite">
      <div className="loading-box">
        <ChevronDotLoader
          variant={phase === 'analyze' ? 'scan' : 'converge'}
          size="md"
          className="loading-chevron"
          label={headline}
        />
        <p className="loading-progress-value">{progress}%</p>
        <div className="loading-progress-track" aria-hidden>
          <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-headline">{headline}</p>
        <ol className="loading-steps">
          {steps.map((step, i) => {
            const done = i < phaseIndex || (i === phaseIndex && progress >= 100)
            const active = i === phaseIndex && progress < 100
            return (
              <li key={step.key} className={`loading-step${done ? ' done' : ''}${active ? ' active' : ''}`}>
                <span className="loading-step-dot" aria-hidden />
                {step.label}
              </li>
            )
          })}
        </ol>
      </div>
    </div>,
    document.body,
  )
}
