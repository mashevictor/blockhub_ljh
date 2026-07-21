import type { CSSProperties, ReactNode } from 'react'

export interface BlueprintColumn {
  name: string
  type: string
  nullable: string
  primary_key?: string
}

export interface BlueprintApi {
  method: string
  path: string
  desc?: string
  auth?: string
}

export interface BlueprintModule {
  capability_key: string
  name: string
  category?: string
  table?: { name: string; label?: string; kind_filter?: string } | null
  columns?: BlueprintColumn[]
  apis?: BlueprintApi[]
  code_paths?: string[]
  client_snippet?: string
}

export interface DeveloperBlueprint {
  success?: boolean
  capability_keys?: string[]
  modules?: BlueprintModule[]
  download?: { requires_role?: string; hint?: string }
  openapi_url?: string
  app?: { public_id?: string; name?: string }
}

export type DeveloperBlueprintMode = 'app' | 'preview'

export interface DeveloperBlueprintPanelProps {
  mode: DeveloperBlueprintMode
  appId?: string
  pack?: string
  token: string
  role?: string
  accent?: string
  className?: string
  /** float=独立悬浮；embedded=嵌在 Composer「交付」Tab */
  variant?: 'float' | 'embedded'
  onAuth?: (auth: { token: string; role: string; display_name: string }) => void
}

export declare function DeveloperBlueprintPanel(props: DeveloperBlueprintPanelProps): ReactNode

export {}
