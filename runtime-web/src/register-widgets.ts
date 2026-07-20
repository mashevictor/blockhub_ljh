import type { BuildManifest } from '@blockhub/web-core'
import { registerBuiltinWidgets } from './builtin-widgets'

registerBuiltinWidgets()

// 解耦核心：不在此硬编码任何能力包。
// 通过 import.meta.glob 自动发现 packages/web-capability-*/src/index.ts，
// 每个包在自身 index.ts 中调用 registerWidget 完成自注册（副作用）。
const capabilityModules = import.meta.glob('../../packages/web-capability-*/src/index.ts')

const loaderByFolder: Record<string, () => Promise<unknown>> = {}
for (const [p, loader] of Object.entries(capabilityModules)) {
  const folder = p.split('/').filter(Boolean).slice(-3, -2)[0]
  if (folder) loaderByFolder[folder] = loader as () => Promise<unknown>
}

const loaded = new Set<string>()
const inflight = new Map<string, Promise<void>>()

function folderOf(pkg: string): string {
  return pkg.split('/').pop() ?? pkg
}

/** 触发某能力包的自注册副作用（导入即注册）。 */
export async function loadPkg(pkg: string): Promise<void> {
  const folder = folderOf(pkg)
  if (loaded.has(folder)) return
  const existing = inflight.get(folder)
  if (existing) return existing

  const loader = loaderByFolder[folder]
  if (!loader) {
    loaded.add(folder)
    return
  }

  const task = (async () => {
    try {
      await loader()
    } catch (e) {
      console.warn('[boot] 能力包加载失败:', pkg, e)
    } finally {
      loaded.add(folder)
      inflight.delete(folder)
    }
  })()
  inflight.set(folder, task)
  return task
}

async function mapPool(items: string[], concurrency: number, fn: (x: string) => Promise<void>) {
  if (!items.length) return
  const queue = [...items]
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift()
      if (!next) break
      await fn(next)
    }
  })
  await Promise.all(workers)
}

function pkgsFromManifest(manifest: BuildManifest | null | undefined): string[] {
  return [...new Set(manifest?.web_pkgs ?? [])]
}

/**
 * 首屏策略：
 * 1) 先加载 priority 包（当前路由需要）
 * 2) 其余包限并发后台预热，避免 20+ 包抢带宽拖垮首屏
 */
export async function bootWidgetsFromManifest(
  manifest: BuildManifest | null | undefined,
  opts?: { priorityPkgs?: string[]; background?: boolean; concurrency?: number },
): Promise<void> {
  const pkgs = pkgsFromManifest(manifest)
  const concurrency = opts?.concurrency ?? 3

  if (!pkgs.length) {
    if (opts?.background) {
      void bootAllWidgets(concurrency)
      return
    }
    await bootAllWidgets(concurrency)
    return
  }

  const priority = [...new Set((opts?.priorityPkgs || []).filter((p) => pkgs.includes(p)))]
  const rest = pkgs.filter((p) => !priority.includes(p))

  await mapPool(priority, Math.min(2, concurrency), loadPkg)

  if (opts?.background) {
    void mapPool(rest, concurrency, loadPkg)
    return
  }
  await mapPool(rest, concurrency, loadPkg)
}

/** 进入某场景前确保相关包已加载 */
export async function ensurePkgsLoaded(pkgs: string[]): Promise<void> {
  await mapPool([...new Set(pkgs.filter(Boolean))], 2, loadPkg)
}

export async function bootAllWidgets(concurrency = 3): Promise<void> {
  const folders = Object.keys(loaderByFolder).map((f) => `@blockhub/${f}`)
  await mapPool(folders, concurrency, loadPkg)
}

/** @deprecated use bootWidgetsFromManifest after manifest fetch */
export function bootWidgetRegistry(): void {
  void bootAllWidgets()
}
