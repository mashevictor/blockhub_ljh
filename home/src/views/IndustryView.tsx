import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runContactPublishPipeline, type PublishWorkPhase } from '../lib/publishFlow'
import { AgentButtonContent } from '../components/AgentChevron'
import { INDUSTRIES, type Audience, type PublishResult, type PublishedModuleItem } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { categoryColor, industryColor, iconWrapStyle, MODULE_ICON_KEYS } from '../data/iconPalette'
import { resolveCategoryIcon, resolveIndustryApiKey } from '../data/showcase'
import { ROUTES } from '../routes/paths'
import { buildClientStaticEnrichment } from '../data/industryEnrichStatic'
import {
  getCachedIndustryScenes,
  type CachedIndustryScene,
} from '../data/industryPackCache'
import {
  INDUSTRY_MICROSITE_TEMPLATES,
  getMicrositeTemplate,
  loadSavedMicrositeId,
  saveMicrositeId,
} from '../data/industryMicrositeTemplates'
import { buildIndustryMicrositeSrcDoc } from '../data/industryMicrositePreviewHtml'
import {
  MICROSITE_PREVIEW_CACHE_LIMIT,
  getCachedMicrositeIds,
  type MicrositeLoadState,
} from '../data/industryMicrositePreviewCache'
import { getMicrositeRuntimeSkin } from '../data/micrositeRuntimeSkin'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding, resolveAppName, defaultAppNameForIndustry } from '../data/appBranding'
import { defaultAppNameI18n, publishGenerateLabel, publishGenerateLoading } from '../i18n/publishLabels'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import DeliveryTemplatePicker from '../components/DeliveryTemplatePicker'
import { industryDesc, industryName } from '../i18n/industryLabels'
import { localizeCachedScenes } from '../i18n/industryPackI18n'
import { micrositeStyleLabel, micrositeBrand } from '../i18n/micrositeLabels'
import { msCacheHint, msChipBadge, msFrameBadge } from '../i18n/micrositeStatus'

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
  const t = useT()
  const { theme } = useTheme()
  const [industry, setIndustry] = useState(initialIndustry ?? 'office')
  const [step, setStep] = useState(1)
  const [audience, setAudience] = useState<Audience>('b')
  const [scenesRaw, setScenesRaw] = useState<CachedIndustryScene[]>(() =>
    getCachedIndustryScenes(resolveIndustryApiKey(initialIndustry ?? 'office')),
  )
  const [selected, setSelected] = useState<Set<string>>(() => {
    const items = getCachedIndustryScenes(resolveIndustryApiKey(initialIndustry ?? 'office'))
    return new Set(items.map((s) => s.id))
  })
  const [workPhase, setWorkPhase] = useState<PublishWorkPhase | null>(null)
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [appName, setAppName] = useState(() => defaultAppNameForIndustry(initialIndustry ?? 'office'))
  const [branding, setBranding] = useState(() =>
    emptyBranding(defaultAppNameForIndustry(initialIndustry ?? 'office')),
  )
  // 业务 Runtime：独立站入口默认侧栏场景工作台（标题页 + 单场景），皮肤由 micrositeId 驱动
  const [webTemplateId, setWebTemplateId] = useState('sidebar_admin')
  const [appUiId, setAppUiId] = useState('bottom_tabs')
  const [preferKeys, setPreferKeys] = useState<string[]>(() =>
    buildClientStaticEnrichment(initialIndustry ?? 'office').recommended_modules,
  )
  const [micrositeId, setMicrositeId] = useState(
    () => initialMicrosite ?? loadSavedMicrositeId(initialIndustry ?? 'office'),
  )
  const [previewFade, setPreviewFade] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [sessionLoadedMicrosites, setSessionLoadedMicrosites] = useState<Set<string>>(() => new Set())

  const loadScenesFromCache = (packKey: string) => {
    const apiKey = resolveIndustryApiKey(packKey)
    const items = getCachedIndustryScenes(apiKey)
    setScenesRaw(items)
    // 深度包默认全选：用户可再取消不需要的场景
    setSelected(new Set(items.map((s) => s.id)))
  }

  useEffect(() => {
    if (initialIndustry) {
      setIndustry(initialIndustry)
      // 从行业站「用此模板去编排」进入时，直接落到选场景（已全选）
      setStep(2)
    }
  }, [initialIndustry])

  useEffect(() => {
    if (initialMicrosite) {
      setMicrositeId(initialMicrosite)
      if (initialIndustry) saveMicrositeId(initialIndustry, initialMicrosite)
    }
  }, [initialMicrosite, initialIndustry])

  useEffect(() => {
    if (!active) return
    loadScenesFromCache(industry)
  }, [industry, active])

  useEffect(() => {
    const next = defaultAppNameI18n(t, industry)
    setAppName(next)
    setBranding((prev) => ({ ...prev, appName: next }))
  }, [industry, t])

  useEffect(() => {
    if (!active) return
    const apiKey = resolveIndustryApiKey(industry)
    const fallback = buildClientStaticEnrichment(apiKey)
    setPreferKeys(fallback.recommended_modules)
    setMicrositeId((prev) => initialMicrosite || loadSavedMicrositeId(apiKey) || prev)
    setWebTemplateId('sidebar_admin')
    setSessionLoadedMicrosites(new Set())
    setPreviewBusy(false)
  }, [industry, active, initialMicrosite])

  useEffect(() => {
    if (active) return
    setContactOpen(false)
  }, [active])

  const pack = INDUSTRIES.find((p) => p.key === industry)!
  const packDisplayName = industryName(t, pack.key, pack.name)
  const apiPackKey = resolveIndustryApiKey(industry)
  const scenes = useMemo(
    () => localizeCachedScenes(t, apiPackKey, scenesRaw, pack.name),
    [t, apiPackKey, scenesRaw, pack.name],
  )
  const micrositeMeta = getMicrositeTemplate(micrositeId)
  const micrositeStyle = micrositeMeta ? micrositeStyleLabel(t, micrositeMeta) : ''
  const micrositeBrandLabel = micrositeMeta ? micrositeBrand(t, micrositeMeta) : ''
  const cachedMicrositeIds = useMemo(() => getCachedMicrositeIds(apiPackKey), [apiPackKey])
  const cachedMicrositeSet = useMemo(() => new Set(cachedMicrositeIds), [cachedMicrositeIds])

  const micrositeSrcDoc = useMemo(() => {
    if (!micrositeMeta) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return buildIndustryMicrositeSrcDoc(
      {
        packKey: apiPackKey,
        packName: packDisplayName,
        tagline: industryDesc(t, pack.key, pack.desc),
        overview: t('home.industry.view.overview', { name: packDisplayName, n: scenes.length }),
        highlights: preferKeys.slice(0, 4),
        scenes: scenes.slice(0, 8).map((s) => ({ name: s.name, detail: s.summary })),
      },
      { ...micrositeMeta, styleLabel: micrositeStyle, brand: micrositeBrandLabel },
      origin,
    )
  }, [
    micrositeMeta,
    apiPackKey,
    packDisplayName,
    pack.key,
    pack.desc,
    scenes,
    preferKeys,
    t,
    micrositeStyle,
    micrositeBrandLabel,
  ])

  // 进入未预载模板时先标加载中，iframe onLoad 后改为「已加载」
  useEffect(() => {
    if (!micrositeMeta) return
    if (cachedMicrositeSet.has(micrositeId) || sessionLoadedMicrosites.has(micrositeId)) return
    setPreviewBusy(true)
  }, [micrositeId, apiPackKey, micrositeMeta, cachedMicrositeSet, sessionLoadedMicrosites])

  const switchMicrosite = (id: string) => {
    if (id === micrositeId) return
    const instant = cachedMicrositeSet.has(id) || sessionLoadedMicrosites.has(id)
    setPreviewFade(true)
    if (!instant) setPreviewBusy(true)
    window.setTimeout(() => {
      setMicrositeId(id)
      saveMicrositeId(apiPackKey, id)
      setPreviewFade(false)
    }, instant ? 80 : 160)
  }

  const micrositeLoadState = (id: string): MicrositeLoadState => {
    if (cachedMicrositeSet.has(id)) return 'cached'
    if (sessionLoadedMicrosites.has(id)) return 'ready'
    if (id === micrositeId && previewBusy) return 'loading'
    return 'idle'
  }

  const selectAllScenes = () => setSelected(new Set(scenes.map((s) => s.id)))

  const openRuntimePreview = () => {
    const q = micrositeId ? `?microsite=${encodeURIComponent(micrositeId)}` : ''
    window.location.assign(`/preview/industry-runtime/${apiPackKey}${q}`)
  }

  const sceneGroups = useMemo(() => {
    const map = new Map<string, CachedIndustryScene[]>()
    for (const s of scenes) {
      const cat = s.category || t('home.industry.view.cat_other')
      const list = map.get(cat) ?? []
      list.push(s)
      map.set(cat, list)
    }
    return [...map.entries()]
  }, [scenes, t])

  const selectionItems = useMemo<SelectionItem[]>(() => {
    const other = t('home.industry.view.cat_other')
    const industryItem: SelectionItem = {
      id: `industry:${industry}`,
      name: packDisplayName,
      kind: 'industry',
      iconKey: pack.iconKey,
      color: industryColor(pack.key, theme),
    }
    const sceneItems = scenes
      .filter((s) => selected.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category ?? other,
        kind: 'scenario' as const,
        iconKey: resolveCategoryIcon(s.category ?? other, 'industry'),
        color: categoryColor(s.category ?? other, theme),
      }))
    return [industryItem, ...sceneItems]
  }, [industry, pack.iconKey, pack.key, packDisplayName, scenes, selected, theme, t])

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

  const doPublish = async (contact: ContactInfo, nameOverride?: string) => {
    if (selected.size === 0) {
      setPublishError(t('home.industry.view.err.need_scene'))
      return
    }
    const finalName = resolveAppName(
      nameOverride || branding.appName,
      appName || defaultAppNameI18n(t, industry),
    )
    await runContactPublishPipeline({
      closeContact: () => setContactOpen(false),
      setPhase: setWorkPhase,
      setError: setPublishError,
      onSuccess: onPublish,
      errorMessage: t('home.industry.view.err.generate'),
      execute: async (markPhase) => {
        markPhase('publish')
        const packKey = resolveIndustryApiKey(industry)
        const selectedScenes = scenes.filter((s) => selected.has(s.id))
        const capabilityKeys = [
          ...new Set(
            selectedScenes
              .map((s) => s.capabilityKey)
              .filter((k) => k && !k.startsWith('gen_')),
          ),
        ]
        const publishedModules: PublishedModuleItem[] = [
          {
            key: packKey,
            label: packDisplayName,
            iconKey: pack.iconKey,
            kind: 'industry',
            source: 'user',
          },
          ...capabilityKeys.map((key) => ({
            key,
            label: selectedScenes.find((s) => s.capabilityKey === key)?.name || key,
            iconKey: MODULE_ICON_KEYS[key] ?? 'creation',
            kind: 'module' as const,
            source: 'auto' as const,
          })),
        ]
        const skin = getMicrositeRuntimeSkin(micrositeId)
        const res = await publishApp(finalName, packKey, {
          scenarioIds: selectedScenes.map((s) => s.id),
          scenarioNames: selectedScenes.map((s) => s.name),
          capabilityKeys,
          modules: publishedModules.map((m) => ({
            key: m.key,
            label: m.label,
            kind: m.kind,
            iconKey: m.iconKey,
            source: m.source,
          })),
          deliver: 'web',
          source: 'industry_site',
          entrySource: 'industry_site',
          micrositeId,
          iconUrl: branding.iconUrl,
          primaryColor: branding.primaryColor || skin?.accent || '#4338ca',
          // 独立站：保留落地壳 + 模板皮肤；用户在交付步骤可改 tabs/sidebar
          webTemplateId,
          appUiId,
          contactEmail: contact.type === 'email' ? contact.value : undefined,
          contactPhone: contact.type === 'phone' ? contact.value : undefined,
          assembleFullScenes: false,
        })
        return publishApiToResult(res, {
          moduleCount: publishedModules.length,
          modules: publishedModules,
          scenarios: selectedScenes.map((s) => s.name),
        })
      },
    })
  }

  const handlePublish = () => setContactOpen(true)

  const clipIndustryDesc = (desc: string, max = 3) => {
    const parts = desc.split(/[、,，·]/).map((s) => s.trim()).filter(Boolean)
    if (parts.length <= max) return { text: parts.join(' · '), more: 0 }
    return { text: parts.slice(0, max).join(' · '), more: parts.length - max }
  }

  return (
    <div className="view industry-view">
      <div className="view-hero compact cube-panel">
        <h2>{t('home.industry.view.pick_title')}</h2>
        <p>{t('home.industry.view.pick_lead', { n: INDUSTRIES.length })}</p>
      </div>

      {(preferKeys.length > 0 || micrositeMeta) && (
        <div className="industry-compose-hint cube-panel">
          {micrositeMeta ? (
            <p>
              {t('home.industry.view.compose_tpl', {
                style: micrositeStyle,
                brand: micrositeBrandLabel,
              })}
            </p>
          ) : null}
          {preferKeys.length > 0 ? (
            <p>
              {t('home.industry.view.compose_caps')}
              {preferKeys.map((k) => (
                <code key={k} className="industry-compose-chip">{k}</code>
              ))}
            </p>
          ) : null}
          <div className="industry-wizard-quick">
            <button type="button" className="btn-ghost" onClick={openRuntimePreview}>
              {t('home.industry.view.runtime_preview', { name: packDisplayName })}
            </button>
            <span className="industry-wizard-quick-hint">{t('home.industry.view.runtime_hint')}</span>
          </div>
        </div>
      )}

      {step <= 2 && micrositeMeta ? (
        <div className="industry-wizard-microsite cube-panel">
          <div className="industry-wizard-microsite-head">
            <strong>{t('home.industry.view.tpl_title')}</strong>
            <span>
              {t('home.industry.ms.lead', { name: packDisplayName, n: MICROSITE_PREVIEW_CACHE_LIMIT })}
            </span>
          </div>
          <p className="industry-microsite-cache-legend" role="status">
            <span className="industry-microsite-cache-pill is-cached">
              {t('home.industry.ms.cached', { a: cachedMicrositeIds.length, b: MICROSITE_PREVIEW_CACHE_LIMIT })}
            </span>
            <span className="industry-microsite-cache-pill is-live">
              {msCacheHint(t, micrositeLoadState(micrositeId))}
            </span>
            {sessionLoadedMicrosites.size > 0 ? (
              <span className="industry-microsite-cache-pill is-session">
                {t('home.industry.ms.session', { n: sessionLoadedMicrosites.size })}
              </span>
            ) : null}
            {micrositeLoadState(micrositeId) === 'idle' ? (
              <span className="industry-microsite-cache-warn">{t('home.industry.ms.uncached_hint')}</span>
            ) : null}
            {previewBusy ? (
              <span className="industry-microsite-cache-warn">{t('home.industry.ms.loading')}</span>
            ) : null}
          </p>
          <div className="industry-wizard-microsite-picker" role="listbox" aria-label={t('home.industry.ms.aria')}>
            {INDUSTRY_MICROSITE_TEMPLATES.map((tpl) => {
              const skin = getMicrositeRuntimeSkin(tpl.id)
              const state = micrositeLoadState(tpl.id)
              const chipClass =
                state === 'cached' ? ' is-cached' : state === 'ready' || state === 'loading' ? ' is-session' : ' is-uncached'
              return (
              <button
                key={tpl.id}
                type="button"
                role="option"
                aria-selected={tpl.id === micrositeId}
                className={`industry-wizard-ms-chip${tpl.id === micrositeId ? ' on' : ''}${chipClass}`}
                title={msCacheHint(t, state)}
                onClick={() => switchMicrosite(tpl.id)}
              >
                <strong>{micrositeStyleLabel(t, tpl)}</strong>
                <span>
                  {skin ? `${skin.layout} · ${skin.nav}` : micrositeStyleLabel(t, tpl)}
                </span>
                <em className="industry-microsite-chip-badge">{msChipBadge(t, state)}</em>
              </button>
              )
            })}
          </div>
          <div className={`industry-wizard-ms-frame-wrap${previewFade ? ' is-fading' : ''}`}>
            <div className="industry-wizard-ms-frame-bar">
              <span>{packDisplayName}</span>
              <span>
                {micrositeStyle}
                {msFrameBadge(t, {
                  cached: cachedMicrositeSet.has(micrositeId),
                  busy: previewBusy,
                  sessionLoaded: sessionLoadedMicrosites.has(micrositeId),
                })}
              </span>
            </div>
            <div className="industry-wizard-ms-frame-stack">
              <iframe
                key={`${apiPackKey}-${micrositeId}`}
                title={`${packDisplayName} · ${micrositeStyle}`}
                className={`industry-wizard-ms-frame${previewBusy ? ' is-loading' : ''}`}
                srcDoc={micrositeSrcDoc}
                sandbox="allow-same-origin allow-scripts"
                loading="lazy"
                onLoad={() => {
                  setPreviewBusy(false)
                  if (!cachedMicrositeSet.has(micrositeId)) {
                    setSessionLoadedMicrosites((prev) => {
                      if (prev.has(micrositeId)) return prev
                      const next = new Set(prev)
                      next.add(micrositeId)
                      return next
                    })
                  }
                }}
              />
              {previewBusy ? (
                <div className="industry-wizard-ms-frame-loading" role="status">
                  {t('home.industry.ms.generating')}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="step-bar">
        {[
          t('home.industry.view.step.industry'),
          t('home.industry.view.step.scenes'),
          t('home.industry.view.step.audience'),
          t('home.industry.view.step.publish'),
        ].map((s, i) => (
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
              const short = clipIndustryDesc(industryDesc(t, p.key, p.desc), 3)
              const name = industryName(t, p.key, p.name)
              return (
              <button
                key={p.key}
                type="button"
                className={`industry-card${industry === p.key ? ' selected' : ''}`}
                style={{ '--accent': ic, '--icon-color': ic } as CSSProperties}
                onClick={() => setIndustry(p.key)}
              >
                <span className="ind-count">{t('home.industry.card.scenes', { n: p.count })}</span>
                <span className="ind-full">{t('home.industry.card.deep_pack')}</span>
                <div className="ind-icon icon-themed" style={iconWrapStyle(ic)}>
                  <DynamicIcon name={p.iconKey} size={28} color={ic} />
                </div>
                <strong className="ind-name">{name}</strong>
                <span className="ind-desc">
                  {short.text}
                  {short.more > 0 ? <em className="ind-desc-more"> +{short.more}</em> : null}
                </span>
                <Link
                  to={ROUTES.industryDetail(p.key)}
                  className="ind-detail-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('home.industry.view.site_link')}
                </Link>
              </button>
              )
            })}
          </div>
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>{t('home.industry.view.next_scenes')}</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="scene-toolbar">
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {t('home.industry.view.selected_hint', { a: selected.size, b: scenes.length })}
            </p>
            <div className="scene-toolbar-actions">
              <button type="button" className="btn-ghost" onClick={selectAllScenes}>{t('home.industry.view.select_all')}</button>
              <button type="button" className="btn-ghost" onClick={clearSelection}>{t('home.industry.view.clear')}</button>
              <button type="button" className="btn-ghost" onClick={openRuntimePreview}>
                {t('home.industry.view.preview_first')}
              </button>
            </div>
          </div>
          {scenes.length === 0 ? (
            <div className="catalog-error">
              <p>{t('home.industry.view.no_scenes')}</p>
            </div>
          ) : (
            sceneGroups.map(([cat, items]) => (
            <div key={cat} className="scene-panel">
              <h4>
                {packDisplayName} · {cat}
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                  {t('home.industry.detail.items', { n: items.length })} · {items.filter((s) => selected.has(s.id)).length}
                </span>
              </h4>
              <div className="scene-grid">
                {items.map((s) => {
                  const catName = s.category || t('home.industry.view.cat_other')
                  const ic = categoryColor(catName, theme)
                  const iconKey = resolveCategoryIcon(catName, 'industry')
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
            ))
          )}
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            {t('home.industry.view.total_selected', { a: selected.size, b: scenes.length })}
          </p>
          <div className="step-actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>{t('home.industry.view.prev')}</button>
            <button
              type="button"
              className="btn-primary"
              disabled={selected.size === 0}
              onClick={() => setStep(3)}
            >
              {t('home.industry.view.next_audience')}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="audience-panel">
            {([
              ['b', 'home.industry.view.aud.b.title', 'home.industry.view.aud.b.desc'],
              ['c', 'home.industry.view.aud.c.title', 'home.industry.view.aud.c.desc'],
              ['both', 'home.industry.view.aud.both.title', 'home.industry.view.aud.both.desc'],
            ] as const).map(([k, titleKey, descKey]) => (
              <label key={k} className={`audience-opt${audience === k ? ' on' : ''}`}>
                <input type="radio" name="aud" checked={audience === k} onChange={() => setAudience(k)} />
                <div><strong>{t(titleKey)}</strong><span>{t(descKey)}</span></div>
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
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>{t('home.industry.view.prev')}</button>
            <button type="button" className="btn-primary agent-action-btn" disabled={Boolean(workPhase)} onClick={handlePublish}>
              {workPhase ? publishGenerateLoading(t) : (
                <AgentButtonContent>{publishGenerateLabel(t)}</AgentButtonContent>
              )}
            </button>
          </div>
        </>
      )}

      {publishError && <p className="publish-error">{publishError}</p>}

      {workPhase && (
        <GenerateLoadingOverlay
          phase={workPhase}
          appName={appName || defaultAppNameI18n(t, industry)}
          redirectHint={t('home.industry.view.redirect')}
        />
      )}

      {active && selectionItems.length > 1 && (
        <SelectionBox
          items={selectionItems}
          onRemove={removeSelectionItem}
          onClear={clearSelection}
          onGenerate={handlePublish}
          generating={Boolean(workPhase)}
          lastAddedId={lastAddedId}
          openSignal={boxOpenSignal}
        />
      )}

      <ContactGateModal
        open={active && contactOpen}
        defaultAppName={appName || defaultAppNameI18n(t, industry)}
        onClose={() => setContactOpen(false)}
        onConfirm={(c, opts) => {
          const named = opts?.appName?.trim()
          if (named) {
            setAppName(named)
            setBranding((prev) => ({ ...prev, appName: named }))
          }
          void doPublish(c, named)
        }}
      />
    </div>
  )
}
