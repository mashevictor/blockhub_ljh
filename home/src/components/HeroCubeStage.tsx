import { useMemo } from 'react'
import { CAPABILITIES_SHOWCASE } from '../data/showcase'
import { useTheme } from '../context/ThemeContext'
import { capabilityColor } from '../data/iconPalette'
import type { RolePreset } from '../data/rolePresets'
import CubeFace, { cubeSeedFromString, cubeShortLabel } from './CubeFace'
import HeroDanmakuCloud from './HeroDanmakuCloud'
import { CAPABILITY_ICONS, IconZap } from './icons'

const BELT_MODULES = CAPABILITIES_SHOWCASE.slice(0, 5)

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
}

function CubeBeltItem({
  item,
  index,
  size = 'md',
  className,
}: {
  item: { label: string; iconKey: string; accent: string }
  index: number
  size?: 'md' | 'lg'
  className?: string
}) {
  const Icon = CAPABILITY_ICONS[item.iconKey] ?? IconZap
  const short = cubeShortLabel(item.label, 5)
  return (
    <CubeFace
      size={size}
      accent={item.accent}
      label={short}
      seed={cubeSeedFromString(item.label) + index}
      className={className}
      center={(
        <>
          <Icon size={size === 'lg' ? 22 : 16} />
          <em>{short}</em>
        </>
      )}
    />
  )
}

export default function HeroCubeStage({ onRoleApply }: Props) {
  const { theme } = useTheme()
  const tileColors = useMemo(() => [theme.pri, theme.sec, theme.accent], [theme])

  const beltItems = useMemo(
    () => BELT_MODULES.map((c, i) => ({
      label: c.name,
      iconKey: c.iconKey,
      accent: capabilityColor(c.id, theme) || tileColors[i % 3],
    })),
    [theme, tileColors],
  )

  const beltLoop = useMemo(() => [...beltItems, ...beltItems, ...beltItems], [beltItems])

  const renderVerticalBelt = (side: 'left' | 'right') => (
    <aside className={`hero-e-vbelt hero-e-vbelt-${side}`} aria-hidden>
      <div className={`hero-e-vbelt-track${side === 'right' ? ' reverse' : ''}`}>
        {beltLoop.map((item, i) => (
          <CubeBeltItem
            key={`${side}-${item.label}-${i}`}
            item={item}
            index={i}
            className="hero-e-vbelt-cube"
          />
        ))}
      </div>
    </aside>
  )

  return (
    <div className="hero-e-stage hero-e-stage-focus">
      <div className="hero-e-first-screen">
        {renderVerticalBelt('left')}

        <div className="hero-e-center">
          <div className="hero-e-agent-sign" aria-label="用符号重新定义智能体">
            <div className="hero-e-sign-glow" aria-hidden />
            <div className="hero-e-sign-inner">
              <div className="hero-e-sign-flow" aria-hidden>
                <span className="hero-e-sign-stream">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
                <span className="hero-e-sign-stream">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
              </div>
              <div className="hero-e-sign-mark">
                <p className="hero-e-sign-title">
                  用符号<span className="hero-e-sign-inline-chev" aria-hidden>&gt;&gt;</span>重新定义智能体
                </p>
              </div>
            </div>
            <div className="hero-e-sign-bridge" aria-hidden>
              <span className="hero-e-sign-bridge-line" />
              <span className="hero-e-sign-bridge-chev">&gt;&gt;</span>
              <span className="hero-e-sign-bridge-hint">身份 × 场景 · 点击弹幕生成应用</span>
            </div>
          </div>

          <HeroDanmakuCloud onRoleApply={onRoleApply} integrated />
        </div>

        {renderVerticalBelt('right')}
      </div>
    </div>
  )
}
