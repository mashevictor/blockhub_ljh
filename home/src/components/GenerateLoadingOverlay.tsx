import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { GENERATE_APP_LABEL, PUBLISH_OVERLAY_PROGRESS_MS } from '../data/publishUi'
import ChevronDotLoader from './ChevronDotLoader'

export type GeneratePhase = 'analyze' | 'publish' | 'redirect'

const STEPS: { key: Exclude<GeneratePhase, 'redirect'>; label: string }[] = [
  { key: 'analyze', label: '读懂你的需求' },
  { key: 'publish', label: '正在生成应用' },
]

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
  useBodyScrollLock(true)
  const [progress, setProgress] = useState(8)
  const startAt = useRef(performance.now())

  useEffect(() => {
    if (phase === 'redirect') {
      setProgress(100)
      return
    }

    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - startAt.current) / PUBLISH_OVERLAY_PROGRESS_MS)
      const next = t >= 1 ? 100 : Math.max(8, Math.round(easeOutCubic(t) * 100))
      setProgress(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  const phaseIndex = STEPS.findIndex((s) => s.key === phase)
  const nameHint = appName?.trim() ? `「${appName.trim()}」` : '你的应用'

  if (phase === 'redirect') {
    return createPortal(
      <div className="loading-overlay loading-overlay-portal loading-overlay-brand" role="alertdialog" aria-busy="true" aria-live="polite">
        <div className="loading-box">
          <ChevronDotLoader variant="converge" size="md" className="loading-chevron" label="完成" />
          <p className="loading-progress-value">{progress}%</p>
          <div className="loading-progress-track" aria-hidden>
            <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="loading-headline">
            {redirectHint || `${GENERATE_APP_LABEL}完成，正在打开「我的应用」…`}
          </p>
          <ol className="loading-steps">
            {STEPS.map((step) => (
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
      ? '正在理解你想做什么…'
      : progress >= 100
        ? `${GENERATE_APP_LABEL}完成，稍候…`
        : `快好了，正在${GENERATE_APP_LABEL}${nameHint}`

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
          {STEPS.map((step, i) => {
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
