import { resolveArticleBlocks, type NewsArticle } from '../../../data/siteNews'
import EnrichArticleBody from './EnrichArticleBody'

/** Article is expected to be pre-localized by the caller (or already zh SSOT). */
export default function NewsArticleBody({ article }: { article: NewsArticle }) {
  return <EnrichArticleBody blocks={resolveArticleBlocks(article)} />
}
