/**
 * Path B 通用交互壳：Agent 输出声明式 interactive schema，Runtime 解释执行。
 * 禁止为每个业务需求单独写死 React 组件；新需求应泛化为 schema（或扩展安全 op 白名单）。
 */

import { useState, type CSSProperties } from 'react'

export type InteractiveOp =
  | { op: 'append_digit'; value: string }
  | { op: 'append_dot' }
  | { op: 'set_value'; value: string }
  | { op: 'clear' }
  | { op: 'clear_all' }
  | { op: 'push_binop'; value: '+' | '-' | '*' | '/' }
  | { op: 'evaluate' }
  | { op: 'add'; value: number }
  | { op: 'random_int'; min: number; max: number }
  | {
      op: 'unary'
      fn:
        | 'neg'
        | 'percent'
        | 'sqrt'
        | 'square'
        | 'inv'
        | 'sin_deg'
        | 'cos_deg'
        | 'tan_deg'
        | 'log10'
        | 'ln'
        | 'const_pi'
        | 'const_e'
    }

export type InteractiveButton = {
  label: string
  style?: 'digit' | 'op' | 'fn' | 'accent'
  ops: InteractiveOp[]
}

export type InteractiveSchema = {
  /** tool_pad = 显示屏 + 按键网格（计算器/计数器/小工具） */
  type: 'tool_pad'
  theme?: 'phone_dark' | 'light'
  columns?: number
  hint?: string
  buttons: InteractiveButton[]
}

type PadState = { main: string; expr: string; error: string }

function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return 'Error'
  return String(Number(n.toPrecision(12)))
}

function applyOps(state: PadState, ops: InteractiveOp[]): PadState {
  let { main, expr, error } = state
  for (const step of ops) {
    error = ''
    if (step.op === 'append_digit') {
      main = main === '0' ? step.value : `${main}${step.value}`
      continue
    }
    if (step.op === 'append_dot') {
      if (!main.includes('.')) main = `${main}.`
      continue
    }
    if (step.op === 'set_value') {
      main = step.value
      continue
    }
    if (step.op === 'clear') {
      main = '0'
      continue
    }
    if (step.op === 'clear_all') {
      main = '0'
      expr = ''
      continue
    }
    if (step.op === 'push_binop') {
      const sym = step.value === '*' ? '×' : step.value === '/' ? '÷' : step.value
      expr = `${main} ${sym} `
      main = '0'
      continue
    }
    if (step.op === 'evaluate') {
      const raw = `${expr}${main}`.replace(/×/g, '*').replace(/÷/g, '/')
      if (!/^[\d.\s+\-*/()]+$/.test(raw)) {
        error = '无效'
        continue
      }
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${raw})`)() as number
        if (!Number.isFinite(result)) throw new Error('nan')
        expr = ''
        main = fmtNum(result)
      } catch {
        error = '错误'
      }
      continue
    }
    if (step.op === 'add') {
      const n = Number(main)
      const next = (Number.isFinite(n) ? n : 0) + Number(step.value || 0)
      main = fmtNum(next)
      continue
    }
    if (step.op === 'random_int') {
      const lo = Math.min(step.min, step.max)
      const hi = Math.max(step.min, step.max)
      const n = lo + Math.floor(Math.random() * (hi - lo + 1))
      main = String(n)
      expr = ''
      continue
    }
    if (step.op === 'unary') {
      const n = Number(main)
      if (step.fn === 'const_pi') {
        main = fmtNum(Math.PI)
        continue
      }
      if (step.fn === 'const_e') {
        main = fmtNum(Math.E)
        continue
      }
      if (!Number.isFinite(n) && step.fn !== 'neg') {
        error = '无效'
        continue
      }
      let next = n
      try {
        switch (step.fn) {
          case 'neg':
            next = -n
            break
          case 'percent':
            next = n / 100
            break
          case 'sqrt':
            next = Math.sqrt(n)
            break
          case 'square':
            next = n * n
            break
          case 'inv':
            next = 1 / n
            break
          case 'sin_deg':
            next = Math.sin((n * Math.PI) / 180)
            break
          case 'cos_deg':
            next = Math.cos((n * Math.PI) / 180)
            break
          case 'tan_deg':
            next = Math.tan((n * Math.PI) / 180)
            break
          case 'log10':
            next = Math.log10(n)
            break
          case 'ln':
            next = Math.log(n)
            break
          default:
            break
        }
        if (!Number.isFinite(next)) throw new Error('overflow')
        main = fmtNum(next)
      } catch {
        error = '错误'
      }
    }
  }
  return { main, expr, error }
}

function btnTone(style: InteractiveButton['style'], theme: string): CSSProperties {
  const dark = theme !== 'light'
  if (style === 'accent' || style === 'op') {
    return { background: '#ff9f0a', color: '#fff', fontWeight: 700 }
  }
  if (style === 'fn') {
    return {
      background: dark ? '#505050' : '#d1d5db',
      color: dark ? '#f5f5f7' : '#111',
      fontWeight: 700,
      fontSize: 13,
    }
  }
  return {
    background: dark ? '#333' : '#f3f4f6',
    color: dark ? '#f5f5f7' : '#111',
    fontWeight: 700,
    fontSize: 18,
  }
}

/** 从用户意图泛化出 interactive schema（模板库，不是按需求写死组件） */
export function interactiveSchemaFromIntent(blob: string): InteractiveSchema | null {
  const t = blob || ''
  if (/计算器|科学计算|calculator|scientific/i.test(t)) {
    return SCIENTIFIC_CALC_SCHEMA
  }
  if (/计数器|counter|打卡次数|点数器/i.test(t)) {
    return COUNTER_SCHEMA
  }
  if (/骰子|随机数|dice|抽签/i.test(t)) {
    return DICE_SCHEMA
  }
  // AI 把按键拆成列表时的兜底信号
  if (/数字按钮|运算符/.test(t) && /(sin|cos|tan|log)/i.test(t)) {
    return SCIENTIFIC_CALC_SCHEMA
  }
  return null
}

export function parseInteractiveSchema(raw: unknown): InteractiveSchema | null {
  if (!raw || typeof raw !== 'object') return null
  const rec = raw as Record<string, unknown>
  if (String(rec.type || '') !== 'tool_pad') return null
  const buttonsRaw = rec.buttons
  if (!Array.isArray(buttonsRaw) || !buttonsRaw.length) return null
  const buttons: InteractiveButton[] = []
  for (const b of buttonsRaw.slice(0, 48)) {
    if (!b || typeof b !== 'object') continue
    const br = b as Record<string, unknown>
    const label = String(br.label || '').trim()
    if (!label) continue
    const opsIn = Array.isArray(br.ops) ? br.ops : []
    const ops: InteractiveOp[] = []
    for (const o of opsIn.slice(0, 6)) {
      if (!o || typeof o !== 'object') continue
      const or = o as Record<string, unknown>
      const kind = String(or.op || '')
      if (kind === 'append_digit') ops.push({ op: 'append_digit', value: String(or.value || '0').slice(0, 1) })
      else if (kind === 'append_dot') ops.push({ op: 'append_dot' })
      else if (kind === 'set_value') ops.push({ op: 'set_value', value: String(or.value || '0').slice(0, 32) })
      else if (kind === 'clear') ops.push({ op: 'clear' })
      else if (kind === 'clear_all') ops.push({ op: 'clear_all' })
      else if (kind === 'push_binop') {
        const v = String(or.value || '+')
        if (v === '+' || v === '-' || v === '*' || v === '/') ops.push({ op: 'push_binop', value: v })
      }       else if (kind === 'evaluate') ops.push({ op: 'evaluate' })
      else if (kind === 'add') ops.push({ op: 'add', value: Number(or.value) || 0 })
      else if (kind === 'random_int') {
        ops.push({
          op: 'random_int',
          min: Number(or.min) || 1,
          max: Number(or.max) || 6,
        })
      } else if (kind === 'unary') {
        const fn = String(or.fn || '')
        const allowed = [
          'neg',
          'percent',
          'sqrt',
          'square',
          'inv',
          'sin_deg',
          'cos_deg',
          'tan_deg',
          'log10',
          'ln',
          'const_pi',
          'const_e',
        ] as const
        if ((allowed as readonly string[]).includes(fn)) {
          ops.push({ op: 'unary', fn: fn as (typeof allowed)[number] })
        }
      }
    }
    if (!ops.length) continue
    const style = String(br.style || 'digit')
    buttons.push({
      label: label.slice(0, 8),
      style: style === 'op' || style === 'fn' || style === 'accent' || style === 'digit' ? style : 'digit',
      ops,
    })
  }
  if (!buttons.length) return null
  const cols = Number(rec.columns || 4)
  return {
    type: 'tool_pad',
    theme: String(rec.theme || '') === 'light' ? 'light' : 'phone_dark',
    columns: Number.isFinite(cols) ? Math.min(8, Math.max(3, cols)) : 4,
    hint: String(rec.hint || '').slice(0, 120) || undefined,
    buttons,
  }
}

export function InteractiveToolPad({
  schema,
  title,
  summary,
}: {
  schema: InteractiveSchema
  title: string
  summary?: string
}) {
  const [state, setState] = useState<PadState>({ main: '0', expr: '', error: '' })
  const theme = schema.theme || 'phone_dark'
  const dark = theme !== 'light'
  const cols = schema.columns || 4

  return (
    <article className="generated-page interactive-tool" data-source="generated">
      <header>
        <p className="generated-badge">Agent 泛化交互 · tool_pad</p>
        <h2>{title}</h2>
        {summary ? <p className="generated-summary">{summary}</p> : null}
        {schema.hint ? (
          <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
            {schema.hint}
          </p>
        ) : null}
      </header>
      <div
        className="sci-calc-shell"
        role="application"
        aria-label={title}
        style={dark ? undefined : { background: '#e5e7eb' }}
      >
        <div className="sci-calc-display" style={dark ? undefined : { background: '#fff', border: '1px solid #cbd5e1' }}>
          <div className="sci-calc-expr" style={dark ? undefined : { color: '#64748b' }}>
            {state.expr || ' '}
          </div>
          <div className="sci-calc-value" style={dark ? undefined : { color: '#0f172a' }}>
            {state.error || state.main}
          </div>
        </div>
        <div
          className="sci-calc-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {schema.buttons.map((b, i) => (
            <button
              key={`${b.label}-${i}`}
              type="button"
              style={{
                border: 'none',
                borderRadius: 999,
                minHeight: 48,
                cursor: 'pointer',
                ...btnTone(b.style, theme),
              }}
              onClick={() => setState((s) => applyOps(s, b.ops))}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}

const d = (v: string): InteractiveButton => ({
  label: v,
  style: 'digit',
  ops: [{ op: 'append_digit', value: v }],
})
const op = (label: string, value: '+' | '-' | '*' | '/'): InteractiveButton => ({
  label,
  style: 'op',
  ops: [{ op: 'push_binop', value }],
})
const fn = (
  label: string,
  name:
    | 'neg'
    | 'percent'
    | 'sqrt'
    | 'square'
    | 'inv'
    | 'sin_deg'
    | 'cos_deg'
    | 'tan_deg'
    | 'log10'
    | 'ln'
    | 'const_pi'
    | 'const_e',
): InteractiveButton => ({
  label,
  style: 'fn',
  ops: [{ op: 'unary', fn: name }],
})

/** 意图模板：科学计算器（数据，非独立组件） */
export const SCIENTIFIC_CALC_SCHEMA: InteractiveSchema = {
  type: 'tool_pad',
  theme: 'phone_dark',
  columns: 5,
  hint: '按键运算（三角函数为角度制）· 由 interactive schema 驱动',
  buttons: [
    fn('sin', 'sin_deg'),
    fn('cos', 'cos_deg'),
    fn('tan', 'tan_deg'),
    fn('log', 'log10'),
    fn('ln', 'ln'),
    { label: 'AC', style: 'fn', ops: [{ op: 'clear_all' }] },
    { label: 'C', style: 'fn', ops: [{ op: 'clear' }] },
    fn('±', 'neg'),
    fn('%', 'percent'),
    op('÷', '/'),
    d('7'),
    d('8'),
    d('9'),
    op('×', '*'),
    fn('x²', 'square'),
    d('4'),
    d('5'),
    d('6'),
    op('-', '-'),
    fn('1/x', 'inv'),
    d('1'),
    d('2'),
    d('3'),
    op('+', '+'),
    fn('π', 'const_pi'),
    d('0'),
    { label: '.', style: 'digit', ops: [{ op: 'append_dot' }] },
    { label: '=', style: 'accent', ops: [{ op: 'evaluate' }] },
    fn('e', 'const_e'),
    fn('√', 'sqrt'),
  ],
}

export const COUNTER_SCHEMA: InteractiveSchema = {
  type: 'tool_pad',
  theme: 'light',
  columns: 3,
  hint: '计数器 · 由 interactive schema 驱动（非写死组件）',
  buttons: [
    { label: '+1', style: 'accent', ops: [{ op: 'add', value: 1 }] },
    { label: '+5', style: 'op', ops: [{ op: 'add', value: 5 }] },
    { label: '-1', style: 'fn', ops: [{ op: 'add', value: -1 }] },
    { label: '归零', style: 'fn', ops: [{ op: 'clear_all' }] },
  ],
}

export const DICE_SCHEMA: InteractiveSchema = {
  type: 'tool_pad',
  theme: 'light',
  columns: 2,
  hint: '随机数 · 由 interactive schema 驱动（非写死组件）',
  buttons: [
    { label: '掷骰子', style: 'accent', ops: [{ op: 'random_int', min: 1, max: 6 }] },
    { label: '重置', style: 'fn', ops: [{ op: 'clear_all' }] },
  ],
}
