/** Format suggest-source tags for PromptSuggestBar / PromptView. */

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export type SuggestSourceSpec =
  | { id: 'brand' }
  | { id: 'blocked' }
  | { id: 'need_more' }
  | { id: 'intent_pct'; pct: number }
  | { id: 'intent' }
  | { id: 'match_pct'; pct: number }
  | { id: 'match' }
  | { id: 'danmaku'; label: string }
  | { id: 'keyword' }
  | { id: 'none' }

export function formatSuggestSource(t: TranslateFn, spec: SuggestSourceSpec | null | undefined): string {
  if (!spec || spec.id === 'none') return ''
  switch (spec.id) {
    case 'brand':
      return t('home.suggest.src.brand')
    case 'blocked':
      return t('home.suggest.src.blocked')
    case 'need_more':
      return t('home.suggest.src.need_more')
    case 'intent_pct':
      return t('home.suggest.src.intent_pct', { pct: spec.pct })
    case 'intent':
      return t('home.suggest.src.intent')
    case 'match_pct':
      return t('home.suggest.src.match_pct', { pct: spec.pct })
    case 'match':
      return t('home.suggest.src.match')
    case 'danmaku':
      return t('home.suggest.src.danmaku', { label: spec.label })
    case 'keyword':
      return t('home.suggest.src.keyword')
    default:
      return ''
  }
}
