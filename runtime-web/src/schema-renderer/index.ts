import type { PageSchema, SchemaNode } from './types'

export type { PageSchema, SchemaNode, SchemaNodeType, TenantRuntimeConfig } from './types'

/** Minimal placeholder renderer — full implementation in W5+. */
export function renderSchemaNode(node: SchemaNode): string {
  return `[${node.type}] ${node.id}`
}

export function renderPageSchema(schema: PageSchema): string {
  return `${schema.title} v${schema.version}: ${renderSchemaNode(schema.root)}`
}
