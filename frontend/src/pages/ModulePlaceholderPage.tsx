interface Props {
  icon: string
  title: string
  desc: string
  pipeline?: string
}

export default function ModulePlaceholderPage({ icon, title, desc, pipeline }: Props) {
  return (
    <div className="placeholder-page">
      <div className="icon">{icon}</div>
      <h2>{title}</h2>
      <p style={{ maxWidth: 480, margin: '0 auto 12px' }}>{desc}</p>
      {pipeline && (
        <p style={{ fontFamily: 'Consolas, monospace', fontSize: 12, color: 'var(--pri)' }}>{pipeline}</p>
      )}
      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>该功能正在完善中，敬请期待</p>
    </div>
  )
}
