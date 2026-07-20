import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import type { RuntimeContextValue, SchemaNode } from './types'

export type WidgetComponent = ComponentType<{ node: SchemaNode }>

const registry = new Map<string, WidgetComponent>()
const listeners = new Set<() => void>()

export function registerWidget(widget: string, component: WidgetComponent): void {
  registry.set(widget, component)
  listeners.forEach((fn) => fn())
}

export function getWidget(widget: string): WidgetComponent | undefined {
  return registry.get(widget)
}

function subscribeWidgets(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function resolveWidgetName(node: SchemaNode): string {
  const widget = node.props?.widget
  if (typeof widget === 'string' && widget) return widget
  const type = node.type
  const map: Record<string, string> = {
    chat: 'ChatWidget',
    voice: 'VoiceWidget',
    voicestream: 'VoiceStreamWidget',
    shanghaivoice: 'ShanghaiVoiceWidget',
    multiagent: 'MultiAgentWidget',
    nlquery: 'NLQueryWidget',
    summary: 'SummaryWidget',
    funnel: 'FunnelWidget',
    inbox: 'InboxWidget',
    email: 'EmailWidget',
    erp: 'ERPWidget',
    meeting: 'MeetingWidget',
    helpdesk: 'HelpdeskWidget',
    asset: 'AssetWidget',
    im: 'IMWidget',
    rbac: 'RBACWidget',
    approval: 'FormWidget',
    form: 'FormWidget',
    list: 'ListWidget',
    chart: 'DashboardWidget',
    dashboard: 'DashboardWidget',
    kbupload: 'KBUploadWidget',
    kbdocument: 'KBUploadWidget',
    audit: 'AuditWidget',
    mask: 'MaskWidget',
    securitymask: 'MaskWidget',
    landing_hero: 'LandingHeroWidget',
    landinghero: 'LandingHeroWidget',
    generated_page: 'GeneratedPageWidget',
    generatedpage: 'GeneratedPageWidget',
  }
  return map[type] || 'ListWidget'
}

const WIDGET_LOAD_GRACE_MS = 12_000

export function WidgetHost({ node, ctx }: { node: SchemaNode; ctx: RuntimeContextValue }) {
  const name = resolveWidgetName(node)
  const [, setTick] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const Comp = getWidget(name)

  // 能力包异步 register 后自动重渲染；宽限期内显示 loading，避免误报「尚未接入」
  useEffect(() => {
    if (Comp) {
      setElapsedMs(0)
      return
    }
    setElapsedMs(0)
    const unsub = subscribeWidgets(() => setTick((n) => n + 1))
    const started = Date.now()
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - started)
      setTick((t) => t + 1)
      if (getWidget(name) || Date.now() - started >= WIDGET_LOAD_GRACE_MS) {
        window.clearInterval(timer)
      }
    }, 200)
    return () => {
      unsub()
      window.clearInterval(timer)
    }
  }, [name, Comp])

  if (!Comp) {
    const capKey = String(node.props?.capability_key ?? node.id ?? '')
    const menuLabel = ctx.schema.menu.find((m) => m.key === capKey || m.capability_key === capKey)?.label
    const displayName = menuLabel || capKey || name
    const stillLoading = elapsedMs < WIDGET_LOAD_GRACE_MS
    return (
      <div className={stillLoading ? 'widget-loading' : 'widget-missing'} role="status">
        {stillLoading ? (
          <div className="widget-loading-spinner" aria-hidden />
        ) : (
          <div className="widget-missing-icon" aria-hidden>
            ◇
          </div>
        )}
        <strong>{displayName}</strong>
        <p>
          {stillLoading
            ? '正在加载能力模块，请稍候…'
            : '该能力在 Web 端尚未接入，请使用移动端 App 或联系管理员。'}
        </p>
        <small>
          组件 <code>{name}</code>
          {capKey ? ` · capability: ${capKey}` : ''}
          {stillLoading ? ' · 加载中' : ''}
        </small>
      </div>
    )
  }
  return (
    <RuntimeContextBridge value={ctx}>
      <Comp node={node} />
    </RuntimeContextBridge>
  )
}

// Avoid circular import — bridge only for widget subtree
import { RuntimeContext } from './RuntimeContext'

function RuntimeContextBridge({
  value,
  children,
}: {
  value: RuntimeContextValue
  children: ReactNode
}) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>
}
