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

  const registeredNote = (() => {
    const parts: string[] = []
    if (registered?.industries?.length) parts.push(`新行业 ${registered.industries.join('、')}`)
    if (registered?.capabilities?.length) parts.push(`新能力 ${registered.capabilities.join('、')}`)
    if (registered?.scenes?.length) parts.push(`${registered.scenes.length} 个新场景`)
    return parts.length ? parts.join(' · ') : ''
  })()

  return (
    <div className={`prompt-suggest-bar${loading ? ' is-loading' : ''}${isInvalid ? ' is-invalid' : ''}`}>
      <div className="prompt-suggest-head">
        {loading ? (
          <ChevronStrokeLoader variant="scan" size="btn" label="分析中" />
        ) : (
          <ChevronDotSign size="btn" className="prompt-suggest-prefix-chev" />
        )}
        <span className="prompt-suggest-title">
          {isInvalid
            ? '意图理解 Agent · 无法识别该需求'
            : loading
              ? `正在分析「${snippet}」…`
              : hasAutoSelected
                ? `已根据「${snippet}」自动勾选推荐模块，点击可取消`
                : isUnclear
                  ? `已分析「${snippet}」，请补充业务信息`
                  : `已分析「${snippet}」，可继续补充或手动选模块`}
        </span>
        {loading ? (
          <em className="prompt-suggest-ai-tag loading prompt-suggest-ai-loading">意图 Agent 分析中…</em>
        ) : sourceLabel ? (
          <em className="prompt-suggest-ai-tag">{sourceLabel}</em>
        ) : validation?.status === 'valid' ? (
          <em className="prompt-suggest-ai-tag">意图 Agent</em>
        ) : null}
      </div>

      {isInvalid ? (
        <div className="prompt-suggest-clarify prompt-suggest-reject">
          <p>{validation?.rejection_reason || '输入内容与搭建企业智能应用无关，无法生成方案。'}</p>
          {validation?.guidance ? <p className="prompt-suggest-guidance">{validation.guidance}</p> : null}
          <p>请描述真实业务场景，例如：制造设备报修、销售 CRM、医院排班、游戏玩家 FAQ、零售会员营销。</p>
        </div>
      ) : groups.length > 0 ? (
        <>
          {validation?.intent_summary ? (
            <p className="prompt-suggest-intent-summary">理解：{validation.intent_summary}</p>
          ) : null}
          {registeredNote ? (
            <p className="prompt-suggest-registered">已自动注册：{registeredNote}</p>
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
          <p>{validation?.guidance || '描述还不够具体，请补充行业与业务关键词。'}</p>
          <ul>
            <li>行业：制造报修、销售 CRM、医院排班、游戏 FAQ、健身课程预约</li>
            <li>能力：审批流、智能问答、数据看板、消息通知、直播带货</li>
          </ul>
          <p>或输入 <code>&gt;&gt;</code> 手动选择模块</p>
        </div>
      ) : lowConfidence ? (
        <div className="prompt-suggest-clarify">
          <p>暂未识别明确的行业或模块，请补充关键词，例如：</p>
          <ul>
            <li>行业：制造报修、销售 CRM、医院排班、游戏 FAQ</li>
            <li>能力：审批流、智能问答、数据看板、消息通知</li>
          </ul>
          <p>或输入 <code>&gt;&gt;</code> 手动选择模块</p>
        </div>
      ) : (
        <p className="prompt-suggest-empty">继续输入更多关键词，或输入 <code>&gt;&gt;</code> 手动选模块</p>
      )}

      {enhancedPreview && !isInvalid && (
        <div className={`prompt-suggest-preview${loading ? ' is-loading' : ''}`}>
          <div className="prompt-suggest-preview-head">
            <span><ChevronDotSign size="btn" className="prompt-suggest-prefix-chev" /> 整理后的描述</span>
            {!loading && confidence >= 0.4 && (
              <button type="button" className="link-btn" onClick={onApplyPreview}>采用到输入框</button>
            )}
          </div>
          <pre className="prompt-suggest-preview-body">{enhancedPreview}</pre>
        </div>
      )}
    </div>
  )
}
