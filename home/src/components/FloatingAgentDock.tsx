import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

interface DockPosition {
  x: number
  y: number
}

interface Props {
  children: ReactNode
  /** localStorage 键前缀，区分不同页面悬浮框 */
  storageKey: string
  className?: string
  /** 顶栏标题 */
  title?: string
  /** 折叠后显示的摘要 */
  collapsedHint?: string
  /** 顶栏 >> 短标签 */
  chevLabel?: string
  ariaLabel?: string
}

const DOCK_WIDTH = 720
const MARGIN = 16
const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label, [contenteditable="true"]'

function loadPosition(key: string): DockPosition | null {
  try {
    const raw = localStorage.getItem(`${key}:pos`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DockPosition
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    /* ignore */
  }
  return null
}

function loadCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(`${key}:collapsed`) === '1'
  } catch {
    return false
  }
}

function defaultPosition(width: number, height: number): DockPosition {
  const w = Math.min(width, window.innerWidth - MARGIN * 2)
  const x = Math.max(MARGIN, (window.innerWidth - w) / 2)
  const bottomInset = MARGIN + (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0)
  const y = Math.max(MARGIN, window.innerHeight - height - bottomInset)
  return { x, y }
}

function clampPosition(pos: DockPosition, dockW: number, dockH: number): DockPosition {
  const maxX = Math.max(MARGIN, window.innerWidth - dockW - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - dockH - MARGIN)
  return {
    x: Math.min(Math.max(MARGIN, pos.x), maxX),
    y: Math.min(Math.max(MARGIN, pos.y), maxY),
  }
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(INTERACTIVE_SELECTOR))
}

export default function FloatingAgentDock({
  children,
  storageKey,
  className = '',
  title = '智能体助手',
  collapsedHint = '点击展开继续操作',
  chevLabel = '助手',
  ariaLabel = '智能体悬浮面板',
}: Props) {
  const dockRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [collapsed, setCollapsed] = useState(() => loadCollapsed(storageKey))
  const [pos, setPos] = useState<DockPosition | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = loadPosition(storageKey)
    if (stored) return stored
    return defaultPosition(DOCK_WIDTH, 180)
  })
  const [dragging, setDragging] = useState(false)
  const panelId = useId()

  const persistPos = useCallback(
    (next: DockPosition) => {
      try {
        localStorage.setItem(`${storageKey}:pos`, JSON.stringify(next))
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  const persistCollapsed = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(`${storageKey}:collapsed`, next ? '1' : '0')
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  const ensureVisible = useCallback(() => {
    const el = dockRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos((prev) => {
      if (!prev) return prev
      const next = clampPosition(prev, rect.width, rect.height)
      if (next.x === prev.x && next.y === prev.y) return prev
      persistPos(next)
      return next
    })
  }, [persistPos])

  useLayoutEffect(() => {
    const el = dockRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const stored = loadPosition(storageKey)
    const initial = stored ?? defaultPosition(rect.width || DOCK_WIDTH, rect.height || 180)
    const next = clampPosition(initial, rect.width, rect.height)
    setPos(next)
    persistPos(next)
  }, [storageKey, persistPos])

  useLayoutEffect(() => {
    ensureVisible()
  }, [children, collapsed, ensureVisible])

  useEffect(() => {
    const el = dockRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => ensureVisible())
    ro.observe(el)
    return () => ro.disconnect()
  }, [ensureVisible])

  useEffect(() => {
    const onResize = () => ensureVisible()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [ensureVisible])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      persistCollapsed(next)
      return next
    })
  }, [persistCollapsed])

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pos || e.button !== 0 || isInteractiveTarget(e.target)) return
      e.preventDefault()
      const handle = e.currentTarget
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      setDragging(true)
      handle.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const el = dockRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        const next = clampPosition(
          { x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y },
          rect.width,
          rect.height,
        )
        setPos(next)
      }

      const onUp = (ev: PointerEvent) => {
        setDragging(false)
        handle.releasePointerCapture(ev.pointerId)
        const el = dockRef.current
        if (el) {
          const rect = el.getBoundingClientRect()
          setPos((prev) => {
            if (!prev) return prev
            const next = clampPosition(prev, rect.width, rect.height)
            persistPos(next)
            return next
          })
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [pos, persistPos],
  )

  const style: CSSProperties | undefined = pos
    ? { left: pos.x, top: pos.y, bottom: 'auto', transform: 'none' }
    : undefined

  return (
    <div
      ref={dockRef}
      className={`floating-agent-dock${collapsed ? ' is-collapsed' : ''}${dragging ? ' is-dragging' : ''} ${className}`.trim()}
      style={style}
      role="complementary"
      aria-label={ariaLabel}
    >
      <div className="floating-agent-dock-frame">
        <div
          className="floating-agent-dock-chrome"
          onPointerDown={onDragStart}
        >
          <span className="floating-agent-dock-grip" aria-hidden />
          <button
            type="button"
            className="floating-agent-dock-brand"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={panelId}
          >
            <span className="agent-brand-chev" aria-hidden>&gt;&gt;</span>
            <span className="floating-agent-dock-title">{title}</span>
            <span className="floating-agent-dock-chev-label">{chevLabel}</span>
          </button>
          {collapsed && (
            <span className="floating-agent-dock-collapsed-hint">{collapsedHint}</span>
          )}
          <button
            type="button"
            className="floating-agent-dock-toggle"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls={panelId}
            aria-label={collapsed ? '展开悬浮框' : '折叠悬浮框'}
          >
            <span className={`floating-agent-dock-caret${collapsed ? '' : ' open'}`} aria-hidden />
          </button>
        </div>
        <div
          id={panelId}
          className="floating-agent-dock-body"
          aria-hidden={collapsed}
          onPointerDown={onDragStart}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
