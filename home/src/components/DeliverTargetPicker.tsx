import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@blockhub/i18n/react'
import { DynamicIcon } from './icons'
import {
  DELIVER_PRESETS,
  PLATFORM_META,
  platformsMatch,
  platformsSummary,
  type PlatformId,
} from '../data/deliverTargets'

const CHANNEL_SLOTS = [
  { key: 'web' as const, icon: 'web', titleKey: 'home.deliver.channel.web' },
  { key: 'mobile' as const, icon: 'ios', titleKey: 'home.deliver.channel.mobile' },
  { key: 'desktop' as const, icon: 'windows', titleKey: 'home.deliver.channel.desktop' },
]

interface Props {
  value: PlatformId[]
  onChange: (platforms: PlatformId[]) => void
  compact?: boolean
  className?: string
}

type PopoverPos =
  | { mode: 'above'; left: number; bottom: number; width: number; maxHeight: number }
  | { mode: 'below'; left: number; top: number; width: number; maxHeight: number }

/** 五端发布目标：与模板选择一致，portal 弹框避免悬浮框裁切 */
export default function DeliverTargetPicker({ value, onChange, compact = false, className = '' }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(280, window.innerWidth - 24)
    const gap = 8
    const spaceAbove = Math.max(0, rect.top - gap - 12)
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - 12)
    const preferAbove = spaceAbove >= 200 || spaceAbove >= spaceBelow
    let left = rect.right - width
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
    if (preferAbove) {
      setPos({
        mode: 'above',
        left,
        bottom: window.innerHeight - rect.top + gap,
        width,
        maxHeight: Math.min(320, Math.max(160, spaceAbove)),
      })
    } else {
      setPos({
        mode: 'below',
        left,
        top: rect.bottom + gap,
        width,
        maxHeight: Math.min(320, Math.max(180, spaceBelow)),
      })
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    updatePosition()
    const onWin = () => updatePosition()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node
      if (rootRef.current?.contains(node)) return
      if (popoverRef.current?.contains(node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const togglePlatform = (id: PlatformId) => {
    const next = value.includes(id) ? value.filter((p) => p !== id) : [...value, id]
    onChange(next.length ? next : ['web'])
  }

  const applyPreset = (platforms: PlatformId[]) => {
    onChange([...platforms])
  }

  const summary = platformsSummary(value, t)
  const platformLabel = (id: PlatformId) => t(`home.deliver.platform.${id}`)

  const popover =
    open &&
    pos &&
    createPortal(
      <div
        ref={popoverRef}
        className="deliver-target-popover is-ported b2b-brand-scope"
        role="dialog"
        aria-label={t('home.deliver.aria')}
        style={{
          position: 'fixed',
          left: pos.left,
          width: pos.width,
          maxHeight: pos.maxHeight,
          zIndex: 12000,
          ...(pos.mode === 'above'
            ? { bottom: pos.bottom, top: 'auto' }
            : { top: pos.top, bottom: 'auto' }),
        }}
      >
        <div className="deliver-target-popover-head">
          <strong>{t('home.deliver.pick_title')}</strong>
          <button
            type="button"
            className="deliver-target-popover-close"
            onClick={() => setOpen(false)}
            aria-label={t('home.deliver.close')}
          >
            ×
          </button>
        </div>
        <div className="deliver-target-popover-body">
          <div className="deliver-target-presets">
            {DELIVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`deliver-preset-chip${platformsMatch(value, preset.platforms) ? ' on' : ''}`}
                onClick={() => applyPreset(preset.platforms)}
              >
                {t(`home.deliver.preset.${preset.id}`)}
              </button>
            ))}
          </div>
          <div className="deliver-target-grid">
            {PLATFORM_META.map((p) => {
              const on = value.includes(p.id)
              const label = platformLabel(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`deliver-platform-chip${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => togglePlatform(p.id)}
                  title={label}
                >
                  <DynamicIcon name={p.id} size={15} />
                  <span>{label}</span>
                  {on && <span className="deliver-platform-check" aria-hidden>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
        <div className="deliver-target-popover-foot">
          <button type="button" className="deliver-target-done" onClick={() => setOpen(false)}>
            {t('home.deliver.done')}
          </button>
        </div>
      </div>,
      document.body,
    )

  return (
    <div
      ref={rootRef}
      className={`deliver-target-picker${compact ? ' compact' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="deliver-target-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="deliver-target-icons" aria-hidden>
          {CHANNEL_SLOTS.map((slot) => {
            const on = summary.channels[slot.key]
            return (
              <span key={slot.key} className={`deliver-target-dot${on ? ' on' : ''}`} title={t(slot.titleKey)}>
                <DynamicIcon name={slot.icon} size={compact ? 12 : 14} />
              </span>
            )
          })}
        </span>
        <span className="deliver-target-summary">{summary.label}</span>
        {summary.countLabel && <span className="deliver-target-count">{summary.countLabel}</span>}
        <span className="deliver-target-caret" aria-hidden>
          ▾
        </span>
      </button>
      {popover}
    </div>
  )
}
