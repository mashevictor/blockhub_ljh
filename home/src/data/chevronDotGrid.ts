/** >> 几何：V 形折线（方案 A 标准描边） */

export interface ChevronDotPoint {
  nx: number
  ny: number
  scatterX: number
  scatterY: number
  strokeOrder: number
}

/** 单枚 > 的 5 个顶点（归一化 0–1，尖端朝右） */
const UNIT_CHEVRON = [
  { lx: 0, ly: 0 },
  { lx: 0.45, ly: 0.22 },
  { lx: 1, ly: 0.5 },
  { lx: 0.45, ly: 0.78 },
  { lx: 0, ly: 1 },
] as const

const CHEVRON_W = 0.42
const CHEVRON_GAP = 0.12

function buildChevronDots(): ChevronDotPoint[] {
  const totalW = CHEVRON_W * 2 + CHEVRON_GAP
  const dots: Array<{ nx: number; ny: number; chev: number; i: number }> = []

  for (let chev = 0; chev < 2; chev++) {
    const ox = chev * (CHEVRON_W + CHEVRON_GAP)
    UNIT_CHEVRON.forEach((p, i) => {
      dots.push({
        nx: (ox + p.lx * CHEVRON_W) / totalW,
        ny: p.ly,
        chev,
        i,
      })
    })
  }

  return dots.map((d, idx) => {
    const arm = d.chev === 0 ? -1 : 1
    return {
      nx: d.nx,
      ny: d.ny,
      scatterX: d.nx + arm * 0.06 * Math.sin(idx * 1.4),
      scatterY: d.ny + 0.04 * Math.cos(idx * 1.9),
      strokeOrder: d.chev * 5 + d.i,
    }
  })
}

/** @deprecated 点阵 loading 几何点 */
export const CHEVRON_DOT_POINTS = buildChevronDots()

export const CHEVRON_SIGN_VIEWBOX = '0 0 48 24'

export function chevronSignSvgPaths(): string[] {
  const totalW = CHEVRON_W * 2 + CHEVRON_GAP
  const h = 24
  const w = 48

  return [0, 1].map((chev) => {
    const ox = (chev * (CHEVRON_W + CHEVRON_GAP)) / totalW
    const cw = CHEVRON_W / totalW
    const pts = UNIT_CHEVRON.map((p) => ({
      x: (ox + p.lx * cw) * w,
      y: p.ly * h,
    }))
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y} L ${pts[2].x} ${pts[2].y} L ${pts[3].x} ${pts[3].y} L ${pts[4].x} ${pts[4].y}`
  })
}

/** 方案 A · 标准描边 — 全站统一令牌 */
export const CHEVRON_SCHEME = {
  color: '#0d47a1',
  stroke: 2.2,
} as const

/** 全站 >> 尺寸：btn 为静态默认；hero/lg/md 带点阵 dot 用于 loading */
export const CHEVRON_DOT_SIZES = {
  /** 首页开场点阵动画 */
  hero: { width: 96, height: 40, dot: 7, stroke: CHEVRON_SCHEME.stroke },
  /** 全屏 Loading */
  lg: { width: 56, height: 24, dot: 5, stroke: CHEVRON_SCHEME.stroke },
  /** 区块 loading */
  md: { width: 48, height: 20, dot: 4.5, stroke: CHEVRON_SCHEME.stroke },
  sm: { width: 40, height: 18, dot: 4, stroke: CHEVRON_SCHEME.stroke },
  /** 胶囊 / 品牌句 — 与 btn 同尺寸（仅静态 SVG） */
  sign: { width: 22, height: 11, stroke: 2.0 },
  /** 按钮、输入框前缀 — 静态基准 */
  btn: { width: 22, height: 11, stroke: 2.0 },
  nav: { width: 20, height: 10, stroke: 1.8 },
  xs: { width: 22, height: 11, stroke: 2.0 },
} as const

export function chevronDotRadius(size: ChevronDotSize): number {
  const cfg = CHEVRON_DOT_SIZES[size]
  return 'dot' in cfg ? cfg.dot : 4
}

export type ChevronDotSize = keyof typeof CHEVRON_DOT_SIZES
export type ChevronDotVariant = 'converge' | 'scan' | 'static' | 'intro'

/** 默认行内 >> 尺寸 */
export const CHEVRON_DEFAULT_SIZE: ChevronDotSize = 'btn'
