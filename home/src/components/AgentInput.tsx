import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useT, useTf } from '@blockhub/i18n/react'
import { MODULES } from '../data/constants'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE, resolveCategoryIcon, type IndustryItem } from '../data/showcase'
import {
  filterHeroPresetsForQuery,
  heroModuleSearchHints,
  picksForCapabilityAlign,
} from '../data/heroAlign'
import { presetRole } from '../data/rolePresets'
import { categoryColor } from '../data/iconPalette'
import type { ThemeTokens } from '../data/themes'
import { DynamicIcon } from './icons'
import AgentOrbPanel from './AgentOrbPanel'
import {
  cancelTrigger,
  completeCommand,
  DEFAULT_GUIDE_TEXT,
  isLoneTrigger,
  normalizeChevronInput,
  PANEL_HINT_TEXT,
  resolveInputState,
  resolvePanelHint,
  TRIGGER_TOKEN,
  type AgentPick,
  type PromptModule,
  type TriggerContext,
} from './agentInputLogic'
import { useAgentPageContext } from '../context/AgentPageContext'
import { useFloatingDock } from '../context/FloatingDockContext'
import { AGENT_CONTEXTS } from '../data/agentContext'
import { ChevronDotSign } from './ChevronDotLoader'
import { officeCategories, PANEL_HINT_KEYS } from '../i18n/agentLabels'
import { industryName } from '../i18n/industryLabels'
import { showcaseCapDesc, showcaseCapName } from '../i18n/contentLabels'

export type { AgentPick } from './agentInputLogic'

export interface AgentInputHandle {
  focus: () => void
  openPicker: () => void
  textarea: HTMLTextAreaElement | null
}

const ACTIONS = [
  { key: 'add-scene', labelKey: 'home.agent.action.add_scene', hintKey: 'home.agent.action.add_scene_hint' },
  { key: 'warehouse', labelKey: 'home.agent.action.warehouse', hintKey: 'home.agent.action.warehouse_hint' },
] as const

interface ScenarioRef {
  id: string
  name: string
  category: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  onFocus?: () => void
  onBlur?: () => void
  expanded?: boolean
  variant?: 'default' | 'minimal'
  modules?: PromptModule[]
  onRemoveModule?: (id: string) => void
  scenarios?: ScenarioRef[]
  onPick?: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
  theme?: ThemeTokens
  orbSize?: 'default' | 'large'
  /** 模块选择面板开/关（用于与积木仓互斥） */
  onPickerChange?: (open: boolean) => void
  /** 空内容聚焦时是否自动插入 >> 引导（首页打字演示时关闭） */
  guideOnEmptyFocus?: boolean
  /** 演示打字时锁定输入 */
  inputLocked?: boolean
}

interface PanelItem {
  pick: AgentPick
  /** 面板展示名（可与 pick.label 不同，如弹幕「角色 × 场景」） */
  displayLabel?: string
  hint?: string
  iconKey?: string
  color?: string
  selected?: boolean
  /** 选中弹幕场景时一并写入的 picks（与点击弹幕同源） */
  bundle?: AgentPick[]
}

interface PanelSection {
  id: string
  title: string
  items: PanelItem[]
}

function isSelected(pick: AgentPick, modules: PromptModule[]): boolean {
  return modules.some((m) => m.type === pick.type && m.key === pick.key)
}

const GUIDE_CURSOR = TRIGGER_TOKEN.length

export default forwardRef<AgentInputHandle, Props>(function AgentInput({
  value,
  onChange,
  onFocus,
  onBlur,
  expanded = false,
  variant = 'default',
  modules = [],
  onRemoveModule,
  scenarios = [],
  onPick,
  theme,
  orbSize = 'default',
  onPickerChange,
  guideOnEmptyFocus = true,
  inputLocked = false,
}, ref) {
  const t = useT()
  const tf = useTf()
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const compactRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const prevQueryRef = useRef('')
  const prevTriggerRef = useRef(-1)
  const pickedRef = useRef(false)

  const isMinimal = variant === 'minimal'
  const floatingDock = useFloatingDock()
  const isFloatingCapsule = Boolean(
    isMinimal && floatingDock?.variant === 'capsule' && !floatingDock.collapsed,
  )
  const capsuleCompact = Boolean(
    isMinimal && floatingDock?.variant === 'capsule' && floatingDock.collapsed,
  )
  const textareaRows = isFloatingCapsule ? 2 : (expanded ? 5 : 2)
  const { contextKey } = useAgentPageContext()
  const contextCopy = AGENT_CONTEXTS[contextKey]
  const guidePlaceholder = t('home.agent.placeholder')
  const placeholderText = capsuleCompact
    ? (contextCopy.placeholderCollapsed ?? contextCopy.placeholder)
    : (isMinimal ? contextCopy.placeholder : guidePlaceholder)

  const panelHintText = (hint: keyof typeof PANEL_HINT_TEXT) =>
    t(PANEL_HINT_KEYS[hint] ?? 'home.agent.hint.browse')

  const [focused, setFocused] = useState(false)
  const [composing, setComposing] = useState(false)
  const [guideHeld, setGuideHeld] = useState(false)
  const [pickerSession, setPickerSession] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const openPickerSession = useCallback(() => {
    setPickerSession(true)
    setFocused(true)
    requestAnimationFrame(() => {
      innerRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const activateGuide = useCallback(() => {
    setPickerSession(true)
    if (!value.trim()) {
      onChange(DEFAULT_GUIDE_TEXT)
      setGuideHeld(true)
      requestAnimationFrame(() => {
        const el = innerRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        el.setSelectionRange(GUIDE_CURSOR, GUIDE_CURSOR)
        setCursor(GUIDE_CURSOR)
      })
    } else {
      openPickerSession()
    }
  }, [onChange, value, openPickerSession])

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = capsuleCompact ? compactRef.current : innerRef.current
      el?.focus({ preventScroll: true })
    },
    openPicker: () => openPickerSession(),
    get textarea() { return innerRef.current },
  }), [openPickerSession, capsuleCompact])

  const inputState = useMemo(
    () => resolveInputState(value, cursor, focused, guideHeld, composing),
    [value, cursor, focused, guideHeld, composing],
  )
  const { mode, ctx, panelOpen } = inputState
  const effectivePanelOpen = panelOpen || (isMinimal && pickerSession && focused)

  useEffect(() => {
    onPickerChange?.(effectivePanelOpen)
  }, [effectivePanelOpen, onPickerChange])

  const filterQuery = ctx.open
    ? ctx.query.trim().toLowerCase()
    : (isMinimal && pickerSession) || mode === 'guide'
      ? ''
      : ''

  const syncCursor = () => {
    const pos = innerRef.current?.selectionStart ?? value.length
    setCursor(pos)
    return pos
  }

  const applyCursor = (_text: string, pos: number) => {
    requestAnimationFrame(() => {
      const el = innerRef.current
      if (!el) return
      el.focus({ preventScroll: true })
      el.setSelectionRange(pos, pos)
      setCursor(pos)
    })
  }

  const closePanel = useCallback(() => {
    setGuideHeld(false)
    setPickerSession(false)
    prevQueryRef.current = ''
    prevTriggerRef.current = -1
  }, [])

  const updateTriggerIndex = useCallback((next: TriggerContext, resetIndex = false) => {
    if (!next.open && mode !== 'guide') return
    const sameTrigger = next.triggerAt === prevTriggerRef.current
    const queryGrowing = sameTrigger && next.query.startsWith(prevQueryRef.current)
    if (resetIndex || !sameTrigger || (!queryGrowing && next.query.length <= prevQueryRef.current.length)) {
      setActiveIdx(0)
    }
    prevQueryRef.current = next.query
    prevTriggerRef.current = next.triggerAt
  }, [mode])

  const sections = useMemo((): PanelSection[] => {
    const q = filterQuery
    const match = (label: string, hint?: string) =>
      !q || label.toLowerCase().includes(q) || (hint?.toLowerCase().includes(q) ?? false)
    const moduleHints = heroModuleSearchHints()

    const mk = (pick: AgentPick, extra: Omit<PanelItem, 'pick' | 'selected'>): PanelItem => ({
      pick,
      ...extra,
      selected: isSelected(pick, modules),
    })

    const actionItems = ACTIONS.filter((a) => {
      const label = t(a.labelKey)
      const hint = t(a.hintKey)
      return match(label, hint) || match(a.key)
    }).map((a) => {
      const label = t(a.labelKey)
      const hint = t(a.hintKey)
      return mk({ type: 'action', key: a.key, label }, { hint })
    })
    const industryItems = INDUSTRIES_SHOWCASE.filter((i: IndustryItem) => {
      const name = industryName(t, i.key, i.name)
      return match(name, i.desc) || match(i.name, i.desc)
    }).map((i) => {
      const name = industryName(t, i.key, i.name)
      return mk(
        { type: 'industry', key: i.key, label: name },
        { hint: i.desc, iconKey: i.iconKey, color: i.color },
      )
    })
    const officeItems = officeCategories(t)
      .filter((c) => match(c.label) || match(c.key))
      .map((c) =>
        mk({ type: 'office', key: c.key, label: c.label }, { iconKey: 'briefcase', color: theme?.pri }),
      )
    const capItems = CAPABILITIES_SHOWCASE.filter((c) => match(c.name, c.desc)).map((c) =>
      mk(
        { type: 'capability', key: c.id, label: showcaseCapName(t, c.id, c.name) },
        { hint: showcaseCapDesc(t, c.id, c.desc), iconKey: c.iconKey, color: c.color },
      ),
    )
    const moduleItems = MODULES.flatMap((group) =>
      group.items
        .filter((m) => {
          if (match(m.name, group.cat)) return true
          const hint = moduleHints.get(m.key)
          return Boolean(q && hint?.includes(q))
        })
        .map((m) => mk({ type: 'module', key: m.key, label: m.name }, { hint: group.cat, iconKey: 'box', color: theme?.priLight })),
    )
    const scenarioItems = scenarios
      .filter((s) => match(s.name, s.category))
      .slice(0, isMinimal ? 24 : 32)
      .map((s) => {
        const ic = theme ? categoryColor(s.category, theme) : undefined
        const iconKey = resolveCategoryIcon(s.category, 'office')
        return mk({ type: 'scenario', key: s.id, label: s.name }, { hint: s.category, iconKey, color: ic })
      })

    const heroPresets = filterHeroPresetsForQuery(q)
    const heroSceneItems = heroPresets.map((preset) => {
      const picks = picksForCapabilityAlign(preset)
      const label = tf(`hero.${preset.id}.label`, preset.label)
      const hint = tf(`hero.${preset.id}.hint`, preset.hint)
      const role = tf(`hero.${preset.id}.role`, presetRole(preset))
      const primary =
        picks.find((p) => p.type === 'module' || p.type === 'capability') ??
        picks[0] ??
        ({ type: 'scenario' as const, key: preset.id, label })
      return mk(
        { ...primary, label: primary.label === preset.label ? label : primary.label },
        {
          displayLabel: `${role} × ${label}`,
          hint: `${role} · ${hint}`,
          iconKey: 'zap',
          color: preset.color,
          bundle: picks,
        },
      )
    })

    const showFullCatalog = !isMinimal || Boolean(filterQuery) || pickerSession
    const moduleLimit = q ? 24 : 8
    const industryLimit = q ? 16 : 8
    const heroLimit = q ? 20 : 10

    const out: PanelSection[] = []
    if (actionItems.length && !isMinimal) out.push({ id: 'actions', title: t('home.agent.section.actions'), items: actionItems })
    if (heroSceneItems.length && showFullCatalog) {
      out.push({ id: 'hero-scenes', title: t('home.agent.section.hero'), items: heroSceneItems.slice(0, heroLimit) })
    }
    if (scenarioItems.length && showFullCatalog) out.push({ id: 'scenarios', title: t('home.agent.section.scenarios'), items: scenarioItems })
    if (industryItems.length) out.push({ id: 'industries', title: t('home.agent.section.industries'), items: industryItems.slice(0, industryLimit) })
    if (officeItems.length) out.push({ id: 'office', title: t('home.agent.section.office'), items: officeItems })
    if (capItems.length) out.push({ id: 'capabilities', title: t('home.agent.section.capabilities'), items: capItems.slice(0, q ? 10 : 6) })
    if (moduleItems.length && showFullCatalog) out.push({ id: 'modules', title: t('home.agent.section.modules'), items: moduleItems.slice(0, moduleLimit) })
    return out
  }, [filterQuery, scenarios, modules, isMinimal, theme, pickerSession, t, tf])

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const panelMode = mode === 'guide' ? 'guide' : 'command'
  const panelHint = resolvePanelHint(
    effectivePanelOpen && pickerSession && !ctx.open ? 'command' : mode,
    ctx,
    flatItems.length,
    composing,
  )

  const insertPick = useCallback((item: PanelItem) => {
    const el = innerRef.current
    const pos = el?.selectionStart ?? value.length
    const triggerAt = mode === 'guide' ? 0 : ctx.triggerAt
    const hasTrigger = mode === 'guide' || ctx.open

    const applyPicks = () => {
      if (item.bundle?.length) {
        for (const pick of item.bundle) {
          onPick?.(pick, { iconKey: item.iconKey, color: item.color })
        }
        return
      }
      onPick?.(item.pick, { iconKey: item.iconKey, color: item.color })
    }

    if (item.pick.type === 'action') {
      pickedRef.current = true
      onPick?.(item.pick, { iconKey: item.iconKey, color: item.color })
      if (hasTrigger) {
        const start = triggerAt >= 0 ? triggerAt : pos - TRIGGER_TOKEN.length
        const end = mode === 'guide' ? value.length : pos
        const { text, cursor: nextPos } = completeCommand(value, start, end)
        onChange(text)
        applyCursor(text, nextPos)
      }
      closePanel()
      return
    }

    pickedRef.current = true
    applyPicks()

    if (isMinimal) {
      setPickerSession(true)
      if (hasTrigger) {
        const start = triggerAt >= 0 ? triggerAt : pos - TRIGGER_TOKEN.length
        const end = mode === 'guide' ? value.length : pos
        const { text, cursor: nextPos } = completeCommand(value, start, end)
        onChange(text)
        applyCursor(text, nextPos)
      } else {
        innerRef.current?.focus({ preventScroll: true })
      }
      return
    }

    const start = triggerAt >= 0 ? triggerAt : pos - TRIGGER_TOKEN.length
    const end = mode === 'guide' ? value.length : pos
    const { text, cursor: nextPos } = completeCommand(value, start, end)
    onChange(text)
    applyCursor(text, nextPos)
    closePanel()
  }, [mode, ctx.open, ctx.triggerAt, value, onPick, onChange, closePanel, isMinimal])

  const handleFocus = () => {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    setFocused(true)
    if (floatingDock?.variant === 'capsule' && floatingDock.collapsed) {
      floatingDock.expand()
    }
    onFocus?.()
    if (!value.trim() && isMinimal) {
      syncCursor()
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
      return
    }
    if (!value.trim()) {
      if (guideOnEmptyFocus) activateGuide()
      requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
      return
    }
    syncCursor()
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }

  const handleBlur = () => {
    setFocused(false)
    closePanel()
    if (isLoneTrigger(value) && !pickedRef.current) {
      onChange('')
    }
    pickedRef.current = false
    onBlur?.()
  }

  const handleChange = (rawText: string) => {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const el = capsuleCompact ? compactRef.current : innerRef.current
    const rawCursor = el?.selectionStart ?? rawText.length
    const { text, cursor: normCursor } = composingRef.current
      ? { text: rawText, cursor: rawCursor }
      : normalizeChevronInput(rawText, rawCursor)

    onChange(text)
    if (floatingDock?.variant === 'capsule' && floatingDock.collapsed) {
      floatingDock.expand()
    }
    if (composingRef.current) return

    if (text !== rawText && el) {
      requestAnimationFrame(() => {
        el.setSelectionRange(normCursor, normCursor)
        setCursor(normCursor)
      })
    } else {
      setCursor(normCursor)
    }

    if (text !== DEFAULT_GUIDE_TEXT) setGuideHeld(false)
    const nextCtx = resolveInputState(text, normCursor, true, guideHeld && text === DEFAULT_GUIDE_TEXT, false).ctx
    if (nextCtx.open && isMinimal) setPickerSession(true)
    if (isMinimal && pickerSession && !nextCtx.open) {
      const plain = text.replace(/^>>\s*/, '').trim()
      if (plain.length >= 2) setPickerSession(false)
    }
    updateTriggerIndex(nextCtx)
    requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget

    if (e.key === 'Escape') {
      if (!effectivePanelOpen) return
      e.preventDefault()
      const triggerAt = mode === 'guide' ? 0 : ctx.triggerAt
      if (triggerAt >= 0) {
        const pos = el.selectionStart
        const end = mode === 'guide' ? value.length : pos
        const { text, cursor: nextPos } = cancelTrigger(value, triggerAt, end)
        onChange(text)
        applyCursor(text, nextPos)
      }
      closePanel()
      return
    }

    if (!effectivePanelOpen) return
    if (composingRef.current) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!flatItems.length) return
      setActiveIdx((i) => (i + 1) % flatItems.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!flatItems.length) return
      setActiveIdx((i) => (i - 1 + flatItems.length) % flatItems.length)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (flatItems.length) insertPick(flatItems[activeIdx])
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (flatItems.length) insertPick(flatItems[activeIdx])
    }
  }

  useEffect(() => {
    if (!effectivePanelOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) closePanel()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [effectivePanelOpen, closePanel])

  useEffect(() => {
    if (!effectivePanelOpen || !panelRef.current) return
    const sel = isMinimal ? '.agent-orb.active' : '.agent-module-item.active'
    panelRef.current.querySelector(sel)?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, effectivePanelOpen, isMinimal])

  useEffect(() => {
    if (effectivePanelOpen && activeIdx >= flatItems.length) setActiveIdx(Math.max(0, flatItems.length - 1))
  }, [flatItems.length, activeIdx, effectivePanelOpen])

  const orbSections = useMemo(() => {
    if (!isMinimal || !theme) return []
    let idx = 0
    return sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.items.map((item) => {
        const current = idx++
        return {
          idx: current,
          label: item.displayLabel ?? item.pick.label,
          hint: item.hint,
          iconKey: item.iconKey,
          color: item.color,
          selected: item.selected,
          active: current === activeIdx,
          onPick: () => insertPick(item),
          onHover: () => setActiveIdx(current),
        }
      }),
    }))
  }, [sections, activeIdx, isMinimal, theme, insertPick])

  const showGhost = focused && !value.trim() && modules.length === 0 && !isMinimal

  const renderModuleButtons = () => modules.map((m) => (
    <button
      key={m.id}
      type="button"
      className={`agent-inline-module${isMinimal ? ' minimal' : ''}`}
      style={m.color ? { '--chip-color': m.color } as React.CSSProperties : undefined}
      title={`${m.label} · 点击移除`}
      onClick={() => onRemoveModule?.(m.id)}
    >
      {m.iconKey && m.color && (
        <span className="agent-inline-module-icon">
          <DynamicIcon name={m.iconKey} size={12} color={m.color} />
        </span>
      )}
      <span className="agent-inline-module-label">{m.label}</span>
      <span className="agent-inline-module-x" aria-hidden>×</span>
    </button>
  ))

  let listIdx = 0

  return (
    <div
      className={`agent-input-wrap${focused ? ' focused' : ''}${effectivePanelOpen ? ' panel-open' : ''}${isMinimal ? ' minimal' : ''}`}
      ref={wrapRef}
    >
      {!isMinimal && modules.length > 0 && (
        <div className="agent-module-chips">{renderModuleButtons()}</div>
      )}

      <div className={`agent-input-shell${isMinimal ? ' composer' : ''}`}>
        {isMinimal ? (
          <>
            {modules.length > 0 && (
              <div className="agent-composer-modules">{renderModuleButtons()}</div>
            )}
            <div className="agent-composer-row">
              {!capsuleCompact && (
              <button
                type="button"
                className={`agent-brand-trigger${effectivePanelOpen ? ' active' : ''}`}
                title="积木仓符号 · >>重新定义智能体新交互"
                aria-label={t('home.agent.aria.open_picker')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (effectivePanelOpen && pickerSession) closePanel()
                  else openPickerSession()
                }}
              >
                <ChevronDotSign size="btn" />
                {contextCopy.chevLabel ? (
                  <span className="agent-brand-chev-label">{contextCopy.chevLabel}</span>
                ) : null}
              </button>
              )}
              <div className="agent-input-field-wrap">
                {capsuleCompact ? (
                  <input
                    ref={compactRef}
                    type="text"
                    className="agent-input-field agent-input-compact"
                    value={value}
                    placeholder={placeholderText}
                    readOnly={inputLocked}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        floatingDock?.expand()
                        requestAnimationFrame(() => innerRef.current?.focus({ preventScroll: true }))
                      }
                    }}
                    spellCheck={false}
                    aria-label="描述应用需求"
                  />
                ) : (
                <textarea
                  ref={innerRef}
                  className="agent-input-field"
                  value={value}
                  rows={textareaRows}
                  placeholder={placeholderText}
                  readOnly={inputLocked}
                  onChange={(e) => handleChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onClick={() => syncCursor()}
                  onSelect={() => syncCursor()}
                  onKeyUp={() => syncCursor()}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => { composingRef.current = true; setComposing(true); closePanel() }}
                  onCompositionEnd={(e) => {
                    composingRef.current = false
                    setComposing(false)
                    setCursor(e.currentTarget.selectionStart)
                  }}
                  spellCheck={false}
                  aria-autocomplete="list"
                  aria-expanded={effectivePanelOpen}
                />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="agent-input-prefix" aria-hidden>
              <ChevronDotSign size="btn" />
            </span>
            <div className="agent-input-field-wrap">
              {showGhost && (
                <div className="agent-input-ghost" aria-hidden>{guidePlaceholder}</div>
              )}
              <textarea
                ref={innerRef}
                className="agent-input-field"
                value={value}
                rows={expanded ? 5 : 2}
                placeholder={focused ? '' : guidePlaceholder}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={() => syncCursor()}
                onSelect={() => syncCursor()}
                onKeyUp={() => syncCursor()}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => { composingRef.current = true; setComposing(true); closePanel() }}
                onCompositionEnd={(e) => {
                  composingRef.current = false
                  setComposing(false)
                  setCursor(e.currentTarget.selectionStart)
                }}
                spellCheck={false}
                aria-autocomplete="list"
                aria-expanded={effectivePanelOpen}
              />
            </div>
          </>
        )}
      </div>

      {focused && (
        <div className="agent-input-tip" role="note">
          {mode === 'free' && !effectivePanelOpen && (
            <span>
              {isMinimal ? t('home.agent.tip.free_compact') : t('home.agent.tip.free')}
            </span>
          )}
          {(mode === 'guide' || (pickerSession && effectivePanelOpen)) && mode !== 'command' && (
            <span>
              {isMinimal ? panelHintText('browse') : panelHintText('guide')}
            </span>
          )}
          {mode === 'command' && (
            <span>
              {t('home.agent.tip.command')}
              {ctx.query.trim() ? ` · ${t('home.agent.panel.filter', { q: ctx.query.trim() })}` : ''}
            </span>
          )}
        </div>
      )}

      {effectivePanelOpen && isMinimal && theme && (
        <div ref={panelRef}>
          <AgentOrbPanel
            sections={orbSections}
            mode={panelMode}
            query={ctx.open ? ctx.query : ''}
            count={flatItems.length}
            foot={panelHintText(panelHint)}
            theme={theme}
            size={orbSize}
            showDone={pickerSession}
            selectedCount={modules.length}
            onDone={closePanel}
          />
        </div>
      )}

      {effectivePanelOpen && !isMinimal && (
        <div className="agent-module-panel" ref={panelRef} role="listbox" aria-label={t('home.agent.aria.open_picker')}>
          <div className="agent-module-head">
            <span className="agent-module-title">
              {mode === 'guide'
                ? t('home.agent.panel.guide_title')
                : ctx.query.trim()
                  ? t('home.agent.panel.filter', { q: ctx.query.trim() })
                  : t('home.agent.panel.insert')}
            </span>
            <span className="agent-module-count">{flatItems.length}</span>
          </div>
          <div className="agent-module-body">
            {sections.length === 0 ? (
              <div className="agent-module-empty">
                <p>{t('home.agent.panel.empty')}</p>
              </div>
            ) : (
              sections.map((section) => (
                <section key={section.id} className="agent-module-section">
                  <header className="agent-module-section-title">{section.title}</header>
                  {section.items.map((item) => {
                    const idx = listIdx++
                    const active = idx === activeIdx
                    return (
                      <button
                        key={`${section.id}-${item.pick.key}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`agent-module-item${active ? ' active' : ''}${item.selected ? ' picked' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => insertPick(item)}
                      >
                        <ChevronDotSign size="btn" />
                        {item.iconKey && item.color && (
                          <span className="agent-module-icon" style={{ color: item.color }}>
                            <DynamicIcon name={item.iconKey} size={16} color={item.color} />
                          </span>
                        )}
                        <span className="agent-module-label">{item.displayLabel ?? item.pick.label}</span>
                        {item.selected && <span className="agent-module-badge">{t('home.agent.panel.selected')}</span>}
                        {item.hint && <span className="agent-module-meta">{item.hint}</span>}
                      </button>
                    )
                  })}
                </section>
              ))
            )}
          </div>
          <footer className="agent-module-foot">{panelHintText(panelHint)}</footer>
        </div>
      )}
    </div>
  )
})
