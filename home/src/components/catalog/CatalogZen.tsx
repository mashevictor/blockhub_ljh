import { useT } from '@blockhub/i18n/react'
import { DynamicIcon } from '../icons'
import { categoryColor, iconWrapStyle } from '../../data/iconPalette'
import { resolveCategoryIcon } from '../../data/showcase'
import type { CatalogScenario } from '../../api/client'
import type { ThemeTokens } from '../../data/themes'
import type { SuggestItem } from '../../data/promptSuggest'
import type { AgentPick } from '../AgentInput'
import { moduleId } from '../agentInputLogic'

interface Props {
  items: CatalogScenario[]
  suggestions: SuggestItem[]
  search: string
  onSearch: (q: string) => void
  selectedCount: number
  selectedIds: Set<string>
  onToggle: (item: CatalogScenario) => void
  onTogglePick: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
  theme: ThemeTokens
  loading?: boolean
}

export default function CatalogZen({
  items,
  suggestions,
  search,
  onSearch,
  selectedCount,
  selectedIds,
  onToggle,
  onTogglePick,
  theme,
  loading,
}: Props) {
  const t = useT()
  const suggestItems = suggestions.slice(0, 6)

  const orbItems = items.slice(0, 14)

  return (
    <div className="catalog-zen">
      <p className="catalog-zen-q">{t('home.catalog.zen.title')}</p>
      <input
        className="catalog-zen-input"
        placeholder={t('home.catalog.zen.search_ph')}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        aria-label={t('home.catalog.search_aria')}
      />

      {loading ? (
        <p className="catalog-zen-hint">{t('home.catalog.zen.loading')}</p>
      ) : orbItems.length === 0 ? (
        <p className="catalog-zen-hint">{t('home.catalog.zen.no_match')}</p>
      ) : (
        <>
          {suggestItems.length > 0 && (
            <div className="catalog-zen-group">
              <span className="catalog-zen-label">{t('home.catalog.zen.recommended')}</span>
              <div className="catalog-zen-orbs">
                {suggestItems.map((s) => {
                  const id = moduleId(s.pick)
                  const matched = s.pick.type === 'scenario'
                    ? items.find((it) => it.id === s.pick.key)
                    : null
                  const ic = matched
                    ? categoryColor(matched.category, theme)
                    : theme.pri
                  const iconKey = matched
                    ? resolveCategoryIcon(matched.category, matched.kind === 'industry' ? 'industry' : 'office')
                    : s.pick.type === 'industry' ? s.pick.key : 'layers'
                  const on = selectedIds.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`catalog-zen-orb suggest${on ? ' on' : ''}`}
                      title={s.pick.label}
                      onClick={() => {
                        if (matched) onToggle(matched)
                        else onTogglePick(s.pick, { iconKey, color: ic })
                      }}
                    >
                      <span className="catalog-zen-orb-icon icon-themed" style={iconWrapStyle(on ? '#fff' : ic)}>
                        <DynamicIcon name={iconKey} size={22} color={on ? '#fff' : ic} />
                      </span>
                      <span className="catalog-zen-orb-name">{s.pick.label.length > 6 ? `${s.pick.label.slice(0, 5)}…` : s.pick.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="catalog-zen-group">
            <span className="catalog-zen-label">{t('home.catalog.zen.scenarios')}</span>
            <div className="catalog-zen-orbs">
              {orbItems.map((item) => {
                const ic = categoryColor(item.category, theme)
                const iconKey = resolveCategoryIcon(item.category, item.kind === 'industry' ? 'industry' : 'office')
                const on = selectedIds.has(`scenario:${item.id}`)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`catalog-zen-orb${on ? ' on' : ''}`}
                    title={item.name}
                    onClick={() => onToggle(item)}
                  >
                    <span className="catalog-zen-orb-icon icon-themed" style={iconWrapStyle(ic)}>
                      <DynamicIcon name={iconKey} size={22} color={on ? '#fff' : ic} />
                    </span>
                    <span className="catalog-zen-orb-name">{item.name.length > 6 ? `${item.name.slice(0, 5)}…` : item.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      {selectedCount > 0 && (
        <p className="catalog-zen-selected">{t('home.catalog.zen.selected', { n: selectedCount })}</p>
      )}
    </div>
  )
}
