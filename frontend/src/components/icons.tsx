import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const s = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function IconHome({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

export function IconBot({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
    </svg>
  )
}

export function IconList({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M11 12H3M16 6H3M16 18H3M21 12h-6M21 6h-6M21 18h-6" />
    </svg>
  )
}

export function IconSparkles({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4M22 5h-4" />
    </svg>
  )
}

export function IconMessage({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function IconBook({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

export function IconCheckCircle({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  )
}

export function IconBarChart({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  )
}

export function IconBell({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

export function IconLayers({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  )
}

export function IconGrid({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  )
}

export function IconUsers({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

export function IconAppWindow({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4M2 8h20M6 4v4" />
    </svg>
  )
}

export function IconActivity({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

export function IconInbox({ size = 18, ...p }: P) {
  const a = s(size)
  return (
    <svg {...a} {...p}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  )
}
