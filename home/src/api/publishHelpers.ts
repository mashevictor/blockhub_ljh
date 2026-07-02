import type { CreatedApp } from './client'
import type { PublishResult, PublishedModuleItem } from '../data/constants'
import { PUBLIC_BASE_URL } from '../data/constants'

export interface PublishResultOptions {
  moduleCount?: number
  modules?: PublishedModuleItem[]
  scenarios?: string[]
}

export function createdAppToPublishResult(app: CreatedApp, opts: PublishResultOptions = {}): PublishResult {
  const id = app.id || app.schema_url.split('/').pop() || ''
  const modules = opts.modules ?? app.modules?.map((m) => ({
    key: m.key,
    label: m.label,
    iconKey: m.icon_key ?? 'creation',
    kind: m.kind as PublishedModuleItem['kind'],
    source: m.source as PublishedModuleItem['source'],
  })) ?? []

  const webUrl = app.web_url || `${PUBLIC_BASE_URL}/r/${id}`
  const downloadUrl = app.download_url || `${PUBLIC_BASE_URL}/r/${id}/download`
  const appQr = app.app_qr || webUrl

  return {
    appName: app.name,
    webUrl,
    downloadUrl,
    appQr,
    moduleCount: opts.moduleCount ?? (modules.length || app.scenarios.length),
    modules,
    scenarios: opts.scenarios ?? app.scenarios,
    appId: app.id,
    schemaUrl: app.schema_url,
    source: app.source,
  }
}
