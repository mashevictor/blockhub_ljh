import type { ComponentType } from 'react'
import { registerWidget, type BuildManifest } from '@blockhub/web-core'

type WidgetMap = Record<string, ComponentType<{ node: unknown; ctx: unknown }>>

const PKG_LOADERS: Record<string, () => Promise<WidgetMap>> = {
  '@blockhub/web-capability-chat': async () => {
    const m = await import('@blockhub/web-capability-chat')
    const chat = m.ChatWidget as ComponentType<{ node: unknown; ctx: unknown }>
    return { ChatWidget: chat, VoiceWidget: chat }
  },
  '@blockhub/web-capability-approval': async () => {
    const m = await import('@blockhub/web-capability-approval')
    return {
      FormWidget: m.FormWidget as ComponentType<{ node: unknown; ctx: unknown }>,
      ApprovalInboxWidget: m.ApprovalInboxWidget as ComponentType<{ node: unknown; ctx: unknown }>,
      ListWidget: m.ListWidget as ComponentType<{ node: unknown; ctx: unknown }>,
    }
  },
  '@blockhub/web-capability-voice': async () => {
    const m = await import('@blockhub/web-capability-voice')
    const voice = m.ShanghaiVoiceWidget as ComponentType<{ node: unknown; ctx: unknown }>
    return { ShanghaiVoiceWidget: voice, VoiceStreamWidget: voice, VoiceWidget: voice }
  },
  '@blockhub/web-capability-kb': async () => {
    const m = await import('@blockhub/web-capability-kb')
    return { KBUploadWidget: m.KBUploadWidget as ComponentType<{ node: unknown; ctx: unknown }> }
  },
  '@blockhub/web-capability-dashboard': async () => {
    const m = await import('@blockhub/web-capability-dashboard')
    return { DashboardWidget: m.DashboardWidget as ComponentType<{ node: unknown; ctx: unknown }> }
  },
}

/** Register only widgets referenced by build_manifest (lazy import per package). */
export async function bootWidgetsFromManifest(manifest: BuildManifest | null | undefined): Promise<void> {
  const pkgs = [...new Set(manifest?.web_pkgs ?? [])]
  if (!pkgs.length) {
    await bootAllWidgets()
    return
  }
  for (const pkg of pkgs) {
    const loader = PKG_LOADERS[pkg]
    if (!loader) continue
    const widgets = await loader()
    for (const [name, Comp] of Object.entries(widgets)) {
      registerWidget(name, Comp)
    }
  }
}

/** Fallback: register all known capability widgets. */
export async function bootAllWidgets(): Promise<void> {
  for (const loader of Object.values(PKG_LOADERS)) {
    const widgets = await loader()
    for (const [name, Comp] of Object.entries(widgets)) {
      registerWidget(name, Comp)
    }
  }
}

/** @deprecated use bootWidgetsFromManifest after manifest fetch */
export function bootWidgetRegistry(): void {
  void bootAllWidgets()
}
