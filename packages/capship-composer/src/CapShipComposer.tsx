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
  fetchCodegenJob,
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
import { CAPABILITY_MANIFEST } from '../../../shared/capability-manifest'

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

/** 与 shared/capability-manifest 对齐；后端 op.widget 优先，此处仅兜底 */
const CAP_WIDGET_FALLBACK: Record<string, string> = Object.fromEntries(
  CAPABILITY_MANIFEST.map((e) => [e.key, e.widget]),
)

function resolveInteractiveUi(op: {
  label?: string
  summary?: string
  capability_key?: string
  interactive_ui?: string
  page_mock?: { ui_kind?: string } | ComposeEditOp['page_mock']
}): string | undefined {
  const explicit = String(op.interactive_ui || (op.page_mock as { ui_kind?: string } | undefined)?.ui_kind || '').trim()
  if (explicit) return explicit
  const blob = `${op.label || ''} ${op.summary || ''} ${op.capability_key || ''}`
  if (/计算器|科学计算|calculator/i.test(blob)) return 'calculator'
  return undefined
}

function resolveAddWidget(cap: string, explicit?: string): string {
  // 正式能力一律用 registry widget，禁止降级 GeneratedPageWidget
  if (!cap.startsWith('gen_') && CAP_WIDGET_FALLBACK[cap]) {
    return CAP_WIDGET_FALLBACK[cap]
  }
  if (explicit && /Widget$/.test(explicit) && explicit !== 'GeneratedPageWidget') {
    return explicit
  }
  if (cap.startsWith('gen_')) return 'GeneratedPageWidget'
  return CAP_WIDGET_FALLBACK[cap] || 'ListWidget'
}

function inheritMenuCategory(schema: ComposerPageSchema, opCategory?: string): string {
  const explicit = (opCategory || '').trim()
  if (explicit && explicit !== '自定义') return explicit
  const meta = (schema.meta || {}) as Record<string, unknown>
  const industryName = String(meta.industry_name || '').trim()
  if (industryName) return industryName
  const cats = schema.menu.map((m) => String(m.category || '').trim()).filter((c) => c && c !== '自定义')
  if (cats.length) {
    const freq = new Map<string, number>()
    for (const c of cats) freq.set(c, (freq.get(c) || 0) + 1)
    return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]![0]
  }
  return explicit || '自定义'
}

function stableSceneKey(op: Extract<ComposeEditOp, { op: 'add' }>, label: string, cap: string): string {
  const fromOp = String(op.scene_key || '').trim()
  if (fromOp) return fromOp
  // 确定性短 key，避免每次随机导致 diff 噪音
  const raw = `${cap}:${label}`
  let h = 0
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0
  return `scene_${(h >>> 0).toString(16)}`
}

export function pageMockToBlocks(mock: ComposeEditOp['page_mock']): Array<{ type: string; text?: string; items?: string[] }> {
  if (!mock) return []
  const blocks: Array<{ type: string; text?: string; items?: string[] }> = []
  if (mock.form_title) blocks.push({ type: 'heading', text: mock.form_title })
  for (const f of mock.fields || []) {
    if (!f.label) continue
    blocks.push({
      type: 'paragraph',
      text: `${f.label}${f.type ? `（${f.type}）` : ''}${f.value ? `：${f.value}` : ''}`,
    })
  }
  if (mock.list_title) blocks.push({ type: 'heading', text: mock.list_title })
  if (mock.list?.length) {
    blocks.push({
      type: 'list',
      text: mock.list_title || '列表',
      items: mock.list.map((row) => (row.status ? `${row.title || row.id} · ${row.status}` : String(row.title || row.id || '条目'))),
    })
  }
  if (mock.primary_action) blocks.push({ type: 'button', text: mock.primary_action })
  return blocks
}

function applyGeneratedPages(
  schema: ComposerPageSchema,
  pages: Array<{
    key?: string
    title?: string
    route?: string
    summary?: string
    blocks?: Array<{ type?: string; text?: string; items?: string[] }>
    interactive?: Record<string, unknown>
    source_html?: string
  }>,
): ComposerPageSchema {
  let next = schema
  const children = [...(next.root.children || [])]
  const menu = [...next.menu]
  const keys = new Set(next.capability_keys || [])

  for (const page of pages) {
    const key = String(page.key || '').trim()
    if (!key) continue
    const title = String(page.title || key)
    const route = String(page.route || `/gen/${key}`)
    const interactive = page.interactive
    const idx = children.findIndex((c) => {
      const props = (c.props || {}) as Record<string, unknown>
      return String(props.capability_key || '') === key || String(c.id) === key
    })
    if (idx >= 0) {
      const child = children[idx]!
      const props = { ...(child.props || {}) } as Record<string, unknown>
      props.widget = 'GeneratedPageWidget'
      props.capability_key = key
      props.title = title
      props.summary = page.summary || props.summary || ''
      props.blocks = page.blocks || []
      props.codegen_pending = false
      props.source = 'generated'
      if (page.route) props.route = route
      if (interactive) {
        props.interactive = interactive
        props.page_mock = {
          ...((props.page_mock as object) || {}),
          interactive,
          ui_kind: String((interactive as { type?: string }).type || 'tool_pad'),
        }
      }
      if (page.source_html) {
        props.source_html = page.source_html
        props.page_kind = 'generated_code'
        props.ui_kind = 'generated_code'
        props.page_mock = { ui_kind: 'generated_code', form_title: title }
        delete props.blocks
        delete props.form_fields
      }
      children[idx] = { ...child, type: 'generated_page', props }
      keys.add(key)
      continue
    }
    children.push({
      id: key,
      type: 'generated_page',
      props: {
        widget: 'GeneratedPageWidget',
        capability_key: key,
        route,
        title,
        summary: page.summary || '',
        source: 'generated',
        codegen_pending: false,
        ...(page.source_html
          ? {
              source_html: page.source_html,
              page_kind: 'generated_code',
              ui_kind: 'generated_code',
              page_mock: { ui_kind: 'generated_code', form_title: title },
            }
          : interactive
            ? {
                interactive,
                page_mock: {
                  interactive,
                  ui_kind: String((interactive as { type?: string }).type || 'tool_pad'),
                  form_title: title,
                },
                blocks: page.blocks || [],
              }
            : { blocks: page.blocks || [] }),
      },
    })
    if (!menu.some((m) => m.capability_key === key || m.key === key)) {
      menu.push({
        key,
        label: title,
        route,
        capability_key: key,
        icon: 'sparkles',
      })
    }
    keys.add(key)
  }

  return {
    ...next,
    capability_keys: [...keys],
    menu,
    root: { ...next.root, children },
  }
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
      const allowDupCap = Boolean(next.meta?.preview) || Boolean(op.page_mock) || Boolean(op.scene_key) || cap.startsWith('gen_')
      if (
        !allowDupCap &&
        [...keys].includes(cap) &&
        next.menu.some((m) => m.capability_key === cap)
      ) {
        continue
      }
      const isGenerated = cap.startsWith('gen_')
      const widget = resolveAddWidget(cap, op.widget)
      const forceFormal = !isGenerated && widget !== 'GeneratedPageWidget'
      const nodeType = forceFormal
        ? widget.replace(/Widget$/i, '').toLowerCase() || cap
        : 'generated_page'
      const key = (() => {
        const preferred = stableSceneKey(op, label, cap)
        if (!next.menu.some((m) => m.key === preferred) && !(next.root.children || []).some((c) => c.id === preferred)) {
          return preferred
        }
        return `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      })()
      const route = `/s/${key}`
      keys.add(cap)
      const category = inheritMenuCategory(next, op.category)
      const menuItem: ComposerPageSchema['menu'][number] = {
        key,
        label,
        route,
        category,
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
      if (op.form_headline) childProps.form_headline = op.form_headline
      if (op.form_hint) childProps.form_hint = op.form_hint
      if (op.default_category) childProps.default_category = op.default_category
      if (op.approval_type) childProps.approval_type = op.approval_type
      if (op.scene_name) childProps.scene_name = op.scene_name

      const formFieldsFromOp = (op.form_fields || [])
        .filter((f) => f.label)
        .map((f, i) => ({
          key: f.key || `f_${i}`,
          label: f.label,
          type: f.type,
          placeholder: f.placeholder,
          optional: f.optional,
        }))
      const formFieldsFromMock = (op.page_mock?.fields || [])
        .filter((f) => f.label)
        .map((f, i) => ({
          key: f.key || `f_${i}`,
          label: f.label,
          type: f.type,
          placeholder: f.value || f.placeholder,
          optional: f.optional,
        }))
      const formFields = formFieldsFromOp.length ? formFieldsFromOp : formFieldsFromMock
      if (formFields.length) childProps.form_fields = formFields

      // 仅真正 gen_* 页才挂 GeneratedPage；异步出页中只挂骨架所需 props
      if (!forceFormal) {
        childProps.title = label
        childProps.codegen_pending = Boolean(op.pending_codegen)
        childProps.source = 'generated'
        childProps.ui_phase = op.pending_codegen ? 'skeleton' : 'ready'
        // pending 时不塞弱表单/blocks，避免骨架阶段露出半成品
        if (!op.pending_codegen && !formFields.length) {
          const fromMock = pageMockToBlocks(op.page_mock)
          if (fromMock.length) childProps.blocks = fromMock
          else if (op.summary) {
            childProps.blocks = [
              { type: 'heading', text: label },
              { type: 'paragraph', text: op.summary },
            ]
          }
        }
        if (op.pending_codegen) {
          // 保留 page_mock 供生成完成后合并参考，但不渲染表单
          delete childProps.form_fields
        }
      }
      const interactiveUi = resolveInteractiveUi(op)
      const interactive =
        (op as { interactive?: Record<string, unknown> }).interactive ||
        (op.page_mock as { interactive?: Record<string, unknown> } | undefined)?.interactive
      if (interactive) {
        childProps.interactive = interactive
        childProps.page_mock = {
          ...(op.page_mock || {}),
          interactive,
          ui_kind: 'tool_pad',
        }
      } else if (interactiveUi) {
        childProps.interactive_ui = interactiveUi
        childProps.ui_kind = interactiveUi
        if (op.page_mock) {
          childProps.page_mock = { ...op.page_mock, ui_kind: interactiveUi }
        } else {
          childProps.page_mock = { ui_kind: interactiveUi, form_title: label }
        }
      }
      if (op.page_mock && !interactive) {
        childProps.page_mock = interactiveUi
          ? { ...op.page_mock, ui_kind: interactiveUi }
          : op.page_mock
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
    if (op.op === 'revise_generated') {
      const hit =
        matchMenuLabel(next.menu, op.label) ||
        next.menu.find((m) => m.capability_key === op.capability_key || m.key === op.capability_key)
      if (!hit) continue
      const key = hit.capability_key || hit.key
      next = {
        ...next,
        root: {
          ...next.root,
          children: (next.root.children || []).map((c) => {
            const props = { ...(c.props || {}) } as Record<string, unknown>
            const ck = String(props.capability_key || c.id || '')
            if (ck !== key && c.id !== hit.key) return c
            return {
              ...c,
              props: {
                ...props,
                codegen_pending: true,
                page_kind: 'generated_code',
                ui_kind: 'generated_code',
                ui_phase: 'skeleton',
                summary: op.summary || props.summary || '',
                widget: 'GeneratedPageWidget',
              },
            }
          }),
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
      const interactiveUi = resolveInteractiveUi({
        ...op,
        label: op.label || hit.label,
        capability_key: op.capability_key || hit.capability_key,
      })
      next = {
        ...next,
        menu: next.menu.map((m) =>
          targetKeys.has(m.key)
            ? {
                ...m,
                page_mock: op.page_mock
                  ? {
                      ...(m.page_mock || {}),
                      ...op.page_mock,
                      ...(interactiveUi ? { ui_kind: interactiveUi } : {}),
                    }
                  : interactiveUi
                    ? { ...(m.page_mock || {}), ui_kind: interactiveUi }
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
                            ...(interactiveUi ? { ui_kind: interactiveUi } : {}),
                          },
                        }
                      : interactiveUi
                        ? {
                            page_mock: {
                              ...((c.props?.page_mock as object) || {}),
                              ui_kind: interactiveUi,
                            },
                          }
                        : {}),
                    ...(formFields.length ? { form_fields: formFields } : {}),
                    ...(interactiveUi
                      ? { interactive_ui: interactiveUi, ui_kind: interactiveUi }
                      : {}),
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

type ChatMsg = { role: 'user' | 'assistant'; text: string; images?: string[] }

function chatStorageKey(appKey: string, kind: 'live' | 'flow') {
  return `capship-composer-chat:${kind}:${appKey}`
}

function loadChatMsgs(appKey: string, kind: 'live' | 'flow', fallback: ChatMsg[]): ChatMsg[] {
  try {
    const raw = sessionStorage.getItem(chatStorageKey(appKey, kind))
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as ChatMsg[]
    if (!Array.isArray(parsed) || !parsed.length) return fallback
    return parsed.filter(
      (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string',
    )
  } catch {
    return fallback
  }
}

function saveChatMsgs(appKey: string, kind: 'live' | 'flow', msgs: ChatMsg[]) {
  try {
    // 截图 dataURL 很大，持久化时去掉图片只留标记，避免撑爆 sessionStorage
    const slim = msgs.slice(-80).map((m) =>
      m.images?.length
        ? { role: m.role, text: m.text || `（附 ${m.images.length} 张截图）` }
        : { role: m.role, text: m.text },
    )
    sessionStorage.setItem(chatStorageKey(appKey, kind), JSON.stringify(slim))
  } catch {
    /* ignore */
  }
}

/** 压缩截图为 jpeg data URL（边长≤960、质量偏低，加快视觉识别） */
async function compressImageFile(file: Blob, maxEdge = 960, quality = 0.55): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法压缩图片')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

const WELCOME_LIVE: ChatMsg = {
  role: 'assistant',
  text: '直接说业务需求即可；也可 Ctrl+V 粘贴或上传界面截图，让我看懂当前页。改页先落「本地草稿」→「保存草稿」→「提交审批」；管理员通过后才影响正式 Runtime。',
}

const WELCOME_FLOW: ChatMsg = {
  role: 'assistant',
  text: '可以说「在报修后面加审批流」。改动先落草稿，保存后提交审批。',
}

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
  deliverPanel,
}: CapShipComposerProps) {
  const [mode, setMode] = useState<ComposerMode>(controlledMode ?? defaultMode)
  const [keys, setKeys] = useState<string[]>(() => (initialKeys?.length ? [...initialKeys] : ['chat_qa']))
  const [schema, setSchema] = useState<ComposerPageSchema | null>(() => cloneSchema(initialSchema))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [draft, setDraft] = useState('')
  const [pendingImages, setPendingImages] = useState<string[]>([])
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
  const chatAppKey = String(appId || initialSchema?.appId || 'preview-local')
  const [messages, setMessages] = useState<ChatMsg[]>(() =>
    loadChatMsgs(chatAppKey, 'live', [WELCOME_LIVE]),
  )
  const [flowMessages, setFlowMessages] = useState<ChatMsg[]>(() =>
    loadChatMsgs(chatAppKey, 'flow', [WELCOME_FLOW]),
  )
  const listRef = useRef<HTMLDivElement>(null)
  const flowListRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastSavedSchemaRef = useRef<ComposerPageSchema | null>(cloneSchema(initialSchema))
  const abortRef = useRef<AbortController | null>(null)
  const codegenAbortRef = useRef<AbortController | null>(null)

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

  useEffect(() => {
    saveChatMsgs(chatAppKey, 'live', messages)
  }, [chatAppKey, messages])

  useEffect(() => {
    saveChatMsgs(chatAppKey, 'flow', flowMessages)
  }, [chatAppKey, flowMessages])

  const abortInFlight = () => {
    abortRef.current?.abort()
    abortRef.current = null
    codegenAbortRef.current?.abort()
    codegenAbortRef.current = null
    setBusy(false)
  }

  const stopChat = () => {
    abortInFlight()
    setStatus('已停止')
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: '已停止当前指令。可点「编辑」改写后重发，或继续输入新需求。' },
    ])
  }

  const deleteMessage = (index: number, kind: 'live' | 'flow' = 'live') => {
    const setter = kind === 'live' ? setMessages : setFlowMessages
    setter((prev) => prev.filter((_, i) => i !== index))
  }

  const editUserMessage = (index: number, kind: 'live' | 'flow' = 'live') => {
    const list = kind === 'live' ? messages : flowMessages
    const hit = list[index]
    if (!hit || hit.role !== 'user') return
    if (busy) abortInFlight()
    if (kind === 'live') {
      setDraft(hit.text)
      setMessages((prev) => prev.slice(0, index))
    } else {
      setFlowDraft(hit.text)
      setFlowMessages((prev) => prev.slice(0, index))
    }
  }

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
    const timer = window.setInterval(() => {
      void loadChangeQueue()
    }, 30_000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, token, isPreviewLocal])

  const confirmDirectPublish = (): boolean => {
    const open = changeItems.filter((c) => c.status === 'draft' || c.status === 'pending')
    if (open.length === 0) {
      return window.confirm(
        '将直接发布正式版到全员 Runtime。\n\n当前无待作废草稿/待审批单。确认继续？',
      )
    }
    const lines = open
      .slice(0, 8)
      .map((c) => `· ${c.status === 'pending' ? '待审批' : '草稿'}：${c.summary || c.author_name || c.id.slice(0, 8)}`)
    const more = open.length > 8 ? `\n… 另有 ${open.length - 8} 条` : ''
    return window.confirm(
      `⚠ 直接发布将覆盖所有未生效内容\n\n将作废 ${open.length} 条草稿/待审批：\n${lines.join('\n')}${more}\n\n建议优先在审批列表逐条「通过」。确认一键发布？`,
    )
  }

  const runDirectPublish = async () => {
    if (!schema || busy || !appId || isPreviewLocal) return
    if (!confirmDirectPublish()) return
    setBusy(true)
    setStatus('')
    try {
      await persistSchema(schema, undefined, {
        directPublish: true,
        source: 'admin_direct',
        summary: '管理员直接发布',
      })
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '发布失败')
    } finally {
      setBusy(false)
    }
  }

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
      const closed = res.supersede_detail?.closed_count ?? res.superseded_changes ?? 0
      setStatus(
        closed
          ? `已直接发布正式 v${res.schema_rev} · 作废 ${closed} 条草稿/待审批`
          : `已直接发布正式 v${res.schema_rev}`,
      )
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: closed
            ? `已更新线上配置（v${res.schema_rev}）。${closed} 条待审批/草稿已自动作废，相关通知已处理。`
            : `已更新线上配置（v${res.schema_rev}）。当前无待作废单据。`,
        },
      ])
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
    // 作者单侧：草稿写入后立刻驱动 Runtime 菜单/页（他人仍读正式 schema）
    onSchemaPatch?.(next)
    onSaved?.({
      page_schema: next,
      capability_keys: next.capability_keys,
      schema_rev: res.schema_rev,
      change_status: 'draft',
    })
    setStatus(
      `个人工作台已按草稿更新（仅你可见）· 正式仍为 v${res.schema_rev} · 管理员通过后全员生效`,
    )
    await loadChangeQueue()
  }

  /** 将当前改动保存为账号草稿（作者单侧 Runtime 立刻生效；正式全员仍待审批） */
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
            : '草稿已保存：你的 Runtime 菜单/页面已按草稿生效（仅你账号）；同事仍看正式版。提交审批并由管理员通过后，全员才会看到。',
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
      // 提交后仍是作者单侧生效（pending）；正式全员仍待管理员通过
      onSchemaPatch?.(schema)
      onSaved?.({
        page_schema: schema,
        capability_keys: schema.capability_keys,
        schema_rev: res.schema_rev,
        change_status: 'pending',
      })
      setStatus('已提交审批 · 你的 Runtime 仍按此稿生效（仅你）；管理员通过后全员同步')
      setHistoryOpen(true)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: '已提交审批。你的账号下 Runtime 已按此稿生效；同事仍看正式版。管理员通过后才会全员更新。',
        },
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

  const addPendingImages = async (files: FileList | File[] | null) => {
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    try {
      const next: string[] = []
      for (const f of list) {
        if (pendingImages.length + next.length >= 3) break
        next.push(await compressImageFile(f))
      }
      if (next.length) setPendingImages((prev) => [...prev, ...next].slice(0, 3))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '图片处理失败')
    }
  }

  const sendChat = async () => {
    const text = draft.trim()
    const images = [...pendingImages]
    if ((!text && !images.length) || busy) return
    setDraft('')
    setPendingImages([])
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: text || '（请看截图，说明这个页面是什么意思）',
        images: images.length ? images : undefined,
      },
    ])
    setBusy(true)
    setStatus('')
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
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
          instruction: text || '请根据截图说明当前页面是什么意思，并指出可改进点',
          app_name: base.title || '',
          app_id: appId || base.appId || '',
          menu: base.menu.map((m) => ({
            key: m.key,
            label: m.label,
            capability_key: m.capability_key,
            category: m.category,
          })),
          capability_keys: keys,
          images,
          page_snapshots: (base.root.children || [])
            .map((c) => {
              const props = (c.props || {}) as Record<string, unknown>
              const html = String(props.source_html || '').trim()
              if (!html) return null
              return {
                key: String(c.id || ''),
                capability_key: String(props.capability_key || c.id || ''),
                title: String(props.title || ''),
                label: String(props.title || ''),
                source_html: html.slice(0, 100_000),
              }
            })
            .filter(Boolean) as Array<{
            key: string
            capability_key: string
            title: string
            label: string
            source_html: string
          }>,
          entry_source: String((base.meta as Record<string, unknown> | undefined)?.entry_source || ''),
          industry_key: String((base.meta as Record<string, unknown> | undefined)?.industry_key || ''),
          microsite_id: String(
            (base.meta as Record<string, unknown> | undefined)?.microsite_id ||
              (base.theme as { micrositeId?: string } | undefined)?.micrositeId ||
              '',
          ),
          web_template_id: String(
            (base.meta as Record<string, unknown> | undefined)?.web_template_id ||
              (base.theme as { templateId?: string } | undefined)?.templateId ||
              '',
          ),
        },
        { token, signal: ac.signal },
      )

      if (ac.signal.aborted) return

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
      const jobId = result.codegen_job_id
      const asyncHint =
        pending?.length
          ? jobId
            ? ` 未覆盖能力交智能出页异步生成（${pending.length} 项）：左侧先显示进度，完成后自动展开可交互预览。`
            : ` 未覆盖能力暂无异步任务，将先用本地可预见模板展示（${pending.length} 项）。`
          : ''
      // 无 job：不要一直卡在骨架，放开本地 foresight 表单
      if (pending?.length && !jobId && result.ops?.length) {
        next = {
          ...next,
          root: {
            ...next.root,
            children: (next.root.children || []).map((c) => {
              const props = { ...(c.props || {}) } as Record<string, unknown>
              if (props.codegen_pending) {
                props.codegen_pending = false
                props.ui_phase = 'ready'
              }
              return { ...c, props }
            }),
          },
        }
        setSchema(next)
        setKeys(next.capability_keys)
        setSchemaDirty(true)
        onSchemaPatch?.(next)
      }
      const draftHint = result.ops?.length ? ' 已写入草稿，点「保存」记入版本历史。' : ''
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `${result.reply}${src}${asyncHint}${draftHint}` },
      ])
      setStatus(
        result.ops?.length
          ? result.ops.some((o) => o.op === 'patch_page')
            ? '草稿已更新控件 · 未保存'
            : pending?.length && jobId
              ? '骨架占位 · DeepSeek 生成中'
              : '草稿已更新页面 · 未保存'
          : '',
      )

      if (jobId) {
        const snapshot = next
        codegenAbortRef.current?.abort()
        const jobAc = new AbortController()
        codegenAbortRef.current = jobAc
        void (async () => {
          for (let i = 0; i < 40; i += 1) {
            if (jobAc.signal.aborted) return
            await new Promise((r) => window.setTimeout(r, 1500))
            if (jobAc.signal.aborted) return
            try {
              const job = await fetchCodegenJob(jobId, { token, signal: jobAc.signal })
              if (job.status === 'failed') {
                // 失败：放开骨架，回退本地 foresight/草稿
                const fallback = {
                  ...snapshot,
                  root: {
                    ...snapshot.root,
                    children: (snapshot.root.children || []).map((c) => {
                      const props = { ...(c.props || {}) } as Record<string, unknown>
                      if (props.codegen_pending) {
                        props.codegen_pending = false
                        props.ui_phase = 'ready'
                      }
                      return { ...c, props }
                    }),
                  },
                }
                setSchema(fallback)
                onSchemaPatch?.(fallback)
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    text: `AI 出页失败：${job.error || '未知错误'}。已展开本地可预见草稿，可继续改或重试。`,
                  },
                ])
                setStatus('生成失败 · 已回退本地预览')
                return
              }
              if (job.status !== 'ready') continue
              const pages = job.result?.generated_pages || []
              if (pages.length) {
                const merged = applyGeneratedPages(snapshot, pages)
                setSchema(merged)
                setKeys(merged.capability_keys)
                setSchemaDirty(true)
                onSchemaPatch?.(merged)
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    text: `页面已生成并通过预览合并${job.result?.llm ? '（DeepSeek）' : '（规则兜底）'}：${pages.length} 页，可在左侧菜单打开使用。`,
                  },
                ])
                setStatus('AI 预览页已就绪 · 未保存')
                return
              }
              if (job.merged && appId && !String(appId).startsWith('preview-')) {
                const data = await fetchRuntimeSchema(appId, { token })
                if (data?.page_schema) {
                  const remote = data.page_schema as ComposerPageSchema
                  setSchema(remote)
                  setKeys(remote.capability_keys || [])
                  onSchemaPatch?.(remote)
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', text: 'AI 预览页已写入应用 schema，已自动刷新。' },
                  ])
                }
              }
              return
            } catch (err) {
              if (jobAc.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) return
              /* 继续轮询 */
            }
          }
          if (!jobAc.signal.aborted) {
            const timedOut = {
              ...snapshot,
              root: {
                ...snapshot.root,
                children: (snapshot.root.children || []).map((c) => {
                  const props = { ...(c.props || {}) } as Record<string, unknown>
                  if (props.codegen_pending) {
                    props.codegen_pending = false
                    props.ui_phase = 'ready'
                  }
                  return { ...c, props }
                }),
              },
            }
            setSchema(timedOut)
            onSchemaPatch?.(timedOut)
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', text: 'AI 出页超时，已展开本地可预见草稿；可稍后刷新或再说一次需求。' },
            ])
            setStatus('生成超时 · 已回退本地预览')
          }
        })()
      }
    } catch (e) {
      if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
      if (e instanceof SchemaRevConflictError) {
        handleConflict(e)
        return
      }
      const msg = e instanceof Error ? e.message : '理解失败'
      onError?.(msg)
      setMessages((prev) => [...prev, { role: 'assistant', text: msg }])
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      if (!ac.signal.aborted) setBusy(false)
    }
  }

  const sendFlowChat = async () => {
    const text = flowDraft.trim()
    if (!text || busy) return
    setFlowDraft('')
    setFlowMessages((prev) => [...prev, { role: 'user', text }])
    setBusy(true)
    setStatus('')
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const result = await askFlowEdit(
        {
          instruction: text,
          app_name: schema?.title || '',
          steps: flow.steps,
          available_labels: [...menuLabels, ...catalog.map((c) => c.label)],
        },
        { token, signal: ac.signal },
      )
      if (ac.signal.aborted) return
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
      if (ac.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
      if (e instanceof SchemaRevConflictError) {
        handleConflict(e)
        return
      }
      const msg = e instanceof Error ? e.message : '理解失败'
      onError?.(msg)
      setFlowMessages((prev) => [...prev, { role: 'assistant', text: msg }])
    } finally {
      if (abortRef.current === ac) abortRef.current = null
      if (!ac.signal.aborted) setBusy(false)
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
            ? `本地未保存改动 · 正式线上仍为 v${schemaRev}`
            : isPreviewLocal
              ? '预览本地版本（无审批流）'
              : changeItems.some((c) => c.id === changeId && c.status === 'pending')
                ? '已提交审批 · 管理员通过后才会全员生效'
                : changeItems.some((c) => c.id === changeId && c.status === 'draft')
                  ? `个人草稿已保存 · 仅你可见 · 正式仍为 v${schemaRev}`
                  : isAdmin
                    ? `正式线上 v${schemaRev} · 审批列表「通过」逐单处理 · 「直接发布」会作废全部未生效单`
                    : `正式线上 v${schemaRev} · 改页需提交审批后由管理员通过`}
        </span>
        <div className="capship-composer-version-actions">
          <button
            type="button"
            className="capship-composer-btn is-sm"
            disabled={busy || !schema || (!schemaDirty && Boolean(changeId))}
            onClick={() => void saveDraftSchema(true)}
            title="保存到账号草稿；你的 Runtime 立刻按草稿生效，同事仍看正式版"
          >
            {busy ? '…' : '保存草稿'}
          </button>
          {!isPreviewLocal && appId && !isAdmin ? (
            <button
              type="button"
              className="capship-composer-btn is-sm is-accent"
              disabled={busy || !schema}
              onClick={() => void submitForApproval()}
              title="提交后管理员审核通过才会更新全员正式 Runtime"
            >
              提交审批
            </button>
          ) : null}
          {!isPreviewLocal && isAdmin && appId && schema ? (
            <button
              type="button"
              className="capship-composer-btn is-sm is-danger"
              disabled={busy}
              title="一键覆盖正式版，并作废所有未生效草稿/待审批"
              onClick={() => void runDirectPublish()}
            >
              直接发布
            </button>
          ) : null}
          {schemaDirty ? (
            <button
              type="button"
              className="capship-composer-btn is-sm is-ghost"
              disabled={busy}
              onClick={discardDraft}
            >
              丢弃
            </button>
          ) : null}
          {!isPreviewLocal && appId ? (
            <button
              type="button"
              className="capship-composer-btn is-sm is-ghost"
              disabled={busy}
              onClick={() => void pullLatest()}
            >
              同步正式
            </button>
          ) : null}
          <button
            type="button"
            className={`capship-composer-btn is-sm is-ghost${historyOpen ? ' is-active' : ''}`}
            disabled={busy}
            onClick={() => {
              void loadHistory()
              void loadChangeQueue()
            }}
          >
            {historyOpen ? '收起' : '版本记录'}
          </button>
        </div>
      </div>

      {conflict && (
        <div className="capship-composer-conflict" role="alert">
          <p>
            版本冲突：服务端已是 <strong>v{conflict.schema_rev}</strong>
            {conflict.schema_editor_name ? `（${conflict.schema_editor_name}）` : ''}。请先同步，或强制覆盖。
          </p>
          <div className="capship-composer-conflict-actions">
            <button
              type="button"
              className="capship-composer-btn is-sm is-ghost"
              disabled={busy}
              onClick={() => void pullLatest()}
            >
              同步正式
            </button>
            {isAdmin ? (
              <button
                type="button"
                className="capship-composer-btn is-sm is-danger"
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
                className="capship-composer-btn is-sm"
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
                        className="capship-composer-btn is-sm"
                        disabled={busy}
                        onClick={() => void reviewChange(c.id, 'approve')}
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        className="capship-composer-btn is-sm is-danger"
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
                      className="capship-composer-btn is-sm is-ghost"
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
                    className="capship-composer-btn is-sm is-ghost"
                    disabled={busy || (!schemaDirty && r.rev === schemaRev)}
                    onClick={() => void restoreRev(r.rev)}
                  >
                    回滚
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
            {busy ? '保存中…' : appId ? '保存模块' : '保存选型'}
          </button>
        </div>
      )}

      {activeMode === 'live_edit' && (
        <div className="capship-composer-pane capship-composer-chat">
          <p className="capship-composer-hint">
            说业务痛点或改页指令；可 Ctrl+V 粘贴 / 上传界面截图让模型看懂当前页。左侧先出预览 → 保存草稿 → 提交审批 → 管理员通过后正式生效。
          </p>
          <div className="capship-composer-chat-list" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={`live-${i}-${m.role}-${m.text.slice(0, 12)}`} className={`capship-composer-msg is-${m.role}`}>
                {m.images?.length ? (
                  <div className="capship-composer-msg-imgs">
                    {m.images.map((src, j) => (
                      <img key={j} src={src} alt={`截图 ${j + 1}`} />
                    ))}
                  </div>
                ) : null}
                <div className="capship-composer-msg-text">{m.text}</div>
                <div className="capship-composer-msg-actions">
                  {m.role === 'user' ? (
                    <button
                      type="button"
                      className="capship-composer-msg-act"
                      disabled={busy && i === messages.length - 1}
                      onClick={() => editUserMessage(i, 'live')}
                      title="编辑并重发"
                    >
                      编辑
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="capship-composer-msg-act"
                    onClick={() => deleteMessage(i, 'live')}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
            {busy ? <div className="capship-composer-msg is-assistant is-pending">正在理解…</div> : null}
          </div>
          {pendingImages.length > 0 ? (
            <div className="capship-composer-pending-imgs">
              {pendingImages.map((src, i) => (
                <div key={i} className="capship-composer-pending-img">
                  <img src={src} alt={`待发截图 ${i + 1}`} />
                  <button
                    type="button"
                    aria-label="移除截图"
                    onClick={() => setPendingImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="capship-composer-chat-input">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                void addPendingImages(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="capship-composer-btn is-ghost"
              disabled={busy || pendingImages.length >= 3}
              title="上传截图"
              aria-label="上传截图"
              onClick={() => fileInputRef.current?.click()}
            >
              上传截图
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="例如：这页啥意思？或 Ctrl+V 粘贴截图 + 说明要改什么"
              rows={2}
              aria-label="改页指令"
              onPaste={(e) => {
                const items = e.clipboardData?.items
                if (!items) return
                const files: File[] = []
                for (const it of Array.from(items)) {
                  if (it.type.startsWith('image/')) {
                    const f = it.getAsFile()
                    if (f) files.push(f)
                  }
                }
                if (files.length) {
                  e.preventDefault()
                  void addPendingImages(files)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void sendChat()
                }
              }}
            />
            {busy ? (
              <button type="button" className="capship-composer-btn is-danger" onClick={stopChat}>
                停止
              </button>
            ) : (
              <button
                type="button"
                className="capship-composer-btn"
                disabled={!draft.trim() && !pendingImages.length}
                onClick={() => void sendChat()}
              >
                发送
              </button>
            )}
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
                    className="capship-composer-btn is-icon"
                    disabled={busy || i === 0}
                    aria-label="上移"
                    title="上移"
                    onClick={() => void commitFlow(moveFlowStepLocal(flow, step.id, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="capship-composer-btn is-icon"
                    disabled={busy || i === flow.steps.length - 1}
                    aria-label="下移"
                    title="下移"
                    onClick={() => void commitFlow(moveFlowStepLocal(flow, step.id, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="capship-composer-btn is-icon is-danger"
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
              <div key={`flow-${i}-${m.role}-${m.text.slice(0, 12)}`} className={`capship-composer-msg is-${m.role}`}>
                <div className="capship-composer-msg-text">{m.text}</div>
                <div className="capship-composer-msg-actions">
                  {m.role === 'user' ? (
                    <button
                      type="button"
                      className="capship-composer-msg-act"
                      onClick={() => editUserMessage(i, 'flow')}
                      title="编辑并重发"
                    >
                      编辑
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="capship-composer-msg-act"
                    onClick={() => deleteMessage(i, 'flow')}
                    title="删除"
                  >
                    删除
                  </button>
                </div>
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
            {busy ? (
              <button type="button" className="capship-composer-btn is-danger" onClick={stopChat}>
                停止
              </button>
            ) : (
              <button
                type="button"
                className="capship-composer-btn"
                disabled={!flowDraft.trim()}
                onClick={() => void sendFlowChat()}
              >
                发送
              </button>
            )}
          </div>
        </div>
      )}

      {activeMode === 'deliver' && (
        <div className="capship-composer-pane capship-composer-deliver">
          <p className="capship-composer-hint">
            统一交付入口：上方是页面配置的草稿 / 审批 / 版本（影响 Runtime 菜单与页面）；下方是当前能力对应的库表、接口与契约包。
            二者同一闭环——改页先草稿再审批；下载契约包需申请权限（管理员可直下或批准）。
          </p>
          {deliverPanel || (
            <p className="muted" style={{ fontSize: 13 }}>
              未注入交付面板（预览环境可忽略）。
            </p>
          )}
        </div>
      )}

      {status ? <p className="capship-composer-status">{status}</p> : null}
    </div>
  )
}

export default CapShipComposer
