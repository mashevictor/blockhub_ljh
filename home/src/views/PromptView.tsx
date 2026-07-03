import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  fetchCatalogSummary,
  fetchIndustryScenarios,
  fetchOfficeScenarios,
  type CatalogScenario,
  type CatalogSummary,
} from '../api/client'
import { publishApp, suggestModules as suggestModulesApi } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { DynamicIcon, IconCheckCircle } from '../components/icons'
import { useTheme } from '../context/ThemeContext'
import {
  categoryColor,
  industryColor,
  iconWrapStyle,
} from '../data/iconPalette'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import AgentInput, { type AgentPick } from '../components/AgentInput'
import PromptSuggestBar from '../components/PromptSuggestBar'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import AppBrandingFields from '../components/AppBrandingFields'
import GenerateLoadingOverlay, { type GeneratePhase } from '../components/GenerateLoadingOverlay'
import { emptyBranding, resolveAppName } from '../data/appBranding'
import { moduleId, pickToModule, type PromptModule } from '../components/agentInputLogic'
import { PROMPT_CHIPS, type PublishResult } from '../data/constants'
import { findChipTemplate, pickWithMeta, resolveAppBundle, composeLogicalPrompt, mergePromptText, splitPromptText } from '../data/appAssembly'
import { buildPublishedModulesFromBundle } from '../data/publishDisplay'
import { resolvePublishBundle } from '../data/intentPublish'
import { enhanceSimplePrompt, suggestModulesFromText, type SuggestItem } from '../data/promptSuggest'
import {
  INDUSTRIES_SHOWCASE,
  resolveCategoryIcon,
  resolveIndustryApiKey,
} from '../data/showcase'
import type { RoleApplyRequest, RolePreset } from '../data/rolePresets'
import { formatAgentLabel } from '../data/agentLabels'

interface Props {
  onPublish: (r: PublishResult) => void
  roleApply?: RoleApplyRequest | null
  onRoleApplyDone?: () => void
  /** 当前是否为「描述需求」Tab（隐藏时收起弹层与积木仓） */
  active?: boolean
}

type Tab = 'all' | 'office' | 'industry'

const OFFICE_CATS = [
  '人事行政', '财务法务', '知识协同', '流程审批',
  '数据报表', '消息通知', 'IT与资产', '外部对接',
]

const API_PACK_KEYS = new Set(['mfg', 'sales', 'med', 'game'])

function filterByIndustries(
  keys: Set<string>,
  office: CatalogScenario[],
  industry: CatalogScenario[],
): CatalogScenario[] {
  if (!keys.size) return []
  const seen = new Set<string>()
  const out: CatalogScenario[] = []
  const add = (items: CatalogScenario[]) => {
    for (const s of items) {
      if (!seen.has(s.id)) { seen.add(s.id); out.push(s) }
    }
  }
  for (const key of keys) {
    const pack = resolveIndustryApiKey(key)
    if (API_PACK_KEYS.has(pack) && pack !== 'office') {
      add(industry.filter((s) => s.kind === 'industry' && s.pack_key === pack))
    } else {
      add(office)
    }
  }
  return out
}

export default function PromptView({ onPublish, roleApply, onRoleApplyDone, active = true }: Props) {
  const { theme } = useTheme()
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('all')
  const [industryKeys, setIndustryKeys] = useState<Set<string>>(new Set())
  const [officeCats, setOfficeCats] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [generatePhase, setGeneratePhase] = useState<GeneratePhase | null>(null)
  const loading = generatePhase !== null
  const [contactOpen, setContactOpen] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<RolePreset | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [deliver, setDeliver] = useState<'web' | 'app' | 'both'>('both')
  const [branding, setBranding] = useState(() => emptyBranding())
  const [summary, setSummary] = useState<CatalogSummary | null>(null)
  const [officeAll, setOfficeAll] = useState<CatalogScenario[]>([])
  const [industryAll, setIndustryAll] = useState<CatalogScenario[]>([])
  const [promptHighlight, setPromptHighlight] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [promptModules, setPromptModules] = useState<PromptModule[]>([])
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [debouncedIntent, setDebouncedIntent] = useState('')
  const [promptSuggestions, setPromptSuggestions] = useState<SuggestItem[]>([])
  const [suggestUsedLlm, setSuggestUsedLlm] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const promptCardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const catalogRef = useRef<HTMLDivElement>(null)
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const userSuffixRef = useRef('')
  const skipSyncRef = useRef(false)

  const flashAdded = useCallback((id: string) => {
    setLastAddedId(id)
    window.setTimeout(() => setLastAddedId(null), 900)
  }, [])

  const applyModuleToFilters = useCallback((pick: AgentPick, add: boolean) => {
    if (pick.type === 'industry') {
      setIndustryKeys((prev) => {
        const next = new Set(prev)
        if (add) next.add(pick.key)
        else next.delete(pick.key)
        return next
      })
      if (add) setTab('all')
    } else if (pick.type === 'office') {
      setOfficeCats((prev) => {
        const next = new Set(prev)
        if (add) next.add(pick.key)
        else next.delete(pick.key)
        return next
      })
    } else if (pick.type === 'scenario') {
      setSelected((prev) => {
        const next = new Set(prev)
        if (add) next.add(pick.key)
        else next.delete(pick.key)
        return next
      })
    }
  }, [])

  const upsertModule = useCallback((pick: AgentPick, extra?: { iconKey?: string; color?: string }) => {
    if (pick.type === 'action') return
    const mod = { ...pickToModule(pick, extra), source: 'user' as const }
    setPromptModules((prev) => {
      const exists = prev.some((m) => m.id === mod.id)
      if (exists) {
        applyModuleToFilters(pick, false)
        return prev.filter((m) => m.id !== mod.id)
      }
      applyModuleToFilters(pick, true)
      flashAdded(mod.id)
      return [...prev, mod]
    })
  }, [applyModuleToFilters, flashAdded])

  const removeModule = useCallback((id: string) => {
    setPromptModules((prev) => {
      const mod = prev.find((m) => m.id === id)
      if (mod) applyModuleToFilters({ type: mod.type, key: mod.key, label: mod.label }, false)
      return prev.filter((m) => m.id !== id)
    })
  }, [applyModuleToFilters])

  const composedFromModules = useMemo(
    () => composeLogicalPrompt(promptModules),
    [promptModules],
  )

  useEffect(() => {
    const merged = mergePromptText(composedFromModules, userSuffixRef.current)
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      if (composedFromModules) {
        setPrompt((prev) => {
          if (!prev.replace(/^>\s*$/, '').trim()) return merged
          return prev
        })
      }
      return
    }
    setPrompt(merged)
  }, [composedFromModules])

  const handlePromptChange = useCallback((value: string) => {
    const stripped = value.replace(/^>\s*$/, '').trim()
    if (!stripped && promptModules.length > 0) {
      userSuffixRef.current = ''
      skipSyncRef.current = false
      setPrompt(mergePromptText(composedFromModules, ''))
      return
    }
    const { suffix } = splitPromptText(value, promptModules)
    userSuffixRef.current = suffix
    skipSyncRef.current = true
    setPrompt(value)
  }, [promptModules, composedFromModules])

  const userIntentText = useMemo(() => {
    const raw = prompt.replace(/^>\s*$/, '').trim()
    if (!raw) return ''
    const { suffix, base } = splitPromptText(prompt, promptModules)
    if (suffix.trim()) return suffix.trim()
    if (!base) return raw
    return ''
  }, [prompt, promptModules])

  const canGenerate = promptModules.length > 0
    || prompt.replace(/^>\s*$/, '').trim().length >= 2

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedIntent(userIntentText), 400)
    return () => window.clearTimeout(id)
  }, [userIntentText])

  const catalogScenarios = useMemo(
    () => [...officeAll, ...industryAll].map((s) => ({ id: s.id, name: s.name, category: s.category })),
    [officeAll, industryAll],
  )

  useEffect(() => {
    const text = debouncedIntent.trim()
    if (text.length < 2) {
      setPromptSuggestions([])
      setSuggestUsedLlm(false)
      return
    }
    let cancelled = false
    suggestModulesApi(text)
      .then((res) => {
        if (cancelled) return
        setSuggestUsedLlm(res.used_llm)
        setPromptSuggestions(res.items.map((it) => ({
          pick: {
            type: it.type === 'industry' ? 'industry' as const
              : it.type === 'supplement' ? 'module' as const
              : it.type === 'module' ? 'module' as const
              : 'module' as const,
            key: it.key,
            label: it.label,
          },
          score: it.score,
          reason: it.source.startsWith('deepseek')
            ? `${it.reason} · AI`
            : it.flutter_pkg
              ? `${it.reason} · ${it.flutter_pkg}`
              : it.reason,
        })))
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestUsedLlm(false)
          setPromptSuggestions(suggestModulesFromText(text, catalogScenarios))
        }
      })
    return () => { cancelled = true }
  }, [debouncedIntent, catalogScenarios])

  const selectedModuleIds = useMemo(
    () => new Set(promptModules.map((m) => m.id)),
    [promptModules],
  )

  const previewPicks = useMemo((): AgentPick[] => {
    const map = new Map<string, AgentPick>()
    for (const m of promptModules) {
      map.set(m.id, { type: m.type, key: m.key, label: m.label })
    }
    for (const s of promptSuggestions) {
      const id = moduleId(s.pick)
      if (!map.has(id)) map.set(id, s.pick)
    }
    return [...map.values()]
  }, [promptModules, promptSuggestions])

  const enhancedPreview = useMemo(
    () => (debouncedIntent.trim().length >= 2 ? enhanceSimplePrompt(debouncedIntent, previewPicks) : ''),
    [debouncedIntent, previewPicks],
  )

  const applyEnhancedPreview = useCallback(() => {
    if (!enhancedPreview) return
    userSuffixRef.current = enhancedPreview
    skipSyncRef.current = true
    setPrompt(composedFromModules ? mergePromptText(composedFromModules, enhancedPreview) : enhancedPreview)
  }, [enhancedPreview, composedFromModules])

  const selectedIndustries = useMemo(
    () => INDUSTRIES_SHOWCASE.filter((i) => industryKeys.has(i.key)),
    [industryKeys],
  )

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => {
      promptCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setPromptHighlight(true)
      setPromptExpanded(true)
      textareaRef.current?.focus()
      window.setTimeout(() => setPromptHighlight(false), 1800)
      window.setTimeout(() => setPromptExpanded(false), 5000)
    })
  }, [])

  const buildModulesFromPreset = useCallback((preset: RolePreset): PromptModule[] => {
    return preset.picks.map((p) => {
      if (p.type !== 'scenario') return pickWithMeta(p)
      const catalog = [...officeAll, ...industryAll]
      const matched = catalog.find((s) => s.name === p.label || s.name.includes(p.label) || p.label.includes(s.name))
      if (matched) {
        return {
          ...pickToModule({
            type: 'scenario',
            key: matched.id,
            label: matched.name,
          }, {
            iconKey: resolveCategoryIcon(matched.category, matched.kind === 'industry' ? 'industry' : 'office'),
            color: categoryColor(matched.category, theme),
          }),
          source: 'user' as const,
        }
      }
      return pickWithMeta(p)
    })
  }, [officeAll, industryAll, theme])

  const applyRolePreset = useCallback((preset: RolePreset) => {
    const picks = buildModulesFromPreset(preset)

    userSuffixRef.current = ''
    setPromptModules(picks)
    setIndustryKeys(new Set(preset.picks.filter((p) => p.type === 'industry').map((p) => p.key)))
    setOfficeCats(new Set(preset.picks.filter((p) => p.type === 'office').map((p) => p.key)))
    setSelected(new Set(picks.filter((m) => m.type === 'scenario').map((m) => m.key)))
    setTab('all')
    skipSyncRef.current = true
    setPrompt(preset.prompt)
    focusPrompt()
  }, [buildModulesFromPreset, focusPrompt])

  useEffect(() => {
    fetchCatalogSummary().then(setSummary).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setCatalogLoading(true)
    Promise.all([
      fetchOfficeScenarios({ lite: true }),
      fetchIndustryScenarios({ lite: true }),
    ])
      .then(([o, i]) => {
        if (cancelled) return
        setOfficeAll(o.map((s) => ({ ...s, kind: 'office' as const })))
        setIndustryAll(i.map((s) => ({ ...s, kind: 'industry' as const })))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const searchFilter = useCallback(
    (items: CatalogScenario[]) => {
      if (!q.trim()) return items
      const qq = q.trim().toLowerCase()
      return items.filter((s) => s.name.toLowerCase().includes(qq))
    },
    [q],
  )

  const visibleItems = useMemo((): CatalogScenario[] => {
    let officeItems = searchFilter(officeAll)
    let industryItems = searchFilter(industryAll)

    if (officeCats.size > 0) {
      officeItems = officeItems.filter((s) => officeCats.has(s.category))
    }

    if (industryKeys.size > 0) {
      const filtered = filterByIndustries(industryKeys, officeItems, industryItems)
      const hasOfficeOnly = filtered.some((s) => s.kind === 'office')
      const hasIndustry = filtered.some((s) => s.kind === 'industry')
      if (hasOfficeOnly && !hasIndustry) {
        officeItems = filtered.filter((s) => s.kind === 'office')
        industryItems = []
      } else if (hasIndustry && !hasOfficeOnly) {
        industryItems = filtered.filter((s) => s.kind === 'industry')
      } else if (hasIndustry && hasOfficeOnly) {
        officeItems = filtered.filter((s) => s.kind === 'office')
        industryItems = filtered.filter((s) => s.kind === 'industry')
      }
    }

    const list: CatalogScenario[] = []
    if (tab === 'all' || tab === 'office') list.push(...officeItems)
    if (tab === 'all' || tab === 'industry') list.push(...industryItems)
    return list
  }, [tab, officeAll, industryAll, officeCats, industryKeys, searchFilter])

  const categoryGroups = useMemo(() => {
    const map = new Map<string, CatalogScenario[]>()
    for (const item of visibleItems) {
      const list = map.get(item.category) ?? []
      list.push(item)
      map.set(item.category, list)
    }
    return [...map.entries()]
  }, [visibleItems])

  const toggleIndustryKey = (key: string) => {
    const ind = INDUSTRIES_SHOWCASE.find((i) => i.key === key)
    if (!ind) return
    upsertModule(
      { type: 'industry', key, label: ind.name },
      { iconKey: ind.iconKey, color: industryColor(key, theme) },
    )
  }

  const clearIndustries = () => {
    promptModules.filter((m) => m.type === 'industry').forEach((m) => removeModule(m.id))
  }

  const toggleOfficeCat = (cat: string) => {
    upsertModule(
      { type: 'office', key: cat, label: cat },
      { iconKey: resolveCategoryIcon(cat, 'office'), color: categoryColor(cat, theme) },
    )
  }

  const toggleScenario = (item: CatalogScenario) => {
    upsertModule(
      { type: 'scenario', key: item.id, label: item.name },
      {
        iconKey: resolveCategoryIcon(item.category, item.kind === 'industry' ? 'industry' : 'office'),
        color: categoryColor(item.category, theme),
      },
    )
  }

  const handleTabChange = (t: Tab) => setTab(t)

  const handleChip = (text: string) => {
    userSuffixRef.current = ''
    const tpl = findChipTemplate(text)
    if (tpl) {
      setPromptModules(tpl.picks.map((p) => pickWithMeta(p)))
      setIndustryKeys(new Set(tpl.picks.filter((p) => p.type === 'industry').map((p) => p.key)))
      setOfficeCats(new Set(tpl.picks.filter((p) => p.type === 'office').map((p) => p.key)))
      setSelected(new Set())
      setTab('all')
      userSuffixRef.current = ''
      skipSyncRef.current = true
      setPrompt(tpl.prompt)
    } else {
      setPromptModules([])
      setSelected(new Set())
      setIndustryKeys(new Set())
      setOfficeCats(new Set())
      setPrompt(text)
      userSuffixRef.current = text
    }
    focusPrompt()
  }

  const catalogNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of [...officeAll, ...industryAll]) map.set(s.id, s.name)
    return map
  }, [officeAll, industryAll])

  const clearAll = useCallback(() => {
    userSuffixRef.current = ''
    skipSyncRef.current = false
    setDebouncedIntent('')
    setPromptModules([])
    setSelected(new Set())
    setIndustryKeys(new Set())
    setOfficeCats(new Set())
    setPrompt('')
    setLastAddedId(null)
  }, [])

  const runPublish = useCallback(async (
    bundle: ReturnType<typeof resolveAppBundle>,
    contact: ContactInfo,
  ) => {
    const publishedModules = buildPublishedModulesFromBundle(bundle)
    setGeneratePhase('publish')
    setPublishError(null)
    try {
      const res = await publishApp(resolveAppName(branding.appName, bundle.appName), bundle.industryKey, {
        scenarioIds: bundle.scenarioIds,
        scenarioNames: bundle.scenarioNames,
        capabilityKeys: publishedModules.filter((m) => m.kind === 'module' || m.kind === 'capability').map((m) => m.key),
        modules: publishedModules.map((m) => ({
          key: m.key,
          label: m.label,
          kind: m.kind,
          iconKey: m.iconKey,
          source: m.source,
        })),
        deliver,
        source: 'prompt',
        prompt: bundle.promptText,
        iconUrl: branding.iconUrl,
        primaryColor: branding.primaryColor,
        contactEmail: contact.type === 'email' ? contact.value : undefined,
        contactPhone: contact.type === 'phone' ? contact.value : undefined,
      })
      onPublish(publishApiToResult(res, {
        moduleCount: publishedModules.length,
        modules: publishedModules,
        scenarios: bundle.scenarioNames,
      }))
      return
    } catch {
      setPublishError('发布失败，请确认 API 可用并已填写联系方式')
      setGeneratePhase(null)
    }
  }, [deliver, onPublish, clearAll, branding])

  const executePresetGenerate = useCallback(async (preset: RolePreset, contact: ContactInfo) => {
    const picks = buildModulesFromPreset(preset)
    const scenarioIds = picks.filter((m) => m.type === 'scenario').map((m) => m.key)
    const bundle = resolveAppBundle({
      userModules: picks,
      promptText: preset.prompt,
      scenarioIds,
      catalogNames,
    })
    await runPublish(bundle, contact)
  }, [buildModulesFromPreset, catalogNames, runPublish])

  const resolvedBundle = useMemo(
    () => resolveAppBundle({
      userModules: promptModules,
      promptText: prompt,
      scenarioIds: [...selected],
      catalogNames,
    }),
    [promptModules, prompt, selected, catalogNames],
  )

  const handleContactConfirm = useCallback(async (contact: ContactInfo) => {
    setContactOpen(false)
    if (pendingPreset) {
      const preset = pendingPreset
      setPendingPreset(null)
      setGeneratePhase('analyze')
      try {
        await executePresetGenerate(preset, contact)
      } catch {
        setPublishError('生成失败，请确认 API 可用并已填写联系方式')
      }
      return
    }
    setGeneratePhase('analyze')
    try {
      const intent = userIntentText.trim() || prompt.replace(/^>\s*$/, '').trim()
      const bundle = await resolvePublishBundle({
        userModules: promptModules,
        promptText: prompt,
        scenarioIds: [...selected],
        catalogNames,
        intentText: intent,
      })
      await runPublish(bundle, contact)
    } catch {
      setGeneratePhase(null)
      setPublishError('生成失败，请确认已选择模块或填写需求，且 API 可用')
    }
  }, [pendingPreset, executePresetGenerate, runPublish, userIntentText, prompt, promptModules, selected, catalogNames])

  useEffect(() => {
    if (!roleApply || catalogLoading) return
    applyRolePreset(roleApply.preset)
    if (roleApply.generate) {
      setPendingPreset(roleApply.preset)
      setContactOpen(true)
    }
    onRoleApplyDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在弹幕场景注入时触发
  }, [roleApply, catalogLoading])

  const handleGenerate = () => {
    if (!canGenerate) return
    setPendingPreset(null)
    setContactOpen(true)
  }

  useEffect(() => {
    if (active) return
    setContactOpen(false)
    setPendingPreset(null)
    setGeneratePhase(null)
  }, [active])

  const handleAgentPick = useCallback((pick: AgentPick, extra?: { iconKey?: string; color?: string }) => {
    if (pick.type === 'action') {
      if (pick.key === 'add-scene') catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (pick.key === 'warehouse') {
        if (promptModules.length > 0) setBoxOpenSignal((n) => n + 1)
        else focusPrompt()
      }
      return
    }
    upsertModule(pick, extra)
  }, [promptModules.length, upsertModule, focusPrompt])

  const panelScenarios = useMemo(
    () => visibleItems.slice(0, 48).map((s) => ({ id: s.id, name: s.name, category: s.category })),
    [visibleItems],
  )

  const selectionItems = useMemo((): SelectionItem[] => {
    const toItem = (m: PromptModule): SelectionItem => {
      let kind: SelectionItem['kind'] = 'scenario'
      if (m.type === 'industry') kind = 'industry'
      else if (m.type === 'office') kind = 'office'
      else if (m.type === 'capability') kind = 'capability'
      else if (m.type === 'module') kind = 'module'
      const boxId = m.type === 'industry' ? `ind-${m.key}` : m.type === 'office' ? `off-${m.key}` : m.id
      const typeLabel = m.type === 'capability' ? '能力' : m.type === 'module' ? '模块' : undefined
      return {
        id: boxId,
        name: m.label,
        category: typeLabel ?? (m.source === 'auto' ? '系统补齐' : undefined),
        kind,
        iconKey: m.iconKey,
        color: m.color,
        auto: m.source === 'auto',
        order: m.order,
      }
    }
    if (promptModules.length === 0) return []
    const user = promptModules.map(toItem)
    const auto = resolvedBundle.autoModules.map(toItem)
    return [...user, ...auto]
  }, [promptModules, resolvedBundle.autoModules])

  const removeSelectionItem = (id: string) => {
    const mod = promptModules.find(
      (m) => (m.type === 'industry' ? `ind-${m.key}` : m.type === 'office' ? `off-${m.key}` : m.id) === id,
    )
    if (mod) removeModule(mod.id)
  }

  return (
    <div className="view prompt-view layout-sticky">
      <div className="view-hero compact cube-panel">
        <h2>描述您想要的应用</h2>
        <p>直接描述需求 — 下方会实时推荐 <strong>&gt;</strong> 模块并优化提示词；也可输入 <strong>&gt;</strong> 手动插入</p>
      </div>

      <div
        ref={promptCardRef}
        className={`prompt-card cube-panel${promptHighlight ? ' prompt-highlight' : ''}${promptExpanded ? ' prompt-expanded' : ''}`}
      >
        <AgentInput
          ref={textareaRef}
          value={prompt}
          onChange={handlePromptChange}
          onFocus={() => setPromptExpanded(true)}
          expanded={promptExpanded || promptHighlight}
          modules={promptModules}
          onRemoveModule={removeModule}
          scenarios={panelScenarios}
          onPick={handleAgentPick}
        />
        <PromptSuggestBar
          userIntent={userIntentText}
          suggestions={promptSuggestions}
          enhancedPreview={enhancedPreview}
          selectedIds={selectedModuleIds}
          onToggle={upsertModule}
          onApplyPreview={applyEnhancedPreview}
          usedLlm={suggestUsedLlm}
        />
        {promptModules.length > 0 && (
          <div className="prompt-branding-wrap">
            <AppBrandingFields
              value={{
                ...branding,
                appName: branding.appName || resolvedBundle?.appName || '',
              }}
              onChange={setBranding}
              compact
            />
          </div>
        )}
        <div className="prompt-footer">
          <div className="prompt-meta">
            {composedFromModules && (
            <span className="prompt-meta-hint">模块已同步到描述文字，可在段落后继续补充需求</span>
          )}
            {(promptModules.length > 0 || prompt.trim()) && (
              <button type="button" className="link-btn" onClick={clearAll}>清空</button>
            )}
          </div>
          <div className="prompt-footer-right">
            <div className="deliver-select">
              {(['web', 'app', 'both'] as const).map((d) => (
                <button key={d} type="button" className={`deliver-btn${deliver === d ? ' on' : ''}`} onClick={() => setDeliver(d)}>
                  {d === 'web' ? '网页' : d === 'app' ? 'App' : '双端'}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary" disabled={loading || !canGenerate} onClick={handleGenerate}>
              {loading ? '正在生成…' : '生成我的应用'}
            </button>
          </div>
        </div>
      </div>

      <div className="chips-row">
        {PROMPT_CHIPS.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => handleChip(c)}>{c}</button>
        ))}
      </div>

      <div className="catalog-panel cube-panel" ref={catalogRef}>
        <div className="section-header-row">
          <div className="section-label left">业务场景目录</div>
          <span className="section-hint">
            {summary ? `${summary.office_count} 办公 + ${summary.industry_count} 行业` : '…'}
            · 显示 <strong>{visibleItems.length}</strong> 项
          </span>
        </div>

        <div className="catalog-filter-row">
          <div className="filter-tabs-inline">
            {(['all', 'office', 'industry'] as Tab[]).map((t) => (
              <button key={t} type="button" className={`cat-tab${tab === t ? ' on' : ''}`} onClick={() => handleTabChange(t)}>
                {t === 'all' ? `全部 ${summary?.total ?? 114}` : t === 'office' ? `办公 ${summary?.office_count ?? 65}` : `行业 ${summary?.industry_count ?? 49}`}
              </button>
            ))}
          </div>
          <input className="catalog-search" placeholder="搜索场景…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="filter-section">
          <div className="filter-section-head">
            <span>行业视角</span>
            <em>可多选</em>
            {industryKeys.size > 0 && (
              <button type="button" className="link-btn" onClick={clearIndustries}>清除</button>
            )}
          </div>
          <div className="industry-rail-wrap">
            <div className="industry-rail">
              {INDUSTRIES_SHOWCASE.map((ind) => {
                const on = industryKeys.has(ind.key)
                const ic = industryColor(ind.key, theme)
                return (
                  <button
                    key={ind.key}
                    type="button"
                    className={`rail-item checkable${on ? ' on' : ''}`}
                    onClick={() => toggleIndustryKey(ind.key)}
                    title={ind.desc}
                    aria-pressed={on}
                  >
                    {on && <span className="rail-check"><IconCheckCircle size={10} /></span>}
                    <span className="rail-icon icon-themed" style={iconWrapStyle(on ? '#fff' : ic)}>
                      <DynamicIcon name={ind.iconKey} size={18} color={on ? '#fff' : ic} />
                    </span>
                    <span>{ind.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {selectedIndustries.length > 0 && (
          <div className="industry-context-banner multi">
            {selectedIndustries.map((ind) => (
              <div key={ind.key} className="icb-chip" style={{ '--ind-color': ind.color } as CSSProperties}>
                <DynamicIcon name={ind.iconKey} size={16} color={ind.color} />
                <span>{ind.name}</span>
              </div>
            ))}
          </div>
        )}

        {tab !== 'industry' && (
          <div className="filter-section">
            <div className="filter-section-head">
              <span>办公分类</span>
              <em>可多选</em>
              {officeCats.size > 0 && (
                <button type="button" className="link-btn" onClick={() => { for (const c of officeCats) removeModule(moduleId({ type: 'office', key: c })) }}>清除</button>
              )}
            </div>
            <div className="filter-check-grid">
              {OFFICE_CATS.map((c) => {
                const on = officeCats.has(c)
                const ic = categoryColor(c, theme)
                const iconKey = resolveCategoryIcon(c, 'office')
                return (
                  <label key={c} className={`filter-check${on ? ' on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleOfficeCat(c)} />
                    <span className="filter-check-box" aria-hidden />
                    <span className="filter-check-icon icon-themed" style={iconWrapStyle(ic)}>
                      <DynamicIcon name={iconKey} size={12} color={ic} />
                    </span>
                    {c}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {catalogLoading ? (
          <div className="catalog-loading">正在加载场景…</div>
        ) : categoryGroups.length === 0 ? (
          <div className="catalog-loading">没有匹配的场景，请调整筛选</div>
        ) : (
          categoryGroups.map(([cat, items]) => {
            const catIcon = resolveCategoryIcon(cat, items[0]?.kind === 'industry' ? 'industry' : 'office')
            const catColor = categoryColor(cat, theme)
            return (
            <section key={cat} className="catalog-section">
              <h3 className="catalog-section-title">
                <span className="catalog-section-icon icon-themed" style={iconWrapStyle(catColor)}>
                  <DynamicIcon name={catIcon} size={18} color={catColor} />
                </span>
                {cat}
                <em>{items.length} 项</em>
              </h3>
              <div className="scenario-pick-grid">
                {items.map((s) => {
                  const isOn = selected.has(s.id) || promptModules.some((m) => m.type === 'scenario' && m.key === s.id)
                  const iconKey = resolveCategoryIcon(s.category, s.kind === 'industry' ? 'industry' : 'office')
                  const iconColor = categoryColor(s.category, theme)
                  return (
                    <button key={s.id} type="button" className={`scenario-pick${isOn ? ' on' : ''}`} onClick={() => toggleScenario(s)} aria-pressed={isOn}>
                      {isOn && <span className="sp-check" aria-hidden><IconCheckCircle size={16} /></span>}
                      <div className="sp-top">
                        <span className="sp-icon icon-themed" style={iconWrapStyle(iconColor)}>
                          <DynamicIcon name={iconKey} size={16} color={iconColor} />
                        </span>
                        <span className="sp-cat">{s.category}</span>
                      </div>
                      <strong className="sp-title">{s.name}</strong>
                      <p className="sp-desc">{s.kind === 'industry' ? s.problem : `适用：${formatAgentLabel(s.agent)}`}</p>
                    </button>
                  )
                })}
              </div>
            </section>
            )
          })
        )}
      </div>

      {active && (
        <SelectionBox
          items={selectionItems}
          onRemove={removeSelectionItem}
          onClear={clearAll}
          onScrollToPrompt={focusPrompt}
          onGenerate={handleGenerate}
          generating={loading}
          lastAddedId={lastAddedId}
          openSignal={boxOpenSignal}
        />
      )}

      {generatePhase && <GenerateLoadingOverlay phase={generatePhase} />}
      {active && publishError && <p className="publish-error">{publishError}</p>}

      <ContactGateModal
        open={active && contactOpen}
        onClose={() => { setContactOpen(false); setPendingPreset(null) }}
        onConfirm={handleContactConfirm}
      />

    </div>
  )
}
