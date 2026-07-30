/** Load flattened message catalogs from shared/i18n (Vite apps can JSON-import). */
import type { FlatMessages, Locale, MessageTree } from './types'
import { flattenMessages } from './flatten'

export type LocaleBundles = Partial<Record<Locale, FlatMessages>>

/** Merge several trees/maps into one flat catalog (later wins). */
export function mergeMessageTrees(
  ...parts: Array<MessageTree | FlatMessages | undefined | null>
): FlatMessages {
  const out: FlatMessages = {}
  for (const part of parts) {
    if (!part) continue
    Object.assign(out, flattenMessages(part))
  }
  return out
}

/**
 * Strip codegen meta keys before handing to runtime.
 * Accepts either nested JSON or already-flat `cap.x.name` maps from *.gen.json.
 */
export function sanitizeCatalog(raw: Record<string, unknown>): FlatMessages {
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue
    cleaned[k] = v
  }
  return flattenMessages(cleaned as MessageTree)
}
