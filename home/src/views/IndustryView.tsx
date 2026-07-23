import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runContactPublishPipeline, type PublishWorkPhase } from '../lib/publishFlow'
import { GENERATE_APP_LABEL, GENERATE_APP_LOADING } from '../data/publishUi'
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
  micrositeCacheHint,
  micrositeChipBadge,
  type MicrositeLoadState,
} from '../data/industryMicrositePreviewCache'
import { getMicrositeRuntimeSkin } from '../data/micrositeRuntimeSkin'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding, resolveAppName, defaultAppNameForIndustry } from '../data/appBranding'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import DeliveryTemplatePicker from '../components/DeliveryTemplatePicker'

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
  const [scenes, setScenes] = useState<CachedIndustryScene[]>(() =>
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
    setScenes(items)
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
    const next = defaultAppNameForIndustry(industry)
    setAppName(next)
    setBranding((prev) => ({ ...prev, appName: next }))
  }, [industry])

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
  const micrositeMeta = getMicrositeTemplate(micrositeId)
  const apiPackKey = resolveIndustryApiKey(industry)
  const cachedMicrositeIds = useMemo(() => getCachedMicrositeIds(apiPackKey), [apiPackKey])
  const cachedMicrositeSet = useMemo(() => new Set(cachedMicrositeIds), [cachedMicrositeIds])

  const micrositeSrcDoc = useMemo(() => {
    if (!micrositeMeta) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return buildIndustryMicrositeSrcDoc(
      {
        packKey: apiPackKey,
        packName: pack.name,
        tagline: pack.desc,
        overview: `${pack.name}深度包 · ${scenes.length} 个业务场景可按需裁剪`,
        highlights: preferKeys.slice(0, 4),
        scenes: scenes.slice(0, 8).map((s) => ({ name: s.name, detail: s.summary })),
      },
      micrositeMeta,
      origin,
    )
  }, [micrositeMeta, apiPackKey, pack.name, pack.desc, scenes, preferKeys])

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
      const cat = s.category || '其他'
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

  const doPublish = async (contact: ContactInfo, nameOverride?: string) => {
    if (selected.size === 0) {
      setPublishError('请至少勾选 1 个场景后再生成（默认已全选，可取消不需要的项）')
      return
    }
    const finalName = resolveAppName(
      nameOverride || branding.appName,
      appName || defaultAppNameForIndustry(industry),
    )
    await runContactPublishPipeline({
      closeContact: () => setContactOpen(false),
      setPhase: setWorkPhase,
      setError: setPublishError,
      onSuccess: onPublish,
      errorMessage: '生成失败，请重试',
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
            label: pack.name,
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
        <h2>选择您的行业</h2>
        <p>共 <strong>{INDUSTRIES.length}</strong> 个行业深度包 · 每项含完整场景清单 · 您可再按需增减</p>
      </div>

      {(preferKeys.length > 0 || micrositeMeta) && (
        <div className="industry-compose-hint cube-panel">
          {micrositeMeta ? (
            <p>
              已选落地页模板：<strong>{micrositeMeta.styleLabel}</strong>（{micrositeMeta.brand}）
              · 下方可切换 20 套视觉模板 · 交付壳默认「单页落地」，可在发布步骤改模板
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
          <div className="industry-wizard-quick">
            <button type="button" className="btn-ghost" onClick={openRuntimePreview}>
              打开 {pack.name} Runtime 预览 →
            </button>
            <span className="industry-wizard-quick-hint">约定页：全场景工作台预览（无需先发布）</span>
          </div>
        </div>
      )}

      {step <= 2 && micrositeMeta ? (
        <div className="industry-wizard-microsite cube-panel">
          <div className="industry-wizard-microsite-head">
            <strong>20 套页面模板</strong>
            <span>
              前 {MICROSITE_PREVIEW_CACHE_LIMIT} 套预载可点即切；其余未预载 · 点选后即时生成，完成后标记「已加载」。行业文案保持「{pack.name}」
            </span>
          </div>
          <p className="industry-microsite-cache-legend" role="status">
            <span className="industry-microsite-cache-pill is-cached">
              已预载 {cachedMicrositeIds.length}/{MICROSITE_PREVIEW_CACHE_LIMIT}
            </span>
            <span className="industry-microsite-cache-pill is-live">
              {micrositeCacheHint(micrositeLoadState(micrositeId))}
            </span>
            {sessionLoadedMicrosites.size > 0 ? (
              <span className="industry-microsite-cache-pill is-session">
                本会话已加载 {sessionLoadedMicrosites.size}
              </span>
            ) : null}
            {micrositeLoadState(micrositeId) === 'idle' ? (
              <span className="industry-microsite-cache-warn">
                当前模板未纳入预载槽，首次打开需短暂生成预览
              </span>
            ) : null}
            {previewBusy ? (
              <span className="industry-microsite-cache-warn">正在加载预览…</span>
            ) : null}
          </p>
          <div className="industry-wizard-microsite-picker" role="listbox" aria-label="视觉模板">
            {INDUSTRY_MICROSITE_TEMPLATES.map((t) => {
              const skin = getMicrositeRuntimeSkin(t.id)
              const state = micrositeLoadState(t.id)
              const chipClass =
                state === 'cached' ? ' is-cached' : state === 'ready' || state === 'loading' ? ' is-session' : ' is-uncached'
              return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={t.id === micrositeId}
                className={`industry-wizard-ms-chip${t.id === micrositeId ? ' on' : ''}${chipClass}`}
                title={micrositeCacheHint(state)}
                onClick={() => switchMicrosite(t.id)}
              >
                <strong>{t.styleLabel}</strong>
                <span>
                  {skin ? `${skin.layout} · ${skin.nav}` : t.name}
                </span>
                <em className="industry-microsite-chip-badge">{micrositeChipBadge(state)}</em>
              </button>
              )
            })}
          </div>
          <div className={`industry-wizard-ms-frame-wrap${previewFade ? ' is-fading' : ''}`}>
            <div className="industry-wizard-ms-frame-bar">
              <span>{pack.name}</span>
              <span>
                {micrositeMeta.styleLabel}
                {cachedMicrositeSet.has(micrositeId)
                  ? ' · 预载切换'
                  : previewBusy
                    ? ' · 生成中…'
                    : sessionLoadedMicrosites.has(micrositeId)
                      ? ' · 已加载'
                      : ' · 即时预览'}
              </span>
            </div>
            <div className="industry-wizard-ms-frame-stack">
              <iframe
                key={`${apiPackKey}-${micrositeId}`}
                title={`${pack.name} · ${micrositeMeta.styleLabel}`}
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
                  未预载模板 · 正在生成预览…
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

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
              const short = clipIndustryDesc(p.desc, 3)
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
                <strong className="ind-name">{p.name}</strong>
                <span className="ind-desc">
                  {short.text}
                  {short.more > 0 ? <em className="ind-desc-more"> +{short.more}</em> : null}
                </span>
                <Link
                  to={ROUTES.industryDetail(p.key)}
                  className="ind-detail-btn"
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
          <div className="scene-toolbar">
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              深度包默认<strong>全选</strong> {selected.size} / {scenes.length} · 可取消不需要的场景
            </p>
            <div className="scene-toolbar-actions">
              <button type="button" className="btn-ghost" onClick={selectAllScenes}>全选</button>
              <button type="button" className="btn-ghost" onClick={clearSelection}>清空</button>
              <button type="button" className="btn-ghost" onClick={openRuntimePreview}>
                先看 Runtime 预览
              </button>
            </div>
          </div>
          {scenes.length === 0 ? (
            <div className="catalog-error">
              <p>该行业暂无缓存场景清单</p>
            </div>
          ) : (
            sceneGroups.map(([cat, items]) => (
            <div key={cat} className="scene-panel">
              <h4>
                {pack.name} · {cat}
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                  {items.length} 项 · 已选 {items.filter((s) => selected.has(s.id)).length}
                </span>
              </h4>
              <div className="scene-grid">
                {items.map((s) => {
                  const catName = s.category || '其他'
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
            合计已选 {selected.size} / {scenes.length} 个场景 · 本地缓存即时加载
          </p>
          <div className="step-actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>上一步</button>
            <button
              type="button"
              className="btn-primary"
              disabled={selected.size === 0}
              onClick={() => setStep(3)}
            >
              下一步：选择受众
            </button>
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
            <button type="button" className="btn-primary agent-action-btn" disabled={Boolean(workPhase)} onClick={handlePublish}>
              {workPhase ? GENERATE_APP_LOADING : (
                <AgentButtonContent>{GENERATE_APP_LABEL}</AgentButtonContent>
              )}
            </button>
          </div>
        </>
      )}

      {publishError && <p className="publish-error">{publishError}</p>}

      {workPhase && (
        <GenerateLoadingOverlay
          phase={workPhase}
          appName={appName || defaultAppNameForIndustry(industry)}
          redirectHint="正在打开行业应用工作台…"
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
        defaultAppName={appName || defaultAppNameForIndustry(industry)}
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
