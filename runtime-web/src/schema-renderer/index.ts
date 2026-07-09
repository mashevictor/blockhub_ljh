import type { PageSchema, SchemaNode } from './types'

export type { PageSchema, SchemaNode, SchemaNodeType, TenantRuntimeConfig } from './types'

export type WidgetRenderer = (node: SchemaNode, schema: PageSchema) => string

const registry = new Map<string, WidgetRenderer>()

/** 注册一个能力 widget 的 W3 文本渲染器（默认为通用渲染，新增能力无需改此文件）。 */
export function registerWidget(widget: string, renderer: WidgetRenderer): void {
  registry.set(widget, renderer)
}

export function getWidgetRenderer(widget: string): WidgetRenderer | undefined {
  return registry.get(widget)
}

export function renderSchemaNode(node: SchemaNode, schema?: PageSchema): string {
  const widget = (node.props?.widget as string) || ''
  const custom = widget ? getWidgetRenderer(widget) : undefined
  if (custom && schema) return custom(node, schema)
  // 通用兜底：新增能力即使未注册专属渲染器也能直接呈现（解耦：无需硬编码逐 widget）。
  const label = (node.props?.capability_key as string) || node.type || node.id
  const kids = node.children?.map((c) => renderSchemaNode(c, schema)).join(' · ') ?? ''
  return kids
    ? `[${label}] ${node.id}: ${kids}`
    : `[${label}] ${node.id}`
}

export function renderPageSchema(schema: PageSchema): string {
  return `${schema.title} v${schema.version}: ${renderSchemaNode(schema.root, schema)}`
}
