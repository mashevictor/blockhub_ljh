/** 勾选能力后：官方能力 / 待 AI 生成分流提示 */

import { useT } from '@blockhub/i18n/react'

interface Props {
  knownLabels: string[]
  pendingLabels: string[]
  compact?: boolean
}

export default function CapabilitySplitBanner({ knownLabels, pendingLabels, compact }: Props) {
  const t = useT()
  const joiner = t('home.cap_split.joiner')
  if (!knownLabels.length && !pendingLabels.length) return null
  return (
    <div className={`capability-split${compact ? ' compact' : ''}`} role="status">
      {knownLabels.length > 0 && (
        <div className="capability-split-row">
          <em>{t('home.cap_split.known')}</em>
          {' · '}
          {knownLabels.join(joiner)}
        </div>
      )}
      {pendingLabels.length > 0 && (
        <div className="capability-split-row">
          <em>{t('home.cap_split.pending')}</em>
          {' · '}
          {pendingLabels.join(joiner)}
          <span className="capability-split-note">{t('home.cap_split.pending_note')}</span>
        </div>
      )}
      {knownLabels.length > 0 && pendingLabels.length === 0 && (
        <div className="capability-split-row muted">{t('home.cap_split.contract')}</div>
      )}
    </div>
  )
}
