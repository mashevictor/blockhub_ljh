import type { CSSProperties } from 'react'
import {
  CAPABILITIES_SHOWCASE,
  PLATFORMS_SHOWCASE,
  SCENARIO_BREAKDOWN,
} from '../data/showcase'
import { useTheme } from '../context/ThemeContext'
import { capabilityColor } from '../data/iconPalette'
import {
  DynamicIcon,
  IconDevices,
  IconLayers,
  IconZap,
  CAPABILITY_ICONS,
} from './icons'

const OFFICE_CATEGORIES = [
  '人事行政', '财务法务', '知识协同', '流程审批',
  '数据报表', '消息通知', 'IT与资产', '外部对接',
]

export default function PlatformShowcaseFooter() {
  const { theme } = useTheme()
  const sceneTotal = SCENARIO_BREAKDOWN.reduce((n, s) => n + s.count, 0)

  return (
    <section className="showcase-footer" aria-label="平台能力总览">
      <div className="showcase-footer-inner">
        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-violet"><IconZap size={20} /></span>
            <div>
              <h2>10 大能力</h2>
              <p>从创建到发布，底座能力全覆盖</p>
            </div>
          </header>
          <ul className="showcase-cap-grid">
            {CAPABILITIES_SHOWCASE.map((c) => {
              const color = capabilityColor(c.id, theme) || c.color
              const Icon = CAPABILITY_ICONS[c.iconKey] ?? IconZap
              return (
                <li key={c.id} className="showcase-cap-card" style={{ '--cap-color': color } as CSSProperties}>
                  <span className="showcase-cap-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.desc}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </article>

        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-sky"><IconLayers size={20} /></span>
            <div>
              <h2>114 业务场景</h2>
              <p>办公 + 行业场景包，开箱即用</p>
            </div>
          </header>
          <ul className="showcase-scene-bars">
            {SCENARIO_BREAKDOWN.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <div className="showcase-scene-track">
                  <i style={{ width: `${(s.count / sceneTotal) * 100}%`, background: s.color }} />
                </div>
                <em>{s.count}</em>
              </li>
            ))}
          </ul>
          <p className="showcase-scene-foot">
            通用办公 <strong>{SCENARIO_BREAKDOWN[0]?.count ?? 65}</strong> 项 ·
            办公 <strong>{OFFICE_CATEGORIES.length}</strong> 大分类 ·
            <strong>20</strong> 个行业模板
          </p>
        </article>

        <article className="showcase-block">
          <header className="showcase-block-head">
            <span className="showcase-block-icon tone-cyan"><IconDevices size={20} /></span>
            <div>
              <h2>5 端全覆盖</h2>
              <p>一次发布，员工多端同步使用</p>
            </div>
          </header>
          <ul className="showcase-plat-grid">
            {PLATFORMS_SHOWCASE.map((p) => (
              <li key={p.id} className="showcase-plat-card">
                <span className="showcase-plat-icon">
                  <DynamicIcon name={p.iconKey} size={22} />
                </span>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.sub}</span>
                </div>
                <em>已支持</em>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
