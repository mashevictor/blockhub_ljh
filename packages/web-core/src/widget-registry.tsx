import type { ComponentType, ReactNode } from 'react'
import type { RuntimeContextValue, SchemaNode } from './types'

export type WidgetComponent = ComponentType<{ node: SchemaNode }>

const registry = new Map<string, WidgetComponent>()

export function registerWidget(widget: string, component: WidgetComponent): void {
  registry.set(widget, component)
}

export function getWidget(widget: string): WidgetComponent | undefined {
  return registry.get(widget)
}

export function resolveWidgetName(node: SchemaNode): string {
  const widget = node.props?.widget
  if (typeof widget === 'string' && widget) return widget
  const type = node.type
  const map: Record<string, string> = {
    chat: 'ChatWidget',
    approval: 'FormWidget',
    form: 'FormWidget',
    list: 'ListWidget',
    chart: 'DashboardWidget',
  }
  return map[type] || 'ListWidget'
}

export function WidgetHost({ node, ctx }: { node: SchemaNode; ctx: RuntimeContextValue }) {
  const name = resolveWidgetName(node)
  const Comp = getWidget(name)
  if (!Comp) {
    return (
      <div className="widget-missing">
        未注册组件 <code>{name}</code>（capability: {String(node.props?.capability_key ?? node.id)}）
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
