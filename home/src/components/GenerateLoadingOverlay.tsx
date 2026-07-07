import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

export type GeneratePhase = 'analyze' | 'publish' | 'redirect'

const STEPS: { key: Exclude<GeneratePhase, 'redirect'>; label: string }[] = [
  { key: 'analyze', label: '读懂你的需求' },
  { key: 'publish', label: '正在为你搭建' },
]

interface Props {
  phase: GeneratePhase
  appName?: string
}

export default function GenerateLoadingOverlay({ phase, appName }: Props) {
  useBodyScrollLock(true)
  const [progress, setProgress] = useState(8)

  useEffect(() => {
    if (phase === 'redirect') {
      setProgress(100)
      return
    }
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (phase === 'analyze') return Math.min(46, p + 2.4)
        if (phase === 'publish') return Math.min(97, p + 1.1)
        return p
      })
    }, 45)
    return () => window.clearInterval(id)
  }, [phase])

  const phaseIndex = STEPS.findIndex((s) => s.key === phase)
  const nameHint = appName?.trim() ? `「${appName.trim()}」` : '你的应用'

  if (phase === 'redirect') {
    return createPortal(
      <div className="loading-overlay loading-overlay-portal" role="alertdialog" aria-busy="true" aria-live="polite">
        <div className="loading-box">
          <p className="loading-progress-value">{progress}%</p>
          <div className="loading-progress-track" aria-hidden>
            <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="loading-headline">搭建完成，正在打开{nameHint}…</p>
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
      : `快好了，正在搭建${nameHint}`

  return createPortal(
    <div className="loading-overlay loading-overlay-portal" role="alertdialog" aria-busy="true" aria-live="polite">
      <div className="loading-box">
        <p className="loading-progress-value">{Math.round(progress)}%</p>
        <div className="loading-progress-track" aria-hidden>
          <div className="loading-progress-fill" style={{ width: `${Math.round(progress)}%` }} />
        </div>
        <p className="loading-headline">{headline}</p>
        <ol className="loading-steps">
          {STEPS.map((step, i) => {
            const done = i < phaseIndex
            const active = i === phaseIndex
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
