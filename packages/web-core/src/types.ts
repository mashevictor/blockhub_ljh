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
  theme?: { primaryColor?: string; mode?: 'light' | 'dark' }
  menu: Array<{ key: string; label: string; icon: string; route: string }>
  capability_keys: string[]
  root: SchemaNode
}

export interface BuildManifest {
  version: string
  capability_keys: string[]
  widgets: string[]
  routes: string[]
  web_pkgs: string[]
  flutter_pkgs: string[]
  agents: string[]
  deliver: string
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
  page_schema?: PageSchema
  build_manifest?: BuildManifest
}

export interface RuntimeUser {
  email: string
  role: string
  display_name: string
}

export interface RuntimeContextValue {
  appId: string
  config: TenantRuntimeConfig
  schema: PageSchema
  manifest: BuildManifest
  token: string
  user: RuntimeUser
  primaryColor: string
}
