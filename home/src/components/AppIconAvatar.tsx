interface Props {
  name: string
  iconUrl?: string
  primaryColor?: string
  size?: number
  className?: string
}

export default function AppIconAvatar({
  name,
  iconUrl,
  primaryColor = '#4338ca',
  size = 40,
  className = '',
}: Props) {
  const letter = (name || '应').slice(0, 1)
  const style = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.22),
    background: primaryColor,
    color: '#fff',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    fontSize: Math.round(size * 0.42),
    overflow: 'hidden',
    flexShrink: 0,
  } as const

  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ ...style, objectFit: 'cover' }}
      />
    )
  }

  return (
    <span className={className} style={style} aria-hidden>
      {letter}
    </span>
  )
}
