import type { FlatMessages, MessageTree } from './types'

/** Flatten `{ a: { b: 'x' } }` → `{ 'a.b': 'x' }`. Already-flat maps pass through. */
export function flattenMessages(input: MessageTree | FlatMessages): FlatMessages {
  const out: FlatMessages = {}
  const walk = (node: string | MessageTree, prefix: string) => {
    if (typeof node === 'string') {
      if (prefix) out[prefix] = node
      return
    }
    for (const [k, v] of Object.entries(node)) {
      const next = prefix ? `${prefix}.${k}` : k
      walk(v as string | MessageTree, next)
    }
  }
  walk(input as MessageTree, '')
  return out
}

export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const val = vars[name]
    return val === undefined || val === null ? `{{${name}}}` : String(val)
  })
}
