import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

export type GeneratePhase = 'analyze' | 'publish'

const STEPS: { key: GeneratePhase; label: string }[] = [
  { key: 'analyze', label: '理解需求 · 匹配功能' },
  { key: 'publish', label: '生成应用' },
]

interface Props {
  phase: GeneratePhase
}

export default function GenerateLoadingOverlay({ phase }: Props) {
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const phaseIndex = STEPS.findIndex((s) => s.key === phase)
  const headline =
    phase === 'analyze'
      ? '正在理解您的需求，匹配功能并生成应用…'
      : '正在发布应用，马上就好…'

  return createPortal(
    <div className="loading-overlay loading-overlay-portal" role="alertdialog" aria-busy="true" aria-live="polite">
      <div className="loading-box">
        <div className="spinner" aria-hidden />
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
