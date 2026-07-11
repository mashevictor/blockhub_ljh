import { BRAND } from '../data/brand'
import { ChevronDotSign } from './ChevronDotLoader'
import type { ChevronDotSize } from '../data/chevronDotGrid'

type Variant = 'hero' | 'eyebrow' | 'section' | 'inline'

const SIGN_SIZE: Record<Variant, ChevronDotSize> = {
  hero: 'md',
  eyebrow: 'btn',
  section: 'sm',
  inline: 'btn',
}

interface Props {
  /** hero：英雄区主标题；eyebrow：顶栏胶囊；section：区块标题；inline：行内短句 */
  variant?: Variant
  className?: string
  as?: 'p' | 'h1' | 'h2' | 'span'
}

/** >> 重新定义智能交互 — 全站统一品牌句 */
export default function AgentSignLine({
  variant = 'inline',
  className = '',
  as: Tag = variant === 'hero' ? 'h2' : variant === 'section' ? 'h2' : 'p',
}: Props) {
  const aria = `大于号大于号${BRAND.agentSignLine}`
  return (
    <Tag
      className={`agent-sign-line agent-sign-line--${variant} ${className}`.trim()}
      aria-label={aria}
    >
      <ChevronDotSign size={SIGN_SIZE[variant]} className="agent-sign-chev-dot" />
      {BRAND.agentSignLine}
    </Tag>
  )
}
