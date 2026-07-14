/** 勾选能力后：官方能力 / 待 AI 生成分流提示 */

interface Props {
  knownLabels: string[]
  pendingLabels: string[]
  compact?: boolean
}

export default function CapabilitySplitBanner({ knownLabels, pendingLabels, compact }: Props) {
  if (!knownLabels.length && !pendingLabels.length) return null
  return (
    <div className={`capability-split${compact ? ' compact' : ''}`} role="status">
      {knownLabels.length > 0 && (
        <div className="capability-split-row">
          <em>官方能力</em>
          {' · '}
          {knownLabels.join('、')}
        </div>
      )}
      {pendingLabels.length > 0 && (
        <div className="capability-split-row">
          <em>将 AI 生成</em>
          {' · '}
          {pendingLabels.join('、')}
          <span className="capability-split-note">（发布后异步生成预览页，不阻塞已知能力）</span>
        </div>
      )}
      {knownLabels.length > 0 && pendingLabels.length === 0 && (
        <div className="capability-split-row muted">所选能力均将进入官方契约，即时交付网页。</div>
      )}
    </div>
  )
}
