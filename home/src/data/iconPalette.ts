import type { CSSProperties } from 'react'
import type { ThemeTokens } from './themes'

const CAP_ORDER = [
  'creation', 'chat_qa', 'kb', 'approval', 'report',
  'notify', 'integration', 'workflow', 'security', 'portal',
]

export function themePalette(theme: ThemeTokens): string[] {
  return [theme.pri, theme.sec, theme.accent, theme.priLight, theme.secLight, theme.priDark]
}

function hashIndex(s: string, len: number): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % len
}

export function capabilityColor(id: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  const idx = CAP_ORDER.indexOf(id)
  return pal[(idx >= 0 ? idx : hashIndex(id, pal.length)) % pal.length]
}

export function industryColor(key: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  return pal[hashIndex(`ind:${key}`, pal.length)]
}

export function categoryColor(category: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  return pal[hashIndex(`cat:${category}`, pal.length)]
}

export function moduleColor(key: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  return pal[hashIndex(`mod:${key}`, pal.length)]
}

export function platformColor(id: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  return pal[hashIndex(`plat:${id}`, pal.length)]
}

export function scenarioBarColor(label: string, theme: ThemeTokens): string {
  const pal = themePalette(theme)
  return pal[hashIndex(`bar:${label}`, pal.length)]
}

export function iconWrapStyle(color: string): CSSProperties {
  return { '--icon-color': color } as CSSProperties
}

export const MODULE_ICON_KEYS: Record<string, string> = {
  chat_qa: 'chat_qa',
  chat_voice: 'chat_qa',
  multi_agent: 'creation',
  device_repair: 'approval',
  quality_inspect: 'approval',
  inventory_count: 'chart',
  member_loyalty: 'chart',
  med_triage: 'chat_qa',
  nurse_shift: 'approval',
  game_support: 'chat_qa',
  school_notice: 'notify',
  homework_qa: 'chat_qa',
  class_schedule: 'chart',
  delivery_order: 'approval',
  house_viewing: 'approval',
  campaign_ops: 'chart',
  fitness_checkin: 'chart',
  travel_plan: 'chat',
  wedding_plan: 'approval',
  deco_material: 'approval',
  pet_clinic: 'chat',
  gov_service: 'kb',
  legal_case: 'kb',
  study_coach: 'kb',
  property_repair: 'approval',
  site_patrol: 'approval',
  hotel_booking: 'chart',
  approval_flow: 'approval',
  approval_inbox: 'approval',
  approval_countersign: 'approval',
  kb_document: 'kb',
  data_nl_query: 'report',
  chart_dashboard: 'report',
  chart_funnel: 'report',
  notify_inapp: 'notify',
  schedule_alarm: 'notify',
  notify_im: 'integration',
  flutter_push: 'notify',
  flutter_scan_qr: 'integration',
  flutter_geolocation: 'integration',
  flutter_camera: 'integration',
  flutter_map: 'integration',
  flutter_offline: 'integration',
  flutter_biometric: 'security',
  flutter_signature: 'approval',
  flutter_speech: 'chat_qa',
  flutter_file_picker: 'kb',
  flutter_pdf: 'kb',
  flutter_webview: 'integration',
  flutter_chart: 'report',
  rbac_page: 'security',
  erp_connector: 'integration',
}
