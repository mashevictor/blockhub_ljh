/** 对话改页 / 智能出页计次后通知「我的套餐」等页刷新用量。 */

export type QuotaSyncMessage = {
  type: 'quota-updated'
  at: number
  reason?: string
  usage?: Record<string, number>
  remaining?: Record<string, number | null>
}

const STORAGE_KEY = 'blockhub:quota-ping'
const CHANNEL = 'blockhub-quota'

export function notifyQuotaUpdated(opts?: {
  reason?: string
  usage?: Record<string, number>
  remaining?: Record<string, number | null>
}): void {
  const payload: QuotaSyncMessage = {
    type: 'quota-updated',
    at: Date.now(),
    reason: opts?.reason,
    usage: opts?.usage,
    remaining: opts?.remaining,
  }
  try {
    const ch = new BroadcastChannel(CHANNEL)
    ch.postMessage(payload)
    ch.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* ignore */
  }
}

export function subscribeQuotaUpdated(onUpdate: (msg: QuotaSyncMessage) => void): () => void {
  let ch: BroadcastChannel | null = null
  try {
    ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (ev) => {
      const data = ev.data as QuotaSyncMessage
      if (data?.type === 'quota-updated') onUpdate(data)
    }
  } catch {
    ch = null
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue) as QuotaSyncMessage
      if (parsed?.type === 'quota-updated') onUpdate(parsed)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    try {
      ch?.close()
    } catch {
      /* ignore */
    }
    window.removeEventListener('storage', onStorage)
  }
}
