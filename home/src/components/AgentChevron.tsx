import type { ReactNode } from 'react'
import type { ChevronDotSize } from '../data/chevronDotGrid'
import { ChevronDotSign } from './ChevronDotLoader'

interface ChevronProps {
  /** >> 内短标签（与页面上下文联动，非按钮场景使用） */
  label?: string
  className?: string
  size?: ChevronDotSize
}

/** 方案 A · 标准描边 >> — 全站统一 SVG */
export function AgentChevronGlyph({
  size = 'btn',
  className = '',
}: {
  size?: ChevronDotSize
  className?: string
}) {
  return (
    <ChevronDotSign size={size} className={`agent-chevron-glyph ${className}`.trim()} />
  )
}

/** 智能体品牌符号 >> */
export function AgentChevronMark({ label, className = '', size = 'btn' }: ChevronProps) {
  return (
    <span className={`agent-chevron-mark ${className}`.trim()} aria-hidden>
      <AgentChevronGlyph size={size} />
      {label && <span className="agent-chevron-inner">{label}</span>}
    </span>
  )
}

interface ButtonChevronProps {
  children: ReactNode
  /** true：文案在前 >> 在后；false：>> 在前 */
  trailing?: boolean
  className?: string
  chevSize?: ChevronDotSize
}

/** 按钮内 >> 装饰：仅追加符号，不重复文案 */
export function AgentButtonContent({
  children,
  trailing = true,
  chevSize = 'btn',
}: ButtonChevronProps) {
  const chev = <AgentChevronGlyph size={chevSize} />
  if (!trailing) {
    return (
      <>
        {chev}
        <span className="agent-btn-text">{children}</span>
      </>
    )
  }
  return (
    <>
      <span className="agent-btn-text">{children}</span>
      {chev}
    </>
  )
}
