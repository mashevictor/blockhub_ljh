import { useT } from '@blockhub/i18n/react'
import { ChevronStrokeLoader } from './ChevronDotLoader'

interface Props {
  visible: boolean
  progress: number
  phase: 'idle' | 'debounce' | 'fetch' | 'done'
}

export default function IntentAnalysisStrip({ visible, progress, phase }: Props) {
  const t = useT()
  if (!visible || phase === 'idle') return null

  const pct = Math.max(4, Math.min(100, Math.round(progress)))
  const active = phase === 'fetch' || phase === 'debounce'
  const label =
    phase === 'debounce'
      ? t('home.intent.phase.debounce')
      : phase === 'fetch'
        ? t('home.intent.phase.fetch')
        : t('home.intent.phase.done')

  return (
    <div className="intent-analysis-strip" role="status" aria-live="polite">
      <ChevronStrokeLoader
        variant="scan"
        size="btn"
        label={label}
      />
      <div className="intent-analysis-body">
        <div className="intent-analysis-track" aria-hidden>
          <div
            className={`intent-analysis-fill${phase === 'fetch' ? ' fetching' : ''}${phase === 'done' ? ' done' : ''}`}
            style={{ width: phase === 'fetch' ? undefined : `${pct}%` }}
          />
        </div>
        <span className="intent-analysis-label">
          {active ? label : label}
        </span>
      </div>
    </div>
  )
}
