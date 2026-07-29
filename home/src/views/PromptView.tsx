import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COMPOSER_MODES } from '@capship/composer'
import {
  fetchIndustryScenarios,
  fetchOfficeScenarios,
  type CatalogScenario,
} from '../api/client'
import { publishApp, suggestModules as suggestModulesApi, type SuggestValidation } from '../api/client'
import { publishApiToResult } from '../api/publishHelpers'
import { runContactPublishPipeline } from '../lib/publishFlow'
import { useT } from '@blockhub/i18n/react'
import { useTheme } from '../context/ThemeContext'
import { capabilityName } from '../i18n/capabilityLabels'
import { formatSuggestSource, type SuggestSourceSpec } from '../i18n/suggestLabels'
import {
  categoryColor,
} from '../data/iconPalette'
import SelectionBox, { type SelectionItem } from '../components/SelectionBox'
import AgentInput, { type AgentInputHandle, type AgentPick } from '../components/AgentInput'
import { publishGenerateLabel, publishGenerateLoading } from '../i18n/publishLabels'
import { AgentButtonContent } from '../components/AgentChevron'
import PromptSuggestBar from '../components/PromptSuggestBar'
import IntentAnalysisStrip from '../components/IntentAnalysisStrip'
import ContactGateModal, { type ContactInfo } from '../components/ContactGateModal'
import GenerateLoadingOverlay, { type GeneratePhase } from '../components/GenerateLoadingOverlay'
import DeliverTargetPicker from '../components/DeliverTargetPicker'
import DeliveryTemplatePicker from '../components/DeliveryTemplatePicker'
import CapabilitySplitBanner from '../components/CapabilitySplitBanner'
import { ALL_PLATFORMS, platformsToDeliver, type PlatformId } from '../data/deliverTargets'
import { deriveDefaultAppName, emptyBranding, resolveAppName } from '../data/appBranding'
import { moduleId, pickToModule, type PromptModule } from '../components/agentInputLogic'
import { MODULES, type PublishResult } from '../data/constants'
import { pickWithMeta, resolveAppBundle, composeLogicalPrompt, mergePromptText, splitPromptText } from '../data/appAssembly'
import { buildPublishedModulesFromBundle } from '../data/publishDisplay'
import { resolvePublishBundle } from '../data/intentPublish'
import {
  matchHeroPreset,
  picksForCapabilityAlign,
} from '../data/heroAlign'
import {
  canAutoApplySuggestions,
  enhanceSimplePrompt,
  hasStructuredPicks,
  mapSuggestApiItem,
  metaForSuggestItem,
  suggestModulesFromText,
  type SuggestItem,
} from '../data/promptSuggest'
import {
  resolveCategoryIcon,
  resolveIndustryApiKey,
} from '../data/showcase'
import type { RoleApplyRequest, RolePreset } from '../data/rolePresets'
import { useDemoBookingActive } from '../context/DemoBookingContext'
import { useHomePageReady } from '../context/HomePageReadyContext'
import { usePromptDraft } from '../context/PromptDraftContext'
import FloatingAgentDock from '../components/FloatingAgentDock'
import AnimatedChevTitle from '../components/AnimatedChevTitle'
import HeroDockIntentBrief from '../components/b2b/HeroDockIntentBrief'
import { useHomeActiveSection } from '../hooks/useHomeActiveSection'
import {
  buildHeroDockDemoModules,
  buildHeroDockDemoSuggestions,
  HERO_DOCK_DEMO_ENHANCED,
  HERO_DOCK_DEMO_PROMPT,
  HERO_DOCK_DEMO_VALIDATION,
  HERO_DOCK_TYPING_CHAR_MS,
  isHeroDockTypingDemoSeen,
  markHeroDockTypingDemoSeen,
} from '../data/heroDockDemo'

interface Props {
  onPublish: (r: PublishResult) => void
  roleApply?: RoleApplyRequest | null
  onRoleApplyDone?: () => void
  /** 当前是否为「描述需求」Tab */
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

/** 弹幕创建对应 CapShip Composer 的 live_edit / 选型发布链路 */
const PROMPT_COMPOSER_MODE = COMPOSER_MODES.find((m) => m.id === 'live_edit')?.id ?? 'live_edit'

export default function PromptView({ onPublish, roleApply, onRoleApplyDone, active = true }: Props) {
  const t = useT()
  const bookingZoneActive = useDemoBookingActive()
  const pageReady = useHomePageReady()
  const activeSection = useHomeActiveSection()
  const inFloatingZone =
    activeSection === 'hero' ||
    activeSection === 'product' ||
    activeSection === 'case' ||
    activeSection === 'contact-create'
  const showPromptDock = active && pageReady && !bookingZoneActive && inFloatingZone
  const [dockReposition, setDockReposition] = useState(0)
  const { draft, setDraft } = usePromptDraft()
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
  const [platforms, setPlatforms] = useState<PlatformId[]>(() => [...ALL_PLATFORMS])
  const deliver = useMemo(() => platformsToDeliver(platforms), [platforms])
  const [webTemplateId, setWebTemplateId] = useState('tabs_portal')
  const [appUiId, setAppUiId] = useState('bottom_tabs')
  const [branding, setBranding] = useState(() => emptyBranding())
  const [officeAll, setOfficeAll] = useState<CatalogScenario[]>([])
  const [industryAll, setIndustryAll] = useState<CatalogScenario[]>([])
  const [promptHighlight, setPromptHighlight] = useState(false)
  const [promptExpanded, setPromptExpanded] = useState(false)
  const [heroDemoActive, setHeroDemoActive] = useState(false)
  const [heroDemoTyping, setHeroDemoTyping] = useState(false)
  const [promptModules, setPromptModules] = useState<PromptModule[]>([])
  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const [debouncedIntent, setDebouncedIntent] = useState('')
  const [promptSuggestions, setPromptSuggestions] = useState<SuggestItem[]>([])
  const [suggestSourceSpec, setSuggestSourceSpec] = useState<SuggestSourceSpec>({ id: 'none' })
  const [suggestUsedAi, setSuggestUsedAi] = useState(false)
  const [suggestFetching, setSuggestFetching] = useState(false)
  const [suggestConfidence, setSuggestConfidence] = useState(0)
  const [suggestValidation, setSuggestValidation] = useState<SuggestValidation | null>(null)
  const [suggestRegistered, setSuggestRegistered] = useState<{ industries: string[]; capabilities: string[]; scenes: string[] } | undefined>()
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'debounce' | 'fetch' | 'done'>('idle')
  const [publishError, setPublishError] = useState<string | null>(null)

  const promptCardRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<AgentInputHandle>(null)
  const [boxOpenSignal, setBoxOpenSignal] = useState(0)
  const [modulePickerOpen, setModulePickerOpen] = useState(false)
  const userSuffixRef = useRef('')
  const skipSyncRef = useRef(false)
  const draftHydratedRef = useRef(false)
  const heroDemoAppliedRef = useRef(false)
  const heroTypingTimerRef = useRef<number | null>(null)
  const heroTypingSkipRef = useRef(false)

  const heroTypingDemoEligible =
    showPromptDock &&
    activeSection === 'hero' &&
    !isHeroDockTypingDemoSeen()

  const cancelHeroTypingDemo = useCallback((markSeen = false) => {
    if (heroTypingTimerRef.current !== null) {
      window.clearTimeout(heroTypingTimerRef.current)
      heroTypingTimerRef.current = null
    }
    setHeroDemoTyping(false)
    heroTypingSkipRef.current = false
    if (markSeen) markHeroDockTypingDemoSeen()
  }, [])

  useEffect(() => () => cancelHeroTypingDemo(false), [cancelHeroTypingDemo])

  const applyHeroDockDemoMatches = useCallback(() => {
    heroDemoAppliedRef.current = true
    setHeroDemoActive(true)

    const modules = buildHeroDockDemoModules()
    userSuffixRef.current = HERO_DOCK_DEMO_PROMPT
    skipSyncRef.current = true
    setDebouncedIntent(HERO_DOCK_DEMO_PROMPT)
    setPromptModules(modules)
    setIndustryKeys(new Set(['office']))
    setOfficeCats(new Set(['知识协同']))
    setSelected(new Set(['hero-demo-create']))
    setPromptSuggestions(buildHeroDockDemoSuggestions())
    setSuggestValidation(HERO_DOCK_DEMO_VALIDATION)
    setSuggestSourceSpec({ id: 'brand' })
    setSuggestUsedAi(true)
    setSuggestConfidence(0.88)
    setSuggestFetching(false)
    setAnalysisPhase('idle')
    setAnalysisProgress(0)
    lastAutoSuggestSigRef.current = `${HERO_DOCK_DEMO_PROMPT}::${modules.map((m) => m.id).join(',')}`
    window.setTimeout(() => setBoxOpenSignal((n) => n + 1), 120)
  }, [])

  const startHeroTypingDemo = useCallback(() => {
    if (
      !heroTypingDemoEligible ||
      heroDemoTyping ||
      heroDemoActive ||
      heroDemoAppliedRef.current ||
      prompt.replace(/^>>\s*$/, '').trim() ||
      draft.trim()
    ) {
      return
    }

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setHeroDemoTyping(true)
    setPromptExpanded(true)
    heroTypingSkipRef.current = true
    setPrompt('')
    userSuffixRef.current = ''

    const finish = () => {
      heroTypingSkipRef.current = true
      skipSyncRef.current = true
      setPrompt(HERO_DOCK_DEMO_PROMPT)
      userSuffixRef.current = HERO_DOCK_DEMO_PROMPT
      setHeroDemoTyping(false)
      markHeroDockTypingDemoSeen()
      applyHeroDockDemoMatches()
    }

    if (reducedMotion) {
      finish()
      return
    }

    const text = HERO_DOCK_DEMO_PROMPT
    let i = 0
    const tick = () => {
      i += 1
      const partial = text.slice(0, i)
      heroTypingSkipRef.current = true
      skipSyncRef.current = true
      setPrompt(partial)
      userSuffixRef.current = partial
      if (i < text.length) {
        heroTypingTimerRef.current = window.setTimeout(tick, HERO_DOCK_TYPING_CHAR_MS)
      } else {
        heroTypingTimerRef.current = null
        finish()
      }
    }
    heroTypingTimerRef.current = window.setTimeout(tick, 180)
  }, [
    heroTypingDemoEligible,
    heroDemoTyping,
    heroDemoActive,
    prompt,
    draft,
    applyHeroDockDemoMatches,
  ])

  useEffect(() => {
    if (showPromptDock && activeSection === 'hero') {
      setPromptExpanded(true)
    }
  }, [showPromptDock, activeSection])

  useEffect(() => {
    if (!pageReady) return
    requestAnimationFrame(() => {
      setDockReposition((n) => n + 1)
    })
    const t = window.setTimeout(() => setDockReposition((n) => n + 1), 850)
    return () => window.clearTimeout(t)
  }, [pageReady])

  const handleAgentInputFocus = useCallback(() => {
    setPromptExpanded(true)
    startHeroTypingDemo()
  }, [startHeroTypingDemo])

  const exitHeroDemo = useCallback(() => {
    cancelHeroTypingDemo(true)
    if (!heroDemoActive) return
    setHeroDemoActive(false)
    heroDemoAppliedRef.current = false
    markHeroDockTypingDemoSeen()
  }, [heroDemoActive, cancelHeroTypingDemo])

  useEffect(() => {
    if (!showPromptDock) {
      draftHydratedRef.current = false
      return
    }
    if (!draftHydratedRef.current) {
      draftHydratedRef.current = true
      if (draft.trim() && !prompt.replace(/^>>\s*$/, '').trim()) {
        userSuffixRef.current = draft
        skipSyncRef.current = true
        setPrompt(draft)
        setPromptExpanded(true)
        requestAnimationFrame(() => textareaRef.current?.focus())
      }
      return
    }
    setDraft(prompt)
  }, [showPromptDock, draft, prompt, setDraft])

  const flashAdded = useCallback((id: string) => {
    setLastAddedId(id)
    window.setTimeout(() => setLastAddedId(null), 900)
  }, [])

  const dismissedSuggestRef = useRef<Set<string>>(new Set())
  const lastAutoSuggestSigRef = useRef('')

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

  const clearSuggestModules = useCallback(() => {
    setPromptModules((prev) => {
      for (const m of prev) {
        if (m.source === 'suggest') {
          applyModuleToFilters({ type: m.type, key: m.key, label: m.label }, false)
        }
      }
      return prev.filter((m) => m.source !== 'suggest')
    })
  }, [applyModuleToFilters])

  const applySuggestModules = useCallback((items: SuggestItem[], intentText: string) => {
    const sig = `${intentText}::${items.map((s) => moduleId(s.pick)).join(',')}`
    if (!sig || sig === '::' || lastAutoSuggestSigRef.current === sig) return
    lastAutoSuggestSigRef.current = sig

    const toApply = items
      .filter((s) => s.pick.type === 'industry' || s.pick.type === 'module' || s.pick.type === 'capability' || s.pick.type === 'supplement')
      .slice(0, 12)

    setPromptModules((prev) => {
      const manual = prev.filter((m) => m.source === 'user')
      const oldSuggest = prev.filter((m) => m.source === 'suggest')
      const manualIds = new Set(manual.map((m) => m.id))
      const nextSuggest: PromptModule[] = []
      for (const s of toApply) {
        const mod = {
          ...pickToModule(s.pick, { iconKey: s.iconKey, color: s.color }),
          source: 'suggest' as const,
        }
        if (dismissedSuggestRef.current.has(mod.id) || manualIds.has(mod.id)) continue
        nextSuggest.push(mod)
      }
      const nextIds = new Set(nextSuggest.map((m) => m.id))
      for (const old of oldSuggest) {
        if (!nextIds.has(old.id)) {
          applyModuleToFilters({ type: old.type, key: old.key, label: old.label }, false)
        }
      }
      return [...manual, ...nextSuggest]
    })

    for (const s of toApply) {
      const id = moduleId(s.pick)
      if (dismissedSuggestRef.current.has(id)) continue
      applyModuleToFilters(s.pick, true)
    }
  }, [applyModuleToFilters])

  const upsertModule = useCallback((pick: AgentPick, extra?: { iconKey?: string; color?: string }) => {
    if (pick.type === 'action') return
    const mod = { ...pickToModule(pick, extra), source: 'user' as const }
    setPromptModules((prev) => {
      const exists = prev.some((m) => m.id === mod.id)
      if (exists) {
        const removing = prev.find((m) => m.id === mod.id)
        if (removing?.source === 'suggest') dismissedSuggestRef.current.add(mod.id)
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
    if (heroDemoTyping) {
      cancelHeroTypingDemo(true)
    } else if (heroTypingSkipRef.current) {
      heroTypingSkipRef.current = false
    } else if (heroDemoActive && value.replace(/^>>\s*$/, '').trim() !== HERO_DOCK_DEMO_PROMPT.trim()) {
      exitHeroDemo()
    }
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
  }, [promptModules, composedFromModules, heroDemoActive, heroDemoTyping, exitHeroDemo, cancelHeroTypingDemo])

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
    if (heroDemoActive && debouncedIntent.trim() === HERO_DOCK_DEMO_PROMPT.trim()) return
    dismissedSuggestRef.current = new Set()
    lastAutoSuggestSigRef.current = ''
    clearSuggestModules()
  }, [debouncedIntent, clearSuggestModules, heroDemoActive])

  useEffect(() => {
    if (heroDemoActive && debouncedIntent.trim() === HERO_DOCK_DEMO_PROMPT.trim()) return
    const text = debouncedIntent.trim()
    if (text.length < 2) {
      clearSuggestModules()
      setPromptSuggestions([])
      setSuggestSourceSpec({ id: 'none' })
      setSuggestUsedAi(false)
      setSuggestConfidence(0)
      setSuggestValidation(null)
      setSuggestRegistered(undefined)
      setSuggestFetching(false)
      return
    }
    let cancelled = false
    setSuggestFetching(true)
    suggestModulesApi(text, true)
      .then((res) => {
        if (cancelled) return
        const validation = res.validation ?? null
        setSuggestValidation(validation)
        setSuggestRegistered(res.registered)
        const hasAgent = res.used_llm || res.agent === 'intent_agent' || res.items.some((it) => it.source.startsWith('deepseek'))
        setSuggestUsedAi(hasAgent)
        setSuggestConfidence(res.confidence)

        if (validation?.status === 'invalid') {
          clearSuggestModules()
          setPromptSuggestions([])
          setSuggestSourceSpec({ id: 'blocked' })
          setAnalysisProgress(100)
          setAnalysisPhase('done')
          window.setTimeout(() => {
            if (!cancelled) {
              setAnalysisPhase('idle')
              setAnalysisProgress(0)
            }
          }, 700)
          return
        }

        if (hasAgent) {
          setSuggestSourceSpec(
            validation?.status === 'unclear'
              ? { id: 'need_more' }
              : res.confidence >= 0.7
                ? { id: 'intent_pct', pct: Math.round(res.confidence * 100) }
                : { id: 'intent' },
          )
        } else if (res.items.length > 0) {
          setSuggestSourceSpec(
            res.confidence >= 0.5
              ? { id: 'match_pct', pct: Math.round(res.confidence * 100) }
              : { id: 'match' },
          )
        } else {
          setSuggestSourceSpec({ id: 'none' })
        }
        const mappedRaw = res.items.map((it) => ({
          pick: mapSuggestApiItem(it),
          score: it.score,
          reason: it.source.startsWith('deepseek') || it.source.startsWith('intent') || it.source === 'industry_pack'
            ? `${it.reason} · AI`
            : it.flutter_pkg
              ? `${it.reason} · ${it.flutter_pkg}`
              : it.reason,
          ...metaForSuggestItem(it),
        }))
        // 命中弹幕场景时：与弹幕点击完全同一套 picks（禁止混入审批流等）
        const hero = matchHeroPreset(text)
        let mapped = mappedRaw
        if (hero) {
          const picks = picksForCapabilityAlign(hero)
          mapped = picks.map((pick, i) => {
            const meta = pickWithMeta(pick)
            return {
              pick,
              score: 9.5 - i * 0.15,
              reason: t('home.suggest.reason.danmaku_align', { label: hero.label }),
              iconKey: meta.iconKey,
              color: meta.color,
            }
          })
          setSuggestSourceSpec({ id: 'danmaku', label: hero.label })
          setPromptSuggestions(mapped)
          if (canAutoApplySuggestions(validation, mapped)) {
            // 与点击弹幕同源：buildModulesFromPreset
            const mods = buildModulesFromPreset(hero).map((m) => ({
              ...m,
              source: 'suggest' as const,
            }))
            lastAutoSuggestSigRef.current = `${text}::${mods.map((m) => m.id).join(',')}`
            setPromptModules(mods)
            setIndustryKeys(new Set(hero.picks.filter((p) => p.type === 'industry').map((p) => p.key)))
            setOfficeCats(new Set(hero.picks.filter((p) => p.type === 'office').map((p) => p.key)))
            setSelected(new Set(mods.filter((m) => m.type === 'scenario').map((m) => m.key)))
          } else {
            clearSuggestModules()
          }
        } else {
          setPromptSuggestions(mapped)
          if (canAutoApplySuggestions(validation, mapped)) {
            applySuggestModules(mapped, text)
          } else {
            clearSuggestModules()
          }
        }
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
          setSuggestConfidence(0)
          setSuggestValidation(null)
          setSuggestRegistered(undefined)
          const hero = matchHeroPreset(text)
          if (hero) {
            setSuggestSourceSpec({ id: 'danmaku', label: hero.label })
            const mapped = picksForCapabilityAlign(hero).map((pick, i) => {
              const meta = pickWithMeta(pick)
              return {
                pick,
                score: 9.5 - i * 0.15,
                reason: t('home.suggest.reason.danmaku_align', { label: hero.label }),
                iconKey: meta.iconKey,
                color: meta.color,
              }
            })
            setPromptSuggestions(mapped)
            if (canAutoApplySuggestions(null, mapped)) {
              const mods = buildModulesFromPreset(hero).map((m) => ({ ...m, source: 'suggest' as const }))
              lastAutoSuggestSigRef.current = `${text}::${mods.map((m) => m.id).join(',')}`
              setPromptModules(mods)
              setIndustryKeys(new Set(hero.picks.filter((p) => p.type === 'industry').map((p) => p.key)))
              setOfficeCats(new Set(hero.picks.filter((p) => p.type === 'office').map((p) => p.key)))
              setSelected(new Set(mods.filter((m) => m.type === 'scenario').map((m) => m.key)))
            } else {
              clearSuggestModules()
            }
          } else {
            setSuggestSourceSpec({ id: 'keyword' })
            const mapped = suggestModulesFromText(text, catalogScenarios)
            setPromptSuggestions(mapped)
            if (canAutoApplySuggestions(null, mapped)) {
              applySuggestModules(mapped, text)
            } else {
              clearSuggestModules()
            }
          }
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
  }, [debouncedIntent, catalogScenarios, applySuggestModules, clearSuggestModules, heroDemoActive, t])

  const displaySuggestions = useMemo(() => {
    if (heroDemoActive) return buildHeroDockDemoSuggestions()
    if (suggestValidation?.status !== 'unclear') return promptSuggestions
    return promptSuggestions.filter(
      (s) => s.score >= 5.5 && !String(s.reason).includes('· AI'),
    )
  }, [heroDemoActive, promptSuggestions, suggestValidation?.status])

  const selectedModuleIds = useMemo(
    () => new Set(promptModules.map((m) => m.id)),
    [promptModules],
  )

  const capabilitySplit = useMemo(() => {
    const official = new Set([
      ...MODULES.flatMap((g) => g.items.map((i) => i.key)),
      ...(suggestRegistered?.capabilities ?? []),
    ])
    const caps = promptModules.filter((m) => m.type === 'module' || m.type === 'capability')
    const labelOf = (m: PromptModule) => capabilityName(t, m.key, m.label || m.key)
    return {
      known: caps.filter((m) => official.has(m.key)).map(labelOf),
      pending: caps.filter((m) => !official.has(m.key)).map(labelOf),
    }
  }, [promptModules, suggestRegistered?.capabilities, t])

  const previewPicks = useMemo((): AgentPick[] => {
    const map = new Map<string, AgentPick>()
    for (const m of promptModules) {
      map.set(m.id, { type: m.type, key: m.key, label: m.label })
    }
    const mergeSuggestions =
      suggestValidation?.status === 'valid'
      || (suggestValidation?.status !== 'invalid' && suggestValidation?.status !== 'unclear')
    if (mergeSuggestions) {
      const threshold = suggestUsedAi ? 5 : 4
      for (const s of promptSuggestions) {
        if (s.score < threshold) continue
        const id = moduleId(s.pick)
        if (!map.has(id)) map.set(id, s.pick)
      }
    }
    return [...map.values()]
  }, [promptModules, promptSuggestions, suggestUsedAi, suggestValidation?.status])

  const enhancedPreview = useMemo(() => {
    if (heroDemoActive) return HERO_DOCK_DEMO_ENHANCED
    if (debouncedIntent.trim().length < 2) return ''
    if (suggestValidation?.status === 'invalid' || suggestValidation?.status === 'unclear') return ''
    if (!hasStructuredPicks(previewPicks) && suggestValidation?.status !== 'valid') return ''
    return enhanceSimplePrompt(debouncedIntent, previewPicks, suggestValidation)
  }, [heroDemoActive, debouncedIntent, previewPicks, suggestValidation])

  const applyEnhancedPreview = useCallback(() => {
    if (!enhancedPreview) return
    userSuffixRef.current = enhancedPreview
    skipSyncRef.current = true
    setPrompt(composedFromModules ? mergePromptText(composedFromModules, enhancedPreview) : enhancedPreview)
  }, [enhancedPreview, composedFromModules])

  const focusPrompt = useCallback(() => {
    requestAnimationFrame(() => {
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

  const catalogNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of [...officeAll, ...industryAll]) map.set(s.id, s.name)
    return map
  }, [officeAll, industryAll])

  const clearAll = useCallback(() => {
    exitHeroDemo()
    userSuffixRef.current = ''
    skipSyncRef.current = false
    setDebouncedIntent('')
    setPromptModules([])
    setSelected(new Set())
    setIndustryKeys(new Set())
    setOfficeCats(new Set())
    setPrompt('')
    setDraft('')
    setLastAddedId(null)
  }, [setDraft, exitHeroDemo])

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
      entrySource: 'capship_workbench',
      prompt: bundle.promptText,
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
      scenarios: bundle.scenarioNames,
    })
  }, [deliver, branding, webTemplateId, appUiId])

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
    onPublish(result)
  }, [onPublish])

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
          ? t('home.prompt.err.preset')
          : t('home.prompt.err.generic'),
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
      const localizedName =
        m.type === 'capability' || m.type === 'module'
          ? capabilityName(t, m.key, m.label)
          : m.label
      return {
        id: boxId,
        name: localizedName,
        category: m.source === 'auto' ? t('home.warehouse.auto_tag') : undefined,
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
  }, [promptModules, resolvedBundle.autoModules, t])

  const removeSelectionItem = (id: string) => {
    const mod = promptModules.find(
      (m) => (m.type === 'industry' ? `ind-${m.key}` : m.type === 'office' ? `off-${m.key}` : m.id) === id,
    )
    if (mod) removeModule(mod.id)
  }

  const handlePickerChange = useCallback((open: boolean) => {
    setModulePickerOpen(open)
    if (!open && promptModules.length > 0) {
      setBoxOpenSignal((n) => n + 1)
    }
  }, [promptModules.length])

  const handleDockExpand = useCallback(() => {
    setPromptExpanded(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        textareaRef.current?.openPicker()
        textareaRef.current?.focus()
      })
    })
  }, [])

  return (
    <div className="view prompt-view prompt-view-minimal layout-floating" data-capship-mode={PROMPT_COMPOSER_MODE}>
      {showPromptDock && (
      <FloatingAgentDock
        storageKey="tc-floating-home"
        className="floating-agent-dock-prompt home-floating-agent"
        title={<AnimatedChevTitle />}
        variant="capsule"
        showDockToggle
        defaultExpanded={activeSection === 'hero'}
        defaultAnchorSelector="#hero-dock-anchor"
        anchorAlign="right"
        anchorVerticalAlign="top"
        repositionSignal={dockReposition}
        closedAnchorSelector=".b2b-header .brand-mark"
        ariaLabel={t('home.dock.prompt_aria')}
        onExpand={handleDockExpand}
      >
        <div
          ref={promptCardRef}
          className={`prompt-card minimal-card${promptHighlight ? ' prompt-highlight' : ''}${promptExpanded ? ' prompt-expanded' : ''}${heroDemoTyping ? ' hero-dock-typing-demo' : ''}`}
        >
        <div className="prompt-card-scroll">
          <AgentInput
            ref={textareaRef}
            variant="minimal"
            orbSize="large"
            theme={theme}
            value={prompt}
            onChange={handlePromptChange}
            onFocus={handleAgentInputFocus}
            expanded={promptExpanded || promptHighlight}
            guideOnEmptyFocus={!heroTypingDemoEligible}
            inputLocked={heroDemoTyping}
            modules={promptModules}
            onRemoveModule={removeModule}
            scenarios={panelScenarios}
            onPick={handleAgentPick}
            onPickerChange={handlePickerChange}
          />
          <HeroDockIntentBrief visible={heroDemoActive} />
          <IntentAnalysisStrip
            visible={intentAnalyzable}
            progress={analysisProgress}
            phase={analysisPhase}
          />
          <PromptSuggestBar
            userIntent={heroDemoActive ? HERO_DOCK_DEMO_PROMPT : userIntentText}
            suggestions={displaySuggestions}
            enhancedPreview={enhancedPreview}
            selectedIds={selectedModuleIds}
            onToggle={(pick, extra) => {
              if (heroDemoActive) exitHeroDemo()
              upsertModule(pick, extra)
            }}
            onApplyPreview={applyEnhancedPreview}
            sourceLabel={formatSuggestSource(t, suggestSourceSpec)}
            confidence={suggestConfidence}
            loading={suggestFetching || isIntentDebouncing}
            validation={suggestValidation}
            registered={suggestRegistered}
          />
        </div>
        <CapabilitySplitBanner
          knownLabels={capabilitySplit.known}
          pendingLabels={capabilitySplit.pending}
          compact
        />
        <div className="prompt-footer minimal-footer">
          <div className="prompt-meta">
            {(promptModules.length > 0 || prompt.trim()) && (
              <button type="button" className="link-btn" onClick={clearAll}>{t('home.prompt.clear')}</button>
            )}
          </div>
          <div className="prompt-footer-right">
            <DeliveryTemplatePicker
              webTemplateId={webTemplateId}
              appUiId={appUiId}
              onWebTemplateChange={setWebTemplateId}
              onAppUiChange={setAppUiId}
              recommendAppUiId={
                promptModules.some((m) => m.key.includes('shanghai_voice')) ? 'immersive_chat' : undefined
              }
              compact
              className="minimal-template"
            />
            <DeliverTargetPicker value={platforms} onChange={setPlatforms} compact className="minimal-deliver" />
            <button type="button" className="btn-primary minimal-generate agent-action-btn" disabled={loading || !canGenerate} onClick={handleGenerate}>
              {loading ? publishGenerateLoading(t) : (
                <AgentButtonContent>{publishGenerateLabel(t)}</AgentButtonContent>
              )}
            </button>
          </div>
        </div>
        </div>
      </FloatingAgentDock>
      )}
      <div className={`agent-floating-spacer${bookingZoneActive ? ' is-booking' : ''}`} aria-hidden />

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
          dormant={modulePickerOpen}
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
