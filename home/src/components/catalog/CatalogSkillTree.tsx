import { useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { DynamicIcon } from '../icons'
import { categoryColor, iconWrapStyle } from '../../data/iconPalette'
import { resolveCategoryIcon } from '../../data/showcase'
import type { CatalogScenario } from '../../api/client'
import type { ThemeTokens } from '../../data/themes'

interface Props {
  categoryGroups: [string, CatalogScenario[]][]
  isSelected: (id: string) => boolean
  onToggle: (item: CatalogScenario) => void
  theme: ThemeTokens
  loading?: boolean
}

const BRANCH_POS = [
  { x: 50, y: 14 },
  { x: 82, y: 28 },
  { x: 88, y: 58 },
  { x: 72, y: 82 },
  { x: 28, y: 82 },
  { x: 12, y: 58 },
  { x: 18, y: 28 },
  { x: 50, y: 88 },
]

const LEAF_POS = [
  { x: 50, y: 4 },
  { x: 78, y: 12 },
  { x: 94, y: 36 },
  { x: 94, y: 64 },
  { x: 78, y: 88 },
  { x: 50, y: 96 },
  { x: 22, y: 88 },
  { x: 6, y: 64 },
  { x: 6, y: 36 },
  { x: 22, y: 12 },
]

function pct(x: number, y: number) {
  return { left: `${x}%`, top: `${y}%` }
}

export default function CatalogSkillTree({
  categoryGroups,
  isSelected,
  onToggle,
  theme,
  loading,
}: Props) {
  const t = useT()
  const [branch, setBranch] = useState<string | null>(null)

  const branches = useMemo(() => categoryGroups.slice(0, 8), [categoryGroups])

  const leaves = useMemo(() => {
    if (branch) {
      const group = categoryGroups.find(([cat]) => cat === branch)
      return group ? group[1].slice(0, 10) : []
    }
    const flat: CatalogScenario[] = []
    for (const [, items] of categoryGroups) {
      for (const it of items) {
        if (flat.length >= 10) break
        flat.push(it)
      }
      if (flat.length >= 10) break
    }
    return flat
  }, [branch, categoryGroups])

  const activeBranch = branch ?? (branches[0]?.[0] ?? null)

  return (
    <div className="catalog-tree">
      {loading ? (
        <p className="catalog-tree-hint">{t('home.catalog.tree.loading')}</p>
      ) : branches.length === 0 ? (
        <p className="catalog-tree-hint">{t('home.catalog.tree.empty')}</p>
      ) : (
        <>
          <div className="catalog-tree-branches">
            {branches.map(([cat], i) => {
              const pos = BRANCH_POS[i % BRANCH_POS.length]
              const sample = categoryGroups.find(([c]) => c === cat)?.[1][0]
              const ic = sample ? categoryColor(sample.category, theme) : theme.pri
              const iconKey = sample
                ? resolveCategoryIcon(sample.category, sample.kind === 'industry' ? 'industry' : 'office')
                : 'layers'
              const on = branch === cat || (!branch && i === 0)
              return (
                <button
                  key={cat}
                  type="button"
                  className={`catalog-tree-node branch${on ? ' on' : ''}`}
                  style={pct(pos.x, pos.y)}
                  title={cat}
                  onClick={() => setBranch(cat)}
                >
                  <span className="catalog-tree-node-icon icon-themed" style={iconWrapStyle(ic)}>
                    <DynamicIcon name={iconKey} size={18} color={on ? '#fff' : ic} />
                  </span>
                  <span className="catalog-tree-node-label">{cat.length > 4 ? `${cat.slice(0, 3)}…` : cat}</span>
                </button>
              )
            })}
          </div>

          <div className="catalog-tree-stage">
            <div className="catalog-tree-lines" aria-hidden>
              {leaves.map((_, i) => {
                const pos = LEAF_POS[i % LEAF_POS.length]
                return (
                  <span
                    key={i}
                    className="catalog-tree-line"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: `${Math.hypot(pos.x - 50, pos.y - 50) * 0.9}%`,
                      transform: `rotate(${Math.atan2(pos.y - 50, pos.x - 50) * (180 / Math.PI)}deg)`,
                    }}
                  />
                )
              })}
            </div>

            <button type="button" className="catalog-tree-root" title={t('home.catalog.tree.app_center')} onClick={() => setBranch(null)}>
              <DynamicIcon name="home" size={26} color="#fff" />
            </button>

            {leaves.map((item, i) => {
              const pos = LEAF_POS[i % LEAF_POS.length]
              const ic = categoryColor(item.category, theme)
              const iconKey = resolveCategoryIcon(item.category, item.kind === 'industry' ? 'industry' : 'office')
              const on = isSelected(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`catalog-tree-node leaf${on ? ' on' : ''}`}
                  style={pct(pos.x, pos.y)}
                  title={item.name}
                  onClick={() => onToggle(item)}
                >
                  <span className="catalog-tree-node-icon icon-themed" style={iconWrapStyle(on ? '#fff' : ic)}>
                    <DynamicIcon name={iconKey} size={16} color={on ? '#fff' : ic} />
                  </span>
                  <span className="catalog-tree-node-label">{item.name.length > 5 ? `${item.name.slice(0, 4)}…` : item.name}</span>
                </button>
              )
            })}
          </div>

          <p className="catalog-tree-foot">
            {activeBranch ? `「${activeBranch}」` : t('home.catalog.tree.all')}
            {' · '}
            {t('home.catalog.tree.hint')}
          </p>
        </>
      )}
    </div>
  )
}
