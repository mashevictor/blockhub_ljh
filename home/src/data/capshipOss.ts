/** CapShip open-source landing (Edge vs Stable) — page copy is English-only */
import { ROLE_PRESETS, presetRole } from './rolePresets'
import { ROUTES } from '../routes/paths'

/** English titles for CapShip UI / marquee / catalog export */
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

export function capshipSceneTitle(id: string, fallback?: string): string {
  return CAPSHIP_SCENE_EN[id] || fallback || id
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
  { key: 'stars', label: 'GitHub Stars', value: 128, suffix: '', format: 'int' as const },
  { key: 'forks', label: 'Forks', value: 36, suffix: '', format: 'int' as const },
  { key: 'scenarios', label: 'Closed-loop scenarios', value: ROLE_PRESETS.length, suffix: '', format: 'int' as const },
  { key: 'capabilities', label: 'Capability modules', value: 87, suffix: '', format: 'int' as const },
  { key: 'dual', label: 'Dual-platform APIs', value: 100, suffix: '%', format: 'int' as const },
  { key: 'releases', label: 'Stable releases', value: 12, suffix: '', format: 'int' as const },
] as const

export const CAPSHIP_PILLARS = [
  {
    title: 'Selection → Delivery',
    body: 'From barrage intent to a deployable Web + App stack — not a mockup carousel.',
  },
  {
    title: 'Real APIs, real data',
    body: 'CapShip modules ship with tenant-scoped records, progress states, and IM hooks.',
  },
  {
    title: 'Stable vs Edge',
    body: 'Pin CapShip Stable for production; track Edge when you want the newest scenarios.',
  },
] as const

export function buildCapshipCatalog() {
  return {
    product: 'CapShip',
    generatedAt: new Date().toISOString(),
    github: CAPSHIP_GITHUB,
    scenarios: ROLE_PRESETS.map((p) => ({
      id: p.id,
      title: capshipSceneTitle(p.id, p.label),
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
    '## Scenarios',
    '',
  ]
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
