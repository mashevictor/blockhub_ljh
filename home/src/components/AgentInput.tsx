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
import { CAPABILITIES_SHOWCASE, INDUSTRIES_SHOWCASE, type IndustryItem } from '../data/showcase'
import { DynamicIcon } from './icons'
import {
  cancelTrigger,
  completeCommand,
  DEFAULT_GUIDE_TEXT,
  GUIDE_PLACEHOLDER,
  isLoneTrigger,
  PANEL_HINT_TEXT,
  resolveInputState,
  resolvePanelHint,
  type AgentPick,
  type PromptModule,
  type TriggerContext,
} from './agentInputLogic'

export type { AgentPick } from './agentInputLogic'

const ACTIONS = [
  { key: 'add-scene', label: '添加场景', hint: '跳转场景目录' },
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
  modules?: PromptModule[]
  onRemoveModule?: (id: string) => void
  scenarios?: ScenarioRef[]
  onPick?: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
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

export default forwardRef<HTMLTextAreaElement, Props>(function AgentInput({
  value,
  onChange,
  onFocus,
  onBlur,
  expanded = false,
  modules = [],
  onRemoveModule,
  scenarios = [],
  onPick,
}, ref) {
  const innerRef = useRef<HTMLTextAreaElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const composingRef = useRef(false)
  const prevQueryRef = useRef('')
  const prevTriggerRef = useRef(-1)
  const pickedRef = useRef(false)

  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement)

  const [focused, setFocused] = useState(false)
  const [composing, setComposing] = useState(false)
  const [guideHeld, setGuideHeld] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const inputState = useMemo(
    () => resolveInputState(value, cursor, focused, guideHeld, composing),
    [value, cursor, focused, guideHeld, composing],
  )
  const { mode, ctx, panelOpen } = inputState

  const syncCursor = () => {
    const pos = innerRef.current?.selectionStart ?? value.length
    setCursor(pos)
    return pos
  }

  const applyCursor = (_text: string, pos: number) => {
    requestAnimationFrame(() => {
      const el = innerRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(pos, pos)
      setCursor(pos)
    })
  }

  const closePanel = useCallback(() => {
    setGuideHeld(false)
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
    const q = (mode === 'guide' ? '' : ctx.query).trim().toLowerCase()
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
      mk({ type: 'office', key: c, label: c }, {}),
    )
    const capItems = CAPABILITIES_SHOWCASE.filter((c) => match(c.name, c.desc)).map((c) =>
      mk({ type: 'capability', key: c.id, label: c.name }, { hint: c.desc, iconKey: c.iconKey, color: c.color }),
    )
    const moduleItems = MODULES.flatMap((group) =>
      group.items
        .filter((m) => match(m.name, group.cat))
        .map((m) => mk({ type: 'module', key: m.key, label: m.name }, { hint: group.cat })),
    )
    const scenarioItems = scenarios
      .filter((s) => match(s.name, s.category))
      .slice(0, 32)
      .map((s) => mk({ type: 'scenario', key: s.id, label: s.name }, { hint: s.category }))

    const out: PanelSection[] = []
    if (actionItems.length) out.push({ id: 'actions', title: '快捷指令', items: actionItems })
    if (industryItems.length) out.push({ id: 'industries', title: '行业视角', items: industryItems.slice(0, 8) })
    if (officeItems.length) out.push({ id: 'office', title: '办公分类', items: officeItems })
    if (capItems.length) out.push({ id: 'capabilities', title: '平台能力', items: capItems.slice(0, 6) })
    if (moduleItems.length) out.push({ id: 'modules', title: '功能模块', items: moduleItems.slice(0, 8) })
    if (scenarioItems.length) out.push({ id: 'scenarios', title: '业务场景', items: scenarioItems })
    return out
  }, [ctx.query, mode, scenarios, modules])

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const panelHint = resolvePanelHint(mode, ctx, flatItems.length, composing)

  const insertPick = (item: PanelItem) => {
    const el = innerRef.current
    const pos = el?.selectionStart ?? value.length
    const triggerAt = mode === 'guide' ? 0 : ctx.triggerAt
    const start = triggerAt >= 0 ? triggerAt : pos - 1
    const end = mode === 'guide' ? value.length : pos

    pickedRef.current = true
    onPick?.(item.pick, { iconKey: item.iconKey, color: item.color })
    const { text, cursor: nextPos } = completeCommand(value, start, end)
    onChange(text)
    applyCursor(text, nextPos)
    closePanel()
  }

  const handleFocus = () => {
    setFocused(true)
    onFocus?.()
    if (!value.trim()) {
      onChange(DEFAULT_GUIDE_TEXT)
      setGuideHeld(true)
      applyCursor(DEFAULT_GUIDE_TEXT, 1)
      return
    }
    syncCursor()
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

  const handleChange = (text: string) => {
    onChange(text)
    if (composingRef.current) return
    const pos = innerRef.current?.selectionStart ?? text.length
    setCursor(pos)
    if (text !== DEFAULT_GUIDE_TEXT) setGuideHeld(false)
    updateTriggerIndex(resolveInputState(text, pos, true, guideHeld && text === DEFAULT_GUIDE_TEXT, false).ctx)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget

    if (e.key === 'Escape') {
      if (!panelOpen) return
      e.preventDefault()
      const triggerAt = mode === 'guide' ? 0 : ctx.triggerAt
      if (triggerAt >= 0) {
        const pos = el.selectionStart
        const end = mode === 'guide' ? value.length : pos
        const { text, cursor: nextPos } = cancelTrigger(value, triggerAt, end)
        onChange(text)
        applyCursor(text, nextPos)
      } else {
        onChange('')
      }
      closePanel()
      return
    }

    if (!panelOpen) return
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
    if (!panelOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) closePanel()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [panelOpen, closePanel])

  useEffect(() => {
    if (!panelOpen || !panelRef.current) return
    panelRef.current.querySelector('.agent-module-item.active')?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, panelOpen])

  useEffect(() => {
    if (panelOpen && activeIdx >= flatItems.length) setActiveIdx(Math.max(0, flatItems.length - 1))
  }, [flatItems.length, activeIdx, panelOpen])

  let runningIdx = 0
  const showGhost = focused && !value.trim()

  return (
    <div className={`agent-input-wrap${focused ? ' focused' : ''}${panelOpen ? ' panel-open' : ''}`} ref={wrapRef}>
      {modules.length > 0 && (
        <div className="agent-module-chips">
          {modules.map((m) => (
            <span
              key={m.id}
              className="agent-module-chip"
              style={m.color ? { '--chip-color': m.color } as React.CSSProperties : undefined}
            >
              {m.iconKey && m.color && (
                <span className="agent-module-chip-icon">
                  <DynamicIcon name={m.iconKey} size={12} color={m.color} />
                </span>
              )}
              <span>{m.label}</span>
              {onRemoveModule && (
                <button type="button" className="agent-module-chip-x" onClick={() => onRemoveModule(m.id)} aria-label={`移除 ${m.label}`}>×</button>
              )}
            </span>
          ))}
        </div>
      )}
      <div className="agent-input-shell">
        <span className="agent-input-prefix" aria-hidden>&gt;&gt;</span>
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
            aria-expanded={panelOpen}
          />
        </div>
      </div>

      {focused && (
        <div className="agent-input-tip" role="note">
          {mode === 'free' && !panelOpen && (
            <span>自由描述中 · 需要模块时在空格后输入 <code>&gt;</code></span>
          )}
          {mode === 'guide' && (
            <span>已就绪：可直接输入文字，或从下方选择 · 按 Esc 取消引导</span>
          )}
          {mode === 'command' && (
            <span>命令模式：{ctx.query.trim() ? `正在筛选「${ctx.query.trim()}」` : '选择模块插入，已有文字会保留'}</span>
          )}
        </div>
      )}

      {panelOpen && (
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
                <span>继续输入文字，或 Esc 删除 <code>&gt;</code></span>
              </div>
            ) : (
              sections.map((section) => (
                <section key={section.id} className="agent-module-section">
                  <header className="agent-module-section-title">{section.title}</header>
                  {section.items.map((item) => {
                    const idx = runningIdx++
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
                        <span className="agent-module-chevron">&gt;</span>
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
