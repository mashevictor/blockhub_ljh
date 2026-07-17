import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ComposeEditOp,
  ComposerEvents,
  ComposerInput,
  ComposerMode,
  ComposerModuleItem,
  ComposerPageSchema,
  ModuleFlowPersist,
  SchemaRevisionItem,
} from './types'
import { COMPOSER_MODES } from './types'
import {
  SchemaRevConflictError,
  askComposeEdit,
  askFlowEdit,
  approveSchemaChange,
  fetchRuntimeSchema,
  fetchSchemaRevisions,
  listSchemaChanges,
  patchRuntimeModules,
  patchRuntimeSchema,
  rejectSchemaChange,
  restoreSchemaRevision,
  submitSchemaChange,
  upsertSchemaChangeDraft,
  type SchemaChangeItem,
} from './api'
import {
  applyFlowEditOps,
  moveFlowStepLocal,
  readModuleFlowFromSchema,
  removeFlowStepLocal,
} from './flowOps'
import {
  commitLocalSchemaRevision,
  getLocalSchemaRevision,
  listLocalSchemaRevisions,
} from './localSchemaRevisions'

const DEMO_CATALOG: ComposerModuleItem[] = [
  { key: 'chat_qa', label: '智能问答', kind: 'module' },
  { key: 'approval_flow', label: '审批流', kind: 'module' },
  { key: 'kb_document', label: '知识库', kind: 'module' },
  { key: 'chart_dashboard', label: '数据看板', kind: 'module' },
  { key: 'notify_inapp', label: '站内信', kind: 'module' },
  { key: 'device_repair', label: '设备报修', kind: 'module' },
  { key: 'quality_inspect', label: '质检SOP', kind: 'module' },
  { key: 'inventory_count', label: '物料盘点', kind: 'module' },
  { key: 'data_nl_query', label: '智能问数', kind: 'module' },
  { key: 'leave_request', label: '请假审批', kind: 'module' },
]

export interface CapShipComposerProps extends ComposerInput, ComposerEvents {
  mode?: ComposerMode
  defaultMode?: ComposerMode
  catalog?: ComposerModuleItem[]
  className?: string
  compact?: boolean
}

function cloneSchema(schema: ComposerPageSchema | null | undefined): ComposerPageSchema | null {
  if (!schema) return null
  return JSON.parse(JSON.stringify(schema)) as ComposerPageSchema
}

function matchMenuLabel(
  menu: ComposerPageSchema['menu'],
  label: string,
): ComposerPageSchema['menu'][number] | undefined {
  const t = label.trim()
  return menu.find((m) => m.label === t) || menu.find((m) => m.label.includes(t) || t.includes(m.label))
}

/** 与 backend capability_registry.widget 对齐的兜底表（后端 op.widget 优先） */
const CAP_WIDGET_FALLBACK: Record<string, string> = {
  chat_qa: 'ChatWidget',
  leave_request: 'LeaveRequestWidget',
  expense_claim: 'ExpenseClaimWidget',
  hire_onboard: 'HireOnboardWidget',
  device_repair: 'DeviceRepairWidget',
  quality_inspect: 'QualityInspectWidget',
  inventory_count: 'InventoryCountWidget',
  member_loyalty: 'MemberLoyaltyWidget',
  meeting_booking: 'MeetingBookingWidget',
  it_ticket: 'ItTicketWidget',
  it_helpdesk: 'ItTicketWidget',
  asset_manage: 'AssetManageWidget',
  seal_request: 'FormWidget',
  approval_flow: 'FormWidget',
  approval_inbox: 'InboxWidget',
  policy_qa: 'PolicyQaWidget',
  kb_document: 'KBUploadWidget',
  chart_dashboard: 'DashboardWidget',
  data_nl_query: 'NLQueryWidget',
  notify_inapp: 'InboxWidget',
  notify_im: 'IMWidget',
  med_triage: 'MedTriageWidget',
  nurse_shift: 'NurseShiftWidget',
  property_repair: 'PropertyRepairWidget',
  hotel_booking: 'HotelBookingWidget',
  house_viewing: 'HouseViewingWidget',
  delivery_order: 'DeliveryOrderWidget',
  site_patrol: 'SitePatrolWidget',
  sales_lead: 'SalesLeadWidget',
  quote_contract: 'QuoteContractWidget',
  ops_kpi: 'OpsKpiWidget',
  school_notice: 'SchoolNoticeWidget',
  homework_qa: 'HomeworkQaWidget',
  class_schedule: 'ClassScheduleWidget',
  game_support: 'GameSupportWidget',
  legal_case: 'LegalCaseWidget',
  gov_service: 'GovServiceWidget',
  shanghai_voice: 'ShanghaiVoiceWidget',
}

function resolveAddWidget(cap: string, explicit?: string): string {
  if (explicit && /Widget$/.test(explicit)) return explicit
  if (cap.startsWith('gen_')) return 'GeneratedPageWidget'
  return CAP_WIDGET_FALLBACK[cap] || 'ListWidget'
}

export function applyComposeOps(schema: ComposerPageSchema, ops: ComposeEditOp[]): ComposerPageSchema {
  let next = cloneSchema(schema)!
  const keys = new Set(next.capability_keys || [])

  for (const op of ops) {
    if (op.op === 'remove') {
      const hit = matchMenuLabel(next.menu, op.label)
      if (!hit) continue
      next = {
        ...next,
        menu: next.menu.filter((m) => m.key !== hit.key),
        root: {
          ...next.root,
          children: (next.root.children || []).filter((c) => c.id !== hit.key),
        },
      }
      continue
    }
    if (op.op === 'rename') {
      const hit = matchMenuLabel(next.menu, op.from)
      if (!hit || !op.to?.trim()) continue
      next = {
        ...next,
        menu: next.menu.map((m) => (m.key === hit.key ? { ...m, label: op.to.trim() } : m)),
      }
      continue
    }
    if (op.op === 'move') {
      const hit = matchMenuLabel(next.menu, op.label)
      if (!hit) continue
      const list = next.menu.filter((m) => m.key !== hit.key)
      const idx = Math.max(0, Math.min(list.length, op.index ?? 0))
      list.splice(idx, 0, hit)
      next = { ...next, menu: list }
      continue
    }
    if (op.op === 'add') {
      const label = (op.label || '').trim()
      if (!label) continue
      if (next.menu.some((m) => m.label === label)) continue
      const cap = op.capability_key || 'chat_qa'
      // 预览 / 带 page_mock：允许同一正式能力对应多个场景页（加班 vs 请假）
      const allowDupCap = Boolean(next.meta?.preview) || Boolean(op.page_mock) || cap.startsWith('gen_')
      if (
        !allowDupCap &&
        [...keys].includes(cap) &&
        next.menu.some((m) => m.capability_key === cap)
      ) {
        continue
      }
      const widget = resolveAddWidget(cap, op.widget)
      const nodeType = widget.replace(/Widget$/i, '').toLowerCase() || cap
      const key = `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      const route = `/s/${key}`
      keys.add(cap)
      const menuItem: ComposerPageSchema['menu'][number] = {
        key,
        label,
        route,
        category: op.category || '自定义',
        capability_key: cap,
        icon: 'module',
        summary: op.summary,
        page_kind: op.page_kind,
      }
      // UI 先行：有 page_mock 一律保留（办公 Runtime 预览靠它展示差异化页面）
      if (op.page_mock) {
        menuItem.page_mock = op.page_mock
      }
      const childProps: Record<string, unknown> = {
        widget,
        capability_key: cap,
        route,
        scene_label: label,
        summary: op.summary,
        page_kind: op.page_kind,
      }
      if (op.page_mock) {
        childProps.page_mock = op.page_mock
        const mockFields = (op.page_mock.fields || [])
          .filter((f) => f.label)
          .map((f, i) => ({
            key: f.key || `f_${i}`,
            label: f.label,
            type: f.type,
            placeholder: f.value,
          }))
        if (mockFields.length) childProps.form_fields = mockFields
      }
      next = {
        ...next,
        capability_keys: [...keys],
        menu: [...next.menu, menuItem],
        root: {
          ...next.root,
          children: [
            ...(next.root.children || []),
            {
              id: key,
              type: nodeType,
              props: childProps,
            },
          ],
        },
      }
      continue
    }
    if (op.op === 'patch_page') {
      const hit =
        matchMenuLabel(next.menu, op.label) ||
        (op.capability_key
          ? next.menu.find((m) => m.capability_key === op.capability_key)
          : undefined)
      if (!hit) continue
      const formFields =
        op.form_fields ||
        (op.page_mock?.fields || [])
          .filter((f) => f.label)
          .map((f, i) => ({
            key: f.key || `f_${i}`,
            label: f.label,
            type: f.type,
            placeholder: f.value,
          }))
      const targetKeys = new Set<string>([hit.key])
      // 预览里同 capability 多场景（请假/加班）一并同步 form_fields
      if (op.capability_key || hit.capability_key) {
        const cap = op.capability_key || hit.capability_key
        for (const m of next.menu) {
          if (m.capability_key === cap) targetKeys.add(m.key)
        }
      }
      next = {
        ...next,
        menu: next.menu.map((m) =>
          targetKeys.has(m.key)
            ? {
                ...m,
                page_mock: op.page_mock
                  ? { ...(m.page_mock || {}), ...op.page_mock }
                  : m.page_mock,
              }
            : m,
        ),
        root: {
          ...next.root,
          children: (next.root.children || []).map((c) =>
            targetKeys.has(c.id)
              ? {
                  ...c,
                  props: {
                    ...(c.props || {}),
                    ...(op.page_mock
                      ? {
                          page_mock: {
                            ...((c.props?.page_mock as object) || {}),
                            ...op.page_mock,
                          },
                        }
                      : {}),
                    ...(formFields.length ? { form_fields: formFields } : {}),
                  },
                }
              : c,
          ),
        },
      }
    }
  }
  return next
}

function withModuleFlow(schema: ComposerPageSchema, flow: ModuleFlowPersist): ComposerPageSchema {
  return {
    ...schema,
    meta: { ...(schema.meta || {}), module_flow: flow },
  }
}

type ChatMsg = { role: 'user' | 'assistant'; text: string }

export function CapShipComposer({
  appId,
  capability_keys: initialKeys,
  page_schema: initialSchema,
  modules: initialModules,
  token,
  mode: controlledMode,
  defaultMode = 'live_edit',
  catalog = DEMO_CATALOG,
  className = '',
  compact = false,
  onModeChange,
  onModulesChange,
  onSchemaPatch,
  onFlowChange,
  onPublish,
  onSaved,
  onError,
}: CapShipComposerProps) {
  const [mode, setMode] = useState<ComposerMode>(controlledMode ?? defaultMode)
  const [keys, setKeys] = useState<string[]>(() => (initialKeys?.length ? [...initialKeys] : ['chat_qa']))
  const [schema, setSchema] = useState<ComposerPageSchema | null>(() => cloneSchema(initialSchema))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [draft, setDraft] = useState('')
  const [flowDraft, setFlowDraft] = useState('')
  const [schemaRev, setSchemaRev] = useState(1)
  const [editorName, setEditorName] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState<SchemaRevisionItem[]>([])
  const [conflict, setConflict] = useState<SchemaRevConflictError | null>(null)
  /** 对话/数据流已改页但未点「保存」→ 草稿，与版本历史区分 */
  const [schemaDirty, setSchemaDirty] = useState(false)
  const [changeId, setChangeId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [changeItems, setChangeItems] = useState<SchemaChangeItem[]>([])
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      text: '直接说业务需求即可。改页先落「本地草稿」（左侧立刻可见）→「保存草稿」（绑你的账号）→「提交审批」；管理员通过后才影响正式 Runtime。',
    },
  ])
  const [flowMessages, setFlowMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: '可以说「在报修后面加审批流」。改动先落草稿，保存后提交审批。' },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const flowListRef = useRef<HTMLDivElement>(null)
  const lastSavedSchemaRef = useRef<ComposerPageSchema | null>(cloneSchema(initialSchema))

  const activeMode = controlledMode ?? mode
  const versionAppKey = String(appId || schema?.appId || 'preview-local')
  const isPreviewLocal =
    Boolean(schema?.meta?.preview) ||
    Boolean(initialSchema?.meta?.preview) ||
    versionAppKey.startsWith('preview-') ||
    !appId

  useEffect(() => {
    if (!initialSchema) return
    // 有未保存草稿时，勿用父组件回传的 schema 覆盖本地草稿
    if (schemaDirty) return
    const cloned = cloneSchema(initialSchema)
    setSchema(cloned)
    lastSavedSchemaRef.current = cloned
  }, [initialSchema, schemaDirty])

  useEffect(() => {
    if (initialKeys?.length) setKeys([...initialKeys])
  }, [initialKeys])

  useEffect(() => {
    if (!isPreviewLocal || !versionAppKey) return
    const local = listLocalSchemaRevisions(versionAppKey)
    if (local.schema_rev > 0) {
      setSchemaRev(local.schema_rev)
      setRevisions(local.items.map(({ page_schema: _ps, ...rest }) => rest))
    }
  }, [isPreviewLocal, versionAppKey])

  useEffect(() => {
    if (!appId || !token || isPreviewLocal) return
    let cancelled = false
    void fetchRuntimeSchema(appId, { token })
      .then((data) => {
        if (cancelled) return
        setSchemaRev(data.schema_rev)
        setEditorName(data.schema_editor_name || '')
        if (data.page_schema) {
          const cloned = cloneSchema(data.page_schema)
          setSchema(cloned)
          lastSavedSchemaRef.current = cloned
          setSchemaDirty(false)
          onSchemaPatch?.(data.page_schema)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
    // 仅挂载 / appId·token 变化时同步版本
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token, isPreviewLocal])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    flowListRef.current?.scrollTo({ top: flowListRef.current.scrollHeight, behavior: 'smooth' })
  }, [flowMessages, busy])

  const menuLabels = useMemo(() => (schema?.menu || []).map((m) => m.label).filter(Boolean), [schema])
  const flow = useMemo(
    () => readModuleFlowFromSchema(schema, menuLabels, appId || schema?.appId || 'preview'),
    [schema, menuLabels, appId],
  )

  const switchMode = (m: ComposerMode) => {
    if (!controlledMode) setMode(m)
    onModeChange?.(m)
  }

  const toggleKey = (key: string) => {
    const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key]
    setKeys(next)
    const mods = catalog.filter((c) => next.includes(c.key))
    onModulesChange?.(next, mods)
  }

  const handleConflict = (err: SchemaRevConflictError) => {
    setConflict(err)
    const who = err.schema_editor_name ? `（${err.schema_editor_name}）` : ''
    const msg = `${err.message}${who}`
    onError?.(msg)
    setStatus(msg)
    setMessages((prev) => [...prev, { role: 'assistant', text: `⚠️ 版本冲突：${msg}` }])
  }

  const pullLatest = async () => {
    if (isPreviewLocal) {
      const saved = lastSavedSchemaRef.current
      if (saved) {
        setSchema(cloneSchema(saved))
        setKeys(saved.capability_keys || keys)
        onSchemaPatch?.(saved)
      }
      setSchemaDirty(false)
      setConflict(null)
      setStatus(`已回到已保存 v${schemaRev}`)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `已丢弃未保存草稿，回到已保存 v${schemaRev}。` },
      ])
      return
    }
    if (!appId) return
    setBusy(true)
    try {
      const data = await fetchRuntimeSchema(appId, { token })
      setSchemaRev(data.schema_rev)
      setEditorName(data.schema_editor_name || '')
      const cloned = cloneSchema(data.page_schema)
      setSchema(cloned)
      lastSavedSchemaRef.current = cloned
      setSchemaDirty(false)
      setKeys(data.page_schema.capability_keys || keys)
      onSchemaPatch?.(data.page_schema)
      setConflict(null)
      setStatus(`已同步到 v${data.schema_rev}`)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `已拉取最新页面 v${data.schema_rev}，可继续对话改页。` },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : '拉取失败'
      onError?.(msg)
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  const loadHistory = async () => {
    const opening = !historyOpen
    setHistoryOpen(opening)
    if (!opening) return
    if (isPreviewLocal) {
      const local = listLocalSchemaRevisions(versionAppKey)
      setRevisions(local.items.map(({ page_schema: _ps, ...rest }) => rest))
      if (local.schema_rev > 0) setSchemaRev(local.schema_rev)
      return
    }
    if (!appId) return
    try {
      const data = await fetchSchemaRevisions(appId, { token })
      setRevisions(data.items || [])
      setSchemaRev(data.schema_rev)
      setEditorName(data.schema_editor_name || '')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '历史加载失败'
      setStatus(msg)
    }
  }

  const restoreRev = async (rev: number) => {
    setBusy(true)
    try {
      if (isPreviewLocal) {
        const hit = getLocalSchemaRevision(versionAppKey, rev)
        if (!hit) {
          setStatus(`本地版本 v${rev} 不存在`)
          return
        }
        const cloned = cloneSchema(hit.page_schema)
        setSchema(cloned)
        lastSavedSchemaRef.current = cloned
        setSchemaDirty(false)
        setKeys(hit.page_schema.capability_keys || keys)
        setSchemaRev(hit.rev)
        onSchemaPatch?.(hit.page_schema)
        setStatus(`已恢复本地 v${rev}（仍可再保存生成新版本）`)
        setHistoryOpen(true)
        return
      }
      if (!appId) return
      const res = await restoreSchemaRevision(
        appId,
        { rev, base_rev: schemaRev, force: false },
        { token },
      )
      setSchemaRev(res.schema_rev)
      setEditorName(res.schema_editor_name || '')
      const cloned = cloneSchema(res.page_schema)
      setSchema(cloned)
      lastSavedSchemaRef.current = cloned
      setSchemaDirty(false)
      setKeys(res.page_schema.capability_keys || keys)
      onSchemaPatch?.(res.page_schema)
      onSaved?.({
        page_schema: res.page_schema,
        capability_keys: res.page_schema.capability_keys,
        schema_rev: res.schema_rev,
      })
      setStatus(`已回滚并生成 v${res.schema_rev}（基于历史 v${rev}）`)
      setConflict(null)
      try {
        const hist = await fetchSchemaRevisions(appId, { token })
        setRevisions(hist.items || [])
      } catch {
        /* ignore */
      }
    } catch (e) {
      if (e instanceof SchemaRevConflictError) handleConflict(e)
      else {
        const msg = e instanceof Error ? e.message : '回滚失败'
        onError?.(msg)
        setStatus(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const applyModules = async (force = false) => {
    if (!appId) {
      onPublish?.({ keys })
      setStatus('已更新本地选型（无 appId，未写库）')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const res = await patchRuntimeModules(
        appId,
        {
          capability_keys: keys,
          modules: (initialModules?.length ? initialModules : catalog.filter((c) => keys.includes(c.key))).map(
            (m) => ({ key: m.key, label: m.label, kind: m.kind || 'module', source: m.source || 'composer' }),
          ),
          rebuild_schema: true,
          base_rev: schemaRev,
          force,
          source: 'modules',
        },
        { token },
      )
      if (res.page_schema) {
        setSchema(res.page_schema)
        onSchemaPatch?.(res.page_schema)
      }
      if (res.capability_keys) setKeys(res.capability_keys)
      if (typeof res.schema_rev === 'number') setSchemaRev(res.schema_rev)
      if (res.schema_editor_name) setEditorName(res.schema_editor_name)
      setConflict(null)
      onSaved?.({
        page_schema: res.page_schema,
        capability_keys: res.capability_keys,
        schema_rev: res.schema_rev,
      })
      setStatus(`模块已保存 · v${res.schema_rev ?? schemaRev}`)
    } catch (e) {
      if (e instanceof SchemaRevConflictError) handleConflict(e)
      else {
        const msg = e instanceof Error ? e.message : '保存失败'
        onError?.(msg)
        setStatus(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const loadChangeQueue = async () => {
    if (!appId || isPreviewLocal) return
    try {
      const data = await listSchemaChanges(appId, { token })
      setIsAdmin(Boolean(data.is_admin))
      const items = data.items || []
      setChangeItems(items)
      const mine = items.find(
        (c) => c.status === 'draft' || c.status === 'pending' || c.status === 'rejected',
      )
      // 无 open 单时必须清空，否则直接发布后仍挂着旧 pending id → 徽章卡「待审批」
      setChangeId(mine?.id ?? null)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!appId || isPreviewLocal) return
    void loadChangeQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token, isPreviewLocal])

  const persistSchema = async (
    next: ComposerPageSchema,
    mergeMeta?: Record<string, unknown>,
    opts?: { force?: boolean; source?: string; summary?: string; directPublish?: boolean },
  ) => {
    const previewLocal =
      Boolean(next.meta?.preview) ||
      Boolean(schema?.meta?.preview) ||
      String(appId || next.appId || '').startsWith('preview-')
    if (!appId || previewLocal) {
      const item = commitLocalSchemaRevision(versionAppKey, next, {
        summary: opts?.summary || '保存草稿为版本',
        source: opts?.source || 'local_save',
        editor_name: '本地',
      })
      const cloned = cloneSchema(next)
      setSchema(cloned)
      lastSavedSchemaRef.current = cloned
      setSchemaDirty(false)
      setSchemaRev(item.rev)
      setEditorName('本地')
      const local = listLocalSchemaRevisions(versionAppKey)
      setRevisions(local.items.map(({ page_schema: _ps, ...rest }) => rest))
      onSchemaPatch?.(next)
      onPublish?.({ schema: next, keys: next.capability_keys })
      onSaved?.({
        page_schema: next,
        capability_keys: next.capability_keys,
        schema_rev: item.rev,
      })
      return
    }

    // 管理员直接发布正式 schema
    if (opts?.directPublish) {
      let merged = next
      if (mergeMeta) {
        merged = {
          ...next,
          meta: { ...(next.meta || {}), ...mergeMeta },
        }
      }
      const res = await patchRuntimeSchema(appId, merged, {
        token,
        mergeMeta,
        baseRev: schemaRev,
        force: opts?.force,
        source: opts?.source ?? 'compose',
        directPublish: true,
      })
      const cloned = cloneSchema(res.page_schema)
      setSchema(cloned)
      lastSavedSchemaRef.current = cloned
      setSchemaDirty(false)
      setChangeId(null)
      // 本地先清掉 pending，避免 loadChangeQueue 返回前徽章仍显示「待审批」
      setChangeItems((prev) =>
        prev.map((c) =>
          c.status === 'draft' || c.status === 'pending'
            ? { ...c, status: 'cancelled' }
            : c,
        ),
      )
      setSchemaRev(res.schema_rev)
      setEditorName(res.schema_editor_name || '')
      setConflict(null)
      onSchemaPatch?.(res.page_schema)
      onSaved?.({
        page_schema: res.page_schema,
        capability_keys: res.page_schema.capability_keys,
        schema_rev: res.schema_rev,
      })
      await loadChangeQueue()
      try {
        const hist = await fetchSchemaRevisions(appId, { token })
        setRevisions(hist.items || [])
      } catch {
        /* ignore */
      }
      return
    }

    // 默认：写入账号绑定的服务端草稿（不改正式业务）
    const res = await upsertSchemaChangeDraft(
      appId,
      {
        page_schema: next,
        summary: opts?.summary || '对话改页草稿',
        change_id: changeId || undefined,
      },
      { token },
    )
    setChangeId(res.change.id)
    setSchemaDirty(false)
    lastSavedSchemaRef.current = cloneSchema(next)
    setStatus(`草稿已保存（账号绑定）· 基于正式 v${res.schema_rev}`)
    await loadChangeQueue()
  }

  /** 将当前改动保存为账号草稿（不进正式 Runtime） */
  const saveDraftSchema = async (force = false) => {
    if (!schema || busy) return
    if (!schemaDirty && !force && changeId) {
      setStatus('当前无新的未保存改动')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      await persistSchema(schema, undefined, {
        force,
        source: isPreviewLocal ? 'local_save' : 'draft_save',
        summary: '对话改页草稿',
      })
      setHistoryOpen(true)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: isPreviewLocal
            ? '草稿已保存到本地版本历史。'
            : '草稿已保存到你的账号。点「提交审批」后管理员才能通过并生效。',
        },
      ])
    } catch (e) {
      if (e instanceof SchemaRevConflictError) handleConflict(e)
      else {
        const msg = e instanceof Error ? e.message : '保存失败'
        onError?.(msg)
        setStatus(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  /** 提交审批 → 通知管理员 */
  const submitForApproval = async () => {
    if (!schema || busy || !appId || isPreviewLocal) return
    setBusy(true)
    setStatus('')
    try {
      const res = await submitSchemaChange(
        appId,
        {
          change_id: changeId || undefined,
          page_schema: schema,
          summary: '对话改页提交审批',
        },
        { token },
      )
      setChangeId(res.change.id)
      setSchemaDirty(false)
      lastSavedSchemaRef.current = cloneSchema(schema)
      setStatus('已提交审批 · 等待管理员通过')
      setHistoryOpen(true)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '已提交审批，管理员将收到通知。通过后才会更新正式 Runtime 业务页面。' },
      ])
      await loadChangeQueue()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '提交失败'
      onError?.(msg)
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  const reviewChange = async (id: string, action: 'approve' | 'reject') => {
    if (!appId || busy) return
    setBusy(true)
    try {
      if (action === 'approve') {
        const res = await approveSchemaChange(appId, id, { comment: '已通过', force: false }, { token })
        if (res.page_schema) {
          const cloned = cloneSchema(res.page_schema)
          setSchema(cloned)
          lastSavedSchemaRef.current = cloned
          onSchemaPatch?.(res.page_schema)
          onSaved?.({
            page_schema: res.page_schema,
            capability_keys: res.page_schema.capability_keys,
            schema_rev: res.schema_rev,
          })
        }
        setSchemaRev(res.schema_rev)
        setSchemaDirty(false)
        setChangeId(null)
        setStatus(`已通过并发布正式 v${res.schema_rev}`)
        try {
          const hist = await fetchSchemaRevisions(appId, { token })
          setRevisions(hist.items || [])
        } catch {
          /* ignore */
        }
      } else {
        await rejectSchemaChange(appId, id, { comment: '已驳回' }, { token })
        setStatus('已驳回该变更')
      }
      await loadChangeQueue()
    } catch (e) {
      if (e instanceof SchemaRevConflictError) handleConflict(e)
      else {
        const msg = e instanceof Error ? e.message : '审批失败'
        onError?.(msg)
        setStatus(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const discardDraft = () => {
    const saved = lastSavedSchemaRef.current
    if (!saved) {
      setStatus('没有可恢复的已保存版本')
      return
    }
    const cloned = cloneSchema(saved)
    setSchema(cloned)
    setKeys(saved.capability_keys || keys)
    setSchemaDirty(false)
    onSchemaPatch?.(saved)
    setStatus(`已丢弃本地未保存改动 · 正式仍为 v${schemaRev}`)
  }

  const commitFlow = async (nextFlow: ModuleFlowPersist) => {
    const base =
      schema ??
      ({
        version: '1',
        appId: appId || 'draft',
        title: '草稿应用',
        menu: [],
        capability_keys: keys,
        root: { id: 'root', type: 'page', props: { layout: 'sidebar' }, children: [] },
      } satisfies ComposerPageSchema)
    const next = withModuleFlow(base, nextFlow)
    setSchema(next)
    setSchemaDirty(true)
    onSchemaPatch?.(next)
    onFlowChange?.(nextFlow)
    setStatus('数据流已写入草稿（未保存）')
  }

  const sendChat = async () => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setBusy(true)
    setStatus('')
    try {
      const base =
        schema ??
        ({
          version: '1',
          appId: appId || 'draft',
          title: '草稿应用',
          menu: [],
          capability_keys: keys,
          root: { id: 'root', type: 'page', props: { layout: 'sidebar' }, children: [] },
        } satisfies ComposerPageSchema)

      const result = await askComposeEdit(
        {
          instruction: text,
          app_name: base.title || '',
          menu: base.menu.map((m) => ({
            key: m.key,
            label: m.label,
            capability_key: m.capability_key,
            category: m.category,
          })),
          capability_keys: keys,
        },
        { token },
      )

      let next = base
      if (result.ops?.length) {
        next = applyComposeOps(base, result.ops)
        if (!next.menu.length) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', text: '至少保留一个菜单项，本次未应用删除。' },
          ])
          return
        }
        setSchema(next)
        setKeys(next.capability_keys)
        setSchemaDirty(true)
        onSchemaPatch?.(next)
      }

      const src = result.source === 'deepseek' ? '' : '（本地规则）'
      const pending = result.pending_codegen_keys
      const asyncHint =
        pending?.length
          ? ` 未覆盖的正式接口将异步生成（${pending.length} 项）。`
          : ''
      const draftHint = result.ops?.length ? ' 已写入草稿，点「保存」记入版本历史。' : ''
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `${result.reply}${src}${asyncHint}${draftHint}` },
      ])
      setStatus(
        result.ops?.length
          ? result.ops.some((o) => o.op === 'patch_page')
            ? '草稿已更新控件 · 未保存'
            : '草稿已更新页面 · 未保存'
          : '',
      )
    } catch (e) {
      if (e instanceof SchemaRevConflictError) {
        handleConflict(e)
        return
      }
      const msg = e instanceof Error ? e.message : '理解失败'
      onError?.(msg)
      setMessages((prev) => [...prev, { role: 'assistant', text: msg }])
    } finally {
      setBusy(false)
    }
  }

  const sendFlowChat = async () => {
    const text = flowDraft.trim()
    if (!text || busy) return
    setFlowDraft('')
    setFlowMessages((prev) => [...prev, { role: 'user', text }])
    setBusy(true)
    setStatus('')
    try {
      const result = await askFlowEdit(
        {
          instruction: text,
          app_name: schema?.title || '',
          steps: flow.steps,
          available_labels: [...menuLabels, ...catalog.map((c) => c.label)],
        },
        { token },
      )
      if (result.ops?.length) {
        const nextFlow = applyFlowEditOps(flow, result.ops)
        if (!nextFlow.steps.length) {
          setFlowMessages((prev) => [
            ...prev,
            { role: 'assistant', text: '至少保留一个数据流节点，本次未应用删除。' },
          ])
          return
        }
        try {
          await commitFlow(nextFlow)
        } catch (pe) {
          if (pe instanceof SchemaRevConflictError) {
            handleConflict(pe)
            return
          }
          throw pe
        }
      }
      const src = result.source === 'deepseek' ? '' : '（本地规则）'
      setFlowMessages((prev) => [...prev, { role: 'assistant', text: `${result.reply}${src}` }])
      setStatus(result.ops?.length ? '数据流已写入草稿（未保存）' : '')
    } catch (e) {
      if (e instanceof SchemaRevConflictError) {
        handleConflict(e)
        return
      }
      const msg = e instanceof Error ? e.message : '理解失败'
      onError?.(msg)
      setFlowMessages((prev) => [...prev, { role: 'assistant', text: msg }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`capship-composer${compact ? ' is-compact' : ''} ${className}`.trim()}>
      <div className="capship-composer-tabs" role="tablist">
        {COMPOSER_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={activeMode === m.id}
            className={`capship-composer-tab${activeMode === m.id ? ' active' : ''}`}
            onClick={() => switchMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="capship-composer-version" aria-live="polite">
        {schemaDirty ? (
          <span className="capship-composer-version-badge is-draft">未保存</span>
        ) : changeItems.some((c) => c.id === changeId && c.status === 'pending') ? (
          <span className="capship-composer-version-badge is-pending">待审批</span>
        ) : (
          <span className="capship-composer-version-badge">v{schemaRev}</span>
        )}
        <span className="capship-composer-version-meta">
          {schemaDirty
            ? `本地草稿 · 正式仍为 v${schemaRev}`
            : isPreviewLocal
              ? '预览本地版本（无审批流）'
              : changeItems.some((c) => c.id === changeId && c.status === 'pending')
                ? '已提交 · 等待管理员通过后影响正式业务'
                : isAdmin
                  ? `正式 v${schemaRev} · 管理员可审批/直接发布`
                  : `正式 v${schemaRev} · 改页需审批后生效`}
        </span>
        <button
          type="button"
          className="capship-composer-btn capship-composer-btn-save"
          disabled={busy || !schema || (!schemaDirty && Boolean(changeId))}
          onClick={() => void saveDraftSchema(true)}
        >
          {busy ? '…' : '保存草稿'}
        </button>
        {!isPreviewLocal && appId ? (
          <button
            type="button"
            className="capship-composer-btn capship-composer-btn-save"
            disabled={busy || !schema}
            onClick={() => void submitForApproval()}
          >
            提交审批
          </button>
        ) : null}
        {!isPreviewLocal && isAdmin && appId && schema ? (
          <button
            type="button"
            className="capship-composer-link"
            disabled={busy}
            onClick={() => {
              void persistSchema(schema, undefined, {
                directPublish: true,
                source: 'admin_direct',
                summary: '管理员直接发布',
              })
                .then(() => {
                  setStatus('已直接发布正式版本')
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', text: '管理员已直接发布，正式 Runtime 已更新。' },
                  ])
                })
                .catch((e) => setStatus(e instanceof Error ? e.message : '发布失败'))
            }}
          >
            直接发布
          </button>
        ) : null}
        {schemaDirty ? (
          <button type="button" className="capship-composer-link" disabled={busy} onClick={discardDraft}>
            丢弃改动
          </button>
        ) : null}
        {!isPreviewLocal && appId ? (
          <button type="button" className="capship-composer-link" disabled={busy} onClick={() => void pullLatest()}>
            拉最新正式版
          </button>
        ) : null}
        <button
          type="button"
          className="capship-composer-link"
          disabled={busy}
          onClick={() => {
            void loadHistory()
            void loadChangeQueue()
          }}
        >
          {historyOpen ? '收起历史' : '版本/审批'}
        </button>
      </div>

      {conflict && (
        <div className="capship-composer-conflict" role="alert">
          <p>
            版本冲突：服务端已是 <strong>v{conflict.schema_rev}</strong>
            {conflict.schema_editor_name ? `（${conflict.schema_editor_name}）` : ''}。请先同步，或强制覆盖。
          </p>
          <div className="capship-composer-conflict-actions">
            <button type="button" disabled={busy} onClick={() => void pullLatest()}>
              拉取最新
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="danger"
                disabled={busy || !schema}
                onClick={() => {
                  if (!schema) return
                  void persistSchema(schema, undefined, {
                    force: true,
                    directPublish: true,
                    source: 'force_overwrite',
                  })
                    .then(() => setStatus('已强制覆盖并生成新版本'))
                    .catch((e) => setStatus(e instanceof Error ? e.message : '覆盖失败'))
                }}
              >
                强制覆盖
              </button>
            ) : null}
          </div>
        </div>
      )}

      {historyOpen && (
        <ul className="capship-composer-history">
          {schemaDirty ? (
            <li className="is-draft-row">
              <div>
                <strong>本地未保存</strong>
                <span>仅本机预览 · 正式仍为 v{schemaRev}</span>
              </div>
              <button
                type="button"
                className="capship-composer-link"
                disabled={busy}
                onClick={() => void saveDraftSchema(true)}
              >
                保存草稿
              </button>
            </li>
          ) : null}
          {changeItems.length > 0 ? (
            changeItems.map((c) => (
              <li key={c.id} className={c.status === 'pending' ? 'is-pending-row' : undefined}>
                <div>
                  <strong>
                    {c.status === 'draft'
                      ? '账号草稿'
                      : c.status === 'pending'
                        ? '待审批'
                        : c.status === 'approved'
                          ? `已通过→v${c.published_rev}`
                          : c.status === 'rejected'
                            ? '已驳回'
                            : c.status}
                  </strong>
                  <span>
                    {c.author_name} · {c.summary}
                    {c.review_comment ? ` · ${c.review_comment}` : ''}
                  </span>
                </div>
                <div className="capship-composer-history-actions">
                  {isAdmin && c.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="capship-composer-link"
                        disabled={busy}
                        onClick={() => void reviewChange(c.id, 'approve')}
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        className="capship-composer-link"
                        disabled={busy}
                        onClick={() => void reviewChange(c.id, 'reject')}
                      >
                        驳回
                      </button>
                    </>
                  ) : null}
                  {c.page_schema && (c.status === 'draft' || c.status === 'rejected') ? (
                    <button
                      type="button"
                      className="capship-composer-link"
                      disabled={busy}
                      onClick={() => {
                        const cloned = cloneSchema(c.page_schema!)
                        setSchema(cloned)
                        setChangeId(c.id)
                        setKeys(c.page_schema!.capability_keys || keys)
                        onSchemaPatch?.(c.page_schema!)
                        setStatus('已载入该草稿')
                      }}
                    >
                      载入
                    </button>
                  ) : null}
                </div>
              </li>
            ))
          ) : null}
          {revisions.length === 0 && !schemaDirty && changeItems.length === 0 ? (
            <li className="muted">暂无版本/审批记录（改页后保存草稿并提交审批）</li>
          ) : (
            revisions.map((r) => (
              <li key={`rev-${r.rev}`}>
                <div>
                  <strong>正式 v{r.rev}</strong>
                  <span>
                    {r.editor_name || '未知'} · {r.summary}
                    {r.source ? ` · ${r.source}` : ''}
                  </span>
                </div>
                {isAdmin || isPreviewLocal ? (
                  <button
                    type="button"
                    className="capship-composer-link"
                    disabled={busy || (!schemaDirty && r.rev === schemaRev)}
                    onClick={() => void restoreRev(r.rev)}
                  >
                    回滚到此
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}

      {activeMode === 'select_modules' && (
        <div className="capship-composer-pane">
          <p className="capship-composer-hint">多选正式能力模块，保存后更新 Runtime 菜单。</p>
          <div className="capship-composer-grid">
            {catalog.map((item) => (
              <label key={item.key} className="capship-composer-chip">
                <input
                  type="checkbox"
                  checked={keys.includes(item.key)}
                  onChange={() => toggleKey(item.key)}
                />
                <span>{item.label}</span>
                <code>{item.key}</code>
              </label>
            ))}
          </div>
          <button type="button" className="capship-composer-btn" disabled={busy} onClick={() => void applyModules()}>
            {busy ? '保存中…' : appId ? '保存模块' : '应用选型'}
          </button>
        </div>
      )}

      {activeMode === 'live_edit' && (
        <div className="capship-composer-pane capship-composer-chat">
          <p className="capship-composer-hint">说业务痛点或改页指令；左侧先出预览 → 保存草稿（绑账号）→ 提交审批 → 管理员通过后正式生效。</p>
          <div className="capship-composer-chat-list" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={`${m.role}-${i}`} className={`capship-composer-msg is-${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy ? <div className="capship-composer-msg is-assistant is-pending">正在理解…</div> : null}
          </div>
          <div className="capship-composer-chat-input">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="例如：产线老坏要报修；或 增加请假和报销"
              rows={2}
              aria-label="改页指令"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendChat()
                }
              }}
            />
            <button type="button" className="capship-composer-btn" disabled={busy || !draft.trim()} onClick={() => void sendChat()}>
              {busy ? '…' : '发送'}
            </button>
          </div>
        </div>
      )}

      {activeMode === 'module_flow' && (
        <div className="capship-composer-pane capship-composer-flow">
          <p className="capship-composer-hint">模块数据流：可手动调整，也可对话修改。</p>
          <ol className="capship-composer-flow-list">
            {flow.steps.map((step, i) => (
              <li key={step.id}>
                <span className="capship-composer-flow-idx">{i + 1}</span>
                <div className="capship-composer-flow-body">
                  <strong>{step.label}</strong>
                  <em>{step.note}</em>
                </div>
                <div className="capship-composer-flow-actions">
                  <button
                    type="button"
                    className="capship-composer-link"
                    disabled={busy || i === 0}
                    aria-label="上移"
                    title="上移"
                    onClick={() => void commitFlow(moveFlowStepLocal(flow, step.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="capship-composer-link"
                    disabled={busy || i === flow.steps.length - 1}
                    aria-label="下移"
                    title="下移"
                    onClick={() => void commitFlow(moveFlowStepLocal(flow, step.id, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="capship-composer-link"
                    disabled={busy || flow.steps.length <= 1}
                    aria-label="移除"
                    title="移除"
                    onClick={() => void commitFlow(removeFlowStepLocal(flow, step.id))}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="capship-composer-chat-list" ref={flowListRef} aria-live="polite">
            {flowMessages.map((m, i) => (
              <div key={`flow-${m.role}-${i}`} className={`capship-composer-msg is-${m.role}`}>
                {m.text}
              </div>
            ))}
            {busy ? <div className="capship-composer-msg is-assistant is-pending">正在理解…</div> : null}
          </div>
          <div className="capship-composer-chat-input">
            <textarea
              value={flowDraft}
              onChange={(e) => setFlowDraft(e.target.value)}
              placeholder="例如：在设备报修后面加审批流"
              rows={2}
              aria-label="数据流指令"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendFlowChat()
                }
              }}
            />
            <button
              type="button"
              className="capship-composer-btn"
              disabled={busy || !flowDraft.trim()}
              onClick={() => void sendFlowChat()}
            >
              {busy ? '…' : '发送'}
            </button>
          </div>
        </div>
      )}

      {status ? <p className="capship-composer-status">{status}</p> : null}
    </div>
  )
}

export default CapShipComposer
