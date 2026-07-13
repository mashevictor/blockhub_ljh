import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { FloatingDockProvider, type FloatingDockVariant } from '../context/FloatingDockContext'
import { ChevronDotSign } from './ChevronDotLoader'

interface DockPosition {
  x: number
  y: number
}

interface StoredDockPosition extends DockPosition {
  anchor?: string
  userMoved?: boolean
}

function anchorStorageKey(selector: string | undefined, vertical: 'below' | 'top'): string | undefined {
  if (!selector) return undefined
  return `${selector}|${vertical}`
}

interface Props {
  children: ReactNode
  /** localStorage 键前缀，区分不同页面悬浮框 */
  storageKey: string
  className?: string
  /** 顶栏标题（可为 >>… 动态组件） */
  title?: ReactNode
  /** 折叠后显示的摘要（capsule 模式忽略） */
  collapsedHint?: string
  /** 顶栏 >> 短标签，空字符串时不显示 */
  chevLabel?: string
  /** default：经典顶栏；capsule：单行胶囊，折叠可输入 */
  variant?: FloatingDockVariant
  /** @deprecated 使用 variant="capsule" */
  keepInputWhenCollapsed?: boolean
  ariaLabel?: string
  /** 从折叠展开时的回调（如打开 >> 选模块） */
  onExpand?: () => void
  /** 展开时吸附到视口底部，给上方模块面板留空间 */
  snapBottomOnExpand?: boolean
  /** 胶囊模式显示开关（默认开启 = 显示悬浮框） */
  showDockToggle?: boolean
  /** 无保存位置时，默认锚定到该选择器下方（如 hero 按钮区） */
  defaultAnchorSelector?: string
  /** 折叠胶囊宽度对齐该选择器（如 hero 主标题） */
  collapsedWidthSelector?: string
  /** 关闭悬浮框时，锚定到该选择器下方（如顶栏品牌 icon） */
  closedAnchorSelector?: string
  /** 首次进入默认展开（仍尊重用户手动折叠后的 localStorage） */
  defaultExpanded?: boolean
  /** 锚点对齐：left 贴左，right 贴右 */
  anchorAlign?: 'left' | 'right'
  /** 递增时强制展开（如首页演示注入） */
  expandSignal?: number
  /** below：锚点下方；top：与锚点顶对齐 */
  anchorVerticalAlign?: 'below' | 'top'
  /** 递增时重新对齐锚点（如首页 intro 结束后） */
  repositionSignal?: number
  /** 胶囊折叠时在 tail 显示展开/折叠按钮（广场等非输入型 dock） */
  collapseToggleInTail?: boolean
}

const DOCK_WIDTH = 720
const MARGIN = 16
const ANCHOR_GAP = 16
const INTERACTIVE_SELECTOR = 'button, input, textarea, select, a, label, [contenteditable="true"]'

function loadStoredPosition(key: string): StoredDockPosition | null {
  try {
    const raw = localStorage.getItem(`${key}:pos`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDockPosition
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed
  } catch {
    /* ignore */
  }
  return null
}

function loadPosition(key: string, expectedAnchor?: string): DockPosition | null {
  const stored = loadStoredPosition(key)
  if (!stored) return null
  if (stored.userMoved) return stored
  if (expectedAnchor && stored.anchor !== expectedAnchor) return null
  return stored
}

function isUserMovedPosition(key: string): boolean {
  return loadStoredPosition(key)?.userMoved === true
}

function loadCollapsed(key: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${key}:collapsed`)
    if (raw === null) return null
    return raw === '1'
  } catch {
    return null
  }
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
}

function loadDockEnabled(key: string): boolean {
  try {
    const raw = localStorage.getItem(`${key}:enabled`)
    if (raw === '0') return false
    return true
  } catch {
    return true
  }
}

function defaultPosition(width: number, height: number): DockPosition {
  const w = Math.min(width, window.innerWidth - MARGIN * 2)
  const x = Math.max(MARGIN, (window.innerWidth - w) / 2)
  const bottomInset = MARGIN + (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0)
  const y = Math.max(MARGIN, window.innerHeight - height - bottomInset)
  return { x, y }
}

function positionAtAnchor(
  anchor: DOMRect,
  dockW: number,
  dockH: number,
  align: 'left' | 'right' = 'left',
  vertical: 'below' | 'top' = 'below',
): DockPosition {
  const w = Math.min(dockW, window.innerWidth - MARGIN * 2)
  const x = align === 'right'
    ? Math.max(MARGIN, anchor.right - w)
    : Math.max(MARGIN, anchor.left)
  const y = vertical === 'top'
    ? anchor.top
    : anchor.bottom + ANCHOR_GAP
  return clampPosition({ x, y }, w, dockH)
}

function clampPosition(pos: DockPosition, dockW: number, dockH: number): DockPosition {
  const maxX = Math.max(MARGIN, window.innerWidth - dockW - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - dockH - MARGIN)
  return {
    x: Math.min(Math.max(MARGIN, pos.x), maxX),
    y: Math.min(Math.max(MARGIN, pos.y), maxY),
  }
}

function resolveInitialPosition(
  storageKey: string,
  anchorSelector: string | undefined,
  dockW: number,
  dockH: number,
  anchorAlign: 'left' | 'right' = 'left',
  anchorVerticalAlign: 'below' | 'top' = 'below',
): DockPosition {
  if (isMobileViewport()) {
    return defaultPosition(dockW, dockH)
  }
  const anchorKey = anchorStorageKey(anchorSelector, anchorVerticalAlign)
  const stored = loadPosition(storageKey, anchorKey)
  if (stored) return stored
  if (anchorSelector && typeof document !== 'undefined') {
    const anchor = document.querySelector(anchorSelector)
    if (anchor) {
      return positionAtAnchor(anchor.getBoundingClientRect(), dockW, dockH, anchorAlign, anchorVerticalAlign)
    }
  }
  return defaultPosition(dockW, dockH)
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
  collapsedHint = '点击展开',
  chevLabel = '助手',
  variant: variantProp = 'default',
  keepInputWhenCollapsed = false,
  ariaLabel = '智能体悬浮面板',
  onExpand,
  snapBottomOnExpand = false,
  showDockToggle = false,
  defaultAnchorSelector,
  collapsedWidthSelector: _collapsedWidthSelector = '.b2b-hero-tagline em',
  closedAnchorSelector,
  defaultExpanded = false,
  anchorAlign = 'left',
  expandSignal = 0,
  anchorVerticalAlign = 'below',
  repositionSignal = 0,
  collapseToggleInTail = false,
}: Props) {
  const variant: FloatingDockVariant = variantProp === 'default' && keepInputWhenCollapsed ? 'capsule' : variantProp
  const isCapsule = variant === 'capsule'

  const dockRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const [collapsed, setCollapsed] = useState(() => {
    if (isMobileViewport()) return true
    const saved = loadCollapsed(storageKey)
    if (saved !== null) return saved
    if (defaultExpanded) return false
    return true
  })
  const [dockEnabled, setDockEnabled] = useState(() => loadDockEnabled(storageKey))
  const [pos, setPos] = useState<DockPosition | null>(null)
  const [dragging, setDragging] = useState(false)
  const panelId = useId()

  const persistPos = useCallback(
    (next: DockPosition, meta?: Pick<StoredDockPosition, 'anchor' | 'userMoved'>) => {
      try {
        const prev = loadStoredPosition(storageKey)
        localStorage.setItem(
          `${storageKey}:pos`,
          JSON.stringify({
            ...next,
            anchor: meta?.anchor ?? prev?.anchor,
            userMoved: meta?.userMoved ?? prev?.userMoved,
          }),
        )
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  )

  const persistDockEnabled = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(`${storageKey}:enabled`, next ? '1' : '0')
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

  const snapToBottom = useCallback(() => {
    const el = dockRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = defaultPosition(rect.width || DOCK_WIDTH, rect.height || (isCapsule ? 56 : 180))
    setPos(next)
    persistPos(next)
  }, [isCapsule, persistPos])

  const snapToAnchor = useCallback(
    (selector: string | undefined, persist = false, vertical = anchorVerticalAlign) => {
      if (!selector || typeof document === 'undefined') return false
      const anchor = document.querySelector(selector)
      const el = dockRef.current
      if (!anchor || !el) return false
      const rect = el.getBoundingClientRect()
      const dockH = rect.height || (isCapsule ? 48 : 180)
      const dockW = rect.width || DOCK_WIDTH
      const next = clampPosition(
        positionAtAnchor(anchor.getBoundingClientRect(), dockW, dockH, anchorAlign, vertical),
        dockW,
        dockH,
      )
      setPos(next)
      if (persist) {
        persistPos(next, {
          anchor: anchorStorageKey(selector, vertical),
          userMoved: false,
        })
      }
      return true
    },
    [isCapsule, persistPos, anchorAlign, anchorVerticalAlign],
  )

  const snapToClosedAnchor = useCallback(() => {
    snapToAnchor(closedAnchorSelector)
  }, [closedAnchorSelector, snapToAnchor])

  const restoreOpenPosition = useCallback(() => {
    const el = dockRef.current
    const dockH = el?.getBoundingClientRect().height || (isCapsule ? 48 : 180)
    const dockW = el?.getBoundingClientRect().width || DOCK_WIDTH
    if (isMobileViewport()) {
      setPos(defaultPosition(dockW, dockH))
      return
    }
    const anchorKey = anchorStorageKey(defaultAnchorSelector, anchorVerticalAlign)
    const stored = loadPosition(storageKey, anchorKey)
    if (stored) {
      setPos(clampPosition(stored, dockW, dockH))
      return
    }
    if (snapToAnchor(defaultAnchorSelector, true)) return
    setPos(defaultPosition(dockW, dockH))
  }, [storageKey, defaultAnchorSelector, isCapsule, snapToAnchor, anchorVerticalAlign])

  const fitPanelInViewport = useCallback(() => {
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    const dock = dockRef.current
    if (!dock || collapsed) return
    const panel = dock.querySelector('.agent-orb-panel')
    if (!(panel instanceof HTMLElement)) return
    const panelTop = panel.getBoundingClientRect().top
    if (panelTop >= MARGIN) return
    const shift = MARGIN - panelTop
    const rect = dock.getBoundingClientRect()
    setPos((prev) => {
      if (!prev) return prev
      const next = clampPosition({ x: prev.x, y: prev.y + shift }, rect.width, rect.height)
      if (next.y === prev.y) return prev
      persistPos(next)
      return next
    })
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }, [collapsed, persistPos])

  useLayoutEffect(() => {
    const el = dockRef.current
    const dockH = el?.getBoundingClientRect().height || (isCapsule ? 48 : 180)
    const dockW = el?.getBoundingClientRect().width || DOCK_WIDTH
    if (!dockEnabled && closedAnchorSelector) {
      snapToAnchor(closedAnchorSelector)
      return
    }
    const anchorKey = anchorStorageKey(defaultAnchorSelector, anchorVerticalAlign)
    const initial = resolveInitialPosition(
      storageKey,
      defaultAnchorSelector,
      dockW,
      dockH,
      anchorAlign,
      anchorVerticalAlign,
    )
    const next = clampPosition(initial, dockW, dockH)
    setPos(next)
    if (!loadPosition(storageKey, anchorKey)) {
      persistPos(next, {
        anchor: anchorKey,
        userMoved: false,
      })
    }
  }, [storageKey, persistPos, isCapsule, defaultAnchorSelector, dockEnabled, closedAnchorSelector, snapToAnchor, anchorAlign, anchorVerticalAlign])

  useLayoutEffect(() => {
    if (!dockEnabled) {
      snapToClosedAnchor()
      return
    }
    restoreOpenPosition()
  }, [dockEnabled, snapToClosedAnchor, restoreOpenPosition])

  useEffect(() => {
    if (dockEnabled || !closedAnchorSelector) return
    const recalc = () => snapToClosedAnchor()
    window.addEventListener('resize', recalc)
    window.addEventListener('scroll', recalc, { passive: true })
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('scroll', recalc)
    }
  }, [dockEnabled, closedAnchorSelector, snapToClosedAnchor])

  /** intro 结束等时机重新对齐锚点（用户未手动拖拽时） */
  useEffect(() => {
    if (!repositionSignal || !defaultAnchorSelector || !dockEnabled || isUserMovedPosition(storageKey)) return
    if (isMobileViewport()) {
      const el = dockRef.current
      const dockH = el?.getBoundingClientRect().height || (isCapsule ? 48 : 180)
      const dockW = el?.getBoundingClientRect().width || DOCK_WIDTH
      setPos(defaultPosition(dockW, dockH))
      return
    }
    const run = () => snapToAnchor(defaultAnchorSelector, true)
    requestAnimationFrame(run)
    const t = window.setTimeout(run, 120)
    const t2 = window.setTimeout(run, 780)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [repositionSignal, storageKey, defaultAnchorSelector, dockEnabled, snapToAnchor])

  useLayoutEffect(() => {
    ensureVisible()
  }, [children, collapsed, ensureVisible])

  useLayoutEffect(() => {
    if (collapsed || !dockEnabled) return
    fitPanelInViewport()
    const t1 = window.setTimeout(fitPanelInViewport, 80)
    const t2 = window.setTimeout(fitPanelInViewport, 280)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [collapsed, children, fitPanelInViewport, dockEnabled])

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

  const expand = useCallback((opts?: { snap?: boolean; invokeOnExpand?: boolean }) => {
    const scrollY = window.scrollY
    const scrollX = window.scrollX
    setCollapsed(false)
    persistCollapsed(false)
    requestAnimationFrame(() => {
      if (opts?.snap) snapToBottom()
      if (opts?.invokeOnExpand ?? !opts?.snap) onExpand?.()
      requestAnimationFrame(() => {
        fitPanelInViewport()
        window.scrollTo(scrollX, scrollY)
      })
    })
  }, [persistCollapsed, snapToBottom, onExpand, fitPanelInViewport])

  useEffect(() => {
    if (!expandSignal) return
    expand({ snap: false, invokeOnExpand: false })
  }, [expandSignal, expand])

  const collapse = useCallback(() => {
    setCollapsed(true)
    persistCollapsed(true)
  }, [persistCollapsed])

  const toggleCollapsed = useCallback(() => {
    if (collapsed) expand({ snap: snapBottomOnExpand, invokeOnExpand: true })
    else collapse()
  }, [collapsed, expand, collapse, snapBottomOnExpand])

  const maybeExpandOnInput = useCallback(() => {
    if (isCapsule && collapsed) expand({ snap: false, invokeOnExpand: false })
  }, [isCapsule, collapsed, expand])

  const onDockFocusIn = useCallback(
    (e: React.FocusEvent) => {
      if (!isCapsule || !collapsed) return
      if (isInteractiveTarget(e.target)) maybeExpandOnInput()
    },
    [isCapsule, collapsed, maybeExpandOnInput],
  )

  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pos || e.button !== 0) return
      const gripOnly = collapsed || !dockEnabled
      if (gripOnly) {
        if (!(e.target instanceof Element)) return
        const onDragSurface = e.target.closest('.is-dock-drag-surface')
        if (isMobileViewport()) {
          if (
            e.target.closest('button, input, textarea, select, a, label, [contenteditable="true"]')
            && !onDragSurface
          ) return
        } else if (!e.target.closest('.floating-agent-dock-grip') && !onDragSurface) {
          return
        }
        if (onDragSurface && e.target.closest('button, input, textarea, select, a, label, [contenteditable="true"]')) {
          return
        }
      } else if (isInteractiveTarget(e.target) && !(e.target instanceof Element && e.target.closest('.is-dock-drag-surface'))) {
        return
      }
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
            persistPos(next, {
              anchor: anchorStorageKey(defaultAnchorSelector, anchorVerticalAlign),
              userMoved: true,
            })
            return next
          })
        }
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [pos, persistPos, collapsed, dockEnabled, defaultAnchorSelector, anchorVerticalAlign],
  )

  const dockContext = useMemo(
    () => ({
      variant,
      collapsed,
      expand: () => expand({ snap: false, invokeOnExpand: false }),
    }),
    [variant, collapsed, expand],
  )

  const setEnabled = useCallback(
    (next: boolean) => {
      setDockEnabled(next)
      persistDockEnabled(next)
      requestAnimationFrame(() => {
        if (next) restoreOpenPosition()
        else snapToClosedAnchor()
      })
    },
    [persistDockEnabled, restoreOpenPosition, snapToClosedAnchor],
  )

  const dockToggle = showDockToggle && isCapsule ? (
    <label
      className="floating-agent-dock-enable-switch"
      title={dockEnabled ? '关闭悬浮框' : '显示悬浮框'}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="floating-agent-dock-enable-input"
        checked={dockEnabled}
        onChange={(e) => setEnabled(e.target.checked)}
        aria-label="显示悬浮框"
      />
      <span className="floating-agent-dock-switch-track" aria-hidden />
    </label>
  ) : null

  const toggleBtn = (
    <button
      type="button"
      className={`floating-agent-dock-toggle${isCapsule ? ' capsule-toggle' : ''}`}
      onClick={toggleCollapsed}
      aria-expanded={!collapsed}
      aria-controls={panelId}
      aria-label={collapsed ? '展开悬浮框' : '折叠悬浮框'}
    >
      <span className={`floating-agent-dock-caret${collapsed ? '' : ' open'}`} aria-hidden />
    </button>
  )

  const titleBlock = (
    <div className="floating-agent-dock-brand floating-agent-dock-brand-static">
      {typeof title === 'string' ? (
        <>
          <ChevronDotSign size="btn" />
          <span className="floating-agent-dock-title">{title}</span>
        </>
      ) : (
        <span className="floating-agent-dock-title floating-agent-dock-title-custom">{title}</span>
      )}
      {!isCapsule && chevLabel ? (
        <span className="floating-agent-dock-chev-label">{chevLabel}</span>
      ) : null}
    </div>
  )

  const dockStyle: CSSProperties | undefined = pos
    ? { left: pos.x, top: pos.y, bottom: 'auto', transform: 'none' }
    : undefined

  if (!dockEnabled) {
    return (
      <div
        ref={dockRef}
        className={[
          'floating-agent-dock',
          'floating-agent-dock-capsule',
          'is-collapsed',
          'is-closed',
          dragging ? 'is-dragging' : '',
          className,
        ].filter(Boolean).join(' ')}
        style={dockStyle}
        role="complementary"
        aria-label="智能体悬浮框已关闭"
      >
        <div className="floating-agent-dock-frame">
          <div className="floating-agent-dock-chrome">
            <span
              className="floating-agent-dock-grip"
              aria-label="拖动悬浮框"
              title="拖动"
              onPointerDown={onDragStart}
            />
            {titleBlock}
            <label
              className="floating-agent-dock-enable-switch"
              title="显示悬浮框"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="floating-agent-dock-enable-input"
                checked={false}
                onChange={() => setEnabled(true)}
                aria-label="显示悬浮框"
              />
              <span className="floating-agent-dock-switch-track" aria-hidden />
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FloatingDockProvider value={dockContext}>
      <div
        ref={dockRef}
        className={[
          'floating-agent-dock',
          collapsed ? 'is-collapsed' : 'is-expanded',
          isCapsule ? 'floating-agent-dock-capsule' : '',
          dragging ? 'is-dragging' : '',
          className,
        ].filter(Boolean).join(' ')}
        style={dockStyle}
        role="complementary"
        aria-label={ariaLabel}
        onFocusCapture={onDockFocusIn}
        onInputCapture={maybeExpandOnInput}
      >
        <div className="floating-agent-dock-frame">
          <div
            className="floating-agent-dock-chrome"
            onPointerDown={collapsed && !isCapsule ? undefined : onDragStart}
          >
            <span
              className="floating-agent-dock-grip"
              aria-label="拖动悬浮框"
              title="拖动"
              onPointerDown={collapsed ? onDragStart : undefined}
            />
            {collapsed && !isCapsule ? (
              <button
                type="button"
                className="floating-agent-dock-expand-bar"
                onClick={() => expand()}
                aria-expanded={false}
                aria-controls={panelId}
              >
                <ChevronDotSign size="btn" />
                {chevLabel ? (
                  <span className="floating-agent-dock-chev-label">{chevLabel}</span>
                ) : null}
                <span className="floating-agent-dock-collapsed-hint">{collapsedHint}</span>
                <span className="floating-agent-dock-caret" aria-hidden />
              </button>
            ) : isCapsule && collapsed ? null : (
              <>
                {!isCapsule ? (
                  <button
                    type="button"
                    className="floating-agent-dock-brand"
                    onClick={collapse}
                    aria-expanded={!collapsed}
                    aria-controls={panelId}
                  >
                    <ChevronDotSign size="btn" />
                    <span className="floating-agent-dock-title">{title}</span>
                    {chevLabel ? (
                      <span className="floating-agent-dock-chev-label">{chevLabel}</span>
                    ) : null}
                  </button>
                ) : (
                  titleBlock
                )}
                {dockToggle}
                {toggleBtn}
              </>
            )}
          </div>
          <div
            id={panelId}
            className="floating-agent-dock-body"
            aria-hidden={collapsed && !isCapsule}
            onPointerDown={collapsed && isCapsule ? undefined : onDragStart}
          >
            {children}
          </div>
          {isCapsule && collapsed && (dockToggle || collapseToggleInTail) ? (
            <div className="floating-agent-dock-tail">
              {dockToggle}
              {collapseToggleInTail ? toggleBtn : null}
            </div>
          ) : null}
        </div>
      </div>
    </FloatingDockProvider>
  )
}
