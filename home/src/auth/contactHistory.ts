export interface SavedContact {
  type: 'email' | 'phone'
  value: string
}

const STORAGE_KEY = 'blockhub_contact_history'
const MAX_ITEMS = 8

export function loadContactHistory(): SavedContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedContact[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item?.value && (item.type === 'email' || item.type === 'phone'))
  } catch {
    return []
  }
}

export function saveContactHistory(contact: SavedContact): void {
  const normalized = { type: contact.type, value: contact.value.trim() }
  if (!normalized.value) return
  const prev = loadContactHistory().filter(
    (item) => !(item.type === normalized.type && item.value === normalized.value),
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify([normalized, ...prev].slice(0, MAX_ITEMS)))
}

export function contactsForMode(mode: 'email' | 'phone'): SavedContact[] {
  return loadContactHistory().filter((item) => item.type === mode)
}
