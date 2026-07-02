import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'

export interface ContactInfo {
  type: 'email' | 'phone'
  value: string
}

const EMAIL_SUFFIXES = [
  '@qq.com',
  '@163.com',
  '@126.com',
  '@gmail.com',
  '@outlook.com',
  '@hotmail.com',
  '@sina.com',
  '@139.com',
  '@icloud.com',
  '@company.com',
]

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (contact: ContactInfo) => void
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidPhone(v: string) {
  return /^1[3-9]\d{9}$/.test(v.replace(/\s/g, ''))
}

export default function ContactGateModal({ open, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useBodyScrollLock(open)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    setValue('')
    setActiveIdx(0)
    setMode('email')
    window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const emailSuggestions = useMemo(() => {
    if (mode !== 'email') return []
    const v = value.trim()
    if (!v || v.includes('@')) return []
    return EMAIL_SUFFIXES.map((s) => v + s)
  }, [mode, value])

  const error = useMemo(() => {
    const v = value.trim()
    if (!v) return ''
    if (mode === 'email' && v.includes('@') && !isValidEmail(v)) return '请输入有效邮箱地址'
    if (mode === 'phone' && v.length >= 11 && !isValidPhone(v)) return '请输入 11 位手机号'
    return ''
  }, [mode, value])

  const canSubmit = mode === 'email'
    ? isValidEmail(value.trim())
    : isValidPhone(value.trim())

  const applySuggestion = (s: string) => {
    setValue(s)
    setActiveIdx(0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (emailSuggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % emailSuggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + emailSuggestions.length) % emailSuggestions.length)
    } else if (e.key === 'Enter' && emailSuggestions.length > 0 && !canSubmit) {
      e.preventDefault()
      applySuggestion(emailSuggestions[activeIdx])
    }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div className="modal-overlay contact-gate-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card contact-gate-card" role="dialog" aria-labelledby="contact-gate-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <h3 id="contact-gate-title">留下联系方式</h3>
        <p className="modal-sub">生成完成后，我们将把应用链接发送到您的邮箱或手机</p>

        <div className="contact-gate-tabs">
          <button
            type="button"
            className={mode === 'email' ? 'on' : ''}
            onClick={() => { setMode('email'); setValue(''); setActiveIdx(0) }}
          >
            邮箱
          </button>
          <button
            type="button"
            className={mode === 'phone' ? 'on' : ''}
            onClick={() => { setMode('phone'); setValue(''); setActiveIdx(0) }}
          >
            手机号
          </button>
        </div>

        <div className="contact-gate-field">
          <label htmlFor="contact-gate-input">
            {mode === 'email' ? '电子邮箱' : '手机号码'}
          </label>
          <input
            ref={inputRef}
            id="contact-gate-input"
            type={mode === 'email' ? 'email' : 'tel'}
            inputMode={mode === 'email' ? 'email' : 'numeric'}
            autoComplete={mode === 'email' ? 'email' : 'tel'}
            placeholder={mode === 'email' ? 'name@company.com' : '138 0000 0000'}
            value={value}
            onChange={(e) => { setValue(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
          />
          {error && <span className="contact-gate-error">{error}</span>}
          {mode === 'email' && emailSuggestions.length > 0 && (
            <ul className="contact-gate-suggest" role="listbox">
              {emailSuggestions.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === activeIdx}
                    className={i === activeIdx ? 'on' : ''}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => applySuggestion(s)}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="contact-gate-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>稍后再说</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={() => onConfirm({ type: mode, value: value.trim().replace(/\s/g, '') })}
          >
            确认并生成
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
