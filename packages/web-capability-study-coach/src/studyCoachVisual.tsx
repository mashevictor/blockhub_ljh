/** 课本学习 · 视觉规范（色板 / 字阶 / 语义图标） */
import type { CSSProperties, ReactNode } from 'react'

/** 与 Runtime accent 混用；未传入时用教育青绿主色（非紫） */
export const SC_FALLBACK_BRAND = '#0f766e'

export const SC = {
  ink: '#0f172a',
  ink2: '#1e293b',
  body: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e2e8f0',
  lineStrong: '#cbd5e1',
  surface: '#ffffff',
  canvas: '#f1f5f9',
  soft: '#f0fdfa',
  ok: '#15803d',
  okSoft: '#dcfce7',
  bad: '#be123c',
  badSoft: '#ffe4e6',
  warn: '#b45309',
  warnSoft: '#fef3c7',
  sheetRule: '#fda4af',
  font: '"Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  /** 模板语义色：可辨识，但同属冷/暖克制色阶 */
  tone: {
    dictation: '#0f766e',
    word_cards: '#0369a1',
    math_drill: '#a16207',
    wrongbook: '#be123c',
    read_aloud: '#047857',
  },
} as const

export type ScTemplateKey = keyof typeof SC.tone
export type ScIconName =
  | 'dictation'
  | 'word_cards'
  | 'math_drill'
  | 'wrongbook'
  | 'read_aloud'
  | 'flowBook'
  | 'flowTonight'
  | 'flowPreview'
  | 'flowPractice'
  | 'brandMark'
  | 'check'
  | 'x'

export const SC_TEMPLATES: {
  key: ScTemplateKey
  label: string
  tip: string
  meaning: string
}[] = [
  { key: 'dictation', label: '本课听写单', tip: '生字词默写', meaning: '听读 + 纸面默写' },
  { key: 'word_cards', label: '本课单词卡', tip: '正反面翻卡', meaning: '英文正面 / 释义背面' },
  { key: 'math_drill', label: '本课口算/巩固', tip: '10 道短练', meaning: '限时口算题单' },
  { key: 'wrongbook', label: '错题巩固', tip: '错词同型再练', meaning: '从错题本抽题' },
  { key: 'read_aloud', label: '本课朗读清单', tip: '按步骤朗读', meaning: '出声读 + 勾选' },
]

export function scVars(brand: string): CSSProperties {
  const b = brand || SC_FALLBACK_BRAND
  return {
    ['--sc-brand' as string]: b,
    ['--sc-brand-soft' as string]: `color-mix(in srgb, ${b} 14%, #fff)`,
    ['--sc-brand-mid' as string]: `color-mix(in srgb, ${b} 55%, #0ea5e9)`,
    ['--sc-ink' as string]: SC.ink,
    ['--sc-ink-2' as string]: SC.ink2,
    ['--sc-body' as string]: SC.body,
    ['--sc-muted' as string]: SC.muted,
    ['--sc-faint' as string]: SC.faint,
    ['--sc-line' as string]: SC.line,
    ['--sc-surface' as string]: SC.surface,
    ['--sc-ok' as string]: SC.ok,
    ['--sc-bad' as string]: SC.bad,
    ['--sc-warn' as string]: SC.warn,
    fontFamily: SC.font,
    color: SC.ink,
  }
}

/** 字阶：标题 / 副标 / 正文 / 辅助 / 标签 */
export const scType = {
  display: { fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, color: SC.ink } as CSSProperties,
  title: { fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.35, color: SC.ink } as CSSProperties,
  subtitle: { fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: SC.body } as CSSProperties,
  body: { fontSize: 13, fontWeight: 500, lineHeight: 1.55, color: SC.body } as CSSProperties,
  caption: { fontSize: 12, fontWeight: 500, lineHeight: 1.45, color: SC.muted } as CSSProperties,
  overline: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    lineHeight: 1.2,
    color: SC.muted,
    textTransform: 'uppercase' as const,
  } as CSSProperties,
  label: { fontSize: 11, fontWeight: 800, lineHeight: 1.2, color: SC.ink } as CSSProperties,
}

/**
 * 语义图标：双色填充 + 场景符号，避免「万能细线」同质化。
 * - dictation：听写纸 + 耳机波
 * - word_cards：正反词卡（A / 中）
 * - math_drill：口算板 ×÷
 * - wrongbook：错题本 + 红叉书签
 * - read_aloud：打开的书 + 声波
 */
export function ScIcon({
  name,
  size = 28,
  color = 'currentColor',
  secondary,
}: {
  name: ScIconName
  size?: number
  color?: string
  /** 辅色（浅面），默认半透明白或 brand soft */
  secondary?: string
}) {
  const c = color
  const s = secondary || 'rgba(255,255,255,.35)'
  const props = { width: size, height: size, viewBox: '0 0 32 32', 'aria-hidden': true as const }

  switch (name) {
    case 'dictation':
      return (
        <svg {...props}>
          <rect x="6" y="4" width="16" height="22" rx="2.5" fill={s} stroke={c} strokeWidth="1.6" />
          <path d="M10 9h8M10 13h8M10 17h5" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M22 11c1.4.6 2.4 1.8 2.4 3.4S23.4 17.2 22 17.8" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M24.2 9.2c2 1 3.4 2.8 3.4 5.2s-1.4 4.2-3.4 5.2" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          <circle cx="21.2" cy="14.4" r="2.2" fill={c} />
        </svg>
      )
    case 'word_cards':
      return (
        <svg {...props}>
          <rect x="9" y="6" width="15" height="18" rx="2.5" fill={s} stroke={c} strokeWidth="1.5" transform="rotate(8 16.5 15)" />
          <rect x="5" y="7" width="15" height="18" rx="2.5" fill={c} opacity="0.92" />
          <text x="12.5" y="19" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            A
          </text>
          <rect x="18" y="10" width="9" height="11" rx="1.5" fill="#fff" opacity="0.95" stroke={c} strokeWidth="1" />
          <text x="22.5" y="18" textAnchor="middle" fill={c} fontSize="7" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            中
          </text>
        </svg>
      )
    case 'math_drill':
      return (
        <svg {...props}>
          <rect x="5" y="5" width="22" height="22" rx="5" fill={s} stroke={c} strokeWidth="1.6" />
          <text x="11" y="15" fill={c} fontSize="8" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            3
          </text>
          <text x="16" y="15" fill={c} fontSize="9" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            ×
          </text>
          <text x="21.5" y="15" fill={c} fontSize="8" fontWeight="800" fontFamily="Segoe UI, sans-serif">
            7
          </text>
          <path d="M9 19h14" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="12" cy="23" r="1.3" fill={c} />
          <circle cx="16" cy="23" r="1.3" fill={c} />
          <circle cx="20" cy="23" r="1.3" fill={c} />
        </svg>
      )
    case 'wrongbook':
      return (
        <svg {...props}>
          <path
            d="M7 5.5h13.5a2 2 0 0 1 2 2V26H9a2 2 0 0 0-2 2V5.5z"
            fill={s}
            stroke={c}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M7 5.5V27a1.5 1.5 0 0 1 1.5-1.5H22.5" fill="none" stroke={c} strokeWidth="1.4" />
          <path d="M11 11h7.5M11 15h7.5M11 19h5" stroke={c} strokeWidth="1.35" strokeLinecap="round" opacity="0.85" />
          <circle cx="23.5" cy="10.5" r="5" fill={SC.bad} />
          <path d="M21.5 8.5l4 4M25.5 8.5l-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'read_aloud':
      return (
        <svg {...props}>
          <path
            d="M5 8.5c0-1.2.9-2 2.1-2H15v17H7.1c-1.2 0-2.1-.8-2.1-2V8.5z"
            fill={s}
            stroke={c}
            strokeWidth="1.5"
          />
          <path
            d="M27 8.5c0-1.2-.9-2-2.1-2H17v17h7.9c1.2 0 2.1-.8 2.1-2V8.5z"
            fill={c}
            opacity="0.9"
          />
          <path d="M17 6.5v17" stroke="#fff" strokeWidth="1.2" opacity="0.5" />
          <path
            d="M22.5 12.2c1.1.5 1.9 1.4 1.9 2.8s-.8 2.3-1.9 2.8"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M24.8 10.2c1.8.9 3 2.4 3 4.8s-1.2 3.9-3 4.8"
            fill="none"
            stroke="#fff"
            strokeWidth="1.3"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      )
    case 'flowBook':
      return (
        <svg {...props}>
          <path d="M6 7.5a2.5 2.5 0 0 1 2.5-2.5H24v19H8.5A2.5 2.5 0 0 0 6 26.5V7.5z" fill={s} stroke={c} strokeWidth="1.5" />
          <path d="M8.5 5v19.5" stroke={c} strokeWidth="1.4" />
          <path d="M12 11h8M12 15h6" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
          <path d="M20 5v6l2-1.4L24 11V5" fill={c} opacity="0.85" />
        </svg>
      )
    case 'flowTonight':
      return (
        <svg {...props}>
          <rect x="7" y="5" width="18" height="22" rx="3" fill={s} stroke={c} strokeWidth="1.5" />
          <path d="M11 3.5h10v3H11z" fill={c} />
          <path d="M12 13l2.2 2.2L19 10.5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 19h8M12 23h5" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'flowPreview':
      return (
        <svg {...props}>
          <rect x="5" y="6" width="15" height="19" rx="2" fill={s} stroke={c} strokeWidth="1.5" />
          <path d="M8.5 11h8M8.5 15h8M8.5 19h5" stroke={c} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="21" cy="20" r="6" fill={c} />
          <circle cx="21" cy="20" r="2.6" fill="#fff" />
          <path d="M25.2 24.2l3 3" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'flowPractice':
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="11" fill={s} stroke={c} strokeWidth="1.6" />
          <path d="M13.2 11.5v9l8-4.5-8-4.5z" fill={c} />
          <path d="M22 7.5l1.2 2.4 2.6.3-2 1.9.5 2.6L22 13.5l-2.3 1.2.5-2.6-2-1.9 2.6-.3L22 7.5z" fill={c} opacity="0.9" />
        </svg>
      )
    case 'brandMark':
      return (
        <svg {...props}>
          <path d="M5 22h17a2.5 2.5 0 0 0 2.5-2.5V7H10a2.5 2.5 0 0 0-2.5 2.5V22A2.5 2.5 0 0 1 5 24.5" fill={s} stroke={c} strokeWidth="1.5" />
          <path d="M7.5 10h15M7.5 14.5h15M7.5 19h10" stroke={c} strokeWidth="1.35" strokeLinecap="round" opacity="0.75" />
          <path d="M4 25.5h20" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="23" cy="9" r="3.2" fill={c} />
          <path d="M21.8 9h2.4M23 7.8v2.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'check':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M5 13.2l4.2 4.2L19.5 7" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'x':
      return (
        <svg {...props} viewBox="0 0 24 24">
          <path d="M7 7l10 10M17 7L7 17" fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )
    default:
      return null
  }
}

export function ScProgressRing({
  pct,
  brand,
  size = 56,
}: {
  pct: number
  brand: string
  size?: number
}) {
  const r = 18
  const circ = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pct))
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" stroke={SC.line} strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={brand}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - p / 100)}
        transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dashoffset .45s ease' }}
      />
      <text
        x="22"
        y="25"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill={SC.ink}
        fontFamily={SC.font}
      >
        {Math.round(p)}%
      </text>
    </svg>
  )
}

export function ScSheet({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 16,
        border: `1px solid ${SC.line}`,
        background: `
          linear-gradient(180deg, rgba(255,255,255,.94), rgba(248,250,252,.98)),
          repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(15,23,42,.045) 28px)
        `,
        backgroundSize: 'auto, 100% 28px',
        backgroundPosition: '0 40px',
        boxShadow: '0 10px 28px rgba(15,23,42,.06)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 28,
          top: 0,
          bottom: 0,
          width: 2,
          background: `linear-gradient(180deg, ${SC.sheetRule}, #fb7185)`,
          opacity: 0.6,
        }}
      />
      <div style={{ padding: '18px 18px 18px 40px' }}>{children}</div>
    </div>
  )
}

export const SC_CSS = `
  .sc-root { color: var(--sc-ink); }
  .sc-root button { font-family: inherit; }
  @keyframes scPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
  @keyframes scPop { from{opacity:0;transform:translateY(8px) scale(.985)} to{opacity:1;transform:none} }
  .sc-flow-dot { transition: transform .2s ease, box-shadow .2s ease; }
  .sc-flow-dot:hover { transform: translateY(-2px); }
  .sc-tpl { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .sc-tpl:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(15,23,42,.08); }
`
