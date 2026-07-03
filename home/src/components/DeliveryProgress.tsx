import type { PublishResult } from '../data/constants'
import { deliverLabel, normalizeDeliver } from '../data/deliverDisplay'
import { useApkBuildProgress } from '../hooks/useApkBuildProgress'

interface Props {
  app: Pick<PublishResult, 'appId' | 'deliver' | 'apkReady' | 'appName'>
  compact?: boolean
}

function stepIcon(status: 'done' | 'active' | 'pending' | 'error') {
  if (status === 'done') return '✓'
  if (status === 'active') return '◌'
  if (status === 'error') return '!'
  return '·'
}

export default function DeliveryProgress({ app, compact }: Props) {
  const { progress, steps, polling, apkReady, needApk } = useApkBuildProgress(app)
  const mode = normalizeDeliver(app.deliver)

  if (steps.length <= 1 && !needApk) return null

  return (
    <div className={`delivery-progress${compact ? ' compact' : ''}`} aria-live="polite">
      <div className="delivery-progress-head">
        <span className="delivery-progress-title">交付进度</span>
        <span className={`publish-deliver-badge mode-${mode}`}>{deliverLabel(mode)}</span>
        {polling && <span className="delivery-progress-polling">自动检测中…</span>}
        {needApk && apkReady && <span className="delivery-progress-done">全部就绪</span>}
      </div>

      <div className="delivery-progress-bar-wrap" aria-hidden>
        <div className="delivery-progress-bar" style={{ width: `${progress}%` }} />
      </div>
      <p className="delivery-progress-percent">{progress}%</p>

      <ol className="delivery-progress-steps">
        {steps.map((step) => (
          <li key={step.id} className={`delivery-step status-${step.status}`}>
            <span className="delivery-step-icon" aria-hidden>{stepIcon(step.status)}</span>
            <div className="delivery-step-body">
              <strong>{step.label}</strong>
              {step.detail && <span>{step.detail}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
