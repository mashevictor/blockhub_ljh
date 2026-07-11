/** 悬浮框标题：>> 与动态省略号 */
export default function AnimatedChevTitle({ className = '' }: { className?: string }) {
  return (
    <span className={`animated-chev-title ${className}`.trim()} aria-hidden>
      <span className="animated-chev-glyph">&gt;&gt;</span>
      <span className="animated-chev-dots">
        <span className="animated-chev-dot" />
        <span className="animated-chev-dot" />
        <span className="animated-chev-dot" />
      </span>
    </span>
  )
}
