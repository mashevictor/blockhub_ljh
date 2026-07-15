import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { fetchIndustryPackDetail, fetchScenarios, publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runLoadingPublishPipeline } from '../lib/publishFlow'
import { GENERATE_APP_LABEL, GENERATE_APP_LOADING } from '../data/publishUi'
import { AgentButtonContent } from '../components/AgentChevron'
import { INDUSTRIES, type Audience, type PublishResult } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { categoryColor, industryColor, iconWrapStyle } from '../data/iconPalette'
import { resolveCategoryIcon, resolveIndustryApiKey } from '../data/showcase'
import { ROUTES } from '../routes/paths'
import { buildPublishedModulesFromIndustry } from '../data/publishDisplay'
import { buildClientStaticEnrichment } from '../data/industryEnrichStatic'
import {
  getMicrositeTemplate,
  loadSavedMicrositeId,
  saveMicrositeId,
} from '../data/industryMicrositeTemplates'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding, resolveAppName } from '../data/appBranding'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import { ChevronDotLoadingRow } from '../components/ChevronDotLoader'
import DeliveryTemplatePicker from '../components/DeliveryTemplatePicker'

interface SceneItem {
  id: string
  name: string
  category?: string
}

interface Props {
  onPublish: (r: PublishResult) => void
  active?: boolean
  initialIndustry?: string
  /** 独立站所选落地页模板 id（codecode microsite） */
  initialMicrosite?: string
}

export default function IndustryView({
  onPublish,
  active = true,
  initialIndustry,
  initialMicrosite,
}: Props) {
  const { theme } = useTheme()
  const [industry, setIndustry] = useState(initialIndustry ?? 'office')
  const [step, setStep] = useState(1)
  const [audience, setAudience] = useState<Audience>('b')
  const [scenes, setScenes] = useState<SceneItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [scenesLoading, setScenesLoading] = useState(false)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [appName, setAppName] = useState('我的行业应用')
  const [branding, setBranding] = useState(() => emptyBranding('我的行业应用'))
  const [webTemplateId, setWebTemplateId] = useState('landing_single')
  const [appUiId, setAppUiId] = useState('bottom_tabs')
  const [preferKeys, setPreferKeys] = useState<string[]>(() =>
    buildClientStaticEnrichment(initialIndustry ?? 'office').recommended_modules,
  )
  const [micrositeId, setMicrositeId] = useState(
    () => initialMicrosite ?? loadSavedMicrositeId(initialIndustry ?? 'office'),
  )

  const loadScenes = () => {
    const apiKey = resolveIndustryApiKey(industry)
    setScenesLoading(true)
    setSceneError(null)
    fetchScenarios(apiKey)
      .then((items) => {
        if (items.length === 0) {
          setSceneError('该行业暂无场景数据，请检查 Catalog seed')
          setScenes([])
          setSelected(new Set())
          return
        }
        setScenes(items)
        setSelected(new Set(items.slice(0, Math.min(6, items.length)).map((s) => s.id)))
      })
      .catch(() => {
        setSceneError('无法加载场景列表，请稍后重试')
        setScenes([])
        setSelected(new Set())
      })
      .finally(() => setScenesLoading(false))
  }

  useEffect(() => {
    if (initialIndustry) setIndustry(initialIndustry)
  }, [initialIndustry])

  useEffect(() => {
    if (initialMicrosite) {
      setMicrositeId(initialMicrosite)
      if (initialIndustry) saveMicrositeId(initialIndustry, initialMicrosite)
    }
  }, [initialMicrosite, initialIndustry])

  useEffect(() => {
    if (!active) return
    loadScenes()
  }, [industry, active])

  useEffect(() => {
    if (!active) return
    const apiKey = resolveIndustryApiKey(industry)
    const fallback = buildClientStaticEnrichment(apiKey)
    setPreferKeys(fallback.recommended_modules)
    setMicrositeId((prev) => initialMicrosite || loadSavedMicrositeId(apiKey) || prev)
    // 独立站落地页风格 → 默认用单页落地壳，用户仍可在交付模板里改
    setWebTemplateId((prev) => (prev === 'tabs_portal' ? 'landing_single' : prev))
    fetchIndustryPackDetail(apiKey, { enrich: false })
      .then((detail) => {
        const keys = detail.enrichment?.recommended_modules
        if (keys?.length) setPreferKeys(keys)
      })
      .catch(() => {
        /* 保留静态 CapShip 推荐 */
      })
  }, [industry, active, initialMicrosite])

  useEffect(() => {
    if (active) return
    setContactOpen(false)
  }, [active])

  const pack = INDUSTRIES.find((p) => p.key === industry)!
  const micrositeMeta = getMicrositeTemplate(micrositeId)

  const sceneGroups = useMemo(() => {
    const map = new Map<string, SceneItem[]>()
    for (const s of scenes) {
      const cat = s.category ?? '其他'
      const list = map.get(cat) ?? []
      list.push(s)
      map.set(cat, list)
    }
    return [...map.entries()]
  }, [scenes])

  const selectionItems = useMemo<SelectionItem[]>(() => {
    const industryItem: SelectionItem = {
      id: `industry:${industry}`,
      name: pack.name,
      kind: 'industry',
      iconKey: pack.iconKey,
      color: industryColor(pack.key, theme),
    }
    const sceneItems = scenes
      .filter((s) => selected.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category ?? '其他',
        kind: 'scenario' as const,
        iconKey: resolveCategoryIcon(s.category ?? '其他', 'industry'),
        color: categoryColor(s.category ?? '其他', theme),
      }))
    return [industryItem, ...sceneItems]
  }, [industry, pack.iconKey, pack.key, pack.name, scenes, selected, theme])

  const removeSelectionItem = (id: string) => {
    if (id.startsWith('industry:')) return
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const clearSelection = () => {
    setSelected(new Set())
  }

  const doPublish = async (contact: ContactInfo) => {
    await runLoadingPublishPipeline({
      closeContact: () => setContactOpen(false),
      setLoading,
      setError: setPublishError,
      onSuccess: onPublish,
      errorMessage: '发布失败，请确认已登录后重试',
      execute: async () => {
        const scenarioNames = scenes.filter((s) => selected.has(s.id)).map((s) => s.name)
        const publishedModules = buildPublishedModulesFromIndustry({
          industryKey: resolveIndustryApiKey(industry),
          industryLabel: pack.name,
          scenarioNames,
          preferCapabilityKeys: preferKeys,
        })
        const res = await publishApp(resolveAppName(branding.appName, appName), resolveIndustryApiKey(industry), {
          scenarioIds: [...selected],
          scenarioNames,
          capabilityKeys: publishedModules.filter((m) => m.kind === 'module').map((m) => m.key),
          modules: publishedModules.map((m) => ({
            key: m.key,
            label: m.label,
            kind: m.kind,
            iconKey: m.iconKey,
            source: m.source,
          })),
          audience,
          source: 'industry',
          iconUrl: branding.iconUrl,
          primaryColor: branding.primaryColor,
          webTemplateId,
          appUiId,
          contactEmail: contact.type === 'email' ? contact.value : undefined,
          contactPhone: contact.type === 'phone' ? contact.value : undefined,
        })
        return publishApiToResult(res, {
          moduleCount: publishedModules.length,
          modules: publishedModules,
          scenarios: scenarioNames,
        })
      },
    })
  }

  const handlePublish = () => setContactOpen(true)

  return (
    <div className="view industry-view">
      <div className="view-hero compact cube-panel">
        <h2>选择您的行业</h2>
        <p>共 <strong>{INDUSTRIES.length}</strong> 个行业深度包 · 每项含完整场景清单 · 您可再按需增减</p>
      </div>

      {(preferKeys.length > 0 || micrositeMeta) && (
        <div className="industry-compose-hint cube-panel">
          {micrositeMeta ? (
            <p>
              已选落地页模板：<strong>{micrositeMeta.styleLabel}</strong>（{micrositeMeta.brand}）
              · 交付壳默认「单页落地」，可在发布步骤改模板
            </p>
          ) : null}
          {preferKeys.length > 0 ? (
            <p>
              正式能力将一并打包（可后续在悬浮框继续编排）：
              {preferKeys.map((k) => (
                <code key={k} className="industry-compose-chip">{k}</code>
              ))}
            </p>
          ) : null}
        </div>
      )}

      <div className="step-bar">
        {['选行业', '选场景', '选受众', '发布'].map((s, i) => (
          <div key={s} className={`step-item${step > i ? ' done' : ''}${step === i + 1 ? ' current' : ''}`}>
            <span>{i + 1}</span> {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="industry-grid industry-grid-20">
            {INDUSTRIES.map((p) => {
              const ic = industryColor(p.key, theme)
              return (
              <button
                key={p.key}
                type="button"
                className={`industry-card${industry === p.key ? ' selected' : ''}`}
                style={{ '--accent': ic, '--icon-color': ic } as CSSProperties}
                onClick={() => setIndustry(p.key)}
              >
                <span className="ind-count">{p.count} 场景</span>
                <span className="ind-full">深度包</span>
                <div className="ind-icon icon-themed" style={iconWrapStyle(ic)}>
                  <DynamicIcon name={p.iconKey} size={28} color={ic} />
                </div>
                <strong>{p.name}</strong>
                <span>{p.desc}</span>
                <Link
                  to={ROUTES.industryDetail(p.key)}
                  className="ind-detail-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  方案站
                </Link>
              </button>
              )
            })}
          </div>
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>下一步：选择场景</button>
        </>
      )}

      {step === 2 && (
        <>
          {scenesLoading && (
            <ChevronDotLoadingRow variant="scan" size="sm" text="正在加载场景…" className="catalog-loading" />
          )}
          {sceneError && (
            <div className="catalog-error">
              <p>{sceneError}</p>
              <button type="button" className="btn-secondary" onClick={loadScenes}>重试</button>
            </div>
          )}
          {!scenesLoading && !sceneError && sceneGroups.map(([cat, items]) => (
            <div key={cat} className="scene-panel">
              <h4>
                {pack.name} · {cat}
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                  {items.length} 项 · 已选 {items.filter((s) => selected.has(s.id)).length}
                </span>
              </h4>
              <div className="scene-grid">
                {items.map((s) => {
                  const cat = s.category ?? '其他'
                  const ic = categoryColor(cat, theme)
                  const iconKey = resolveCategoryIcon(cat, 'industry')
                  return (
                  <label key={s.id} className={`scene-check${selected.has(s.id) ? ' on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => {
                        setSelected((prev) => {
                          const next = new Set(prev)
                          if (next.has(s.id)) next.delete(s.id)
                          else {
                            next.add(s.id)
                            setLastAddedId(s.id)
                            setBoxOpenSignal((n) => n + 1)
                          }
                          return next
                        })
                      }}
                    />
                    <span className="scene-check-icon icon-themed" style={iconWrapStyle(ic)}>
                      <DynamicIcon name={iconKey} size={14} color={ic} />
                    </span>
                    {s.name}
                  </label>
                  )
                })}
              </div>
            </div>
          ))}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            合计已选 {selected.size} / {scenes.length} 个场景
          </p>
          <div className="step-actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>上一步</button>
            <button type="button" className="btn-primary" onClick={() => setStep(3)}>下一步：选择受众</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="audience-panel">
            {([
              ['b', '🏢 内部使用', '问答、审批、看板等完整功能'],
              ['c', '👤 给客户/玩家用', '对外轻量版：以问答、查询为主'],
              ['both', '🔀 内外都要', '同时生成内部版与对外版'],
            ] as const).map(([k, title, desc]) => (
              <label key={k} className={`audience-opt${audience === k ? ' on' : ''}`}>
                <input type="radio" name="aud" checked={audience === k} onChange={() => setAudience(k)} />
                <div><strong>{title}</strong><span>{desc}</span></div>
              </label>
            ))}
          </div>
          <AppBrandingFields
            value={{ ...branding, appName: branding.appName || appName }}
            onChange={(next) => {
              setBranding(next)
              if (next.appName) setAppName(next.appName)
            }}
          />
          <DeliveryTemplatePicker
            webTemplateId={webTemplateId}
            appUiId={appUiId}
            onWebTemplateChange={setWebTemplateId}
            onAppUiChange={setAppUiId}
          />
          <div className="step-actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>上一步</button>
            <button type="button" className="btn-primary agent-action-btn" disabled={loading} onClick={handlePublish}>
              {loading ? GENERATE_APP_LOADING : (
                <AgentButtonContent>{GENERATE_APP_LABEL}</AgentButtonContent>
              )}
            </button>
          </div>
        </>
      )}

      {publishError && <p className="publish-error">{publishError}</p>}

      {loading && <GenerateLoadingOverlay phase="publish" />}

      {active && selectionItems.length > 1 && (
        <SelectionBox
          items={selectionItems}
          onRemove={removeSelectionItem}
          onClear={clearSelection}
          onGenerate={handlePublish}
          generating={loading}
          lastAddedId={lastAddedId}
          openSignal={boxOpenSignal}
        />
      )}

      <ContactGateModal
        open={active && contactOpen}
        onClose={() => setContactOpen(false)}
        onConfirm={(c) => { void doPublish(c) }}
      />
    </div>
  )
}
