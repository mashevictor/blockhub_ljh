/**
 * 产品面适配器（非 L3 Composer 核心）。
 * 行业装配 / creation 域 API 仅供积木仓 Home 等产品壳使用；开源 Composer 可裁掉本模块。
 */
export async function fetchIndustryAssembly(packKey: string, sceneNames?: string[]) {
  const q = sceneNames?.length ? `?scenes=${encodeURIComponent(sceneNames.join(','))}` : ''
  const res = await fetch(`/api/v1/creation/industry/${packKey}/assembly${q}`)
  if (!res.ok) throw new Error('industry assembly failed')
  return res.json() as Promise<{
    success: boolean
    assembly: {
      capability_keys: string[]
      scenario_names: string[]
      menu_plan: Array<Record<string, string>>
      groups: Array<{ category: string; scenes: string[] }>
      scene_count: number
      pack_name: string
    }
  }>
}
