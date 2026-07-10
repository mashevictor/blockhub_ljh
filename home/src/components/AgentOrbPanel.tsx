import { DynamicIcon } from './icons'
import { categoryColor, iconWrapStyle } from '../data/iconPalette'
import { resolveCategoryIcon } from '../data/showcase'
import type { ThemeTokens } from '../data/themes'
import { BRAND_TAGLINE } from './agentInputLogic'

interface OrbItem {
  idx: number
  label: string
  hint?: string
  iconKey?: string
  color?: string
  selected?: boolean
  active?: boolean
  onPick: () => void
  onHover: () => void
}

interface Section {
  id: string
  title: string
  items: OrbItem[]
}

interface Props {
  sections: Section[]
  mode: 'guide' | 'command'
  query: string
  count: number
  foot: string
  theme: ThemeTokens
  size?: 'default' | 'large'
}

export default function AgentOrbPanel({ sections, mode, query, count, foot, theme, size = 'default' }: Props) {
  const empty = count === 0
  const large = size === 'large'
  const iconSize = large ? 28 : 20
  const labelMax = large ? 8 : 6

  return (
    <div className={`agent-orb-panel${large ? ' agent-orb-panel-large' : ''}`} role="listbox" aria-label="可用模块">
      <header className="agent-orb-head">
        <div className="agent-orb-brand">
          <span className="agent-orb-brand-chev" aria-hidden>&gt;&gt;</span>
          <div className="agent-orb-brand-copy">
            <span className="agent-orb-brand-title">
              {mode === 'guide' ? '开始编排' : query.trim() ? `筛选「${query.trim()}」` : '插入模块'}
            </span>
            <span className="agent-orb-brand-tag">{BRAND_TAGLINE}</span>
          </div>
        </div>
        <span className="agent-orb-count">{count} 项</span>
      </header>

      <div className="agent-orb-body">
        {empty ? (
          <div className="agent-orb-empty">
            <p>没有匹配的模块</p>
            <span>继续输入文字，或 Esc 删除 <code>&gt;&gt;</code></span>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.id} className="agent-orb-section">
              <h4 className="agent-orb-section-title">{section.title}</h4>
              <div className="agent-orb-grid">
                {section.items.map((item) => {
                  const ic = item.color ?? theme.pri
                  const iconKey = item.iconKey ?? 'layers'
                  return (
                    <button
                      key={`${section.id}-${item.idx}`}
                      type="button"
                      role="option"
                      aria-selected={item.active}
                      className={`agent-orb${item.active ? ' active' : ''}${item.selected ? ' on' : ''}`}
                      title={item.hint ? `${item.label} · ${item.hint}` : item.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={item.onHover}
                      onClick={item.onPick}
                    >
                      <span
                        className="agent-orb-icon icon-themed"
                        style={iconWrapStyle(item.selected ? '#fff' : ic)}
                      >
                        <DynamicIcon name={iconKey} size={iconSize} color={item.selected ? '#fff' : ic} />
                      </span>
                      <span className="agent-orb-label">
                        {item.label.length > labelMax ? `${item.label.slice(0, labelMax - 1)}…` : item.label}
                      </span>
                      {item.selected && <span className="agent-orb-badge">已选</span>}
                    </button>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>

      <footer className="agent-orb-foot">{foot}</footer>
    </div>
  )
}

/** 场景类 pick 无 icon 时从 category 解析 */
export function resolveOrbMeta(
  pickType: string,
  category: string | undefined,
  kind: 'industry' | 'office' | undefined,
  theme: ThemeTokens,
  fallbackIcon?: string,
  fallbackColor?: string,
): { iconKey: string; color: string } {
  if (fallbackIcon && fallbackColor) {
    return { iconKey: fallbackIcon, color: fallbackColor }
  }
  if (pickType === 'scenario' && category) {
    return {
      iconKey: resolveCategoryIcon(category, kind === 'industry' ? 'industry' : 'office'),
      color: categoryColor(category, theme),
    }
  }
  return { iconKey: fallbackIcon ?? 'layers', color: fallbackColor ?? theme.pri }
}
