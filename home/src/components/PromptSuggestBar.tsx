import type { AgentPick } from './agentInputLogic'
import { moduleId } from './agentInputLogic'
import { DynamicIcon } from './icons'
import type { SuggestItem } from '../data/promptSuggest'

interface Props {
  userIntent: string
  suggestions: SuggestItem[]
  enhancedPreview: string
  selectedIds: Set<string>
  onToggle: (pick: AgentPick, extra?: { iconKey?: string; color?: string }) => void
  onApplyPreview: () => void
  usedLlm?: boolean
}

export default function PromptSuggestBar({
  userIntent,
  suggestions,
  enhancedPreview,
  selectedIds,
  onToggle,
  onApplyPreview,
  usedLlm = false,
}: Props) {
  if (!userIntent.trim() || userIntent.trim().length < 2) return null

  return (
    <div className="prompt-suggest-bar">
      <div className="prompt-suggest-head">
        <span className="prompt-suggest-prefix">&gt;&gt;</span>
        <span className="prompt-suggest-title">根据你的描述，推荐勾选模块（点击切换）</span>
        {usedLlm && <em className="prompt-suggest-ai-tag">DeepSeek</em>}
      </div>

      {suggestions.length > 0 ? (
        <div className="prompt-suggest-chips">
          {suggestions.map((s) => {
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
                <span>{s.pick.label}</span>
                {on && <em className="prompt-suggest-check">✓</em>}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="prompt-suggest-empty">继续输入更多关键词，或输入 <code>&gt;</code> 手动选模块</p>
      )}

      {enhancedPreview && (
        <div className="prompt-suggest-preview">
          <div className="prompt-suggest-preview-head">
            <span><span className="prompt-suggest-prefix">&gt;&gt;</span> 优化后的生成提示词</span>
            <button type="button" className="link-btn" onClick={onApplyPreview}>采用到输入框</button>
          </div>
          <pre className="prompt-suggest-preview-body">{enhancedPreview}</pre>
        </div>
      )}
    </div>
  )
}
