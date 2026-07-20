import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ComposerEvents, ComposerInput, ComposerMode } from './types'

const CapShipComposer = lazy(() => import('./CapShipComposer'))

const MARGIN = 16
const DOCK_WIDTH = 720

export interface CapShipComposerDockProps extends ComposerInput, ComposerEvents {
  defaultMode?: ComposerMode
  defaultOpen?: boolean
  storageKey?: string
  /** 初始角落：独立站用 top-right，避免挡住左侧导航 */
  defaultPlacement?: 'center' | 'top-right'
}

interface DockPos {
  x: number
  y: number
}

function loadPos(key: string): DockPos | null {
  try {
    const raw = localStorage.getItem(`${key}:pos`)
    if (!raw) return null
    const p = JSON.parse(raw) as DockPos
    if (typeof p.x === 'number' && typeof p.y === 'number') return p
  } catch {
    /* ignore */
  }
  return null
}

function savePos(key: string, pos: DockPos) {
  try {
    localStorage.setItem(`${key}:pos`, JSON.stringify(pos))
  } catch {
    /* ignore */
  }
}

function loadOpen(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(`${key}:open`)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return fallback
}

function saveOpen(key: string, open: boolean) {
  try {
    localStorage.setItem(`${key}:open`, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** 默认中上部，与首页胶囊同宽，避免贴底 */
function defaultPos(width: number, height: number): DockPos {
  const w = Math.min(width, window.innerWidth - MARGIN * 2)
  const x = Math.max(MARGIN, (window.innerWidth - w) / 2)
  const y = Math.max(MARGIN, Math.round(window.innerHeight * 0.22))
  return clampPos({ x, y }, w, height)
}

/** 右上角：折叠胶囊默认位置，不挡左侧导航 */
function defaultPosTopRight(width: number, height: number): DockPos {
  const w = Math.min(width, 420, window.innerWidth - MARGIN * 2)
  const x = Math.max(MARGIN, window.innerWidth - w - MARGIN)
  const y = MARGIN
  return clampPos({ x, y }, w, height)
}

function clampPos(pos: DockPos, dockW: number, dockH: number): DockPos {
  const maxX = Math.max(MARGIN, window.innerWidth - dockW - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - dockH - MARGIN)
  return {
    x: Math.min(Math.max(MARGIN, pos.x), maxX),
    y: Math.min(Math.max(MARGIN, pos.y), maxY),
  }
}

/**
 * CapShip 悬浮编排壳：结构与视觉对齐 home FloatingAgentDock capsule
 * （握把 + >> 标题 + caret 折叠/展开按钮，不用文字链）
 */
export function CapShipComposerDock({
  defaultOpen = true,
  defaultMode = 'live_edit',
  storageKey = 'capship-composer-dock-v3',
  defaultPlacement = 'center',
  ...composerProps
}: CapShipComposerDockProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const panelId = useId()
  const [open, setOpen] = useState(() => loadOpen(storageKey, defaultOpen))
  const [fullscreen, setFullscreen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [pos, setPos] = useState<DockPos | null>(null)

  const resolveDefaultPos = useCallback(
    (w: number, h: number) =>
      defaultPlacement === 'top-right' ? defaultPosTopRight(w, h) : defaultPos(w, h),
    [defaultPlacement],
  )

  useEffect(() => {
    const el = rootRef.current
    const w = el?.offsetWidth || (open ? DOCK_WIDTH : 280)
    const h = el?.offsetHeight || 48
    const stored = loadPos(storageKey)
    if (stored) {
      const nearBottom = stored.y > window.innerHeight - h - 80
      const nearCenter =
        Math.abs(stored.x - (window.innerWidth - w) / 2) < 80 && stored.y > window.innerHeight * 0.15
      // 独立站：旧的中部宽盒会挡住侧栏，强制迁到右上
      if (defaultPlacement === 'top-right' && (nearBottom || nearCenter || stored.x < 120)) {
        setPos(resolveDefaultPos(w, h))
      } else {
        setPos(nearBottom ? resolveDefaultPos(w, h) : clampPos(stored, w, h))
      }
    } else {
      setPos(resolveDefaultPos(w, h))
    }
  }, [storageKey, defaultPlacement, open, resolveDefaultPos])

  useEffect(() => {
    saveOpen(storageKey, open)
    if (!open) setFullscreen(false)
  }, [open, storageKey])

  useEffect(() => {
    const onResize = () => {
      const el = rootRef.current
      if (!el || !pos || fullscreen) return
      setPos(clampPos(pos, el.offsetWidth, el.offsetHeight))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos, fullscreen])

  const setOpenSafe = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) {
        requestAnimationFrame(() => {
          const el = rootRef.current
          if (!el) return
          setPos((prev) => {
            const base = prev || resolveDefaultPos(el.offsetWidth || DOCK_WIDTH, el.offsetHeight || 48)
            const nextPos = clampPos(base, el.offsetWidth || DOCK_WIDTH, el.offsetHeight || 48)
            savePos(storageKey, nextPos)
            return nextPos
          })
        })
      }
    },
    [storageKey, resolveDefaultPos],
  )

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (fullscreen || e.button !== 0 || !pos) return
      if (!(e.target instanceof Element)) return
      if (e.target.closest('button, a, input, textarea, select, label')) return
      if (!e.target.closest('.floating-agent-dock-grip, .floating-agent-dock-chrome, .is-dock-drag-surface')) {
        return
      }
      e.preventDefault()
      const handle = e.currentTarget
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
      setDragging(true)
      handle.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        const el = rootRef.current
        if (!el) return
        setPos(
          clampPos(
            { x: ev.clientX - dragOffset.current.x, y: ev.clientY - dragOffset.current.y },
            el.offsetWidth,
            el.offsetHeight,
          ),
        )
      }
      const onUp = (ev: PointerEvent) => {
        setDragging(false)
        handle.releasePointerCapture(ev.pointerId)
        setPos((prev) => {
          if (!prev) return prev
          savePos(storageKey, prev)
          return prev
        })
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [pos, fullscreen, storageKey],
  )

  const style: CSSProperties | undefined = fullscreen
    ? undefined
    : pos
      ? {
          left: pos.x,
          top: pos.y,
          right: 'auto',
          bottom: 'auto',
          transform: 'none',
          // 折叠时按内容收缩，禁止 720px 透明热区挡住左侧菜单
          width: open ? Math.min(DOCK_WIDTH, window.innerWidth - MARGIN * 2) : 'max-content',
          maxWidth: Math.min(DOCK_WIDTH, window.innerWidth - MARGIN * 2),
          pointerEvents: 'auto',
        }
      : {
          visibility: 'hidden',
          width: open ? Math.min(DOCK_WIDTH, typeof window !== 'undefined' ? window.innerWidth - MARGIN * 2 : DOCK_WIDTH) : 'max-content',
        }

  return (
    <div
      ref={rootRef}
      className={[
        'floating-agent-dock',
        'floating-agent-dock-capsule',
        'capship-floating-dock',
        open ? 'is-expanded' : 'is-collapsed',
        fullscreen ? 'is-fullscreen' : '',
        dragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="complementary"
      aria-label="CapShip 编排悬浮框"
    >
      <div className="floating-agent-dock-frame">
        {!open ? (
          <div className="floating-agent-dock-chrome" onPointerDown={onDragStart}>
            <span className="floating-agent-dock-grip" aria-label="拖动悬浮框" title="拖动" />
            <button
              type="button"
              className="floating-agent-dock-expand-bar"
              onClick={() => setOpenSafe(true)}
              aria-expanded={false}
              aria-controls={panelId}
              aria-label="打开 CapShip 编排"
            >
              <span className="floating-agent-dock-brand-static">
                <span className="floating-agent-dock-chev" aria-hidden>
                  &gt;&gt;
                </span>
                <span className="floating-agent-dock-title">CapShip</span>
              </span>
              <span className="floating-agent-dock-collapsed-hint">对话改页 · 数据流 · 选模块</span>
              <span className="floating-agent-dock-caret" aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div className="floating-agent-dock-chrome" onPointerDown={onDragStart}>
              <button
                type="button"
                className="floating-agent-dock-toggle capsule-toggle"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setOpenSafe(false)
                }}
                aria-expanded
                aria-controls={panelId}
                aria-label="折叠悬浮框"
                title="折叠"
              >
                <span className="floating-agent-dock-caret open" aria-hidden />
              </button>
              <span className="floating-agent-dock-grip" aria-hidden />
              <span className="floating-agent-dock-brand-static">
                <span className="floating-agent-dock-chev" aria-hidden>
                  &gt;&gt;
                </span>
                <span className="floating-agent-dock-title">CapShip</span>
              </span>
              <button
                type="button"
                className="floating-agent-dock-toggle"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setFullscreen((v) => !v)}
                aria-label={fullscreen ? '退出全屏' : '全屏'}
                title={fullscreen ? '退出全屏' : '全屏'}
              >
                <span className={`floating-agent-dock-fs${fullscreen ? ' is-exit' : ''}`} aria-hidden />
              </button>
            </div>
            <div id={panelId} className="floating-agent-dock-body" role="dialog" aria-label="CapShip 编排">
              <Suspense fallback={<p className="capship-composer-hint">加载编排器…</p>}>
                <CapShipComposer {...composerProps} defaultMode={defaultMode} compact />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default CapShipComposerDock
