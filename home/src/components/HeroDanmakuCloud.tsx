import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fetchHeroPresets } from '../api/client'
import { buildDanmakuLayout, mapHeroPresetFromApi, presetRole, type RolePreset } from '../data/rolePresets'
import HeroRoleDialog from './HeroRoleDialog'

const LANE_COUNT = 10

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
}

export default function HeroDanmakuCloud({ onRoleApply }: Props) {
  const [presets, setPresets] = useState<RolePreset[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const items = useMemo(() => buildDanmakuLayout(presets), [presets])
  const [active, setActive] = useState<RolePreset | null>(null)
  const [paused, setPaused] = useState(false)

  const loadPresets = () => {
    setLoading(true)
    setLoadError(null)
    fetchHeroPresets()
      .then((rows) => {
        if (rows.length === 0) {
          setLoadError('英雄区预设为空，请执行 POST /api/v1/seed')
          setPresets([])
          return
        }
        setPresets(rows.map((row) => mapHeroPresetFromApi({
          ...row,
          picks: row.picks as RolePreset['picks'],
        })))
      })
      .catch(() => {
        setLoadError('无法加载英雄区预设，请检查 API 与数据库 seed')
        setPresets([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPresets()
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
            {loading ? 'SYNC' : loadError ? 'ERR' : 'LIVE'}
          </span>
          <span className="hud-title">IDENTITY × SCENARIO</span>
          <span className="hud-meta">
            {loading ? '加载 PG 预设…' : loadError ? '数据未就绪' : `${presets.length} 场景 · 点击生成`}
          </span>
        </header>

        {loadError && (
          <div className="hero-danmaku-error">
            <p>{loadError}</p>
            <button type="button" onClick={loadPresets}>重试</button>
          </div>
        )}

        <div className="hero-danmaku-stage">
          <div className="hero-danmaku-aurora" aria-hidden />
          {Array.from({ length: LANE_COUNT }, (_, track) => (
            <div key={track} className="hero-danmaku-lane" style={{ '--lane-i': track } as CSSProperties} />
          ))}
          {items.map(({ preset, track, delay, duration, direction }, index) => {
            const role = presetRole(preset)
            const hot = index % 4 === 0
            return (
              <button
                key={preset.id}
                type="button"
                className={`hero-danmaku-item${direction === 'reverse' ? ' reverse' : ''}${hot ? ' hot' : ''}`}
                style={{
                  '--dm-color': preset.color,
                  '--dm-track': track,
                  '--dm-delay': `${delay}s`,
                  '--dm-duration': `${duration}s`,
                  '--dm-glow-delay': `${(index % 7) * 0.45}s`,
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
