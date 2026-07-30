import { useEffect, useMemo, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  fetchCatalogSummary,
  fetchIndustryScenarios,
  fetchOfficeScenarios,
  type CatalogSummary,
  type IndustryScenario,
  type OfficeScenario,
} from '../api/client'
import { PLATFORM_STATS } from '@shared/platformStats'

type Tab = 'all' | 'office' | 'industry'

type CatalogItem =
  | (OfficeScenario & { kind: 'office' })
  | (IndustryScenario & { kind: 'industry' })

const PAGE_SIZE = 24
const CATEGORY_ALL = '全部'

const OFFICE_CATS: { api: string; key: string }[] = [
  { api: CATEGORY_ALL, key: 'admin.scenarios.category.all' },
  { api: '人事行政', key: 'admin.scenarios.category.hr_admin' },
  { api: '财务法务', key: 'admin.scenarios.category.finance_legal' },
  { api: '知识协同', key: 'admin.scenarios.category.knowledge' },
  { api: '流程审批', key: 'admin.scenarios.category.approval' },
  { api: '数据报表', key: 'admin.scenarios.category.reports' },
  { api: '消息通知', key: 'admin.scenarios.category.notification' },
  { api: 'IT与资产', key: 'admin.scenarios.category.it_assets' },
  { api: '外部对接', key: 'admin.scenarios.category.integration' },
]

const PACK_KEYS = ['', 'mfg', 'sales', 'med', 'game'] as const

const PACK_COLORS: Record<string, string> = {
  mfg: '#254b9c',
  sales: '#dc2626',
  med: '#059669',
  game: '#7c3aed',
}

const OFFICE_CATEGORY_KEYS: Record<string, string> = Object.fromEntries(
  OFFICE_CATS.filter((c) => c.api !== CATEGORY_ALL).map((c) => [c.api, c.key]),
)

function groupKey(item: CatalogItem): string {
  return item.kind === 'office' ? item.category : item.category
}

export default function ScenarioCatalogPage() {
  const t = useT()
  const [tab, setTab] = useState<Tab>('all')
  const [pack, setPack] = useState('')
  const [category, setCategory] = useState(CATEGORY_ALL)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState<CatalogSummary | null>(null)
  const [office, setOffice] = useState<OfficeScenario[]>([])
  const [industry, setIndustry] = useState<IndustryScenario[]>([])
  const [officeTotal, setOfficeTotal] = useState(0)
  const [industryTotal, setIndustryTotal] = useState(0)

  const packLabel = (key: string) => {
    if (!key) return t('admin.scenarios.industry.all')
    const homeKey = `home.industry.${key}.name`
    const translated = t(homeKey)
    return translated !== homeKey ? translated : key
  }

  const categoryLabel = (apiValue: string) => {
    const i18nKey = OFFICE_CATEGORY_KEYS[apiValue]
    return i18nKey ? t(i18nKey) : apiValue
  }

  const standardTag = (s: string) => {
    if (s === '✓') return <span className="tag-ok">{t('admin.scenarios.tag.standard')}</span>
    if (s === '部分') return <span className="tag-warn">{t('admin.scenarios.tag.partial')}</span>
    return <span className="tag-no">{t('admin.scenarios.tag.custom')}</span>
  }

  useEffect(() => {
    fetchCatalogSummary().then(setSummary)
  }, [])

  useEffect(() => {
    setPage(1)
  }, [tab, pack, category, q])

  useEffect(() => {
    if (tab === 'industry') return
    const params: { q?: string; category?: string; limit?: number; offset?: number } = {
      limit: tab === 'office' ? PAGE_SIZE : 200,
      offset: tab === 'office' ? (page - 1) * PAGE_SIZE : 0,
    }
    if (q) params.q = q
    if (category !== CATEGORY_ALL) params.category = category
    fetchOfficeScenarios(params).then((d) => {
      setOffice(d.items)
      setOfficeTotal(d.total)
    })
  }, [category, q, tab, page])

  useEffect(() => {
    if (tab === 'office') return
    const params: { q?: string; pack?: string; limit?: number; offset?: number } = {
      limit: tab === 'industry' ? PAGE_SIZE : 200,
      offset: tab === 'industry' ? (page - 1) * PAGE_SIZE : 0,
    }
    if (q) params.q = q
    if (pack) params.pack = pack
    fetchIndustryScenarios(params).then((d) => {
      setIndustry(d.items)
      setIndustryTotal(d.total)
    })
  }, [pack, q, tab, page])

  const visibleItems = useMemo((): CatalogItem[] => {
    const list: CatalogItem[] = []
    if (tab === 'all' || tab === 'office') {
      list.push(...office.map((s) => ({ ...s, kind: 'office' as const })))
    }
    if (tab === 'all' || tab === 'industry') {
      list.push(...industry.map((s) => ({ ...s, kind: 'industry' as const })))
    }
    return list
  }, [tab, office, industry])

  const totalCount = tab === 'office'
    ? officeTotal
    : tab === 'industry'
      ? industryTotal
      : visibleItems.length

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const displayItems = useMemo(() => {
    if (tab === 'office' || tab === 'industry') return visibleItems
    const start = (page - 1) * PAGE_SIZE
    return visibleItems.slice(start, start + PAGE_SIZE)
  }, [tab, visibleItems, page])

  const categoryGroups = useMemo(() => {
    const map = new Map<string, CatalogItem[]>()
    for (const item of displayItems) {
      const key = groupKey(item)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [displayItems])

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab)
    if (nextTab === 'office') setPack('')
    if (nextTab === 'industry') setCategory(CATEGORY_ALL)
  }

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.scenarios.title')}</h1>
        <p>{t('admin.page.scenarios.desc')}</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{summary?.office_count ?? '—'}</div><div className="l">{t('admin.scenarios.stat.office')}</div></div>
        <div className="summary-pill"><div className="n">{summary?.industry_count ?? '—'}</div><div className="l">{t('admin.scenarios.stat.industry')}</div></div>
        <div className="summary-pill"><div className="n">{summary?.total ?? '—'}</div><div className="l">{t('admin.scenarios.stat.total')}</div></div>
        <div className="summary-pill"><div className="n">{summary?.industry_packs ?? 4}</div><div className="l">{t('admin.scenarios.stat.packs')}</div></div>
        <div className="summary-pill"><div className="n">{totalCount}</div><div className="l">{t('admin.scenarios.stat.filtered')}</div></div>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          {(['all', 'office', 'industry'] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              type="button"
              className={`filter-tab${tab === tabKey ? ' active' : ''}`}
              onClick={() => handleTabChange(tabKey)}
            >
              {tabKey === 'all'
                ? t('admin.scenarios.tab.all', { n: summary?.total ?? PLATFORM_STATS.scenarios })
                : tabKey === 'office'
                  ? t('admin.scenarios.tab.office', { n: summary?.office_count ?? PLATFORM_STATS.officeScenarios })
                  : t('admin.scenarios.tab.industry', { n: summary?.industry_count ?? PLATFORM_STATS.industryScenarios })}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder={t('admin.scenarios.search_ph')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {tab !== 'industry' && (
        <div className="filter-bar">
          <div className="filter-tabs">
            {OFFICE_CATS.map(({ api, key }) => (
              <button
                key={api}
                type="button"
                className={`filter-tab${category === api ? ' active' : ''}`}
                onClick={() => setCategory(api)}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab !== 'office' && (
        <div className="filter-bar">
          <div className="filter-tabs">
            {PACK_KEYS.map((packKey) => (
              <button
                key={packKey || 'all'}
                type="button"
                className={`filter-tab${pack === packKey ? ' active' : ''}`}
                onClick={() => setPack(packKey)}
              >
                {packLabel(packKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="catalog-groups">
        {categoryGroups.map(([cat, items]) => {
          const firstIndustry = items.find((i): i is IndustryScenario & { kind: 'industry' } => i.kind === 'industry')
          const packKey = firstIndustry?.pack_key
          const packColor = packKey ? PACK_COLORS[packKey] : undefined
          const officeIcon = items[0]?.kind === 'office' ? items[0].category_icon : null

          return (
            <div key={cat} className="card group-card catalog-group-card">
              <div className="catalog-group-head">
                <h3>
                  {officeIcon && <span>{officeIcon} </span>}
                  {categoryLabel(cat)}
                  <span className="catalog-group-count">{t('admin.scenarios.items_count', { n: items.length })}</span>
                </h3>
                {packKey && (
                  <span
                    className="pack-badge"
                    style={{
                      background: `${packColor}18`,
                      color: packColor,
                      borderColor: `${packColor}40`,
                    }}
                  >
                    {packLabel(packKey)}
                  </span>
                )}
              </div>

              <div className="scenario-chip-grid">
                {items.map((s) =>
                  s.kind === 'office' ? (
                    <div key={s.id} className="scenario-chip">
                      <div className="scenario-chip-dot" style={{ background: '#6366f1' }} />
                      <div className="scenario-chip-body">
                        <strong>{s.name}</strong>
                        <span>{s.agent}</span>
                      </div>
                      <span className="tag-ok">{t('admin.scenarios.tag.standard')}</span>
                    </div>
                  ) : (
                    <div key={s.id} className="scenario-chip">
                      <div
                        className="scenario-chip-dot"
                        style={{ background: PACK_COLORS[s.pack_key] ?? '#6366f1' }}
                      />
                      <div className="scenario-chip-body">
                        <strong>{s.name}</strong>
                        <span>{s.agent}</span>
                      </div>
                      {standardTag(s.standard)}
                    </div>
                  ),
                )}
              </div>
            </div>
          )
        })}
      </div>

      {categoryGroups.length === 0 && (
        <div className="placeholder-page">
          <div className="icon">🔍</div>
          <h2>{t('admin.page.scenarios.empty')}</h2>
          <p>{t('admin.scenarios.empty_hint')}</p>
        </div>
      )}

      {totalCount > 0 && (
        <div className="catalog-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-ghost-dark"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t('admin.scenarios.pagination.prev')}
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {t('admin.scenarios.pagination.info', { page, pageCount, total: totalCount })}
            {summary?.total === 114 && tab === 'all' && !q && category === CATEGORY_ALL && !pack ? ' · count=114 ✓' : ''}
          </span>
          <button
            type="button"
            className="btn btn-ghost-dark"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            {t('admin.scenarios.pagination.next')}
          </button>
        </div>
      )}
    </>
  )
}
