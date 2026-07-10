import type { ReactNode } from 'react'

interface ChevronProps {
  /** >> 内短标签（与页面上下文联动，非按钮场景使用） */
  label?: string
  className?: string
}

/** 智能体品牌符号 >> */
export function AgentChevronMark({ label, className = '' }: ChevronProps) {
  return (
    <span className={`agent-chevron-mark ${className}`.trim()} aria-hidden>
      <span className="agent-chevron-glyph">&gt;&gt;</span>
      {label && <span className="agent-chevron-inner">{label}</span>}
    </span>
  )
}

interface ButtonChevronProps {
  children: ReactNode
  /** true：文案在前 >> 在后；false：>> 在前 */
  trailing?: boolean
  className?: string
}

/** 按钮内 >> 装饰：仅追加符号，不重复文案 */
export function AgentButtonContent({ children, trailing = true }: ButtonChevronProps) {
  const chev = <span className="agent-chevron-glyph">&gt;&gt;</span>
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
