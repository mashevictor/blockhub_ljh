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

/**
 * 合并 defaults + form_fields + page_mock.fields → GtgtStep[]（含 inputType）。
 * props 同 key 覆盖默认；page_mock 仅补 type/label/placeholder。
 */
export function resolveFormFieldDefs(opts: ResolveFormStepsOptions): FormFieldDef[] {
  const defaults = opts.defaults?.length ? [...opts.defaults] : []
  const fromProps = asFieldList(opts.formFields)
  const fromMock = asFieldList(opts.pageMockFields)

  let merged: FormFieldDef[]
  if (fromProps.length) {
    const byKey = new Map(defaults.map((d) => [d.key, { ...d }]))
    for (const f of fromProps) {
      const prev = byKey.get(f.key)
      byKey.set(f.key, {
        ...(prev || {}),
        ...f,
        type: normalizeInputType(f.type || prev?.type),
      })
    }
    // 保持 props 顺序；未出现在 props 的 defaults 追加在前（若 props 是全量覆盖则只用 props）
    if (fromProps.length >= defaults.length || defaults.length === 0) {
      merged = fromProps.map((f) => {
        const prev = byKey.get(f.key)
        return {
          ...f,
          type: normalizeInputType(f.type || prev?.type),
          placeholder: f.placeholder || prev?.placeholder,
          optional: f.optional ?? prev?.optional,
        }
      })
    } else {
      const propKeys = new Set(fromProps.map((f) => f.key))
      merged = [
        ...defaults
          .filter((d) => !propKeys.has(d.key))
          .map((d) => ({ ...d, type: normalizeInputType(d.type) })),
        ...fromProps.map((f) => {
          const prev = byKey.get(f.key)
          return {
            ...(prev || {}),
            ...f,
            type: normalizeInputType(f.type || prev?.type),
          }
        }),
      ]
    }
  } else {
    merged = defaults.map((d) => ({ ...d, type: normalizeInputType(d.type) }))
  }

  if (fromMock.length && merged.length) {
    merged = merged.map((f) => {
      const hit = fromMock.find(
        (m) =>
          m.key === f.key ||
          m.label === f.label ||
          m.label.includes(f.label) ||
          f.label.includes(m.label),
      )
      if (!hit) return f
      return {
        ...f,
        label: hit.label || f.label,
        type: normalizeInputType(hit.type || f.type),
        placeholder: hit.placeholder || f.placeholder,
        optional: hit.optional ?? f.optional,
      }
    })
  }

  return merged
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
