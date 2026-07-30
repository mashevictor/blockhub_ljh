import { forwardRef, type CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  CHEVRON_DEFAULT_SIZE,
  CHEVRON_DOT_POINTS,
  CHEVRON_DOT_SIZES,
  CHEVRON_SIGN_VIEWBOX,
  chevronDotRadius,
  chevronSignSvgPaths,
  type ChevronDotSize,
  type ChevronDotVariant,
} from '../data/chevronDotGrid'

interface LoaderProps {
  variant?: ChevronDotVariant
  size?: ChevronDotSize
  className?: string
  label?: string
}

function schemeClass(variant: ChevronDotVariant): string {
  if (variant === 'intro') return 'scheme-intro'
  if (variant === 'converge') return 'scheme-a'
  if (variant === 'scan') return 'scheme-b'
  return 'scheme-static'
}

function ChevronStrokeLoader({
  variant = 'scan',
  size = CHEVRON_DEFAULT_SIZE,
  className = '',
  label,
}: LoaderProps) {
  const t = useT()
  const aria = label ?? t('common.loading')
  const { width, height, stroke } = CHEVRON_DOT_SIZES[size]
  const paths = chevronSignSvgPaths()

  return (
    <svg
      className={`chevron-sign-loader ${schemeClass(variant)} ${className}`.trim()}
      width={width}
      height={height}
      viewBox={CHEVRON_SIGN_VIEWBOX}
      role="img"
      aria-label={aria}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={100}
        />
      ))}
    </svg>
  )
}

/** Loading >> — 默认点阵；悬浮框输入用 ChevronStrokeLoader */
const ChevronDotLoader = forwardRef<HTMLSpanElement, LoaderProps>(function ChevronDotLoader(
  {
    variant = 'scan',
    size = 'sm',
    className = '',
    label,
  },
  ref,
) {
  const t = useT()
  const aria = label ?? t('common.loading')
  const { width, height } = CHEVRON_DOT_SIZES[size]
  const dot = chevronDotRadius(size)
  const scheme = schemeClass(variant)

  return (
    <span
      ref={ref}
      className={`chevron-dot-loader dot-chev ${scheme} ${className}`.trim()}
      style={
        {
          '--cdl-w': `${width}px`,
          '--cdl-h': `${height}px`,
          '--ds': `${dot}px`,
          width: `${width}px`,
          height: `${height}px`,
        } as CSSProperties
      }
      role="img"
      aria-label={aria}
    >
      {CHEVRON_DOT_POINTS.map((p, i) => (
        <span
          key={i}
          className="dot"
          style={
            {
              left: `${p.nx * width}px`,
              top: `${p.ny * height}px`,
              '--i': i,
              '--order': p.strokeOrder,
              '--sx': `${(p.scatterX - p.nx) * width * 0.35}px`,
              '--sy': `${(p.scatterY - p.ny) * height * 0.35}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
})

export default ChevronDotLoader

/** 悬浮框输入 loading — SVG 描边（非点阵） */
export { ChevronStrokeLoader }

/** 品牌静态 >> — SVG 折线 */
export function ChevronDotSign({
  size = CHEVRON_DEFAULT_SIZE,
  className = '',
  introTarget = false,
}: {
  size?: ChevronDotSize
  className?: string
  /** 首页开场 FLIP 落点 */
  introTarget?: boolean
}) {
  const t = useT()
  const { width, height, stroke } = CHEVRON_DOT_SIZES[size]
  const paths = chevronSignSvgPaths()

  return (
    <svg
      className={`chevron-dot-sign chevron-sign-svg ${className}`.trim()}
      width={width}
      height={height}
      viewBox={CHEVRON_SIGN_VIEWBOX}
      role="img"
      aria-label={t('home.chevron.aria')}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(introTarget ? { 'data-intro-sign-target': '' } : {})}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

/** 行内 loading：点阵 + 文案 */
export function ChevronDotLoadingRow({
  variant = 'scan',
  size = 'sm',
  text,
  className = '',
}: {
  variant?: ChevronDotVariant
  size?: ChevronDotSize
  text: string
  className?: string
}) {
  return (
    <p className={`chevron-dot-loading-row ${className}`.trim()}>
      <ChevronDotLoader variant={variant} size={size} label={text} />
      <span>{text}</span>
    </p>
  )
}
