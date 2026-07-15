import { fetchHeroPresets } from '../api/client'
import { mapHeroPresetFromApi, ROLE_PRESETS, type RolePreset } from '../data/rolePresets'

const CACHE_KEY = 'blockhub_hero_presets_v7'

type CachePayload = {
  savedAt: number
  items: RolePreset[]
}

let inflight: Promise<RolePreset[]> | null = null

export function loadCachedHeroPresets(): RolePreset[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null
    return parsed.items
  } catch {
    return null
  }
}

export function saveCachedHeroPresets(items: RolePreset[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), items } satisfies CachePayload))
  } catch {
    /* quota / private mode */
  }
}

/** 首屏秒开：优先本地缓存，否则内置 30 条静态预设 */
export function getInstantHeroPresets(): RolePreset[] {
  return loadCachedHeroPresets() ?? ROLE_PRESETS
}

function mapRows(rows: Awaited<ReturnType<typeof fetchHeroPresets>>): RolePreset[] {
  return rows.map((row) => mapHeroPresetFromApi({
    ...row,
    picks: row.picks as RolePreset['picks'],
  }))
}

export async function syncHeroPresetsFromApi(): Promise<RolePreset[]> {
  if (inflight) return inflight
  inflight = fetchHeroPresets()
    .then((rows) => {
      if (rows.length === 0) throw new Error('hero presets empty')
      return mapRows(rows)
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** 应用启动时预热，减少首次进入创建区时的等待 */
export function prefetchHeroPresets(): void {
  void syncHeroPresetsFromApi()
    .then((items) => saveCachedHeroPresets(items))
    .catch(() => {})
}
