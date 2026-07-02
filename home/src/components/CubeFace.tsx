import type { CSSProperties, ReactNode } from 'react'

export const CUBE_PALETTE = [
  '#ffffff', '#fbbf24', '#f97316', '#db2777', '#9333ea', '#06b6d4', '#3b82f6', '#22c55e', '#1e1b4b',
]

const SIZE_PX = { sm: 64, md: 112, lg: 128 } as const

export type CubeFaceSize = keyof typeof SIZE_PX

export function cubeSeedFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function cubeShortLabel(name: string, max = 5): string {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

export interface CubeFaceProps {
  label?: string
  accent: string
  center?: ReactNode
  seed?: number
  size?: CubeFaceSize
  className?: string
}

export default function CubeFace({
  label,
  accent,
  center,
  seed = 0,
  size = 'md',
  className = '',
}: CubeFaceProps) {
  const px = SIZE_PX[size]
  return (
    <div
      className={`cube-face cube-face-${size}${className ? ` ${className}` : ''}`}
      style={{ '--cube-size': `${px}px` } as CSSProperties}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const bg = i === 4 ? accent : CUBE_PALETTE[(seed + i) % CUBE_PALETTE.length]
        const light = bg === '#ffffff'
        return (
          <span
            key={i}
            className={`cube-face-cell${i === 4 ? ' center' : ''}`}
            style={{
              background: bg,
              color: light && i !== 4 ? '#111' : '#fff',
            }}
          >
            {i === 4 && (center ?? (label ? <em>{label}</em> : null))}
          </span>
        )
      })}
    </div>
  )
}
