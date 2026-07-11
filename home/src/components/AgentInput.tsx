import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { MODULES } from '../data/constants'
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE, resolveCategoryIcon, type IndustryItem } from '../data/showcase'
import { categoryColor } from '../data/iconPalette'
import type { ThemeTokens } from '../data/themes'
import { DynamicIcon } from './icons'
import AgentOrbPanel from './AgentOrbPanel'
import {
  cancelTrigger,
  completeCommand,
  DEFAULT_GUIDE_TEXT,
  GUIDE_PLACEHOLDER,
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

export type { AgentPick } from './agentInputLogic'

export interface AgentInputHandle {
  focus: () => void
  openPicker: () => void
  textarea: HTMLTextAreaElement | null
}

const ACTIONS = [
  { key: 'add-scene', label: '添加场景', hint: '打开 >> 选模块' },
  { key: 'warehouse', label: '查看积木仓', hint: '已选清单' },
] as const

const OFFICE_CATS = [
  '人事行政', '财务法务', '知识协同', '流程审批',
  '数据报表', '消息通知', 'IT与资产', '外部对接',
]

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
  hint?: string
  iconKey?: string
  color?: string
  selected?: boolean
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
  const placeholderText = capsuleCompact && contextCopy.placeholderCollapsed
    ? contextCopy.placeholderCollapsed
    : (isMinimal ? contextCopy.placeholder : GUIDE_PLACEHOLDER)

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

    const mk = (pick: AgentPick, extra: Omit<PanelItem, 'pick' | 'selected'>): PanelItem => ({
      pick,
      ...extra,
      selected: isSelected(pick, modules),
    })

    const actionItems = ACTIONS.filter((a) => match(a.label, a.hint)).map((a) =>
      mk({ type: 'action', key: a.key, label: a.label }, { hint: a.hint }),
    )
    const industryItems = INDUSTRIES_SHOWCASE.filter((i: IndustryItem) => match(i.name, i.desc)).map((i) =>
      mk({ type: 'industry', key: i.key, label: i.name }, { hint: i.desc, iconKey: i.iconKey, color: i.color }),
    )
    const officeItems = OFFICE_CATS.filter((c) => match(c)).map((c) =>
      mk({ type: 'office', key: c, label: c }, { iconKey: 'briefcase', color: theme?.pri }),
    )
    const capItems = CAPABILITIES_SHOWCASE.filter((c) => match(c.name, c.desc)).map((c) =>
      mk({ type: 'capability', key: c.id, label: c.name }, { hint: c.desc, iconKey: c.iconKey, color: c.color }),
    )
    const moduleItems = MODULES.flatMap((group) =>
      group.items
        .filter((m) => match(m.name, group.cat))
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

    const showFullCatalog = !isMinimal || Boolean(filterQuery) || pickerSession

    const out: PanelSection[] = []
    if (actionItems.length && !isMinimal) out.push({ id: 'actions', title: '快捷指令', items: actionItems })
    if (scenarioItems.length && showFullCatalog) out.push({ id: 'scenarios', title: '业务场景', items: scenarioItems })
    if (industryItems.length) out.push({ id: 'industries', title: '行业视角', items: industryItems.slice(0, 8) })
    if (officeItems.length) out.push({ id: 'office', title: '办公分类', items: officeItems })
    if (capItems.length) out.push({ id: 'capabilities', title: '平台能力', items: capItems.slice(0, 6) })
    if (moduleItems.length && showFullCatalog) out.push({ id: 'modules', title: '功能模块', items: moduleItems.slice(0, 8) })
    return out
  }, [filterQuery, scenarios, modules, isMinimal, theme])

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
    onPick?.(item.pick, { iconKey: item.iconKey, color: item.color })

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
          label: item.pick.label,
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
                title="积木仓符号 · >>重新定义智能交互"
                aria-label="打开模块选择"
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
                <div className="agent-input-ghost" aria-hidden>{GUIDE_PLACEHOLDER}</div>
              )}
              <textarea
                ref={innerRef}
                className="agent-input-field"
                value={value}
                rows={expanded ? 5 : 2}
                placeholder={focused ? '' : GUIDE_PLACEHOLDER}
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
              {isMinimal ? (
                <>自由描述中 · 输入 <code>&gt;&gt;</code> 多选模块</>
              ) : (
                <>自由描述中 · 需要模块时在空格后输入 <code>&gt;&gt;</code></>
              )}
            </span>
          )}
          {(mode === 'guide' || (pickerSession && effectivePanelOpen)) && mode !== 'command' && (
            <span>
              {isMinimal
                ? '点上方光球选模块 · 选完点「完成选模块」查看积木仓'
                : '可多选模块 · 选完后 Esc 或直接输入描述'}
            </span>
          )}
          {mode === 'command' && (
            <span>
              <code>&gt;&gt;</code> 编排中 · 可多选
              {ctx.query.trim() ? ` · 筛选「${ctx.query.trim()}」` : ' · 或直接输入需求，如：游戏'}
              {pickerSession && !ctx.open ? ' · Esc 完成' : ''}
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
            foot={PANEL_HINT_TEXT[panelHint]}
            theme={theme}
            size={orbSize}
            showDone={pickerSession}
            selectedCount={modules.length}
            onDone={closePanel}
          />
        </div>
      )}

      {effectivePanelOpen && !isMinimal && (
        <div className="agent-module-panel" ref={panelRef} role="listbox" aria-label="可用模块">
          <div className="agent-module-head">
            <span className="agent-module-title">
              {mode === 'guide' ? '开始创建 — 选一项或直接输入' : ctx.query.trim() ? `筛选：${ctx.query.trim()}` : '插入模块'}
            </span>
            <span className="agent-module-count">{flatItems.length} 项</span>
          </div>
          <div className="agent-module-body">
            {sections.length === 0 ? (
              <div className="agent-module-empty">
                <p>没有匹配的模块</p>
                <span>继续输入文字，或 Esc 删除 <code>&gt;&gt;</code></span>
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
                        <span className="agent-module-label">{item.pick.label}</span>
                        {item.selected && <span className="agent-module-badge">已选</span>}
                        {item.hint && <span className="agent-module-meta">{item.hint}</span>}
                      </button>
                    )
                  })}
                </section>
              ))
            )}
          </div>
          <footer className="agent-module-foot">{PANEL_HINT_TEXT[panelHint]}</footer>
        </div>
      )}
    </div>
  )
})
