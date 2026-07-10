import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchIndustryScenarios,
  fetchOfficeScenarios,
  type CatalogScenario,
} from '../api/client'
import { publishApp, suggestModules as suggestModulesApi } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runContactPublishPipeline, finishPublishNavigate } from '../lib/publishFlow'
import { useTheme } from '../context/ThemeContext'
import {
  categoryColor,
} from '../data/iconPalette'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import AgentInput, { type AgentInputHandle, type AgentPick } from '../components/AgentInput'
import { GENERATE_APP_LABEL, GENERATE_APP_LOADING } from '../data/publishUi'
import { AgentButtonContent } from '../components/AgentChevron'
import PromptSuggestBar from '../components/PromptSuggestBar'
import IntentAnalysisStrip from '../components/IntentAnalysisStrip'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay, { type GeneratePhase } from '../components/GenerateLoadingOverlay'
import { deriveDefaultAppName, emptyBranding, resolveAppName } from '../data/appBranding'
import { moduleId, pickToModule, type PromptModule } from '../components/agentInputLogic'
import { PROMPT_CHIPS, type PublishResult } from '../data/constants'
import { findChipTemplate, pickWithMeta, resolveAppBundle, composeLogicalPrompt, mergePromptText, splitPromptText } from '../data/appAssembly'
import { buildPublishedModulesFromBundle } from '../data/publishDisplay'
import { resolvePublishBundle } from '../data/intentPublish'
import { enhanceSimplePrompt, suggestModulesFromText, type SuggestItem } from '../data/promptSuggest'
import {
  resolveCategoryIcon,
  resolveIndustryApiKey,
} from '../data/showcase'
import type { RoleApplyRequest, RolePreset } from '../data/rolePresets'
import { useAgentPageContext } from '../context/AgentPageContext'
import { useDemoBookingActive } from '../context/DemoBookingContext'
import { AGENT_CONTEXTS } from '../data/agentContext'
import FloatingAgentDock from '../components/FloatingAgentDock'

interface Props {
  onPublish: (r: PublishResult) => void
  roleApply?: RoleApplyRequest | null
  onRoleApplyDone?: () => void
  /** 当前是否为「描述需求」Tab（隐藏时收起弹层与积木仓） */
  active?: boolean
}

type Tab = 'all' | 'office' | 'industry'

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

export default function PromptView({ onPublish: _onPublish, roleApply, onRoleApplyDone, active = true }: Props) {
  const navigate = useNavigate()
  const { contextKey } = useAgentPageContext()
  const bookingZoneActive = useDemoBookingActive()
  const { theme } = useTheme()
  const [prompt, setPrompt] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<Tab>('all')
  const [industryKeys, setIndustryKeys] = useState<Set<string>>(new Set())
  const [officeCats, setOfficeCats] = useState<Set<string>>(new Set())
  const [generatePhase, setGeneratePhase] = useState<GeneratePhase | null>(null)
  const loading = generatePhase !== null
  const [contactOpen, setContactOpen] = useState(false)
  const [contactBusy, setContactBusy] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<RolePreset | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [deliver, setDeliver] = useState<'web' | 'app' | 'both'>('both')
  const [branding, setBranding] = useState(() => emptyBranding())
  const [officeAll, setOfficeAll] = useState<CatalogScenario[]>([])
  const [industryAll, setIndustryAll] = useState<CatalogScenario[]>([])
  const [promptHighlight, setPromptHighlight] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [promptModules, setPromptModules] = useState<PromptModule[]>([])
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [debouncedIntent, setDebouncedIntent] = useState('')
  const [promptSuggestions, setPromptSuggestions] = useState<SuggestItem[]>([])
  const [suggestSourceLabel, setSuggestSourceLabel] = useState('')
  const [suggestUsedAi, setSuggestUsedAi] = useState(false)
  const [suggestFetching, setSuggestFetching] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'debounce' | 'fetch' | 'done'>('idle')
  const [publishError, setPublishError] = useState<string | null>(null)

  const promptCardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<AgentInputHandle>(null)
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
          if (!prev.replace(/^>>\s*$/, '').trim()) return merged
          return prev
        })
      }
      return
    }
    setPrompt(merged)
  }, [composedFromModules])

  const handlePromptChange = useCallback((value: string) => {
    const stripped = value.replace(/^>>\s*$/, '').trim()
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
    const raw = prompt.replace(/^>>\s*/, '').trim()
    if (!raw) return ''
    const { suffix, base } = splitPromptText(prompt, promptModules)
    const tail = suffix.trim() || (!base ? raw : '')
    return tail.replace(/^>>\s*/, '').trim()
  }, [prompt, promptModules])

  const canGenerate = promptModules.length > 0
    || prompt.replace(/^>>\s*$/, '').trim().length >= 2

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedIntent(userIntentText), 400)
    return () => window.clearTimeout(id)
  }, [userIntentText])

  const catalogScenarios = useMemo(
    () => [...officeAll, ...industryAll].map((s) => ({ id: s.id, name: s.name, category: s.category })),
    [officeAll, industryAll],
  )

  const intentAnalyzable = userIntentText.trim().length >= 2
  const isIntentDebouncing = intentAnalyzable && userIntentText.trim() !== debouncedIntent.trim()

  useEffect(() => {
    if (!intentAnalyzable) {
      setAnalysisPhase('idle')
      setAnalysisProgress(0)
      return
    }
    if (isIntentDebouncing) {
      setAnalysisPhase('debounce')
      setAnalysisProgress((p) => (p > 30 ? 6 : p))
      return
    }
    if (suggestFetching) {
      setAnalysisPhase('fetch')
    }
  }, [intentAnalyzable, isIntentDebouncing, suggestFetching])

  useEffect(() => {
    if (!intentAnalyzable || analysisPhase === 'idle') return

    const id = window.setInterval(() => {
      setAnalysisProgress((prev) => {
        if (analysisPhase === 'debounce') return Math.min(28, prev + 2.2)
        if (analysisPhase === 'fetch') return Math.min(92, prev + 1.4)
        if (analysisPhase === 'done') return Math.min(100, prev + 8)
        return prev
      })
    }, 40)
    return () => window.clearInterval(id)
  }, [intentAnalyzable, analysisPhase])

  useEffect(() => {
    const text = debouncedIntent.trim()
    if (text.length < 2) {
      setPromptSuggestions([])
      setSuggestSourceLabel('')
      setSuggestUsedAi(false)
      setSuggestFetching(false)
      return
    }
    let cancelled = false
    setSuggestFetching(true)
    suggestModulesApi(text)
      .then((res) => {
        if (cancelled) return
        const hasDeepSeek = res.used_llm || res.items.some((it) => it.source.startsWith('deepseek'))
        setSuggestUsedAi(hasDeepSeek)
        if (hasDeepSeek) {
          setSuggestSourceLabel(res.confidence >= 0.7 ? `智能推荐 · ${Math.round(res.confidence * 100)}%` : '智能推荐')
        } else if (res.items.length > 0) {
          setSuggestSourceLabel('为你匹配')
        } else {
          setSuggestSourceLabel('')
        }
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
        const pct = res.confidence > 0 ? Math.round(res.confidence * 100) : 100
        setAnalysisProgress(pct)
        setAnalysisPhase('done')
        window.setTimeout(() => {
          if (!cancelled) {
            setAnalysisPhase('idle')
            setAnalysisProgress(0)
          }
        }, 700)
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestUsedAi(false)
          setSuggestSourceLabel('关键词匹配')
          setPromptSuggestions(suggestModulesFromText(text, catalogScenarios))
          setAnalysisProgress(100)
          setAnalysisPhase('done')
          window.setTimeout(() => {
            setAnalysisPhase('idle')
            setAnalysisProgress(0)
          }, 700)
        }
      })
      .finally(() => {
        if (!cancelled) setSuggestFetching(false)
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

  const quickApplyRolePreset = useCallback((preset: RolePreset) => {
    const picks = preset.picks.map((p) => pickWithMeta(p))
    userSuffixRef.current = ''
    setPromptModules(picks)
    setIndustryKeys(new Set(preset.picks.filter((p) => p.type === 'industry').map((p) => p.key)))
    setOfficeCats(new Set(preset.picks.filter((p) => p.type === 'office').map((p) => p.key)))
    setSelected(new Set(picks.filter((m) => m.type === 'scenario').map((m) => m.key)))
    setTab('all')
    skipSyncRef.current = true
    setPrompt(preset.prompt)
  }, [])

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

  const visibleItems = useMemo((): CatalogScenario[] => {
    let officeItems = officeAll
    let industryItems = industryAll

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
  }, [tab, officeAll, industryAll, officeCats, industryKeys])

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
    appNameOverride?: string,
  ) => {
    const publishedModules = buildPublishedModulesFromBundle(bundle)
    const appName = resolveAppName(appNameOverride ?? branding.appName, bundle.appName)
    const res = await publishApp(appName, bundle.industryKey, {
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
    return publishApiToResult(res, {
      moduleCount: publishedModules.length,
      modules: publishedModules,
      scenarios: bundle.scenarioNames,
    })
  }, [deliver, branding])

  const executePresetGenerate = useCallback(async (preset: RolePreset, contact: ContactInfo, appNameOverride?: string) => {
    const picks = buildModulesFromPreset(preset)
    const scenarioIds = picks.filter((m) => m.type === 'scenario').map((m) => m.key)
    const bundle = resolveAppBundle({
      userModules: picks,
      promptText: preset.prompt,
      scenarioIds,
      catalogNames,
    })
    return runPublish(bundle, contact, appNameOverride)
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

  const defaultAppName = useMemo(
    () => deriveDefaultAppName({
      modules: promptModules,
      suggestions: promptSuggestions,
      intentText: userIntentText,
      usedAi: suggestUsedAi,
      fallback: resolvedBundle.appName,
    }),
    [promptModules, promptSuggestions, userIntentText, suggestUsedAi, resolvedBundle.appName],
  )

  const handlePublishSuccess = useCallback((result: PublishResult) => {
    finishPublishNavigate(navigate, result)
  }, [navigate])

  const handleContactConfirm = useCallback(async (contact: ContactInfo, opts?: { appName?: string }) => {
    if (contactBusy) return
    const appNameOverride = opts?.appName?.trim() || defaultAppName
    if (appNameOverride) {
      setBranding((prev) => ({ ...prev, appName: appNameOverride }))
    }
    setContactBusy(true)
    const preset = pendingPreset
    if (preset) setPendingPreset(null)

    try {
      await runContactPublishPipeline({
        closeContact: () => setContactOpen(false),
        setPhase: setGeneratePhase,
        setError: setPublishError,
        onSuccess: handlePublishSuccess,
        errorMessage: preset
          ? '生成失败，请确认网络正常并已填写联系方式'
          : '生成失败，请确认已选好功能或填写描述，且网络正常',
        execute: async (markPhase) => {
          if (preset) {
            markPhase('publish')
            return executePresetGenerate(preset, contact, appNameOverride)
          }
          const intent = userIntentText.trim() || prompt.replace(/^>>\s*$/, '').trim()
          const bundle = await resolvePublishBundle({
            userModules: promptModules,
            promptText: prompt,
            scenarioIds: [...selected],
            catalogNames,
            intentText: intent,
          })
          markPhase('publish')
          return runPublish(bundle, contact, appNameOverride)
        },
      })
    } finally {
      setContactBusy(false)
    }
  }, [contactBusy, pendingPreset, executePresetGenerate, runPublish, handlePublishSuccess, userIntentText, prompt, promptModules, selected, catalogNames, defaultAppName])

  useEffect(() => {
    if (!roleApply) return

    if (roleApply.generate) {
      quickApplyRolePreset(roleApply.preset)
      setPendingPreset(roleApply.preset)
      setContactOpen(true)
    }

    if (!catalogLoading) {
      if (roleApply.generate) {
        const picks = buildModulesFromPreset(roleApply.preset)
        setPromptModules(picks)
        setSelected(new Set(picks.filter((m) => m.type === 'scenario').map((m) => m.key)))
      } else {
        applyRolePreset(roleApply.preset)
      }
    } else if (!roleApply.generate) {
      quickApplyRolePreset(roleApply.preset)
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
      if (pick.key === 'add-scene') textareaRef.current?.openPicker()
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

  const agentCopy = AGENT_CONTEXTS[contextKey]

  return (
    <div className="view prompt-view prompt-view-minimal layout-floating">
      <div className="minimal-hero">
        <img src="/design/hero-minimal.jpg" alt="" className="minimal-hero-img" width={72} height={72} />
        <h2>搭积木，造应用</h2>
        <p className="minimal-hero-hint">输入 <span className="minimal-brand-chev">&gt;&gt;</span> 编排模块，或直接描述需求</p>
      </div>

      {!bookingZoneActive && (
      <FloatingAgentDock
        storageKey="tc-floating-prompt"
        className="floating-agent-dock-prompt"
        title="搭积木，造应用"
        chevLabel={agentCopy.chevLabel}
        collapsedHint={agentCopy.placeholder}
        ariaLabel="创建应用悬浮助手"
      >
        <div
          ref={promptCardRef}
          className={`prompt-card minimal-card${promptHighlight ? ' prompt-highlight' : ''}${promptExpanded ? ' prompt-expanded' : ''}`}
        >
        <AgentInput
          ref={textareaRef}
          variant="minimal"
          orbSize="large"
          theme={theme}
          value={prompt}
          onChange={handlePromptChange}
          onFocus={() => setPromptExpanded(true)}
          expanded={promptExpanded || promptHighlight}
          modules={promptModules}
          onRemoveModule={removeModule}
          scenarios={panelScenarios}
          onPick={handleAgentPick}
        />
        <IntentAnalysisStrip
          visible={intentAnalyzable}
          progress={analysisProgress}
          phase={analysisPhase}
        />
        <PromptSuggestBar
          userIntent={userIntentText}
          suggestions={promptSuggestions}
          enhancedPreview={enhancedPreview}
          selectedIds={selectedModuleIds}
          onToggle={upsertModule}
          onApplyPreview={applyEnhancedPreview}
          sourceLabel={suggestSourceLabel}
          loading={suggestFetching || isIntentDebouncing}
        />
        <div className="prompt-footer minimal-footer">
          <div className="prompt-meta">
            {(promptModules.length > 0 || prompt.trim()) && (
              <button type="button" className="link-btn" onClick={clearAll}>清空</button>
            )}
          </div>
          <div className="prompt-footer-right">
            <div className="deliver-select minimal-deliver">
              {(['web', 'app', 'both'] as const).map((d) => (
                <button key={d} type="button" className={`deliver-btn${deliver === d ? ' on' : ''}`} onClick={() => setDeliver(d)}>
                  {d === 'web' ? '网页' : d === 'app' ? 'App' : '双端'}
                </button>
              ))}
            </div>
            <button type="button" className="btn-primary minimal-generate agent-action-btn" disabled={loading || !canGenerate} onClick={handleGenerate}>
              {loading ? GENERATE_APP_LOADING : (
                <AgentButtonContent>{GENERATE_APP_LABEL}</AgentButtonContent>
              )}
            </button>
          </div>
        </div>
        </div>
      </FloatingAgentDock>
      )}
      <div className={`agent-floating-spacer${bookingZoneActive ? ' is-booking' : ''}`} aria-hidden />

      <div className="minimal-chips" ref={catalogRef}>
        {PROMPT_CHIPS.slice(0, 4).map((c) => (
          <button key={c} type="button" className="minimal-chip" onClick={() => handleChip(c)}>{c}</button>
        ))}
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

      {generatePhase && (
        <GenerateLoadingOverlay
          phase={generatePhase}
          appName={branding.appName || defaultAppName}
        />
      )}
      {active && publishError && <p className="publish-error">{publishError}</p>}

      <ContactGateModal
        open={active && contactOpen}
        busy={contactBusy}
        defaultAppName={defaultAppName}
        onClose={() => { if (!contactBusy) { setContactOpen(false); setPendingPreset(null) } }}
        onConfirm={handleContactConfirm}
      />

    </div>
  )
}
