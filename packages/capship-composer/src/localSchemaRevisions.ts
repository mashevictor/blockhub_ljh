/**
 * 预览 / 无 Runtime appId 时的本地版本库（与服务端 app_schema_revisions 同构展示）。
 * 仅存 page_schema 快照，不冒充业务数据。
 */
import type { ComposerPageSchema, SchemaRevisionItem } from './types'

export type LocalSchemaRevision = SchemaRevisionItem & {
  page_schema: ComposerPageSchema
}

type Store = {
  current_rev: number
  items: LocalSchemaRevision[]
}

function storageKey(appKey: string): string {
  return `capship:schema-revs:${appKey}`
}

function readStore(appKey: string): Store {
  try {
    const raw = localStorage.getItem(storageKey(appKey))
    if (!raw) return { current_rev: 0, items: [] }
    const parsed = JSON.parse(raw) as Store
    return {
      current_rev: Number(parsed.current_rev) || 0,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    }
  } catch {
    return { current_rev: 0, items: [] }
  }
}

function writeStore(appKey: string, store: Store) {
  try {
    localStorage.setItem(storageKey(appKey), JSON.stringify(store))
  } catch {
    /* quota / private mode */
  }
}

export function listLocalSchemaRevisions(appKey: string): {
  schema_rev: number
  items: LocalSchemaRevision[]
} {
  const store = readStore(appKey)
  return {
    schema_rev: store.current_rev,
    items: [...store.items].sort((a, b) => b.rev - a.rev),
  }
}

export function commitLocalSchemaRevision(
  appKey: string,
  page_schema: ComposerPageSchema,
  opts?: { summary?: string; source?: string; editor_name?: string },
): LocalSchemaRevision {
  const store = readStore(appKey)
  const rev = store.current_rev + 1
  const item: LocalSchemaRevision = {
    rev,
    summary: opts?.summary || '保存草稿',
    source: opts?.source || 'local_save',
    editor_name: opts?.editor_name || '本地',
    created_at: new Date().toISOString(),
    page_schema: JSON.parse(JSON.stringify(page_schema)) as ComposerPageSchema,
  }
  store.current_rev = rev
  store.items = [item, ...store.items].slice(0, 40)
  writeStore(appKey, store)
  return item
}

export function getLocalSchemaRevision(
  appKey: string,
  rev: number,
): LocalSchemaRevision | null {
  return readStore(appKey).items.find((i) => i.rev === rev) || null
}
