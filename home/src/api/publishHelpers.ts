import type { CreatedApp } from './client'
import type { PublishResult, PublishedModuleItem } from '../data/constants'
import { PUBLIC_BASE_URL } from '../data/constants'

export interface PublishResultOptions {
  moduleCount?: number
  modules?: PublishedModuleItem[]
  scenarios?: string[]
  contactEmail?: string
  emailSent?: boolean
  emailConfigured?: boolean
  apkReady?: boolean
}

export interface PublishApiResponse {
  app: CreatedApp & { capability_assembly?: PublishResult['capabilityAssembly'] }
  capability_assembly?: PublishResult['capabilityAssembly']
  page_schema?: Record<string, unknown>
  build_manifest?: {
    web_pkgs?: string[]
    flutter_pkgs?: string[]
    capability_keys?: string[]
  }
  runtime?: { apk_ready?: boolean; apk_build_status?: string; web_url?: string; download_url?: string }
  notification?: { email?: string; email_sent?: boolean; email_configured?: boolean }
}

export function createdAppToPublishResult(app: CreatedApp, opts: PublishResultOptions = {}): PublishResult {
  const id = app.id || app.schema_url?.split('/').filter(Boolean).pop() || ''
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
    iconUrl: app.icon_url,
    primaryColor: app.primary_color,
    webUrl,
    downloadUrl,
    appQr,
    moduleCount: opts.moduleCount ?? (modules.length || app.scenarios?.length || 0),
    modules,
    scenarios: opts.scenarios ?? app.scenarios,
    appId: id,
    schemaUrl: app.schema_url,
    source: app.source,
    deliver: (app.deliver as PublishResult['deliver']) ?? 'both',
    contactEmail: opts.contactEmail,
    emailSent: opts.emailSent,
    emailConfigured: opts.emailConfigured,
    apkReady: opts.apkReady,
  }
}

/** 将 POST /creation/publish 响应转为前端 PublishResult */
export function publishApiToResult(res: PublishApiResponse, opts: PublishResultOptions = {}): PublishResult {
  const base = createdAppToPublishResult(res.app, {
    ...opts,
    contactEmail: opts.contactEmail ?? res.notification?.email,
    emailSent: opts.emailSent ?? res.notification?.email_sent,
    emailConfigured: opts.emailConfigured ?? res.notification?.email_configured,
    apkReady: opts.apkReady ?? res.runtime?.apk_ready,
  })
  return {
    ...base,
    buildManifest: res.build_manifest ?? res.app.build_manifest,
    pageSchema: res.page_schema ?? res.app.page_schema,
    capabilityAssembly: res.capability_assembly ?? res.app.capability_assembly,
  }
}
