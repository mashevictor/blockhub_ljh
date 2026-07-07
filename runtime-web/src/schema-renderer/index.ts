import type { PageSchema, SchemaNode } from './types'

export type { PageSchema, SchemaNode, SchemaNodeType, TenantRuntimeConfig } from './types'

export type WidgetRenderer = (node: SchemaNode, schema: PageSchema) => string

const registry = new Map<string, WidgetRenderer>()

/** Register a capability widget renderer (W3+ loads from packages). */
export function registerWidget(widget: string, renderer: WidgetRenderer): void {
  registry.set(widget, renderer)
}

export function getWidgetRenderer(widget: string): WidgetRenderer | undefined {
  return registry.get(widget)
}

registerWidget('ChatWidget', (node) => `[Chat] ${node.props?.capability_key ?? node.id}`)
registerWidget('ShanghaiVoiceWidget', (node) => `[上海话语音] ${node.props?.route ?? '/voice'}`)
registerWidget('FormWidget', (node) => `[审批表单] ${node.id}`)
registerWidget('ApprovalInboxWidget', (node) => `[待办中心] ${node.id}`)
registerWidget('KBUploadWidget', (node) => `[知识库] ${node.id}`)
registerWidget('DashboardWidget', (node) => `[看板] ${node.id}`)
registerWidget('ListWidget', (node) => `[列表] ${node.id}`)

export function renderSchemaNode(node: SchemaNode, schema?: PageSchema): string {
  const widget = (node.props?.widget as string) || ''
  const custom = widget ? getWidgetRenderer(widget) : undefined
  if (custom && schema) return custom(node, schema)
  const kids = node.children?.map((c) => renderSchemaNode(c, schema)).join(' · ') ?? ''
  return kids ? `[${node.type}] ${node.id}: ${kids}` : `[${node.type}] ${node.id}`
}

export function renderPageSchema(schema: PageSchema): string {
  return `${schema.title} v${schema.version}: ${renderSchemaNode(schema.root, schema)}`
}
