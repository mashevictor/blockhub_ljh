import { resolveArticleBlocks, type NewsArticle } from '../../../data/siteNews'
import EnrichArticleBody from './EnrichArticleBody'

export default function NewsArticleBody({ article }: { article: NewsArticle }) {
  return <EnrichArticleBody blocks={resolveArticleBlocks(article)} />
}
