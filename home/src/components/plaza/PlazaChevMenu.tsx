import { useEffect, useRef } from 'react'

export interface PlazaChevAction {
  id: string
  label: string
  onClick: () => void
  disabled?: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  actions: PlazaChevAction[]
  anchorClassName?: string
}

export default function PlazaChevMenu({ open, onClose, actions, anchorClassName }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (menuRef.current?.contains(t)) return
      if (t instanceof Element && t.closest(anchorClassName ?? '.plaza-dock-chev-btn')) return
      onClose()
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, onClose, anchorClassName])

  if (!open) return null

  return (
    <div className="plaza-dock-chev-menu" ref={menuRef} role="menu">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          role="menuitem"
          className="plaza-dock-chev-menu-item"
          disabled={a.disabled}
          onClick={() => {
            a.onClick()
            onClose()
          }}
        >
          <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
          {a.label}
        </button>
      ))}
    </div>
  )
}
