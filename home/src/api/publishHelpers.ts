import type { CreatedApp } from './client'
import type { PublishResult, PublishedModuleItem } from '../data/constants'

export interface PublishResultOptions {
  moduleCount?: number
  modules?: PublishedModuleItem[]
  scenarios?: string[]
}

export function createdAppToPublishResult(app: CreatedApp, opts: PublishResultOptions = {}): PublishResult {
  const id = app.schema_url.split('/').pop() ?? app.id
  const modules = opts.modules ?? app.modules?.map((m) => ({
    key: m.key,
    label: m.label,
    iconKey: m.icon_key ?? 'creation',
    kind: m.kind as PublishedModuleItem['kind'],
    source: m.source as PublishedModuleItem['source'],
  })) ?? []

  return {
    appName: app.name,
    webUrl: `https://app.trackchat.io${app.schema_url}`,
    appQr: `trackchat://app/${id}`,
    moduleCount: opts.moduleCount ?? (modules.length || app.scenarios.length),
    modules,
    scenarios: opts.scenarios ?? app.scenarios,
    appId: app.id,
    schemaUrl: app.schema_url,
    source: app.source,
  }
}
