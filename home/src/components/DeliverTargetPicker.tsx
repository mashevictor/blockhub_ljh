import { useEffect, useRef, useState } from 'react'
import { DynamicIcon } from './icons'
import {
  DELIVER_PRESETS,
  PLATFORM_META,
  platformsMatch,
  platformsSummary,
  type PlatformId,
} from '../data/deliverTargets'

const CHANNEL_SLOTS = [
  { key: 'web', icon: 'web', title: '网页' },
  { key: 'mobile', icon: 'ios', title: 'App' },
  { key: 'desktop', icon: 'windows', title: '桌面' },
] as const

interface Props {
  value: PlatformId[]
  onChange: (platforms: PlatformId[]) => void
  compact?: boolean
  className?: string
}

function useMobilePopover() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return mobile
}

export default function DeliverTargetPicker({ value, onChange, compact = false, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const mobileSheet = useMobilePopover()

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
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

  const summary = platformsSummary(value)

  return (
    <>
      {open && mobileSheet && (
        <button
          type="button"
          className="deliver-target-backdrop"
          aria-label="关闭平台选择"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        ref={rootRef}
        className={`deliver-target-picker${compact ? ' compact' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      >
      <button
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
              <span key={slot.key} className={`deliver-target-dot${on ? ' on' : ''}`} title={slot.title}>
                <DynamicIcon name={slot.icon} size={compact ? 12 : 14} />
              </span>
            )
          })}
        </span>
        <span className="deliver-target-summary">{summary.label}</span>
        {summary.countLabel && <span className="deliver-target-count">{summary.countLabel}</span>}
        <span className="deliver-target-caret" aria-hidden>▾</span>
      </button>

      {open && (
        <div className="deliver-target-popover" role="dialog" aria-label="选择发布平台">
          <div className="deliver-target-presets">
            {DELIVER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`deliver-preset-chip${platformsMatch(value, preset.platforms) ? ' on' : ''}`}
                onClick={() => applyPreset(preset.platforms)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="deliver-target-grid">
            {PLATFORM_META.map((p) => {
              const on = value.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`deliver-platform-chip${on ? ' on' : ''}`}
                  aria-pressed={on}
                  onClick={() => togglePlatform(p.id)}
                >
                  <DynamicIcon name={p.id} size={16} />
                  <span>{p.label}</span>
                  {on && <span className="deliver-platform-check" aria-hidden>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </>
  )
}
