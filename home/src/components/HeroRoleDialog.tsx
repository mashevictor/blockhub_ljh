import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RolePreset } from '../data/rolePresets'
import { presetRole } from '../data/rolePresets'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { GENERATE_APP_LABEL } from '../data/publishUi'
import { AgentButtonContent } from './AgentChevron'

interface Props {
  role: RolePreset
  onClose: () => void
  onApply: (role: RolePreset, generate?: boolean) => void
}

export default function HeroRoleDialog({ role, onClose, onApply }: Props) {
  const [visibleLines, setVisibleLines] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setVisibleLines(0)
    setShowCursor(true)
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setVisibleLines(i)
      if (i >= role.flowLines.length) {
        window.clearInterval(timer)
        window.setTimeout(() => setShowCursor(false), 600)
      }
    }, 420)
    return () => window.clearInterval(timer)
  }, [role])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ready = visibleLines >= role.flowLines.length

  if (!mounted) return null

  return createPortal(
    <div className="hero-role-overlay" onClick={onClose} role="presentation">
      <div
        className="hero-role-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hero-role-title"
      >
        <button type="button" className="hero-role-close" onClick={onClose} aria-label="关闭">×</button>

        <div className="hero-role-head">
          <span className="hero-role-badge role" style={{ background: role.color }}>{role.role ?? presetRole(role)}</span>
          <span className="hero-role-badge scene">{role.label}</span>
          <h2 id="hero-role-title">{role.hint}</h2>
        </div>

        <div className="hero-role-console">
          <div className="hero-role-cmd-bar">
            <span className="hero-role-cmd-prefix">&gt;&gt;</span>
            <span className="hero-role-cmd-flow" aria-hidden>
              {'>'.repeat(12)}
            </span>
          </div>
          <div className="hero-role-flow">
            {role.flowLines.slice(0, visibleLines).map((line, idx) => (
              <p key={`${role.id}-line-${idx}`} className="hero-role-line" style={{ animationDelay: `${idx * 0.05}s` }}>
                {line}
              </p>
            ))}
            {showCursor && !ready && (
              <span className="hero-role-cursor" aria-hidden>|</span>
            )}
          </div>
        </div>

        <p className="hero-role-prompt-preview">{role.prompt}</p>

        <div className="hero-role-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>再看看</button>
          <button
            type="button"
            className="btn-primary agent-action-btn"
            disabled={!ready}
            onClick={() => onApply(role, true)}
          >
            <AgentButtonContent>{GENERATE_APP_LABEL}</AgentButtonContent>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
