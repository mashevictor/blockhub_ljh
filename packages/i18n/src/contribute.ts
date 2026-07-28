/** Capability packages push locales here on import — Provider merges at runtime. */
import { flattenMessages } from './flatten'
import type { FlatMessages, Locale, MessageTree } from './types'

type Chunk = Partial<Record<Locale, MessageTree | FlatMessages>>
type Listener = () => void

const store: Partial<Record<Locale, FlatMessages>> = {}
const listeners = new Set<Listener>()

export function contributeI18nMessages(chunk: Chunk): void {
  for (const [loc, tree] of Object.entries(chunk) as [Locale, MessageTree | FlatMessages][]) {
    if (!tree) continue
    store[loc] = { ...(store[loc] ?? {}), ...flattenMessages(tree) }
  }
  listeners.forEach((fn) => fn())
}

export function getContributedMessages(): Partial<Record<Locale, FlatMessages>> {
  return {
    'zh-CN': { ...(store['zh-CN'] ?? {}) },
    'en-US': { ...(store['en-US'] ?? {}) },
  }
}

export function subscribeI18nContributions(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
