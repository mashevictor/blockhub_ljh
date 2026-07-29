export type AgentPick =
  | { type: 'action'; key: string; label: string }
  | { type: 'industry'; key: string; label: string }
  | { type: 'office'; key: string; label: string }
  | { type: 'capability'; key: string; label: string }
  | { type: 'module'; key: string; label: string }
  | { type: 'scenario'; key: string; label: string }
  | { type: 'supplement'; key: string; label: string }

/** 输入框内模块 chip：一次 `>>` 选择对应一条 */
export interface PromptModule {
  id: string
  type: AgentPick['type']
  key: string
  label: string
  iconKey?: string
  color?: string
  /** user = 用户选择；auto = 生成时系统补齐；suggest = AI/关键词推荐 */
  source?: 'user' | 'auto' | 'suggest'
  /** chip 顺序 = 组合优先级 */
  order?: number
}

export function moduleId(pick: Pick<AgentPick, 'type' | 'key'>): string {
  return `${pick.type}:${pick.key}`
}

export function pickToModule(
  pick: AgentPick,
  extra?: { iconKey?: string; color?: string },
): PromptModule {
  return {
    id: moduleId(pick),
    type: pick.type,
    key: pick.key,
    label: pick.label,
    iconKey: extra?.iconKey,
    color: extra?.color,
  }
}

const TOKEN_BOUNDARY = /[\s\n，。、；：！？（）【】「」,;:!?()[\]{}"']/

export interface TriggerContext {
  open: boolean
  triggerAt: number
  query: string
}

export type InputMode = 'idle' | 'guide' | 'command' | 'free'

export interface InputState {
  mode: InputMode
  ctx: TriggerContext
  panelOpen: boolean
}

export const TRIGGER_TOKEN = '>>'

export function findTriggerContext(text: string, cursor: number): TriggerContext {
  const closed = { open: false, triggerAt: -1, query: '' }
  if (cursor < 0) return closed

  const before = text.slice(0, cursor)
  const idx = before.lastIndexOf(TRIGGER_TOKEN)
  if (idx === -1) return closed
  if (idx > 0) {
    const prev = text[idx - 1]
    if (!TOKEN_BOUNDARY.test(prev)) return closed
  }

  const query = text.slice(idx + TRIGGER_TOKEN.length, cursor)
  if (query.includes('\n')) return closed

  return { open: true, triggerAt: idx, query }
}

export function isLoneTrigger(text: string): boolean {
  return text === TRIGGER_TOKEN
}

export function isEmptyOrGuide(text: string): boolean {
  return !text.trim() || text === TRIGGER_TOKEN
}

export function resolveInputState(
  text: string,
  cursor: number,
  focused: boolean,
  guideHeld: boolean,
  composing: boolean,
): InputState {
  const ctx = composing ? { open: false, triggerAt: -1, query: '' } : findTriggerContext(text, cursor)

  if (!focused) return { mode: 'idle', ctx, panelOpen: false }
  if (ctx.open) return { mode: 'command', ctx, panelOpen: true }
  if (guideHeld && isEmptyOrGuide(text)) {
    return { mode: 'guide', ctx: { open: true, triggerAt: 0, query: '' }, panelOpen: true }
  }
  return { mode: 'free', ctx, panelOpen: false }
}

export function normalizeChevronInput(text: string, cursor: number): { text: string; cursor: number } {
  if (!text) return { text, cursor }

  let out = ''
  let newCursor = cursor

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    const prev = out[out.length - 1]

    if (ch === '》' && next === '》') {
      out += TRIGGER_TOKEN
      if (cursor > i + 1) newCursor = out.length
      else if (cursor > i) newCursor = out.length - 1
      i += 1
      continue
    }

    const isChev = ch === '》' || ch === '>'
    if (isChev && next !== '>' && next !== '》' && prev !== '>') {
      const atBoundary = out.length === 0 || TOKEN_BOUNDARY.test(prev)
      if (atBoundary) {
        out += TRIGGER_TOKEN
        if (cursor > i) newCursor += 1
        continue
      }
    }

    out += ch
    if (cursor === i + 1) newCursor = out.length
  }

  return { text: out, cursor: Math.min(Math.max(0, newCursor), out.length) }
}

export function normalizeSpaces(text: string): string {
  return text.replace(/\s{2,}/g, ' ').replace(/^\s+/, '')
}

export function cancelTrigger(text: string, triggerAt: number, cursor: number): { text: string; cursor: number } {
  const before = text.slice(0, triggerAt)
  const after = text.slice(cursor)
  const next = normalizeSpaces(before + after)
  return { text: next, cursor: Math.min(before.length, next.length) }
}

/** 完成一次 `>>` 选择：去掉命令符，模块以 chip 展示 */
export function completeCommand(
  text: string,
  triggerAt: number,
  cursor: number,
): { text: string; cursor: number } {
  return cancelTrigger(text, triggerAt, cursor)
}

export type PanelHint = 'guide' | 'browse' | 'filtering' | 'empty' | 'free' | 'ime'

export function resolvePanelHint(
  mode: InputMode,
  ctx: TriggerContext,
  resultCount: number,
  composing: boolean,
): PanelHint {
  if (composing) return 'ime'
  if (mode === 'guide') return 'guide'
  if (mode === 'free') return 'free'
  if (ctx.query.trim() && resultCount === 0) return 'empty'
  if (ctx.query.trim()) return 'filtering'
  return 'browse'
}

/** @deprecated Prefer `t('home.agent.hint.*')` via PANEL_HINT_KEYS — kept for PanelHint keyof only. */
export const PANEL_HINT_TEXT: Record<PanelHint, string> = {
  guide: '',
  browse: '',
  filtering: '',
  empty: '',
  free: '',
  ime: '',
}

/** @deprecated Prefer `t('home.agent.placeholder')`. */
export const GUIDE_PLACEHOLDER = ''
export const DEFAULT_GUIDE_TEXT = TRIGGER_TOKEN
