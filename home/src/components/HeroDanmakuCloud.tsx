import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useT, useTf } from '@blockhub/i18n/react'
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
  const t = useT()
  const tf = useTf()
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
          setSyncError(t('home.danmaku.err_load'))
        } else {
          setSyncError(t('home.danmaku.err_sync'))
        }
      })
      .finally(() => {
        if (manual) setSyncing(false)
      })
  }, [presets.length, t])

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
          setSyncError(t('home.danmaku.err_load'))
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
        aria-label={t('home.danmaku.aria')}
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
              ? t('home.danmaku.meta_sync', { n: presets.length })
              : t('home.danmaku.meta_ready', { n: presets.length })}
          </span>
        </header>

        {syncError && presets.length === 0 && (
          <div className="hero-danmaku-error">
            <p>{syncError}</p>
            <button type="button" onClick={() => void syncPresets(true)}>{t('home.danmaku.retry')}</button>
          </div>
        )}

        <div className="hero-danmaku-stage">
          <div className="hero-danmaku-aurora" aria-hidden />
          <div className="hero-danmaku-chevron" aria-hidden>&gt;&gt;</div>
          {Array.from({ length: LANE_COUNT }, (_, track) => (
            <div key={track} className="hero-danmaku-lane" style={{ '--lane-i': track } as CSSProperties} />
          ))}
          {items.map(({ preset, track, delay, duration, direction, startLeft }, index) => {
            const role = tf(`hero.${preset.id}.role`, presetRole(preset))
            const label = tf(`hero.${preset.id}.label`, preset.label)
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
                title={`${role} · ${label}`}
              >
                <span className="hero-danmaku-role">{role}</span>
                <span className="hero-danmaku-sep" aria-hidden>×</span>
                <span className="hero-danmaku-prefix">&gt;&gt;</span>
                <span className="hero-danmaku-label">{label}</span>
              </button>
            )
          })}
        </div>

        <footer className="hero-danmaku-hud-foot">
          <span>&gt;&gt; {t('home.danmaku.foot.compose')}</span>
          <span className="hud-foot-dot" />
          <span>{t('home.danmaku.foot.identity')}</span>
          <span className="hud-foot-dot" />
          <span>{t('home.danmaku.foot.match')}</span>
          <span className="hud-foot-dot" />
          <span>{t('home.danmaku.foot.generate')}</span>
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
