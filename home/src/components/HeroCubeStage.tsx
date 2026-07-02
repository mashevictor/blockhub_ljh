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

  const beltLoop = useMemo(() => [...beltItems, ...beltItems], [beltItems])

  return (
    <div className="hero-e-stage hero-e-stage-focus">
      <div className="hero-e-belt-wrap">
        <div className="hero-e-belt hero-e-belt-sparse">
          {beltLoop.map((item, i) => {
            const Icon = CAPABILITY_ICONS[item.iconKey] ?? IconZap
            const short = cubeShortLabel(item.label, 5)
            return (
              <CubeFace
                key={`${item.label}-${i}`}
                size="lg"
                accent={item.accent}
                label={short}
                seed={cubeSeedFromString(item.label) + i}
                className="hero-e-belt-cube"
                center={(
                  <>
                    <Icon size={22} />
                    <em>{short}</em>
                  </>
                )}
              />
            )
          })}
        </div>
        <div className="hero-e-belt-core" aria-hidden>
          <div className="hero-e-flow-track">
            <span className="hero-e-flow-cmd">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
            <span className="hero-e-flow-cmd">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
          </div>
          <p className="hero-e-flow-title">定义智能体符号</p>
        </div>
      </div>

      <div className="hero-e-focus">
        <p className="hero-e-role-hint">
          身份 × 场景弹幕流 — 点击任意条目，<strong>&gt;&gt;</strong> 生成应用
        </p>
        <HeroDanmakuCloud onRoleApply={onRoleApply} />
      </div>
    </div>
  )
}
