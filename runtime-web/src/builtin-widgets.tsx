import { registerWidget, type SchemaNode } from '@blockhub/web-core'

type Block = { type?: string; text?: string; items?: string[] }

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

function GeneratedPageWidget({ node }: { node: SchemaNode }) {
  const title = String(node.props?.title || node.id || '生成页')
  const summary = String(node.props?.summary || '')
  const blocks = (Array.isArray(node.props?.blocks) ? node.props?.blocks : []) as Block[]
  return (
    <article className="generated-page" data-source="generated">
      <header>
        <p className="generated-badge">AI 生成预览</p>
        <h2>{title}</h2>
        {summary ? <p className="generated-summary">{summary}</p> : null}
      </header>
      <div className="generated-blocks">
        {blocks.map((b, i) => {
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
        })}
      </div>
    </article>
  )
}

/** 运行时内置壳组件（不依赖能力包目录） */
export function registerBuiltinWidgets(): void {
  registerWidget('LandingHeroWidget', LandingHeroWidget)
  registerWidget('GeneratedPageWidget', GeneratedPageWidget)
}
