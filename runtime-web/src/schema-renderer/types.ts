/** Page Schema types — shared contract with Flutter WidgetRegistry (D5 skeleton). */

export type SchemaNodeType =
  | 'page'
  | 'section'
  | 'text'
  | 'button'
  | 'list'
  | 'form'
  | 'chat'
  | 'approval'
  | 'chart'

export interface SchemaNode {
  id: string
  type: SchemaNodeType
  props?: Record<string, unknown>
  children?: SchemaNode[]
}

export interface PageSchema {
  version: string
  appId: string
  title: string
  theme?: {
    primaryColor?: string
    mode?: 'light' | 'dark'
  }
  root: SchemaNode
}

export interface TenantRuntimeConfig {
  tenant_slug: string
  tenant_name: string
  app_name: string
  app_icon_url?: string
  primary_color: string
  theme: string
  api_base_url: string
  menu: Array<{ key: string; label: string; icon: string; route?: string }>
  features?: Record<string, boolean>
  app?: {
    id: string
    name: string
    schema_url: string
    modules: unknown[]
    capability_keys: string[]
  }
}
