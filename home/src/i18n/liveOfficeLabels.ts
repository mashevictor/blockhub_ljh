/** LiveOffice Runtime preview chrome — keys in home.json (`home.liveOffice.*`). */

import type { TranslateFn } from './industryLabels'

const STATUS_ALIASES: Record<string, string> = {
  done: 'archived',
  dispatched: 'assigned',
  offered: 'offer',
  joined: 'onboarded',
}

export function liveOfficeStatusLabel(t: TranslateFn, status: string): string {
  if (!status) return '—'
  const normalized = STATUS_ALIASES[status] || status
  const key = `home.liveOffice.status.${normalized}`
  const v = t(key)
  return v === key ? status : v
}
