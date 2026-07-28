/** CapShip open-source landing (Edge vs Stable) — English-only page copy */
import { ROLE_PRESETS, presetRole } from './rolePresets'
import { ROUTES } from '../routes/paths'
import heroEnGen from '@shared/i18n/messages/en-US/hero.gen.json'
import heroZhGen from '@shared/i18n/messages/zh-CN/hero.gen.json'

/**
 * @deprecated Seed / glossary fallback only — not the SSOT.
 * Prefer shared/i18n/messages/{locale}/hero.gen.json (codegen from hero_presets + seed).
 */
export const CAPSHIP_SCENE_EN: Record<string, string> = {
  s00: 'Shanghai Voice Agent',
  s01: 'Leave Request',
  s02: 'Expense Claim',
  s03: 'Policy Q&A',
  s04: 'Hire & Onboard',
  s05: 'Sales Lead',
  s06: 'Quote & Contract',
  s07: 'Ops KPI Board',
  s08: 'Device Repair',
  s09: 'Quality Inspect',
  s10: 'Inventory Count',
  s11: 'Membership Growth',
  s12: 'Medical Guide',
  s13: 'Nurse Shift',
  s14: 'Player FAQ',
  s15: 'School Notify',
  s16: 'Homework Help',
  s17: 'Class Schedule',
  s18: 'Campaign Ops',
  s19: 'Property Repair',
  s20: 'House Viewing',
  s21: 'Hotel Booking',
  s22: 'Delivery Ride',
  s23: 'Fitness Check-in',
  s24: 'Travel Playbook',
  s25: 'Wedding Planner',
  s26: 'Home Renovation',
  s27: 'Pet Clinic',
  s28: 'Site Patrol',
  s29: 'Gov Services',
  s30: 'Legal Contract',
  s31: 'Shanghai Voice (Realtime)',
  s32: 'Study Coach',
  s33: 'Parent Coach',
  s34: 'Teacher Plan',
}

function heroGenLabel(gen: Record<string, unknown>, id: string): string | undefined {
  const v = gen[`hero.${id}.label`]
  return typeof v === 'string' && v ? v : undefined
}

/** Scene title: hero.gen.json first, then deprecated CAPSHIP_SCENE_EN seed. */
export function capshipSceneTitle(id: string, fallback?: string): string {
  return (
    heroGenLabel(heroEnGen as Record<string, unknown>, id) ||
    CAPSHIP_SCENE_EN[id] ||
    fallback ||
    id
  )
}

export function capshipSceneTitleZh(id: string, fallback?: string): string {
  return heroGenLabel(heroZhGen as Record<string, unknown>, id) || fallback || id
}

export const CAPSHIP_GITHUB = {
  edge: {
    label: 'CapShip Edge',
    owner: 'mashevictor',
    repo: 'capship-dev',
    url: 'https://github.com/mashevictor/capship-dev',
    clone: 'https://github.com/mashevictor/capship-dev.git',
    blurb: 'Test / edge build — latest CapShip experiments on the capship-dev lane.',
  },
  stable: {
    label: 'CapShip Stable',
    owner: 'mashevictor',
    repo: 'capship',
    url: 'https://github.com/mashevictor/capship',
    clone: 'https://github.com/mashevictor/capship.git',
    releaseUrl: 'https://github.com/mashevictor/capship/releases',
    blurb: 'Pinned release channel for production installs and long-lived references.',
  },
} as const

export const CAPSHIP_STATS = [
  {
    key: 'stars',
    label: 'GitHub Stars',
    labelZh: 'GitHub Stars',
    value: 128,
    suffix: '',
    format: 'int' as const,
  },
  {
    key: 'forks',
    label: 'Forks',
    labelZh: 'Forks',
    value: 36,
    suffix: '',
    format: 'int' as const,
  },
  {
    key: 'scenarios',
    label: 'Closed-loop scenarios',
    labelZh: '闭环场景',
    value: ROLE_PRESETS.length,
    suffix: '',
    format: 'int' as const,
  },
  {
    key: 'capabilities',
    label: 'Capability modules',
    labelZh: '能力模块',
    value: 87,
    suffix: '',
    format: 'int' as const,
  },
  {
    key: 'dual',
    label: 'Dual-platform APIs',
    labelZh: '双端 API',
    value: 100,
    suffix: '%',
    format: 'int' as const,
  },
  {
    key: 'releases',
    label: 'Stable releases',
    labelZh: 'Stable 发布',
    value: 12,
    suffix: '',
    format: 'int' as const,
  },
] as const

export const CAPSHIP_PILLARS = [
  {
    title: '>> Selection → Delivery',
    titleZh: '>> 选型即交付',
    body: 'Type >> on the product home or in Runtime chat — CapShip mounts real modules (leave, repair, expense…), not a mock carousel.',
    bodyZh: '在首页或 Runtime 对话输入 >> — CapShip 挂载真能力（请假、报修、报销…），不是演示轮播。',
  },
  {
    title: 'Compose Edit → Approve',
    titleZh: '对话改页 → 审批',
    body: 'Chat to reshape page_schema with live preview. Personal draft → submit → admin approve before the formal Runtime updates for everyone. Platform orchestration — not a business capability key.',
    bodyZh: '用聊天改 page_schema 并即时预览。个人草稿 → 提交 → 管理员通过后，正式 Runtime 才对全员生效。平台编排，不是业务 capability key。',
  },
  {
    title: 'Ship in 5 minutes',
    titleZh: '五分钟交付',
    body: 'Select → publish → Web Runtime / App on the same contract. Empty DB = empty lists; submits hit real tables and APIs.',
    bodyZh: '选型 → 发布 → Web Runtime / App 同一契约。空库=空列表；提交写入真表与真 API。',
  },
  {
    title: 'Stable vs Edge',
    titleZh: 'Stable 与 Edge',
    body: 'Pin CapShip Stable for production; track Edge (capship-dev) for the newest scenarios.',
    bodyZh: '生产钉 CapShip Stable；试验跟 Edge（capship-dev）拿最新场景。',
  },
] as const

/** Page section copy — EN default, ZH switchable; English mode never mixes Chinese parentheses */
export const CAPSHIP_COPY = {
  en: {
    kicker: 'Selection → Delivery · Open Source',
    tagline: 'Ship it in 5 minutes',
    lead1Prefix: 'Type',
    lead1Suffix: 'to mount real capabilities — publish Web + App.',
    lead2Prefix: 'Compose Edit: chat to reshape pages, draft → approve → formal',
    ctaHome: 'Try >> on home',
    statsTitle: 'Numbers in motion',
    statsSub: 'Stars, forks, and CapShip scenario coverage — live when GitHub responds.',
    lanesTitle: 'Two GitHub lanes',
    lanesSub: 'Pin Stable for production. Follow Edge (capship-dev) for the test lane.',
    whyTitle: 'Why >>',
    whySub: 'One command mounts a capability — intent to a runnable Runtime in five minutes.',
    orchTitle: 'Platform orchestration',
    orchSub:
      'Core CapShip open-source capabilities beyond business modules — Composer modes and schema write-back gates. Not registered as capability_keys.',
    dlTitle: 'Download catalog & links',
    dlSub: 'Export the scenario directory and repository links for offline handoff.',
    metaTitle: 'CapShip · >> Ship in 5 minutes',
    metaDescription:
      'CapShip: type >> to mount real capabilities. Compose Edit drafts page_schema; approve to ship Web + App — leave, repair, expense with real APIs.',
  },
  zh: {
    kicker: '选型即交付 · 开源',
    tagline: '五分钟交付',
    lead1Prefix: '输入',
    lead1Suffix: '挂载真能力 — 发布 Web + App。',
    lead2Prefix: '对话改页：用聊天改页面，草稿 → 审批 → 正式',
    ctaHome: '去首页试 >>',
    statsTitle: '动态数字',
    statsSub: 'Stars、Forks 与场景覆盖 — GitHub 响应时实时更新。',
    lanesTitle: '两条 GitHub 通道',
    lanesSub: '生产钉 Stable；试验跟 Edge（capship-dev）。',
    whyTitle: '为什么是 >>',
    whySub: '一条指令挂载能力 — 意图到可运行 Runtime，约五分钟。',
    orchTitle: '平台编排',
    orchSub: '开源核心能力（非业务模块）— Composer 模式与 schema 写回闸门。不注册为 capability_keys。',
    dlTitle: '下载目录与链接',
    dlSub: '导出场景目录与仓库链接，便于离线交接。',
    metaTitle: 'CapShip · >> 五分钟交付',
    metaDescription: 'CapShip：输入 >> 挂载真能力。对话改页草稿审批后交付 Web + App。',
  },
} as const

/** Platform orchestration features (Composer / schema approval) — not capability_registry keys */
export const CAPSHIP_PLATFORM_FEATURES = [
  {
    id: 'compose_edit',
    title: 'Compose Edit',
    titleZh: '对话改页',
    mode: 'live_edit',
    summary:
      'Natural-language page edits with instant left-pane preview; formal page_schema unchanged until approved.',
    summaryZh: '自然语言改页，左侧即时预览；正式 page_schema 需审批通过后才对全员生效。',
  },
  {
    id: 'schema_approval',
    title: 'Schema Approval',
    titleZh: '草稿审批',
    mode: 'draft → pending → approved',
    summary:
      'Personal draft on app_schema_change_requests; admin approve commits schema_rev and formal Runtime.',
    summaryZh: '个人草稿写入 app_schema_change_requests；管理员通过后提交 schema_rev 并更新正式 Runtime。',
  },
  {
    id: 'module_flow',
    title: 'Module Flow',
    titleZh: '数据流',
    mode: 'module_flow',
    summary: 'Composer mode for wiring capability data paths alongside compose edit and module pick.',
    summaryZh: '在对话改页与能力选型之外，用 Composer 编排能力数据通路。',
  },
] as const

export type CapshipLang = 'en' | 'zh'

export function resolveCapshipCopy(lang: CapshipLang) {
  return CAPSHIP_COPY[lang]
}

export function resolvePlatformFeature(
  f: (typeof CAPSHIP_PLATFORM_FEATURES)[number],
  lang: CapshipLang,
) {
  return {
    id: f.id,
    title: lang === 'zh' ? f.titleZh : f.title,
    mode: f.mode,
    summary: lang === 'zh' ? f.summaryZh : f.summary,
  }
}

export function resolvePillar(p: (typeof CAPSHIP_PILLARS)[number], lang: CapshipLang) {
  return {
    title: lang === 'zh' ? p.titleZh : p.title,
    body: lang === 'zh' ? p.bodyZh : p.body,
  }
}

export function resolveStatLabel(
  s: { readonly label: string; readonly labelZh: string },
  lang: CapshipLang,
) {
  return lang === 'zh' ? s.labelZh : s.label
}

export function buildCapshipCatalog(lang: CapshipLang = 'en') {
  return {
    product: 'CapShip',
    lang,
    generatedAt: new Date().toISOString(),
    github: CAPSHIP_GITHUB,
    platformFeatures: CAPSHIP_PLATFORM_FEATURES.map((f) => resolvePlatformFeature(f, lang)),
    pillars: CAPSHIP_PILLARS.map((p) => resolvePillar(p, lang)),
    scenarios: ROLE_PRESETS.map((p) => ({
      id: p.id,
      title: lang === 'zh' ? capshipSceneTitleZh(p.id, p.label) : capshipSceneTitle(p.id, p.label),
      hint: p.hint,
      role: presetRole(p),
      modules: p.picks.filter((x) => x.type === 'module').map((x) => ({ key: x.key, label: x.label })),
      flow: p.flowLines,
    })),
    links: buildCapshipLinks(),
  }
}

export function buildCapshipLinks() {
  return [
    { name: 'CapShip Edge (capship-dev)', url: CAPSHIP_GITHUB.edge.url },
    { name: 'CapShip Stable', url: CAPSHIP_GITHUB.stable.url },
    { name: 'Stable Releases', url: CAPSHIP_GITHUB.stable.releaseUrl },
    { name: 'Home · Product', url: typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.home}` : ROUTES.home },
    { name: 'Plaza', url: typeof window !== 'undefined' ? `${window.location.origin}${ROUTES.plazaFeed}` : ROUTES.plazaFeed },
    { name: 'Clone Edge', url: CAPSHIP_GITHUB.edge.clone },
    { name: 'Clone Stable', url: CAPSHIP_GITHUB.stable.clone },
  ]
}

export function catalogToMarkdown(catalog: ReturnType<typeof buildCapshipCatalog>): string {
  const lines: string[] = [
    '# CapShip Catalog',
    '',
    `Generated: ${catalog.generatedAt}`,
    '',
    '## GitHub',
    '',
    `- Edge: ${catalog.github.edge.url}`,
    `- Stable: ${catalog.github.stable.url}`,
    '',
    '## Platform features (orchestration)',
    '',
  ]
  for (const f of catalog.platformFeatures) {
    lines.push(`### ${f.id} · ${f.title}`)
    lines.push(`- Mode: ${f.mode}`)
    lines.push(`- ${f.summary}`)
    lines.push('')
  }
  lines.push('## Scenarios')
  lines.push('')
  for (const s of catalog.scenarios) {
    lines.push(`### ${s.id} · ${s.title}`)
    lines.push(`- Modules: ${s.modules.map((m) => m.key).join(', ') || '—'}`)
    lines.push('')
  }
  lines.push('## Links')
  lines.push('')
  for (const l of catalog.links) {
    lines.push(`- [${l.name}](${l.url})`)
  }
  lines.push('')
  return lines.join('\n')
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
