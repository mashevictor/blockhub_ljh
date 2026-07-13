import { Link } from 'react-router-dom'
import type { EnrichBlock, EnrichLinkItem } from '../../../data/enrichBlocks'
import { RichParagraph } from '../../../lib/enrichRichText'

function BlockImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="enrich-news-figure">
      <img src={src} alt={alt} loading="lazy" />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}

function BlockLinks({ title, items }: { title?: string; items: EnrichLinkItem[] }) {
  return (
    <aside className="enrich-news-related">
      {title ? <h3>{title}</h3> : null}
      <ul className="enrich-news-related-list">
        {items.map((item) => (
          <li key={item.href}>
            {item.external ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="enrich-inline-link">
                {item.label} →
              </a>
            ) : item.href.startsWith('/#') || item.href.startsWith('#') ? (
              <a href={item.href} className="enrich-inline-link">
                {item.label} →
              </a>
            ) : (
              <Link to={item.href} className="enrich-inline-link">
                {item.label} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </aside>
  )
}

function BlockPanel({ title, lead, paragraphs }: { title: string; lead?: string; paragraphs: string[] }) {
  return (
    <section className="enrich-panel enrich-doc-panel">
      <div className="enrich-panel-head">
        <h2>{title}</h2>
        {lead ? <p>{lead}</p> : null}
      </div>
      <div className="enrich-panel-body">
        {paragraphs.map((text, i) => (
          <RichParagraph key={i} text={text} />
        ))}
      </div>
    </section>
  )
}

function renderBlock(block: EnrichBlock, index: number) {
  switch (block.type) {
    case 'p':
      return <RichParagraph key={index} text={block.text} />
    case 'image':
      return <BlockImage key={index} src={block.src} alt={block.alt} caption={block.caption} />
    case 'links':
      return <BlockLinks key={index} title={block.title} items={block.items} />
    case 'panel':
      return <BlockPanel key={index} title={block.title} lead={block.lead} paragraphs={block.paragraphs} />
    default:
      return null
  }
}

export default function EnrichArticleBody({ blocks }: { blocks: EnrichBlock[] }) {
  return <div className="enrich-article-body enrich-news-article-body">{blocks.map(renderBlock)}</div>
}
