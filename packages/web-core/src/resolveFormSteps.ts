import type { GtgtStep } from './GtgtStepComposer'

/** 对话改页 / schema 写入的字段描述 */
export type FormFieldDef = {
  key: string
  label: string
  placeholder?: string
  optional?: boolean
  /** text | date | datetime-local | number | textarea | email | tel */
  type?: string
}

export type ResolveFormStepsOptions = {
  /** 能力默认字段；props.form_fields 按 key 覆盖 */
  defaults?: FormFieldDef[]
  /** node.props.form_fields 或等价数组 */
  formFields?: unknown
  /** page_mock.fields（仅含 label 时按 label 对齐） */
  pageMockFields?: unknown
}

function asFieldList(raw: unknown): FormFieldDef[] {
  if (!Array.isArray(raw) || !raw.length) return []
  const out: FormFieldDef[] = []
  raw.forEach((f, i) => {
    if (!f || typeof f !== 'object') return
    const rec = f as Record<string, unknown>
    const label = String(rec.label || '').trim()
    if (!label) return
    const key = String(rec.key || '').trim() || `f_${i}`
    const typeRaw = String(rec.type || '').trim().toLowerCase()
    out.push({
      key,
      label,
      placeholder: String(rec.placeholder || rec.value || ''),
      optional: Boolean(rec.optional),
      type: typeRaw || undefined,
    })
  })
  return out
}

/** 归一化 input type；textarea 仍走 Gtgt 的 inputType=textarea */
export function normalizeInputType(type?: string): string | undefined {
  if (!type) return undefined
  const t = type.trim().toLowerCase()
  if (!t || t === 'text' || t === 'string') return 'text'
  if (t === 'datetime' || t === 'datetime_local') return 'datetime-local'
  if (t === 'int' || t === 'float' || t === 'money' || t === 'currency') return 'number'
  if (t === 'longtext' || t === 'multiline') return 'textarea'
  return t
}

function isSyntheticKey(key: string): boolean {
  return /^f_\d+$/i.test(key)
}

/** 口语 label → 正式 API key（用于 page_mock 的 f_0 对齐 start_at 等） */
const KEY_LABEL_HINTS: Record<string, string[]> = {
  start_at: ['开始', '起始', '起止', '请假日期', '加班日期', '出差日期', '行程日期', '时段'],
  end_at: ['结束', '截止', '止'],
  note: ['事由', '说明', '备注', '用途', '描述', '现象', '故障'],
  title: ['标题', '主题', '活动名称', '事项', '名称'],
  amount: ['金额', '预算', '费用'],
  room_name: ['会议室', '房间'],
  asset_code: ['设备', '产线', '资产编号', '工位'],
  fault: ['故障', '现象', '问题描述'],
  location: ['位置', '地点'],
  candidate: ['候选人', '姓名'],
  role: ['岗位', '职位'],
  join_date: ['入职日期', '入职'],
  seal_type: ['印章'],
  doc_name: ['文件'],
  purpose: ['用途'],
}

function hintsMatchLabel(label: string, key: string): boolean {
  const hints = KEY_LABEL_HINTS[key]
  if (!hints) return false
  return hints.some((h) => label.includes(h))
}

function findOverlay(
  target: FormFieldDef,
  extras: FormFieldDef[],
  used: Set<string>,
): FormFieldDef | undefined {
  return extras.find((e) => {
    if (used.has(e.key)) return false
    if (e.key === target.key) return true
    if (e.label === target.label) return true
    if (e.label.includes(target.label) || target.label.includes(e.label)) return true
    if (hintsMatchLabel(e.label, target.key)) return true
    return false
  })
}

/**
 * 有正式 defaults 时：始终保留 API key（start_at 等），
 * page_mock / form_fields 只覆盖 label/type；禁止 f_0 顶替正式字段导致提交空串。
 */
function mergeOntoDefaults(defaults: FormFieldDef[], extras: FormFieldDef[]): FormFieldDef[] {
  const used = new Set<string>()
  const merged = defaults.map((d) => {
    const hit = findOverlay(d, extras, used)
    if (!hit) return { ...d, type: normalizeInputType(d.type) }
    used.add(hit.key)
    // 合成 label「起止时间」同时匹配 start/end 时：首个未用的吃掉，勿重复
    return {
      ...d,
      label: hit.label || d.label,
      placeholder: hit.placeholder || d.placeholder,
      optional: hit.optional ?? d.optional,
      type: normalizeInputType(hit.type || d.type),
      key: d.key,
    }
  })

  // 仅追加带真 key 的额外字段；丢掉未对齐的 f_*
  for (const e of extras) {
    if (used.has(e.key)) continue
    if (isSyntheticKey(e.key)) continue
    if (defaults.some((d) => d.key === e.key)) continue
    merged.push({ ...e, type: normalizeInputType(e.type) })
  }
  return merged
}

/**
 * 合并 defaults + form_fields + page_mock.fields → GtgtStep[]（含 inputType）。
 * 有 defaults 时强制保留正式 key，避免 mock 的 f_* 导致提交缺字段。
 */
export function resolveFormFieldDefs(opts: ResolveFormStepsOptions): FormFieldDef[] {
  const defaults = opts.defaults?.length ? [...opts.defaults] : []
  const fromProps = asFieldList(opts.formFields)
  const fromMock = asFieldList(opts.pageMockFields)
  const extras = [...fromProps, ...fromMock]

  if (defaults.length) {
    return mergeOntoDefaults(defaults, extras)
  }

  // 无 defaults：尽量把合成 key 按 label 提示归一（仍可能不完美）
  return extras.map((f, i) => {
    let key = f.key
    if (isSyntheticKey(key)) {
      const hit = Object.keys(KEY_LABEL_HINTS).find((k) => hintsMatchLabel(f.label, k))
      if (hit) key = hit
      else key = `f_${i}`
    }
    return { ...f, key, type: normalizeInputType(f.type) }
  })
}

export function resolveFormSteps(opts: ResolveFormStepsOptions): GtgtStep[] {
  return resolveFormFieldDefs(opts).map((f) => ({
    key: f.key,
    label: f.label,
    placeholder: f.placeholder || undefined,
    optional: f.optional,
    inputType: normalizeInputType(f.type) || 'text',
  }))
}
