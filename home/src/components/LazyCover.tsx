import type { CSSProperties, ReactNode } from 'react'

/** 封面图：用 img + lazy，避免 CSS background 首屏并发拉取全部行业/新闻图 */
export default function LazyCover({
  src,
  alt,
  className,
  eager = false,
  children,
  style,
}: {
  src: string
  alt: string
  className?: string
  /** 首屏可见位图用 eager，其余默认 lazy */
  eager?: boolean
  children?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className={className} style={style} role="img" aria-label={alt}>
      <img
        className="lazy-cover-img"
        src={src}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : 'low'}
        draggable={false}
      />
      {children}
    </div>
  )
}
