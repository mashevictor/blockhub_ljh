import { registerWidget, type SchemaNode } from '@blockhub/web-core'

type Block = { type?: string; text?: string; items?: string[] }

type PageMock = {
  form_title?: string
  fields?: Array<{ key?: string; label?: string; type?: string; value?: string }>
  list_title?: string
  list?: Array<{ id?: string; title?: string; status?: string }>
  primary_action?: string
  chat_title?: string
  chat?: Array<{ role?: string; text?: string }>
  kpis?: Array<{ label?: string; value?: string; hint?: string }>
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

/** compose page_mock → GeneratedPageWidget blocks（即时预览，不等 codegen） */
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
        const title = row.title || row.id || '条目'
        return row.status ? `${title} · ${row.status}` : String(title)
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
  if (mock.primary_action) blocks.push({ type: 'button', text: String(mock.primary_action) })
  return blocks
}

function GeneratedPageWidget({ node }: { node: SchemaNode }) {
  const title = String(node.props?.title || node.props?.scene_label || node.id || '生成页')
  const summary = String(node.props?.summary || '')
  const rawBlocks = (Array.isArray(node.props?.blocks) ? node.props?.blocks : []) as Block[]
  const mock = node.props?.page_mock as PageMock | undefined
  const blocks = rawBlocks.length ? rawBlocks : pageMockToBlocks(mock)
  const pending = Boolean(node.props?.codegen_pending)
  return (
    <article className="generated-page" data-source="generated">
      <header>
        <p className="generated-badge">{pending ? 'AI 生成中 · 先看预览' : 'AI 生成预览'}</p>
        <h2>{title}</h2>
        {summary ? <p className="generated-summary">{summary}</p> : null}
      </header>
      <div className="generated-blocks">
        {blocks.length ? (
          blocks.map((b, i) => {
            const t = b.type || 'paragraph'
            if (t === 'heading') return <h3 key={i}>{b.text}</h3>
            if (t === 'list') {
              return (
                <div key={i}>
                  {b.text ? <p>{b.text}</p> : null}
                  <ul>
                    {(b.items || []).map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </div>
              )
            }
            if (t === 'button') {
              return (
                <button key={i} type="button" className="btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  {b.text || '操作'}
                </button>
              )
            }
            return <p key={i}>{b.text}</p>
          })
        ) : (
          <p className="muted">页面结构生成中，请稍候…</p>
        )}
      </div>
    </article>
  )
}

/** 运行时内置壳组件（不依赖能力包目录） */
export function registerBuiltinWidgets(): void {
  registerWidget('LandingHeroWidget', LandingHeroWidget)
  registerWidget('GeneratedPageWidget', GeneratedPageWidget)
}
