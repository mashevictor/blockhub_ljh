/** 对话改页 / 智能出页后通知 Runtime 刷新（同浏览器多标签 / 同页 Composer↔壳）。 */

export type SchemaSyncMessage = {
  type: 'schema-updated'
  appId: string
  schema_rev?: number
  reason?: string
  at: number
}

const channelName = (appId: string) => `blockhub-schema:${appId}`

export function notifySchemaUpdated(
  appId: string | null | undefined,
  opts?: { schema_rev?: number; reason?: string },
): void {
  const id = String(appId || '').trim()
  if (!id || id.startsWith('preview-')) return
  const payload: SchemaSyncMessage = {
    type: 'schema-updated',
    appId: id,
    schema_rev: opts?.schema_rev,
    reason: opts?.reason,
    at: Date.now(),
  }
  try {
    const ch = new BroadcastChannel(channelName(id))
    ch.postMessage(payload)
    ch.close()
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(
      `blockhub:schema-ping:${id}`,
      JSON.stringify({ schema_rev: opts?.schema_rev ?? null, at: payload.at, reason: opts?.reason || '' }),
    )
  } catch {
    /* ignore */
  }
}

export function subscribeSchemaUpdated(
  appId: string | null | undefined,
  onUpdate: (msg: SchemaSyncMessage) => void,
): () => void {
  const id = String(appId || '').trim()
  if (!id || id.startsWith('preview-')) return () => undefined

  let ch: BroadcastChannel | null = null
  try {
    ch = new BroadcastChannel(channelName(id))
    ch.onmessage = (ev) => {
      const data = ev.data as SchemaSyncMessage
      if (data?.type === 'schema-updated' && data.appId === id) onUpdate(data)
    }
  } catch {
    ch = null
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== `blockhub:schema-ping:${id}` || !e.newValue) return
    try {
      const parsed = JSON.parse(e.newValue) as { schema_rev?: number; at?: number; reason?: string }
      onUpdate({
        type: 'schema-updated',
        appId: id,
        schema_rev: parsed.schema_rev,
        reason: parsed.reason,
        at: parsed.at || Date.now(),
      })
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
