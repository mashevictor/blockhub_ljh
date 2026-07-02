import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fetchHeroPresets } from '../api/client'
import { buildDanmakuLayout, mapHeroPresetFromApi, presetRole, ROLE_PRESETS, type RolePreset } from '../data/rolePresets'
import HeroRoleDialog from './HeroRoleDialog'

const LANE_COUNT = 10

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
}

export default function HeroDanmakuCloud({ onRoleApply }: Props) {
  const [presets, setPresets] = useState<RolePreset[]>(ROLE_PRESETS)
  const items = useMemo(() => buildDanmakuLayout(presets), [presets])
  const [active, setActive] = useState<RolePreset | null>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    fetchHeroPresets()
      .then((rows) => {
        if (rows.length > 0) {
          setPresets(rows.map((row) => mapHeroPresetFromApi({
            ...row,
            picks: row.picks as RolePreset['picks'],
          })))
        }
      })
      .catch(() => {})
  }, [])

  const handleApply = (role: RolePreset, generate?: boolean) => {
    setActive(null)
    setPaused(false)
    onRoleApply?.(role, generate)
  }

  return (
    <>
      <div
        className={`hero-danmaku-hud${paused ? ' paused' : ''}`}
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
            LIVE
          </span>
          <span className="hud-title">IDENTITY × SCENARIO</span>
          <span className="hud-meta">{presets.length} 场景 · 点击生成</span>
        </header>

        <div className="hero-danmaku-stage">
          {Array.from({ length: LANE_COUNT }, (_, track) => (
            <div key={track} className="hero-danmaku-lane" style={{ '--lane-i': track } as CSSProperties} />
          ))}
          {items.map(({ preset, track, delay, duration, direction }) => {
            const role = presetRole(preset)
            return (
              <button
                key={preset.id}
                type="button"
                className={`hero-danmaku-item${direction === 'reverse' ? ' reverse' : ''}`}
                style={{
                  '--dm-color': preset.color,
                  '--dm-track': track,
                  '--dm-delay': `${delay}s`,
                  '--dm-duration': `${duration}s`,
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
          <span>身份识别</span>
          <span className="hud-foot-dot" />
          <span>场景匹配</span>
          <span className="hud-foot-dot" />
          <span>&gt;&gt; 符号编排</span>
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
