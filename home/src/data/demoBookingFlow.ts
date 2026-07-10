import type { AgentContextKey } from './agentContext'

export type BookingFieldKey = 'contact' | 'salutation' | 'company'

export interface BookingFieldDef {
  key: BookingFieldKey
  label: string
  hint: string
  prompt: string
  doneHint: string
  contextKey: AgentContextKey
  chevLabel: string
  placeholder: string
  ghost: string
  required: boolean
}

export const BOOKING_FIELDS: BookingFieldDef[] = [
  {
    key: 'contact',
    label: '邮箱或电话',
    hint: '邮箱地址或手机号',
    prompt: '邮箱或电话',
    doneHint: '',
    contextKey: 'booking_contact',
    chevLabel: '联系',
    placeholder: '邮箱或手机号',
    ghost: '',
    required: true,
  },
  {
    key: 'salutation',
    label: '称呼',
    hint: '如：张先生、李经理',
    prompt: '称呼（选填）',
    doneHint: '',
    contextKey: 'booking_salutation',
    chevLabel: '称呼',
    placeholder: '张先生、李经理',
    ghost: '可跳过',
    required: false,
  },
  {
    key: 'company',
    label: '公司名称',
    hint: '公司 / 组织全称',
    prompt: '公司名称（选填）',
    doneHint: '',
    contextKey: 'booking_company',
    chevLabel: '公司',
    placeholder: '公司全称',
    ghost: '填写后自动提交',
    required: false,
  },
]

export const BOOKING_REVIEW_CONTEXT: AgentContextKey = 'booking_review'

export function bookingContextForStep(stepIdx: number): AgentContextKey {
  if (stepIdx >= BOOKING_FIELDS.length) return BOOKING_REVIEW_CONTEXT
  return BOOKING_FIELDS[stepIdx].contextKey
}

export function filledBookingCount(values: Partial<Record<BookingFieldKey, string>>): number {
  return BOOKING_FIELDS.filter((f) => values[f.key]?.trim()).length
}

export function isEmailOk(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

export function isPhoneOk(v: string): boolean {
  return v.replace(/\D/g, '').length >= 7
}

export function isContactOk(v: string): boolean {
  const s = v.trim()
  if (!s) return false
  if (s.includes('@')) return isEmailOk(s)
  return isPhoneOk(s)
}

export function hasValidContact(values: Partial<Record<BookingFieldKey, string>>): boolean {
  return isContactOk(values.contact ?? '')
}

export function missingRequiredFields(values: Partial<Record<BookingFieldKey, string>>): BookingFieldDef[] {
  if (!hasValidContact(values)) return [BOOKING_FIELDS[0]]
  return []
}

export function parseBookingInput(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('>>')) s = s.slice(2).trim()
  const prefixes = [
    '邮箱或电话', '邮箱', '电话', '联系电话', '称呼', '公司名称', '企业名称', '公司',
    ...BOOKING_FIELDS.map((f) => f.label),
  ]
  for (const p of prefixes) {
    if (s.startsWith(p)) {
      s = s.slice(p.length).replace(/^[：:\s,，]+/, '').trim()
      break
    }
  }
  return s
}

export function validateBookingField(
  field: BookingFieldDef,
  raw: string,
): string | null {
  const v = raw.trim()
  if (field.key === 'contact') {
    if (!v) return '请填写邮箱或电话'
    if (v.includes('@') && !isEmailOk(v)) return '邮箱格式不正确'
    if (!v.includes('@') && !isPhoneOk(v)) return '电话格式不正确'
    return null
  }
  if (field.required && !v) return `请先填写${field.label}`
  return null
}
