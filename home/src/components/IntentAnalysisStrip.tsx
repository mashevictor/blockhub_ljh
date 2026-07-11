import { ChevronStrokeLoader } from './ChevronDotLoader'

interface Props {
  visible: boolean
  progress: number
  phase: 'idle' | 'debounce' | 'fetch' | 'done'
}

const PHASE_LABEL: Record<Props['phase'], string> = {
  idle: '',
  debounce: '等你输入完成…',
  fetch: '正在理解你的描述…',
  done: '好了',
}

export default function IntentAnalysisStrip({ visible, progress, phase }: Props) {
  if (!visible || phase === 'idle') return null

  const pct = Math.max(4, Math.min(100, Math.round(progress)))
  const active = phase === 'fetch' || phase === 'debounce'

  return (
    <div className="intent-analysis-strip" role="status" aria-live="polite">
      <ChevronStrokeLoader
        variant="scan"
        size="btn"
        label={PHASE_LABEL[phase]}
      />
      <div className="intent-analysis-body">
        <div className="intent-analysis-track" aria-hidden>
          <div
            className={`intent-analysis-fill${phase === 'fetch' ? ' fetching' : ''}${phase === 'done' ? ' done' : ''}`}
            style={{ width: phase === 'fetch' ? undefined : `${pct}%` }}
          />
        </div>
        <span className="intent-analysis-label">
          {active ? PHASE_LABEL[phase] : PHASE_LABEL[phase]}
        </span>
      </div>
    </div>
  )
}
