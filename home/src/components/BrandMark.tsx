import { LOGO } from '../data/brand'

interface Props {
  size?: number
  className?: string
}

/** 与顶栏一致的 Logo 容器（白底圆角） */
export default function BrandMark({ size = 42, className = '' }: Props) {
  return (
    <span
      className={`brand-mark${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
    >
      <img
        src={LOGO.mark}
        alt=""
        width={size}
        height={size}
        decoding="sync"
        fetchPriority="high"
      />
    </span>
  )
}
