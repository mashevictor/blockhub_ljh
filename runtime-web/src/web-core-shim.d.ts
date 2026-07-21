/** Type-only shim：tsc 不编译 packages/web-core 源码。 */
import type { ReactNode } from 'react'

export interface DeveloperBlueprintPanelProps {
  mode: 'app' | 'preview'
  appId?: string
  pack?: string
  token: string
  role?: string
  accent?: string
  className?: string
  variant?: 'float' | 'embedded'
  onAuth?: (auth: { token: string; role: string; display_name: string }) => void
}

export type DeveloperBlueprintMode = DeveloperBlueprintPanelProps['mode']
export type DeveloperBlueprint = Record<string, unknown>

export declare function DeveloperBlueprintPanel(props: DeveloperBlueprintPanelProps): ReactNode

export interface AuthUser {
  email: string
  role: string
  display_name: string
}

export declare function apiFetch<T = unknown>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T>

export declare function useRuntime(): {
  token: string
  primaryColor?: string
  appId?: string
  user?: AuthUser & Record<string, unknown>
  schema?: PageSchema | null
}

export type GtgtStep = {
  key: string
  label: string
  placeholder?: string
  hint?: string
  optional?: boolean
  inputType?: string
  render?: (ctx: { value: string; setValue: (v: string) => void; accent: string }) => ReactNode
}

export declare function GtgtStepComposer(props: {
  title: string
  meta?: string
  accent?: string
  steps: GtgtStep[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onComplete: () => void | Promise<void>
  busy?: boolean
  submitLabel?: string
  flowHint?: string
  resetKey?: string | number
  variant?: 'default' | 'soft'
  children?: ReactNode
}): ReactNode

export declare function resolveFormFieldDefs(opts: {
  defaults?: Array<{ key: string; label: string; placeholder?: string; optional?: boolean; type?: string }>
  formFields?: unknown
  pageMockFields?: unknown
}): Array<{ key: string; label: string; placeholder?: string; optional?: boolean; type?: string }>

export interface BuildManifest {
  version?: string
  capability_keys: string[]
  web_pkgs: string[]
  flutter_pkgs?: string[]
  widgets?: string[]
  routes?: string[]
  agents?: string[]
  deliver?: string
  meta?: Record<string, unknown>
}

export type SchemaNodeType = string

export interface SchemaNode {
  id: string
  type: SchemaNodeType
  props?: Record<string, unknown>
  children?: SchemaNode[]
}

export interface PageSchema {
  version?: string
  appId?: string
  title?: string
  capability_keys: string[]
  menu?: Array<{ key: string; label: string; route?: string; [k: string]: unknown }>
  theme?: { primaryColor?: string; templateId?: string; mode?: string }
  meta?: Record<string, unknown>
  root: SchemaNode
}

export interface TenantRuntimeConfig {
  app_name: string
  app_icon_url?: string
  primary_color?: string
  menu: Array<{ key: string; label: string; route?: string }>
  [k: string]: unknown
}

export declare const RuntimeContext: {
  Provider: (props: { value: unknown; children?: ReactNode }) => ReactNode
}

export declare function WidgetHost(props: { node: SchemaNode; ctx: unknown }): ReactNode
export declare function registerWidget(
  type: string,
  component: (props: { node: SchemaNode; ctx: unknown }) => ReactNode,
): void
export declare function clearAuth(): void
export declare function getStoredToken(): string
export declare function getStoredUser(): AuthUser | null
export declare function login(
  email: string,
  password: string,
): Promise<{ token: string; user: AuthUser }>

export {}
