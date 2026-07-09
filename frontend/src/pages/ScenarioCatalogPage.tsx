import { useEffect, useMemo, useState } from 'react'
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

const PACKS = [
  { key: '', label: '全行业' },
  { key: 'mfg', label: '制造业', color: '#254b9c' },
  { key: 'sales', label: '销售', color: '#dc2626' },
  { key: 'med', label: '医疗', color: '#059669' },
  { key: 'game', label: '游戏', color: '#7c3aed' },
]

const OFFICE_CATS = [
  '全部',
  '人事行政',
  '财务法务',
  '知识协同',
  '流程审批',
  '数据报表',
  '消息通知',
  'IT与资产',
  '外部对接',
]

const PACK_COLORS: Record<string, string> = {
  mfg: '#254b9c',
  sales: '#dc2626',
  med: '#059669',
  game: '#7c3aed',
}

function standardTag(s: string) {
  if (s === '✓') return <span className="tag-ok">标准</span>
  if (s === '部分') return <span className="tag-warn">部分</span>
  return <span className="tag-no">定制</span>
}

function groupKey(item: CatalogItem): string {
  return item.kind === 'office' ? item.category : item.category
}

export default function ScenarioCatalogPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [pack, setPack] = useState('')
  const [category, setCategory] = useState('全部')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [summary, setSummary] = useState<CatalogSummary | null>(null)
  const [office, setOffice] = useState<OfficeScenario[]>([])
  const [industry, setIndustry] = useState<IndustryScenario[]>([])
  const [officeTotal, setOfficeTotal] = useState(0)
  const [industryTotal, setIndustryTotal] = useState(0)

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
    if (category !== '全部') params.category = category
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

  const handleTabChange = (t: Tab) => {
    setTab(t)
    if (t === 'office') setPack('')
    if (t === 'industry') setCategory('全部')
  }

  return (
    <>
      <div className="page-header">
        <h1>场景目录</h1>
        <p>
          {summary?.office_count ?? PLATFORM_STATS.officeScenarios} 办公场景 +{' '}
          {summary?.industry_count ?? PLATFORM_STATS.industryScenarios} 行业场景 ={' '}
          <strong>{summary?.total ?? PLATFORM_STATS.scenarios}</strong> 总计（PG 分页）
        </p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{summary?.office_count ?? '—'}</div><div className="l">办公场景</div></div>
        <div className="summary-pill"><div className="n">{summary?.industry_count ?? '—'}</div><div className="l">行业场景</div></div>
        <div className="summary-pill"><div className="n">{summary?.total ?? '—'}</div><div className="l">场景总计</div></div>
        <div className="summary-pill"><div className="n">{summary?.industry_packs ?? 4}</div><div className="l">行业方案包</div></div>
        <div className="summary-pill"><div className="n">{totalCount}</div><div className="l">当前筛选</div></div>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          {(['all', 'office', 'industry'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`filter-tab${tab === t ? ' active' : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t === 'all'
                ? `全部 ${summary?.total ?? PLATFORM_STATS.scenarios}`
                : t === 'office'
                  ? `办公 ${summary?.office_count ?? PLATFORM_STATS.officeScenarios}`
                  : `行业 ${summary?.industry_count ?? PLATFORM_STATS.industryScenarios}`}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          placeholder="搜索场景名称…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {tab !== 'industry' && (
        <div className="filter-bar">
          <div className="filter-tabs">
            {OFFICE_CATS.map((c) => (
              <button
                key={c}
                type="button"
                className={`filter-tab${category === c ? ' active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab !== 'office' && (
        <div className="filter-bar">
          <div className="filter-tabs">
            {PACKS.map((p) => (
              <button
                key={p.key || 'all'}
                type="button"
                className={`filter-tab${pack === p.key ? ' active' : ''}`}
                onClick={() => setPack(p.key)}
              >
                {p.label}
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
                  {cat}
                  <span className="catalog-group-count">{items.length} 项</span>
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
                    {firstIndustry?.pack_name.replace('传统', '').replace('行业', '') || packKey}
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
                      <span className="tag-ok">标准</span>
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
          <h2>没有匹配的场景</h2>
          <p>试试调整 Tab、行业包或搜索关键词</p>
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
            上一页
          </button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            第 {page} / {pageCount} 页 · 共 {totalCount} 条
            {summary?.total === 114 && tab === 'all' && !q && category === '全部' && !pack ? ' · count=114 ✓' : ''}
          </span>
          <button
            type="button"
            className="btn btn-ghost-dark"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </>
  )
}
