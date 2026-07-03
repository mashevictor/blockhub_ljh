import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { fetchScenarios, publishApp } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runLoadingPublishPipeline } from '../lib/publishFlow'
import { INDUSTRIES, type Audience, type PublishResult } from '../data/constants'
import { DynamicIcon } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import { categoryColor, industryColor, iconWrapStyle } from '../data/iconPalette'
import { resolveCategoryIcon, resolveIndustryApiKey } from '../data/showcase'
import { buildPublishedModulesFromIndustry } from '../data/publishDisplay'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay from '../components/GenerateLoadingOverlay'
import AppBrandingFields from '../components/AppBrandingFields'
import { emptyBranding, resolveAppName } from '../data/appBranding'

interface SceneItem {
  id: string
  name: string
  category?: string
}

interface Props {
  onPublish: (r: PublishResult) => void
  active?: boolean
}

export default function IndustryView({ onPublish, active = true }: Props) {
  const { theme } = useTheme()
  const [industry, setIndustry] = useState('office')
  const [step, setStep] = useState(1)
  const [audience, setAudience] = useState<Audience>('b')
  const [scenes, setScenes] = useState<SceneItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [scenesLoading, setScenesLoading] = useState(false)
  const [sceneError, setSceneError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [appName, setAppName] = useState('我的行业应用')
  const [branding, setBranding] = useState(() => emptyBranding('我的行业应用'))

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
        setSceneError('无法加载场景列表，请检查 API 与 PostgreSQL')
        setScenes([])
        setSelected(new Set())
      })
      .finally(() => setScenesLoading(false))
  }

  useEffect(() => {
    loadScenes()
  }, [industry])

  useEffect(() => {
    if (active) return
    setContactOpen(false)
  }, [active])

  const pack = INDUSTRIES.find((p) => p.key === industry)!

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

  const doPublish = async (contact: ContactInfo) => {
    await runLoadingPublishPipeline({
      closeContact: () => setContactOpen(false),
      setLoading,
      setError: setPublishError,
      onSuccess: onPublish,
      errorMessage: '发布失败，请确认已登录且 API 可用',
      execute: async () => {
        const scenarioNames = scenes.filter((s) => selected.has(s.id)).map((s) => s.name)
        const publishedModules = buildPublishedModulesFromIndustry({
          industryKey: resolveIndustryApiKey(industry),
          industryLabel: pack.name,
          scenarioNames,
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
        <p>共 <strong>{INDUSTRIES.length}</strong> 个行业模板 · 5 个深度场景包 + 15 个快速模板 · 您可再按需增减</p>
      </div>

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
                {p.fullPack ? (
                  <span className="ind-full">深度包</span>
                ) : (
                  <span className="ind-template">模板</span>
                )}
                <div className="ind-icon icon-themed" style={iconWrapStyle(ic)}>
                  <DynamicIcon name={p.iconKey} size={28} color={ic} />
                </div>
                <strong>{p.name}</strong>
                <span>{p.desc}</span>
              </button>
              )
            })}
          </div>
          <button type="button" className="btn-primary" onClick={() => setStep(2)}>下一步：选择场景</button>
        </>
      )}

      {step === 2 && (
        <>
          {scenesLoading && <p className="catalog-loading">正在从 PostgreSQL 加载场景…</p>}
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
                          else next.add(s.id)
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
              ['b', '🏢 给员工用', '内部员工：问答、审批、看板等完整功能'],
              ['c', '👤 给客户/玩家用', '对外轻量版：以问答、查询为主'],
              ['both', '🔀 内外都要', '同时生成员工版与对外版'],
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
          <div className="step-actions">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>上一步</button>
            <button type="button" className="btn-primary" disabled={loading} onClick={handlePublish}>
              {loading ? '发布中…' : '🚀 发布给员工使用'}
            </button>
          </div>
        </>
      )}

      {publishError && <p className="publish-error">{publishError}</p>}

      {loading && <GenerateLoadingOverlay phase="publish" />}

      <ContactGateModal
        open={active && contactOpen}
        onClose={() => setContactOpen(false)}
        onConfirm={(c) => { void doPublish(c) }}
      />
    </div>
  )
}
