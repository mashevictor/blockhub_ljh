import { useEffect, useState } from 'react'
import { DynamicIcon } from '../icons'
import { categoryColor, iconWrapStyle } from '../../data/iconPalette'
import { resolveCategoryIcon } from '../../data/showcase'
import type { CatalogScenario } from '../../api/client'
import type { ThemeTokens } from '../../data/themes'
import type { SuggestItem } from '../../data/promptSuggest'
import type { AgentPick } from '../AgentInput'
import type { PromptModule } from '../agentInputLogic'
import { moduleId } from '../agentInputLogic'

interface Props {
  items: CatalogScenario[]
  suggestions: SuggestItem[]
  modules: PromptModule[]
  search: string
  onSearch: (q: string) => void
  selectedIds: Set<string>
  onToggle: (item: CatalogScenario) => void
  onTogglePick: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
  onRemoveModule: (id: string) => void
  theme: ThemeTokens
  loading?: boolean
  hasIntent: boolean
}

/** 04 极简白 · 配套选模块：默认折叠，展开后光球 + 底线搜索 */
export default function CatalogMinimal({
  items,
  suggestions,
  modules,
  search,
  onSearch,
  selectedIds,
  onToggle,
  onTogglePick,
  onRemoveModule,
  theme,
  loading,
  hasIntent,
}: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (hasIntent && suggestions.length > 0) setOpen(true)
  }, [hasIntent, suggestions.length])

  const displayItems = (() => {
    if (suggestions.length > 0 && hasIntent) {
      const ids = new Set<string>()
      const merged: CatalogScenario[] = []
      for (const s of suggestions) {
        if (s.pick.type !== 'scenario') continue
        const m = items.find((it) => it.id === s.pick.key)
        if (m && !ids.has(m.id)) {
          ids.add(m.id)
          merged.push(m)
        }
      }
      for (const it of items) {
        if (merged.length >= 12) break
        if (!ids.has(it.id)) {
          ids.add(it.id)
          merged.push(it)
        }
      }
      return merged.slice(0, 12)
    }
    return items.slice(0, 12)
  })()

  return (
    <section className="catalog-minimal" aria-label="选择模块">
      {modules.length > 0 && (
        <div className="catalog-minimal-pills">
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              className="catalog-minimal-pill"
              title={`移除 ${m.label}`}
              onClick={() => onRemoveModule(m.id)}
            >
              {m.label.length > 8 ? `${m.label.slice(0, 7)}…` : m.label}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      {!open ? (
        <button type="button" className="catalog-minimal-trigger" onClick={() => setOpen(true)}>
          {modules.length > 0 ? '继续选模块' : '+ 选模块'}
        </button>
      ) : (
        <div className="catalog-minimal-panel">
          <div className="catalog-minimal-panel-head">
            <input
              className="catalog-minimal-search"
              placeholder="搜索场景…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              aria-label="搜索场景"
            />
            <button type="button" className="catalog-minimal-close" onClick={() => setOpen(false)} aria-label="收起">
              收起
            </button>
          </div>

          {loading ? (
            <p className="catalog-minimal-hint">加载中…</p>
          ) : displayItems.length === 0 ? (
            <p className="catalog-minimal-hint">无匹配场景</p>
          ) : (
            <div className="catalog-minimal-orbs">
              {displayItems.map((item) => {
                const ic = categoryColor(item.category, theme)
                const iconKey = resolveCategoryIcon(item.category, item.kind === 'industry' ? 'industry' : 'office')
                const sid = `scenario:${item.id}`
                const on = selectedIds.has(sid)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`catalog-minimal-orb${on ? ' on' : ''}`}
                    title={item.name}
                    onClick={() => onToggle(item)}
                  >
                    <span className="catalog-minimal-orb-icon icon-themed" style={iconWrapStyle(on ? '#fff' : ic)}>
                      <DynamicIcon name={iconKey} size={20} color={on ? '#fff' : ic} />
                    </span>
                  </button>
                )
              })}
              {suggestions.slice(0, 4).map((s) => {
                if (s.pick.type === 'scenario' && displayItems.some((it) => it.id === s.pick.key)) return null
                const id = moduleId(s.pick)
                const ic = theme.pri
                const iconKey = s.pick.type === 'industry' ? s.pick.key : 'layers'
                const on = selectedIds.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`catalog-minimal-orb suggest${on ? ' on' : ''}`}
                    title={s.pick.label}
                    onClick={() => onTogglePick(s.pick, { iconKey, color: ic })}
                  >
                    <span className="catalog-minimal-orb-icon icon-themed" style={iconWrapStyle(on ? '#fff' : ic)}>
                      <DynamicIcon name={iconKey} size={20} color={on ? '#fff' : ic} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
