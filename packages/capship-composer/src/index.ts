export type {
  ComposerMode,
  ComposerInput,
  ComposerEvents,
  ComposerPageSchema,
  ComposerModuleItem,
  ComposerMenuItem,
  ComposerPageMock,
  ComposerBuildManifest,
  ComposeEditOp,
  FlowEditOp,
  ModuleFlowPersist,
  SchemaRevisionItem,
} from './types'
export { COMPOSER_MODES } from './types'
export {
  patchRuntimeSchema,
  patchRuntimeModules,
  fetchRuntimeSchema,
  fetchSchemaRevisions,
  restoreSchemaRevision,
  SchemaRevConflictError,
  askComposeEdit,
  askComposeEditStream,
  askFlowEdit,
  fetchCodegenJob,
  cancelCodegenJob,
  findActiveCodegenJob,
  upsertSchemaChangeDraft,
  submitSchemaChange,
  listSchemaChanges,
  approveSchemaChange,
  rejectSchemaChange,
} from './api'
export type { SchemaChangeItem, ComposeThinkingStep, ComposeEditResult } from './api'
/** @deprecated 产品面 API — 请改从 `@capship/composer/product` 或 `./productAdapters` 引入 */
export { fetchIndustryAssembly } from './productAdapters'
export {
  applyFlowEditOps,
  buildDefaultModuleFlow,
  readModuleFlowFromSchema,
  moveFlowStepLocal,
  removeFlowStepLocal,
} from './flowOps'
export {
  commitLocalSchemaRevision,
  getLocalSchemaRevision,
  listLocalSchemaRevisions,
} from './localSchemaRevisions'
export type { LocalSchemaRevision } from './localSchemaRevisions'
export { notifySchemaUpdated, subscribeSchemaUpdated } from './schemaSyncChannel'
export type { SchemaSyncMessage } from './schemaSyncChannel'
export { notifyQuotaUpdated, subscribeQuotaUpdated } from './quotaSyncChannel'
export type { QuotaSyncMessage } from './quotaSyncChannel'
export { CapShipComposer, applyComposeOps, type CapShipComposerProps } from './CapShipComposer'
export { CapShipComposerDock, type CapShipComposerDockProps } from './CapShipComposerDock'
