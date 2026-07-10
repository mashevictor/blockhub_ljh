import { BRAND } from '../data/brand'

type Variant = 'hero' | 'eyebrow' | 'section' | 'inline'

interface Props {
  /** hero：英雄区主标题；eyebrow：顶栏胶囊；section：区块标题；inline：行内短句 */
  variant?: Variant
  className?: string
  as?: 'p' | 'h1' | 'h2' | 'span'
}

/** 用符号 >> 重新定义智能体新交互 — 全站统一品牌句 */
export default function AgentSignLine({
  variant = 'inline',
  className = '',
  as: Tag = variant === 'hero' ? 'h2' : variant === 'section' ? 'h2' : 'p',
}: Props) {
  const aria = BRAND.agentSignLine.replace('>>', '大于号大于号')
  return (
    <Tag
      className={`agent-sign-line agent-sign-line--${variant} ${className}`.trim()}
      aria-label={aria}
    >
      用符号<span className="agent-sign-chev" aria-hidden>&gt;&gt;</span>重新定义智能体新交互
    </Tag>
  )
}
