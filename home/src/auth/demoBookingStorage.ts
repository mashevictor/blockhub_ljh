import type { DemoBookingPayload } from '../api/client'

const STORAGE_KEY = 'tc_demo_bookings'
const MAX_ITEMS = 100

export interface LocalDemoBooking extends DemoBookingPayload {
  savedAt: number
  synced: boolean
}

function loadAll(): LocalDemoBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalDemoBooking[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveDemoBookingLocal(payload: DemoBookingPayload): LocalDemoBooking {
  const row: LocalDemoBooking = {
    ...payload,
    savedAt: Date.now(),
    synced: false,
  }
  const next = [row, ...loadAll()].slice(0, MAX_ITEMS)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return row
}
