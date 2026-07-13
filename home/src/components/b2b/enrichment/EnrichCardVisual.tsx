interface Props {
  icon: string
  label: string
  sublabel?: string
}

/** 与首页 b2b-template-preview-wrap 同构的卡片顶图 */
export default function EnrichCardVisual({ icon, label, sublabel }: Props) {
  return (
    <div className="enrich-card-visual" aria-hidden>
      <span className="enrich-card-icon">{icon}</span>
      <div className="enrich-card-visual-text">
        <span className="enrich-card-visual-label">{label}</span>
        {sublabel ? <span className="enrich-card-visual-sub">{sublabel}</span> : null}
      </div>
    </div>
  )
}
