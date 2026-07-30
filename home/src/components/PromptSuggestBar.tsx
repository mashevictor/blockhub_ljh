import type { AgentPick } from './agentInputLogic'
import { moduleId } from './agentInputLogic'
import { DynamicIcon } from './icons'
import { groupSuggestions, type SuggestItem } from '../data/promptSuggest'
import type { SuggestValidation } from '../api/client'
import { ChevronDotSign, ChevronStrokeLoader } from './ChevronDotLoader'
import { useT } from '@blockhub/i18n/react'
import { localizeCapabilityPickLabel } from '../i18n/contentLabels'

interface Props {
  userIntent: string
  suggestions: SuggestItem[]
  enhancedPreview: string
  selectedIds: Set<string>
  onToggle: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
  onApplyPreview: () => void
  /** 推荐来源标签，随输入与接口结果变化 */
  sourceLabel?: string
  confidence?: number
  loading?: boolean
  validation?: SuggestValidation | null
  registered?: { industries: string[]; capabilities: string[]; scenes: string[] }
}

function intentSnippet(text: string, max = 14): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

export default function PromptSuggestBar({
  userIntent,
  suggestions,
  enhancedPreview,
  selectedIds,
  onToggle,
  onApplyPreview,
  sourceLabel = '',
  confidence = 0,
  loading = false,
  validation = null,
  registered,
}: Props) {
  const t = useT()
  if (!userIntent.trim() || userIntent.trim().length < 2) return null

  const snippet = intentSnippet(userIntent)
  const groups = groupSuggestions(suggestions, t)
  const isInvalid = !loading && validation?.status === 'invalid'
  const isUnclear = !loading && validation?.status === 'unclear' && groups.length === 0
  const lowConfidence = !loading && !isInvalid && groups.length === 0
  const hasAutoSelected = !loading && !isInvalid && groups.length > 0
  const joiner = t('home.cap_split.joiner')

  const registeredNote = (() => {
    const parts: string[] = []
    if (registered?.industries?.length) {
      parts.push(t('home.suggest.reg.industry', { list: registered.industries.join(joiner) }))
    }
    if (registered?.capabilities?.length) {
      parts.push(t('home.suggest.reg.capability', { list: registered.capabilities.join(joiner) }))
    }
    if (registered?.scenes?.length) {
      parts.push(t('home.suggest.reg.scenes', { n: registered.scenes.length }))
    }
    return parts.length ? parts.join(' · ') : ''
  })()

  const title = isInvalid
    ? t('home.suggest.title.invalid')
    : loading
      ? t('home.suggest.title.loading', { snippet })
      : hasAutoSelected
        ? t('home.suggest.title.auto', { snippet })
        : isUnclear
          ? t('home.suggest.title.unclear', { snippet })
          : t('home.suggest.title.done', { snippet })

  return (
    <div className={`prompt-suggest-bar${loading ? ' is-loading' : ''}${isInvalid ? ' is-invalid' : ''}`}>
      <div className="prompt-suggest-head">
        {loading ? (
          <ChevronStrokeLoader variant="scan" size="btn" label={t('home.suggest.analyzing')} />
        ) : (
          <ChevronDotSign size="btn" className="prompt-suggest-prefix-chev" />
        )}
        <span className="prompt-suggest-title">{title}</span>
        {loading ? (
          <em className="prompt-suggest-ai-tag loading prompt-suggest-ai-loading">{t('home.suggest.agent_analyzing')}</em>
        ) : sourceLabel ? (
          <em className="prompt-suggest-ai-tag">{sourceLabel}</em>
        ) : validation?.status === 'valid' ? (
          <em className="prompt-suggest-ai-tag">{t('home.suggest.agent')}</em>
        ) : null}
      </div>

      {isInvalid ? (
        <div className="prompt-suggest-clarify prompt-suggest-reject">
          <p>{validation?.rejection_reason || t('home.suggest.reject_default')}</p>
          {validation?.guidance ? <p className="prompt-suggest-guidance">{validation.guidance}</p> : null}
          <p>{t('home.suggest.reject_examples')}</p>
        </div>
      ) : groups.length > 0 ? (
        <>
          {validation?.intent_summary ? (
            <p className="prompt-suggest-intent-summary">
              {t('home.suggest.understood', { summary: validation.intent_summary })}
            </p>
          ) : null}
          {registeredNote ? (
            <p className="prompt-suggest-registered">
              {t('home.suggest.registered', { note: registeredNote })}
            </p>
          ) : null}
          <div className="prompt-suggest-groups">
            {groups.map((group) => (
              <section key={group.kind} className="prompt-suggest-group">
                <h4 className="prompt-suggest-group-title">{group.label}</h4>
                <div className="prompt-suggest-chips">
                  {group.items.map((s) => {
                    const id = moduleId(s.pick)
                    const on = selectedIds.has(id)
                    return (
                      <button
                        key={id}
                        type="button"
                        className={`prompt-suggest-chip${on ? ' on' : ''}`}
                        onClick={() => onToggle(s.pick, { iconKey: s.iconKey, color: s.color })}
                        title={s.reason}
                      >
                        <span className="prompt-suggest-chevron">&gt;&gt;</span>
                        {s.iconKey && s.color && (
                          <span className="prompt-suggest-icon">
                            <DynamicIcon name={s.iconKey} size={14} color={s.color} />
                          </span>
                        )}
                        <span>{localizeCapabilityPickLabel(t, s.pick)}</span>
                        {on && <em className="prompt-suggest-check">✓</em>}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : isUnclear ? (
        <div className="prompt-suggest-clarify">
          <p>{validation?.guidance || t('home.suggest.unclear_default')}</p>
          <ul>
            <li>{t('home.suggest.hint.industry_long')}</li>
            <li>{t('home.suggest.hint.capability_long')}</li>
          </ul>
          <p>{t('home.suggest.or_manual')}</p>
        </div>
      ) : lowConfidence ? (
        <div className="prompt-suggest-clarify">
          <p>{t('home.suggest.low_confidence')}</p>
          <ul>
            <li>{t('home.suggest.hint.industry_short')}</li>
            <li>{t('home.suggest.hint.capability_short')}</li>
          </ul>
          <p>{t('home.suggest.or_manual')}</p>
        </div>
      ) : (
        <p className="prompt-suggest-empty">{t('home.suggest.keep_typing')}</p>
      )}

      {enhancedPreview && !isInvalid && (
        <div className={`prompt-suggest-preview${loading ? ' is-loading' : ''}`}>
          <div className="prompt-suggest-preview-head">
            <span>
              <ChevronDotSign size="btn" className="prompt-suggest-prefix-chev" /> {t('home.suggest.preview_title')}
            </span>
            {!loading && confidence >= 0.4 && (
              <button type="button" className="link-btn" onClick={onApplyPreview}>
                {t('home.suggest.apply_preview')}
              </button>
            )}
          </div>
          <pre className="prompt-suggest-preview-body">{enhancedPreview}</pre>
        </div>
      )}
    </div>
  )
}
