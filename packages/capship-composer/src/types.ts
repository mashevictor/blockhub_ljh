/** CapShip Composer 模式契约（与后端 Runtime PATCH / compose-edit / flow-edit 对齐） */

export type ComposerMode = 'live_edit' | 'module_flow' | 'select_modules'

export const COMPOSER_MODES: Array<{ id: ComposerMode; label: string; desc: string }> = [
  { id: 'live_edit', label: '对话改页', desc: '说业务需求，理解后挂正式能力包' },
  { id: 'module_flow', label: '数据流', desc: '编排模块链路，对话或手动改流' },
  { id: 'select_modules', label: '选模块', desc: '从目录检索并多选正式能力' },
]

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

export interface ComposerPageMock {
  form_title?: string
  fields?: Array<{
    key?: string
    label: string
    value?: string
    type?: string
    placeholder?: string
    optional?: boolean
  }>
  list_title?: string
  list?: Array<{ id: string; title: string; status: string }>
  chat_title?: string
  chat?: Array<{ role: string; text: string }>
  files_title?: string
  files?: string[]
  kpis?: Array<{ label: string; value: string; hint?: string }>
  primary_action?: string
  /** 特殊交互壳标记（兼容）；优先用 interactive */
  ui_kind?: string
  /** Agent 泛化后的声明式交互（tool_pad 等） */
  interactive?: Record<string, unknown>
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
    change_status?: string
  }) => void
  onError?: (message: string) => void
}

/** 对话改页版本历史条目 */
export interface SchemaRevisionItem {
  rev: number
  summary: string
  source: string
  editor_name: string
  created_at?: string | null
}

export type ComposeEditOp =
  | {
      op: 'add'
      label: string
      capability_key?: string
      /** 注册表 widget 名，如 DeviceRepairWidget；缺省按 capability 推导 */
      widget?: string
      category?: string
      summary?: string
      page_kind?: string
      page_mock?: ComposerPageMock
      pending_codegen?: boolean
      /** SSOT 稳定菜单 key，优先于随机 scene_* */
      scene_key?: string
      scene_name?: string
      form_headline?: string
      form_hint?: string
      default_category?: string
      approval_type?: string
      form_fields?: Array<{ key: string; label: string; type?: string; placeholder?: string; optional?: boolean }>
    }
  | { op: 'remove'; label: string }
  | { op: 'rename'; from: string; to: string }
  | { op: 'move'; label: string; index?: number }
  | {
      /** 改已有场景页的表单控件 / page_mock（如日期文本框→日期选择器） */
      op: 'patch_page'
      label: string
      capability_key?: string
      page_mock?: ComposerPageMock
      form_fields?: Array<{ key: string; label: string; type?: string; placeholder?: string }>
    }

export type FlowEditOp =
  | { op: 'add'; label: string; note?: string; after?: string }
  | { op: 'remove'; label: string }
  | { op: 'rename'; from: string; to: string }
  | { op: 'move'; label: string; index?: number }
  | { op: 'note'; label: string; note: string }

export interface ModuleFlowPersist {
  appKey: string
  steps: Array<{ id: string; label: string; note: string; order: number }>
  updatedAt: string
}
