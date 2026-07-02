import type { SuggestModuleItem } from '../api/client'
import { suggestModules as suggestModulesApi } from '../api/client'
import { moduleId, type PromptModule } from '../components/agentInputLogic'
import { resolveAppBundle, type ResolvedAppBundle } from './appAssembly'
import { MODULE_ICON_KEYS } from './iconPalette'

function suggestItemToModule(it: SuggestModuleItem): PromptModule {
  const type = it.type === 'industry' ? 'industry' as const : 'module' as const
  const pick = { type, key: it.key, label: it.label }
  return {
    id: moduleId(pick),
    type,
    key: it.key,
    label: it.label,
    iconKey: MODULE_ICON_KEYS[it.key] ?? 'creation',
    source: 'suggest',
  }
}

export interface ResolvePublishBundleOpts {
  userModules: PromptModule[]
  promptText: string
  scenarioIds: string[]
  catalogNames: Map<string, string>
  intentText: string
}

/** 发布前：调用后端 suggest（含 DeepSeek）解析意图，再组装 bundle */
export async function resolvePublishBundle(opts: ResolvePublishBundleOpts): Promise<ResolvedAppBundle> {
  const intent = opts.intentText.trim()
  let suggested: PromptModule[] = []
  let usedLlm = false

  if (intent.length >= 2) {
    try {
      const res = await suggestModulesApi(intent)
      usedLlm = res.used_llm
      const seen = new Set<string>()
      for (const it of res.items) {
        const mod = suggestItemToModule(it)
        if (seen.has(mod.id)) continue
        seen.add(mod.id)
        suggested.push(mod)
      }
      for (const sup of res.supplemented ?? []) {
        const mod: PromptModule = {
          id: moduleId({ type: 'module', key: sup.key }),
          type: 'module',
          key: sup.key,
          label: sup.label,
          iconKey: 'creation',
          source: 'suggest',
        }
        if (seen.has(mod.id)) continue
        seen.add(mod.id)
        suggested.push(mod)
      }
    } catch {
      suggested = []
    }
  }

  const hasUserPicks = opts.userModules.some((m) => m.type !== 'action')
  const skipBaseline = suggested.length > 0 && (usedLlm || !hasUserPicks)

  return resolveAppBundle({
    userModules: opts.userModules,
    promptText: opts.promptText,
    scenarioIds: opts.scenarioIds,
    catalogNames: opts.catalogNames,
    suggestedModules: suggested,
    skipBaseline,
    intentLabel: intent,
  })
}
