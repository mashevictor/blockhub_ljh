import { staticUrl } from '../../../lib/staticUrl'

interface Props {
  icon: string
  label: string
  sublabel?: string
  /** 新闻等场景使用真实封面图 */
  imageUrl?: string
  /** 封面图上的叠加层：full 标题+日期 | badge 仅角标 | none 纯图 */
  photoOverlay?: 'full' | 'badge' | 'none'
}

/** 与首页 b2b-template-preview-wrap 同构的卡片顶图 */
export default function EnrichCardVisual({
  icon,
  label,
  sublabel,
  imageUrl,
  photoOverlay = 'full',
}: Props) {
  const showOverlay = imageUrl && photoOverlay !== 'none'
  const badgeOnly = imageUrl && photoOverlay === 'badge'
  const src = imageUrl ? staticUrl(imageUrl) : ''

  return (
    <div
      className={`enrich-card-visual${imageUrl ? ' enrich-card-visual--photo' : ''}${badgeOnly ? ' enrich-card-visual--photo-badge' : ''}`}
      aria-hidden={!imageUrl}
      role={imageUrl ? 'img' : undefined}
      aria-label={imageUrl ? label : undefined}
    >
      {src ? (
        <img
          className="lazy-cover-img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          draggable={false}
        />
      ) : null}
      {!imageUrl ? (
        <>
          <span className="enrich-card-icon">{icon}</span>
          <div className="enrich-card-visual-text">
            <span className="enrich-card-visual-label">{label}</span>
            {sublabel ? <span className="enrich-card-visual-sub">{sublabel}</span> : null}
          </div>
        </>
      ) : showOverlay ? (
        badgeOnly ? (
          <div className="enrich-card-photo-badges">
            <span className="enrich-card-photo-badge">{label}</span>
            {sublabel ? <span className="enrich-card-photo-badge enrich-card-photo-badge--muted">{sublabel}</span> : null}
          </div>
        ) : (
          <div className="enrich-card-visual-text enrich-card-visual-text--overlay">
            <span className="enrich-card-visual-label">{label}</span>
            {sublabel ? <span className="enrich-card-visual-sub">{sublabel}</span> : null}
          </div>
        )
      ) : null}
    </div>
  )
}
