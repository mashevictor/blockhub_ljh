import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { buildDanmakuLayout, presetRole, type RolePreset } from '../data/rolePresets'
import {
  getInstantHeroPresets,
  saveCachedHeroPresets,
  syncHeroPresetsFromApi,
} from '../lib/heroPresetsCache'
import HeroRoleDialog from './HeroRoleDialog'

const LANE_COUNT = 10

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
  /** 嵌入 Hero 第一屏，与 >> 符号区视觉一体 */
  integrated?: boolean
}

export default function HeroDanmakuCloud({ onRoleApply, integrated }: Props) {
  const [presets, setPresets] = useState<RolePreset[]>(getInstantHeroPresets)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const items = useMemo(() => buildDanmakuLayout(presets), [presets])
  const [active, setActive] = useState<RolePreset | null>(null)
  const [paused, setPaused] = useState(false)

  const syncPresets = useCallback((manual = false) => {
    if (manual) setSyncing(true)
    setSyncError(null)
    return syncHeroPresetsFromApi()
      .then((rows) => {
        setPresets(rows)
        saveCachedHeroPresets(rows)
      })
      .catch(() => {
        if (presets.length === 0) {
          setSyncError('无法加载英雄区预设，请稍后重试')
        } else {
          setSyncError('后台同步失败，当前为本地预设')
        }
      })
      .finally(() => {
        if (manual) setSyncing(false)
      })
  }, [presets.length])

  useEffect(() => {
    let cancelled = false
    setSyncing(true)
    void syncHeroPresetsFromApi()
      .then((rows) => {
        if (cancelled) return
        setPresets(rows)
        saveCachedHeroPresets(rows)
        setSyncError(null)
      })
      .catch(() => {
        if (cancelled) return
        if (presets.length === 0) {
          setSyncError('无法加载英雄区预设，请稍后重试')
        }
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时后台同步一次
  }, [])

  const handleApply = (role: RolePreset, generate?: boolean) => {
    setActive(null)
    setPaused(false)
    onRoleApply?.(role, generate)
  }

  return (
    <>
      <div
        className={`hero-danmaku-hud${paused ? ' paused' : ''}${integrated ? ' integrated' : ''}`}
        aria-label="身份与场景弹幕流"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => !active && setPaused(false)}
      >
        <div className="hero-danmaku-hud-frame" aria-hidden>
          <span className="hud-corner hud-tl" />
          <span className="hud-corner hud-tr" />
          <span className="hud-corner hud-bl" />
          <span className="hud-corner hud-br" />
          <div className="hud-grid" />
          <div className="hud-scanline" />
        </div>

        <header className="hero-danmaku-hud-head">
          <span className="hud-status">
            <i className="hud-pulse" aria-hidden />
            {syncError && presets.length === 0 ? 'ERR' : syncing ? 'SYNC' : 'LIVE'}
          </span>
          <span className="hud-title">&gt;&gt; IDENTITY × SCENARIO</span>
          <span className="hud-meta">
            {syncing && presets.length > 0
              ? `${presets.length} 场景 · 同步中…`
              : `${presets.length} 场景 · 点击生成`}
          </span>
        </header>

        {syncError && presets.length === 0 && (
          <div className="hero-danmaku-error">
            <p>{syncError}</p>
            <button type="button" onClick={() => void syncPresets(true)}>重试</button>
          </div>
        )}

        <div className="hero-danmaku-stage">
          <div className="hero-danmaku-aurora" aria-hidden />
          <div className="hero-danmaku-chevron" aria-hidden>&gt;&gt;</div>
          {Array.from({ length: LANE_COUNT }, (_, track) => (
            <div key={track} className="hero-danmaku-lane" style={{ '--lane-i': track } as CSSProperties} />
          ))}
          {items.map(({ preset, track, delay, duration, direction, startLeft }, index) => {
            const role = presetRole(preset)
            const hot = index % 4 === 0
            return (
              <button
                key={`${preset.id}-${track}-${index}`}
                type="button"
                className={`hero-danmaku-item${direction === 'reverse' ? ' reverse' : ''}${hot ? ' hot' : ''}`}
                style={{
                  '--dm-color': preset.color,
                  '--dm-track': track,
                  '--dm-delay': `${delay}s`,
                  '--dm-duration': `${duration}s`,
                  '--dm-glow-delay': `${(index % 7) * 0.45}s`,
                  '--dm-start-left': `${startLeft}%`,
                } as CSSProperties}
                onClick={() => {
                  setPaused(true)
                  setActive(preset)
                }}
                title={`${role} · ${preset.label}`}
              >
                <span className="hero-danmaku-role">{role}</span>
                <span className="hero-danmaku-sep" aria-hidden>×</span>
                <span className="hero-danmaku-prefix">&gt;&gt;</span>
                <span className="hero-danmaku-label">{preset.label}</span>
              </button>
            )
          })}
        </div>

        <footer className="hero-danmaku-hud-foot">
          <span>&gt;&gt; 符号编排</span>
          <span className="hud-foot-dot" />
          <span>身份识别</span>
          <span className="hud-foot-dot" />
          <span>场景匹配</span>
          <span className="hud-foot-dot" />
          <span>点击生成应用</span>
        </footer>
      </div>

      {active && (
        <HeroRoleDialog
          role={active}
          onClose={() => {
            setActive(null)
            setPaused(false)
          }}
          onApply={handleApply}
        />
      )}
    </>
  )
}
