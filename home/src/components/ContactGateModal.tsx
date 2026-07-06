import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { contactsForMode, saveContactHistory } from '../auth/contactHistory'
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
  busy?: boolean
  onClose: () => void
  onConfirm: (contact: ContactInfo) => void
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isValidPhone(v: string) {
  return /^1[3-9]\d{9}$/.test(v.replace(/\s/g, ''))
}

export default function ContactGateModal({ open, busy = false, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  const [value, setValue] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useBodyScrollLock(open)

  const historyItems = useMemo(() => contactsForMode(mode), [mode, open])

  useEffect(() => {
    if (!open) return
    setActiveIdx(0)
    setHistoryOpen(false)
    const saved = contactsForMode('email')
    if (saved.length > 0) {
      setMode('email')
      setValue(saved[0].value)
    } else {
      setMode('email')
      setValue('')
    }
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open || busy) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  const emailSuggestions = useMemo(() => {
    if (mode !== 'email') return []
    const v = value.trim()
    if (!v || v.includes('@')) return []
    return EMAIL_SUFFIXES.map((s) => v + s)
  }, [mode, value])

  const dropdownItems = useMemo(() => {
    if (emailSuggestions.length > 0) return emailSuggestions
    if (historyOpen && historyItems.length > 0) return historyItems.map((item) => item.value)
    return []
  }, [emailSuggestions, historyOpen, historyItems])

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
    setHistoryOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (dropdownItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => (i + 1) % dropdownItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => (i - 1 + dropdownItems.length) % dropdownItems.length)
    } else if (e.key === 'Enter' && dropdownItems.length > 0 && !canSubmit) {
      e.preventDefault()
      applySuggestion(dropdownItems[activeIdx])
    }
  }

  const handleConfirm = () => {
    if (busy || !canSubmit) return
    const contact = { type: mode, value: value.trim().replace(/\s/g, '') }
    saveContactHistory(contact)
    onConfirm(contact)
  }

  if (!open) return null

  return createPortal(
    <div
      className={`modal-overlay contact-gate-overlay${busy ? ' contact-gate-busy' : ''}`}
      onClick={(e) => !busy && e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card contact-gate-card" role="dialog" aria-labelledby="contact-gate-title" aria-busy={busy}>
        <button type="button" className="modal-close" onClick={onClose} disabled={busy} aria-label="关闭">×</button>
        <h3 id="contact-gate-title">留下联系方式</h3>
        <p className="modal-sub">生成完成后，我们将把应用链接发送到您的邮箱或手机</p>

        {busy && (
          <div className="contact-gate-progress" role="status" aria-live="polite">
            <div className="contact-gate-progress-bar" aria-hidden />
            <p>正在生成应用，请稍候…</p>
          </div>
        )}

        <div className="contact-gate-tabs">
          <button
            type="button"
            className={mode === 'email' ? 'on' : ''}
            disabled={busy}
            onClick={() => {
              setMode('email')
              const saved = contactsForMode('email')
              setValue(saved[0]?.value ?? '')
              setActiveIdx(0)
            }}
          >
            邮箱
          </button>
          <button
            type="button"
            className={mode === 'phone' ? 'on' : ''}
            disabled={busy}
            onClick={() => {
              setMode('phone')
              const saved = contactsForMode('phone')
              setValue(saved[0]?.value ?? '')
              setActiveIdx(0)
            }}
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
            disabled={busy}
            onChange={(e) => { setValue(e.target.value); setActiveIdx(0) }}
            onFocus={() => {
              if (emailSuggestions.length === 0 && historyItems.length > 0) setHistoryOpen(true)
            }}
            onKeyDown={handleKeyDown}
          />
          {historyItems.length > 0 && (
            <button
              type="button"
              className="contact-history-toggle"
              disabled={busy}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              历史记录 ({historyItems.length})
            </button>
          )}
          {error && <span className="contact-gate-error">{error}</span>}
          {dropdownItems.length > 0 && !busy && (
            <ul className="contact-gate-suggest" role="listbox">
              {dropdownItems.map((s, i) => (
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
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>稍后再说</button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit || busy}
            onClick={handleConfirm}
          >
            {busy ? '生成中…' : '确认并生成'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
