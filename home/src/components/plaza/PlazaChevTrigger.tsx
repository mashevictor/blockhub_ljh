import { useState } from 'react'
import type { PlazaChevAction } from './PlazaChevMenu'
import PlazaChevMenu from './PlazaChevMenu'

export default function PlazaChevTrigger({ actions, className }: { actions: PlazaChevAction[]; className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`plaza-dock-chev-wrap${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="plaza-dock-chev-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        title=">> 操作"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
      </button>
      <PlazaChevMenu open={open} onClose={() => setOpen(false)} actions={actions} />
    </div>
  )
}
