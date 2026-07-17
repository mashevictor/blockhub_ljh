/** 对外类型入口：供 home/runtime `tsc` 解析，避免编译进包内 .tsx（无独立 react 安装） */
import type { ComponentType } from 'react'

export type ComposerMode = 'live_edit' | 'module_flow' | 'select_modules'

export declare const COMPOSER_MODES: Array<{ id: ComposerMode; label: string; desc: string }>

export interface ComposerPageMock {
  form_title?: string
  fields?: Array<{ label: string; value?: string }>
  list_title?: string
  list?: Array<{ id: string; title: string; status: string }>
  chat_title?: string
  chat?: Array<{ role: string; text: string }>
  files_title?: string
  files?: string[]
  kpis?: Array<{ label: string; value: string; hint?: string }>
  primary_action?: string
}

export interface ComposerMenuItem {
  key: string
  label: string
  route: string
  icon?: string
  category?: string
  capability_key?: string
  summary?: string
  page_kind?: string
  page_mock?: ComposerPageMock
}

export interface ComposerPageSchema {
  version?: string
  appId?: string
  title?: string
  menu: ComposerMenuItem[]
  capability_keys: string[]
  meta?: Record<string, unknown>
  theme?: { primaryColor?: string; mode?: string; templateId?: string }
  root: {
    id: string
    type: string
    props?: Record<string, unknown>
    children?: Array<{
      id: string
      type: string
      props?: Record<string, unknown>
    }>
  }
}

export interface ComposerBuildManifest {
  web_pkgs?: string[]
  flutter_pkgs?: string[]
  capability_keys?: string[]
}

export interface ComposerModuleItem {
  key: string
  label: string
  kind?: string
  source?: string
  category?: string
}

export interface ModuleFlowPersist {
  appKey: string
  steps: Array<{ id: string; label: string; note: string; order: number }>
  updatedAt: string
}

export type ComposeEditOp =
  | {
      op: 'add'
      label: string
      capability_key?: string
      category?: string
      summary?: string
      page_kind?: string
      page_mock?: ComposerPageMock
    }
  | { op: 'remove'; label: string }
  | { op: 'rename'; from: string; to: string }
  | { op: 'move'; label: string; index?: number }

export type FlowEditOp =
  | { op: 'add'; label: string; note?: string; after?: string }
  | { op: 'remove'; label: string }
  | { op: 'rename'; from: string; to: string }
  | { op: 'move'; label: string; index?: number }
  | { op: 'note'; label: string; note: string }

export interface ComposerInput {
  appId?: string
  capability_keys?: string[]
  page_schema?: ComposerPageSchema | null
  build_manifest?: ComposerBuildManifest | null
  industry_pack?: string
  scene_ids?: string[]
  modules?: ComposerModuleItem[]
  token?: string | null
}

export interface ComposerEvents {
  onModeChange?: (mode: ComposerMode) => void
  onModulesChange?: (keys: string[], modules: ComposerModuleItem[]) => void
  onSchemaPatch?: (schema: ComposerPageSchema) => void
  onFlowChange?: (flow: ModuleFlowPersist) => void
  onPublish?: (payload: { appId?: string; schema?: ComposerPageSchema; keys?: string[] }) => void
  onSaved?: (result: {
    page_schema?: ComposerPageSchema
    capability_keys?: string[]
    schema_rev?: number
  }) => void
  onError?: (message: string) => void
}

export interface SchemaRevisionItem {
  rev: number
  summary: string
  source: string
  editor_name: string
  created_at?: string | null
}

export interface CapShipComposerProps extends ComposerInput, ComposerEvents {
  mode?: ComposerMode
  defaultMode?: ComposerMode
  catalog?: ComposerModuleItem[]
  className?: string
  compact?: boolean
}

export interface CapShipComposerDockProps extends ComposerInput, ComposerEvents {
  defaultMode?: ComposerMode
  defaultOpen?: boolean
  storageKey?: string
}

export declare const CapShipComposer: ComponentType<CapShipComposerProps>
export declare const CapShipComposerDock: ComponentType<CapShipComposerDockProps>

export declare function applyComposeOps(
  schema: ComposerPageSchema,
  ops: ComposeEditOp[],
): ComposerPageSchema

export declare class SchemaRevConflictError extends Error {
  status: number
  schema_rev: number
  schema_editor_name: string
  page_schema?: ComposerPageSchema
}

export declare function fetchRuntimeSchema(
  appId: string,
  opts?: { token?: string | null },
): Promise<{
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
  schema_updated_at?: string | null
}>

export declare function fetchSchemaRevisions(
  appId: string,
  opts?: { token?: string | null; limit?: number },
): Promise<{ schema_rev: number; schema_editor_name?: string; items: SchemaRevisionItem[] }>

export declare function restoreSchemaRevision(
  appId: string,
  body: { rev: number; base_rev?: number; force?: boolean },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
}>

export declare function patchRuntimeSchema(
  appId: string,
  pageSchema: ComposerPageSchema,
  opts?: {
    token?: string | null
    mergeMeta?: Record<string, unknown>
    baseRev?: number | null
    force?: boolean
    source?: string
  },
): Promise<{
  success: boolean
  page_schema: ComposerPageSchema
  schema_rev: number
  schema_editor_name?: string
}>

export declare function patchRuntimeModules(
  appId: string,
  body: {
    capability_keys: string[]
    modules?: Array<Record<string, unknown>>
    rebuild_schema?: boolean
    menu_plan?: Array<Record<string, unknown>>
    base_rev?: number | null
    force?: boolean
    source?: string
  },
  opts?: { token?: string | null },
): Promise<{
  success: boolean
  page_schema?: ComposerPageSchema
  capability_keys?: string[]
  build_manifest?: Record<string, unknown>
  schema_rev?: number
  schema_editor_name?: string
}>

export declare function fetchIndustryAssembly(
  packKey: string,
  sceneNames?: string[],
): Promise<{
  success: boolean
  assembly: {
    capability_keys: string[]
    scenario_names: string[]
    menu_plan: Array<Record<string, string>>
    groups: Array<{ category: string; scenes: string[] }>
    scene_count: number
    pack_name: string
  }
}>

export declare function askComposeEdit(
  body: {
    instruction: string
    app_name?: string
    menu?: Array<{ key?: string; label?: string; capability_key?: string; category?: string }>
    capability_keys?: string[]
  },
  opts?: { token?: string | null },
): Promise<{
  reply: string
  ops: ComposeEditOp[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
  intent_summary?: string
  matched?: Array<{ key: string; label?: string; score?: number }>
  pending_codegen_keys?: string[]
  codegen_job_id?: string
}>

export declare function askFlowEdit(
  body: {
    instruction: string
    app_name?: string
    steps?: Array<{ id?: string; label?: string; note?: string; order?: number }>
    available_labels?: string[]
  },
  opts?: { token?: string | null },
): Promise<{
  reply: string
  ops: FlowEditOp[]
  source: 'deepseek' | 'fallback'
  llm_configured: boolean
}>
