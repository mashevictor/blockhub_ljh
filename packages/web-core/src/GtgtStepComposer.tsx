import { useEffect, useRef, useState, type ReactNode } from 'react'

export type GtgtStep = {
  key: string
  label: string
  placeholder?: string
  hint?: string
  optional?: boolean
  /** 自定义输入控件；默认单行 input */
  render?: (ctx: {
    value: string
    setValue: (v: string) => void
    accent: string
  }) => ReactNode
}

type Props = {
  title: string
  meta?: string
  accent?: string
  steps: GtgtStep[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onComplete: () => void | Promise<void>
  busy?: boolean
  submitLabel?: string
  /** 流程提示文案，如「录入 → 推送 → 闭环」 */
  flowHint?: string
  resetKey?: string | number
  children?: ReactNode
}

/**
 * 预约演示同款：单字段 >> 前缀 + Enter 确认推进，最后一步提交。
 * 视觉类名对齐 home BookingFloatingAgent（bh-gtgt / booking-float 双类）。
 */
export function GtgtStepComposer({
  title,
  meta,
  accent = '#4338ca',
  steps,
  values,
  onChange,
  onComplete,
  busy = false,
  submitLabel = '提交',
  flowHint,
  resetKey,
  children,
}: Props) {
  const [step, setStep] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const current = steps[step]
  const isLast = step >= steps.length - 1
  const draft = current ? (values[current.key] ?? '') : ''
  const canGo = !current || current.optional || draft.trim().length > 0

  useEffect(() => {
    setStep(0)
  }, [resetKey])

  useEffect(() => {
    inputRef.current?.focus()
  }, [step, resetKey])

  const advance = async () => {
    if (!current || busy) return
    if (!current.optional && !draft.trim()) return
    if (isLast) {
      await onComplete()
      return
    }
    setStep((s) => s + 1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void advance()
    }
  }

  if (!current) return null

  return (
    <div
      className="widget bh-gtgt-form booking-float-composer"
      style={{ ['--accent' as string]: accent, ['--bh-gtgt-accent' as string]: accent }}
    >
      <div className="bh-flow-head">
        <h3>{title}</h3>
        {meta ? <span className="bh-flow-meta">{meta}</span> : null}
      </div>
      {flowHint ? <p className="muted bh-gtgt-flow">{flowHint}</p> : null}

      <div className="booking-float-status bh-gtgt-progress">
        <span className="booking-float-progress">
          {step + 1}/{steps.length}
        </span>
        <ol className="bh-gtgt-dots" aria-hidden>
          {steps.map((s, i) => (
            <li key={s.key} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} />
          ))}
        </ol>
      </div>

      <div className="booking-float-input-row bh-gtgt-row">
        <span className="booking-float-prefix bh-gtgt-prefix" aria-hidden>
          <span className="bh-gtgt-chev">&gt;&gt;</span> {current.label}
        </span>
        {current.render ? (
          <div className="bh-gtgt-custom">
            {current.render({
              value: draft,
              setValue: (v) => onChange(current.key, v),
              accent,
            })}
          </div>
        ) : (
          <input
            ref={inputRef}
            className="booking-float-input bh-gtgt-input"
            value={draft}
            onChange={(e) => onChange(current.key, e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={current.placeholder || current.hint || `填写${current.label}`}
            disabled={busy}
            aria-label={current.label}
          />
        )}
        <button
          type="button"
          className="btn booking-float-go bh-gtgt-go"
          style={{ background: accent }}
          disabled={busy || !canGo}
          onClick={() => void advance()}
        >
          {busy && isLast ? '提交中…' : isLast ? submitLabel : '确认'}
        </button>
      </div>

      {current.hint && !current.render ? <p className="bh-gtgt-hint muted">{current.hint}</p> : null}
      <div className="bh-gtgt-actions">
        {current.optional && (
          <button type="button" className="btn btn-ghost booking-float-skip" disabled={busy} onClick={() => void advance()}>
            跳过
          </button>
        )}
        {step > 0 && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStep((s) => s - 1)}>
            上一步
          </button>
        )}
      </div>

      {children}
    </div>
  )
}
