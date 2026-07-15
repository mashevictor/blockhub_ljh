import type { BuildManifest } from '@blockhub/web-core'
import { registerBuiltinWidgets } from './builtin-widgets'

registerBuiltinWidgets()

// 解耦核心：不在此硬编码任何能力包。
// 通过 import.meta.glob 自动发现 packages/web-capability-*/src/index.ts，
// 每个包在自身 index.ts 中调用 registerWidget 完成自注册（副作用）。
// 新增能力包 = 建目录 + 在注册表登记，本文件永不再改。
const capabilityModules = import.meta.glob('../../packages/web-capability-*/src/index.ts')

// 包目录名（如 web-capability-voice） -> 懒加载器
const loaderByFolder: Record<string, () => Promise<unknown>> = {}
for (const [p, loader] of Object.entries(capabilityModules)) {
  const folder = p.split('/').filter(Boolean).slice(-3, -2)[0]
  if (folder) loaderByFolder[folder] = loader as () => Promise<unknown>
}

function folderOf(pkg: string): string {
  return pkg.split('/').pop() ?? pkg
}

/** 触发某能力包的自注册副作用（导入即注册）。 */
async function loadPkg(pkg: string): Promise<void> {
  const loader = loaderByFolder[folderOf(pkg)]
  if (!loader) return // 不存在的包（如纯 Flutter 能力）静默跳过
  try {
    await loader()
  } catch (e) {
    console.warn('[boot] 能力包加载失败:', pkg, e)
  }
}

/** 按 build_manifest.web_pkgs 并行懒加载所需能力包（自注册生效）。 */
export async function bootWidgetsFromManifest(
  manifest: BuildManifest | null | undefined,
): Promise<void> {
  const pkgs = [...new Set(manifest?.web_pkgs ?? [])]
  if (!pkgs.length) {
    await bootAllWidgets()
    return
  }
  await Promise.all(pkgs.map((pkg) => loadPkg(pkg)))
}

/** 兜底：无 manifest 时并行导入所有已发现的能力包。 */
export async function bootAllWidgets(): Promise<void> {
  await Promise.all(
    Object.values(loaderByFolder).map(async (loader) => {
      try {
        await loader()
      } catch (e) {
        console.warn('[boot] 能力包加载失败:', e)
      }
    }),
  )
}

/** @deprecated use bootWidgetsFromManifest after manifest fetch */
export function bootWidgetRegistry(): void {
  void bootAllWidgets()
}
