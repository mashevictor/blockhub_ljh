import { useEffect, useMemo, useState } from 'react'
import {
  GtgtStepComposer,
  registerWidget,
  resolveFormFieldDefs,
  useRuntime,
  type GtgtStep,
  type SchemaNode,
} from '@blockhub/web-core'
import {
  InteractiveToolPad,
  interactiveSchemaFromIntent,
  parseInteractiveSchema,
} from './interactive-tool-pad'

type Block = { type?: string; text?: string; items?: string[] }

type PageMock = {
  form_title?: string
  fields?: Array<{ key?: string; label?: string; type?: string; value?: string; placeholder?: string }>
  list_title?: string
  list?: Array<{ id?: string; title?: string; status?: string }>
  primary_action?: string
  chat_title?: string
  chat?: Array<{ role?: string; text?: string }>
  kpis?: Array<{ label?: string; value?: string; hint?: string }>
  ui_kind?: string
  interactive?: unknown
}

type LocalRecord = {
  id: string
  title: string
  status: string
  detail: string
  at: string
}

type SeedRow = LocalRecord & { seed: true }

const STATUS_CYCLE = ['待处理', '进行中', '已完成'] as const

function storageKey(cap: string) {
  return `blockhub_gen_records:${cap}`
}

function loadRecords(cap: string): LocalRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(cap))
    if (!raw) return []
    const parsed = JSON.parse(raw) as LocalRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecords(cap: string, rows: LocalRecord[]) {
  try {
    localStorage.setItem(storageKey(cap), JSON.stringify(rows.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

/** compose page_mock → 静态块（说明区兜底） */
export function pageMockToBlocks(mock: PageMock | null | undefined): Block[] {
  if (!mock || typeof mock !== 'object') return []
  const blocks: Block[] = []
  if (mock.form_title) blocks.push({ type: 'heading', text: String(mock.form_title) })
  for (const f of mock.fields || []) {
    if (!f?.label) continue
    const tip = f.type ? `（${f.type}）` : ''
    blocks.push({ type: 'paragraph', text: `${f.label}${tip}${f.value ? `：${f.value}` : ''}` })
  }
  if (mock.list_title) blocks.push({ type: 'heading', text: String(mock.list_title) })
  if (mock.list?.length) {
    blocks.push({
      type: 'list',
      text: mock.list_title || '列表',
      items: mock.list.map((row) => {
        const t = row.title || row.id || '条目'
        return row.status ? `${t} · ${row.status}` : String(t)
      }),
    })
  }
  if (mock.chat_title) blocks.push({ type: 'heading', text: String(mock.chat_title) })
  for (const c of mock.chat || []) {
    if (c?.text) blocks.push({ type: 'paragraph', text: `${c.role === 'bot' ? '助手' : '用户'}：${c.text}` })
  }
  if (mock.kpis?.length) {
    blocks.push({
      type: 'list',
      text: '指标',
      items: mock.kpis.map((k) => `${k.label || '指标'}：${k.value || '—'}${k.hint ? `（${k.hint}）` : ''}`),
    })
  }
  return blocks
}

function LandingHeroWidget({ node }: { node: SchemaNode }) {
  const title = String(node.props?.title || '应用')
  const subtitle = String(node.props?.subtitle || '')
  return (
    <section className="landing-hero">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </section>
  )
}

function resolveInteractiveForNode(node: SchemaNode) {
  const props = node.props || {}
  const mock = props.page_mock as (PageMock & { interactive?: unknown }) | undefined
  const fromProp = parseInteractiveSchema(props.interactive)
  if (fromProp) return fromProp
  const fromMock = parseInteractiveSchema(mock?.interactive)
  if (fromMock) return fromMock
  const blob = [
    props.title,
    props.scene_label,
    props.summary,
    props.capability_key,
    props.interactive_ui,
    props.ui_kind,
    mock?.ui_kind,
    mock?.form_title,
    node.id,
    ...(Array.isArray(props.blocks)
      ? (props.blocks as Block[]).flatMap((b) => [b.text, ...(b.items || [])])
      : []),
  ]
    .filter(Boolean)
    .join(' ')
  return interactiveSchemaFromIntent(blob)
}

function GeneratedCodeFrame({ title, html }: { title: string; html: string }) {
  return (
    <article className="generated-page generated-page--code" data-source="generated">
      <iframe
        title={title}
        srcDoc={html}
        sandbox="allow-scripts"
        style={{
          width: '100%',
          minHeight: 420,
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#fff',
        }}
      />
    </article>
  )
}

/**
 * Path B：有 source_html 直接 iframe；tool_pad 可点；业务才用 Gtgt。
 * 生成中仅简骨架，不把校验过程暴露给用户。
 */
function GeneratedPageWidget({ node }: { node: SchemaNode }) {
  const { primaryColor, user, schema } = useRuntime()
  const accent = primaryColor || '#4338ca'
  const meta = (schema?.meta || {}) as Record<string, unknown>
  const theme = (schema?.theme || {}) as { micrositeId?: string }
  const industrySite =
    String(meta.entry_source || '') === 'industry_site' ||
    Boolean(meta.microsite_id) ||
    Boolean(theme.micrositeId)
  const title = String(node.props?.title || node.props?.scene_label || node.id || '新页面')
  const summary = String(node.props?.summary || '')
  const capKey = String(node.props?.capability_key || node.id || 'gen_page')
  const pending = Boolean(node.props?.codegen_pending)
  const sourceHtml = String(node.props?.source_html || '').trim()
  const pageKind = String(
    node.props?.page_kind ||
      node.props?.ui_kind ||
      (node.props?.page_mock as PageMock | undefined)?.ui_kind ||
      '',
  )
  const mock = node.props?.page_mock as PageMock | undefined
  const rawBlocks = (Array.isArray(node.props?.blocks) ? node.props?.blocks : []) as Block[]
  const interactive = resolveInteractiveForNode(node)

  const fieldDefs = useMemo(() => {
    const hasCustom =
      (Array.isArray(node.props?.form_fields) && (node.props?.form_fields as unknown[]).length > 0) ||
      (Array.isArray(mock?.fields) && mock!.fields!.length > 0)
    return resolveFormFieldDefs({
      defaults: hasCustom
        ? undefined
        : [
            { key: 'title', label: '标题', placeholder: `请输入${title}相关内容` },
            { key: 'note', label: '说明', placeholder: '补充细节（可选）', optional: true, type: 'textarea' },
          ],
      formFields: node.props?.form_fields,
      pageMockFields: mock?.fields,
    })
  }, [node.props?.form_fields, mock?.fields, title])

  const steps: GtgtStep[] = useMemo(
    () =>
      fieldDefs.map((f) => ({
        key: f.key,
        label: f.label,
        placeholder: f.placeholder || '',
        optional: f.optional,
        inputType: f.type || 'text',
      })),
    [fieldDefs],
  )

  const seedList = useMemo<SeedRow[]>(
    () =>
      (mock?.list || []).map((row, i) => ({
        id: String(row.id || `seed_${i}`),
        title: String(row.title || row.id || '条目'),
        status: String(row.status || '示例'),
        detail: '',
        at: '',
        seed: true as const,
      })),
    [mock?.list],
  )

  const [records, setRecords] = useState<LocalRecord[]>(() => loadRecords(capKey))
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    setRecords(loadRecords(capKey))
    setValues({})
    setMsg('')
    setResetKey((k) => k + 1)
  }, [capKey])

  if (sourceHtml) {
    return <GeneratedCodeFrame title={title} html={sourceHtml} />
  }

  if (pending || pageKind === 'generated_code') {
    return (
      <article
        className={`generated-page generated-page--skeleton${industrySite ? ' generated-page--industry' : ''}`}
        data-source="generating"
        aria-busy="true"
        aria-label={`${title} 生成中`}
      >
        <header className="generated-skeleton-head">
          <h2>{title}</h2>
          <p className="generated-summary">{summary || '页面生成中，稍候即可使用…'}</p>
        </header>
        <div className="generated-skeleton-body" aria-hidden>
          <div className="generated-skel-line generated-skel-line--lg" />
          <div className="generated-skel-card" />
        </div>
      </article>
    )
  }

  if (interactive) {
    return <InteractiveToolPad schema={interactive} title={title || '交互工具'} summary={summary} />
  }

  const displayList: Array<LocalRecord | SeedRow> = [
    ...records,
    ...seedList.filter((s) => !records.some((r) => r.title === s.title)),
  ]

  const hasFormFields = fieldDefs.length > 0
  // 有表单时不再渲染 page_mock 静态块，避免「模板说明 + 表单」双重堆砌
  const infoBlocks =
    hasFormFields
      ? []
      : (rawBlocks.length ? rawBlocks : pageMockToBlocks(mock)).filter((b) => b.type !== 'button')

  const submitLabel = String(mock?.primary_action || node.props?.primary_action || `提交${title}`).slice(0, 16)
  const formTitle = String(mock?.form_title || node.props?.form_headline || title)
  const listTitle = String(mock?.list_title || '记录')

  const handleSubmit = async () => {
    const primaryKey = fieldDefs[0]?.key || 'title'
    const primaryVal = (values[primaryKey] || values.title || '').trim()
    if (!primaryVal) {
      setMsg('请先填写必填项')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await new Promise((r) => window.setTimeout(r, 280))
      const detail = fieldDefs
        .slice(1)
        .map((f) => {
          const v = (values[f.key] || '').trim()
          return v ? `${f.label}：${v}` : ''
        })
        .filter(Boolean)
        .join('；')
      const row: LocalRecord = {
        id: `r_${Date.now().toString(36)}`,
        title: primaryVal,
        status: '待处理',
        detail,
        at: new Date().toLocaleString(),
      }
      setRecords((prev) => {
        const next = [row, ...prev]
        saveRecords(capKey, next)
        return next
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg(pending ? '已写入本机预览记录（能力接口仍在生成）' : '已提交，记录已加入下方列表')
    } finally {
      setBusy(false)
    }
  }

  const cycleStatus = (id: string) => {
    setRecords((prev) => {
      const next = prev.map((r) => {
        if (r.id !== id) return r
        const idx = STATUS_CYCLE.indexOf(r.status as (typeof STATUS_CYCLE)[number])
        const status = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] || '待处理'
        return { ...r, status }
      })
      saveRecords(capKey, next)
      return next
    })
  }

  const removeRecord = (id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveRecords(capKey, next)
      return next
    })
  }

  return (
    <article
      className={`generated-page${industrySite ? ' generated-page--industry' : ''}`}
      data-source="generated"
      data-entry={industrySite ? 'industry_site' : 'workbench'}
    >
      <header>
        {!industrySite ? (
          <p className="generated-badge">{pending ? '预览录入 · 接口生成中' : '预览页 · 可交互'}</p>
        ) : null}
        <h2>{title}</h2>
        {summary ? <p className="generated-summary">{summary}</p> : null}
        <p className="muted" style={{ margin: '0 0 8px', fontSize: 13 }}>
          下方表单逐项填写（Enter 推进），点「{submitLabel}」写入本机记录；列表状态可点击切换。
          {user?.display_name ? ` · ${user.display_name}` : ''}
        </p>
      </header>

      {infoBlocks.length ? (
        <div className="generated-blocks generated-blocks-info">
          {infoBlocks.map((b, i) => {
            const t = b.type || 'paragraph'
            if (t === 'heading') return <h3 key={i}>{b.text}</h3>
            if (t === 'list') {
              return (
                <div key={i}>
                  {b.text ? <p className="muted">{b.text}</p> : null}
                  <ul>
                    {(b.items || []).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              )
            }
            return <p key={i}>{b.text}</p>
          })}
        </div>
      ) : null}

      <div className="generated-page-form">
        <GtgtStepComposer
          title={formTitle}
          meta={industrySite ? '业务录入' : '预览录入'}
          accent={accent}
          flowHint=">> 单字段 Enter 推进 · 提交后写入本机列表（非正式业务库）"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={handleSubmit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={busy ? '提交中…' : submitLabel}
        >
          {msg ? <p className="status-msg">{msg}</p> : null}
        </GtgtStepComposer>
      </div>

      <section className="generated-page-list" aria-label={listTitle}>
        <div className="generated-page-list-head">
          <h3 style={{ margin: 0 }}>{listTitle}</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {records.length} 条本机 · 点击状态可切换
          </span>
        </div>
        {displayList.length === 0 ? (
          <p className="muted">暂无记录，提交表单后出现在这里</p>
        ) : (
          <ul className="generated-page-list-ul">
            {displayList.map((row) => {
              const isSeed = 'seed' in row && row.seed
              return (
                <li key={row.id} className="generated-page-list-item">
                  <div>
                    <strong>{row.title}</strong>
                    {row.detail ? (
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {row.detail}
                      </p>
                    ) : null}
                    {row.at ? (
                      <p className="muted" style={{ margin: '2px 0 0', fontSize: 11 }}>
                        {row.at}
                      </p>
                    ) : null}
                  </div>
                  <div className="generated-page-list-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={Boolean(isSeed)}
                      title={isSeed ? '示例数据' : '切换状态'}
                      onClick={() => {
                        if (!isSeed) cycleStatus(row.id)
                      }}
                    >
                      {row.status}
                    </button>
                    {!isSeed ? (
                      <button type="button" className="btn btn-ghost" onClick={() => removeRecord(row.id)}>
                        删除
                      </button>
                    ) : (
                      <span className="muted" style={{ fontSize: 11 }}>
                        示例
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </article>
  )
}

/** 运行时内置壳组件（不依赖能力包目录） */
export function registerBuiltinWidgets(): void {
  registerWidget('LandingHeroWidget', LandingHeroWidget)
  registerWidget('GeneratedPageWidget', GeneratedPageWidget)
}
