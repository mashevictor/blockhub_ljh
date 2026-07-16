import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  ComposeEditOp,
  ComposerEvents,
  ComposerInput,
  ComposerMode,
  ComposerModuleItem,
  ComposerPageSchema,
  ModuleFlowPersist,
} from './types'
import { COMPOSER_MODES } from './types'
import { askComposeEdit, askFlowEdit, patchRuntimeModules, patchRuntimeSchema } from './api'
import {
  applyFlowEditOps,
  moveFlowStepLocal,
  readModuleFlowFromSchema,
  removeFlowStepLocal,
} from './flowOps'

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
      const key = `scene_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
      const route = `/s/${key}`
      keys.add(cap)
      next = {
        ...next,
        capability_keys: [...keys],
        menu: [
          ...next.menu,
          {
            key,
            label,
            route,
            category: op.category || '自定义',
            capability_key: cap,
            icon: 'module',
            summary: op.summary,
            page_kind: op.page_kind,
            page_mock: op.page_mock,
          },
        ],
        root: {
          ...next.root,
          children: [
            ...(next.root.children || []),
            {
              id: key,
              type: 'section',
              props: {
                capability_key: cap,
                route,
                scene_label: label,
                summary: op.summary,
                page_kind: op.page_kind,
                page_mock: op.page_mock,
                widget: 'ListWidget',
              },
            },
          ],
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
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: '直接说要怎么改，例如「去掉保养计划」或「增加请假管理」。' },
  ])
  const [flowMessages, setFlowMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: '可以说「在报修后面加审批流」或「去掉知识库」。' },
  ])
  const listRef = useRef<HTMLDivElement>(null)
  const flowListRef = useRef<HTMLDivElement>(null)

  const activeMode = controlledMode ?? mode

  useEffect(() => {
    if (initialSchema) setSchema(cloneSchema(initialSchema))
  }, [initialSchema])

  useEffect(() => {
    if (initialKeys?.length) setKeys([...initialKeys])
  }, [initialKeys])

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

  const applyModules = async () => {
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
        },
        { token },
      )
      if (res.page_schema) {
        setSchema(res.page_schema)
        onSchemaPatch?.(res.page_schema)
      }
      if (res.capability_keys) setKeys(res.capability_keys)
      onSaved?.({ page_schema: res.page_schema, capability_keys: res.capability_keys })
      setStatus('模块已保存并刷新页面')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败'
      onError?.(msg)
      setStatus(msg)
    } finally {
      setBusy(false)
    }
  }

  const persistSchema = async (next: ComposerPageSchema, mergeMeta?: Record<string, unknown>) => {
    if (!appId) {
      onPublish?.({ schema: next, keys: next.capability_keys })
      return
    }
    const res = await patchRuntimeSchema(appId, next, { token, mergeMeta })
    setSchema(res.page_schema)
    onSchemaPatch?.(res.page_schema)
    onSaved?.({ page_schema: res.page_schema, capability_keys: res.page_schema.capability_keys })
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
    onSchemaPatch?.(next)
    onFlowChange?.(nextFlow)
    await persistSchema(next, { module_flow: nextFlow })
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
        onSchemaPatch?.(next)
        await persistSchema(next)
      }

      const src = result.source === 'deepseek' ? '' : '（本地规则）'
      setMessages((prev) => [...prev, { role: 'assistant', text: `${result.reply}${src}` }])
      setStatus(result.ops?.length ? '页面已更新' : '')
    } catch (e) {
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
        await commitFlow(nextFlow)
      }
      const src = result.source === 'deepseek' ? '' : '（本地规则）'
      setFlowMessages((prev) => [...prev, { role: 'assistant', text: `${result.reply}${src}` }])
      setStatus(result.ops?.length ? '数据流已更新' : '')
    } catch (e) {
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
          <p className="capship-composer-hint">输入文字直接改页面，由大模型理解意图。</p>
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
              placeholder="例如：去掉保养计划，增加请假管理"
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
