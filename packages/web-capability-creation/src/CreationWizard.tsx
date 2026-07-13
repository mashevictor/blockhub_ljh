import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

const STEPS = ['描述需求', '选能力', '预览', '发布']

export default function CreationWizard(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [step, setStep] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [caps, setCaps] = useState<string[]>(['chat_qa', 'approval_flow'])
  const [msg, setMsg] = useState('')

  const toggleCap = (key: string) => {
    setCaps((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <div className="widget creation-wizard">
      <h3>智能创建向导</h3>
      <p className="muted">描述需求 → 选能力 → 一键发布（演示）</p>
      <div className="agent-picker">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`agent-chip${step === i ? ' active' : ''}`}
            style={step === i ? { borderColor: primaryColor, color: primaryColor } : undefined}
            onClick={() => setStep(i)}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <label>
          需求描述
          <textarea
            className="input"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：做一个门店请假+审批+看板应用…"
          />
        </label>
      )}

      {step === 1 && (
        <div className="nl-suggestions">
          {[
            ['chat_qa', '智能问答'],
            ['approval_flow', '审批流'],
            ['data_nl_query', '智能问数'],
            ['chart_dashboard', '数据看板'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`nl-suggest-btn agent-chip${caps.includes(key) ? ' active' : ''}`}
              style={caps.includes(key) ? { borderColor: primaryColor, color: primaryColor } : undefined}
              onClick={() => toggleCap(key)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="nl-result">
          <strong>预览</strong>
          <p>{prompt || '（未填写需求）'}</p>
          <p className="muted">已选 {caps.length} 项：{caps.join(' · ')}</p>
        </div>
      )}

      {step === 3 && (
        <p className="status-msg">可在 Home 主页完成真实发布；此处为 runtime 内嵌演示。</p>
      )}

      <div className="row-actions">
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
            上一步
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => setStep((s) => s + 1)}>
            下一步
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            style={{ background: primaryColor }}
            onClick={() => setMsg(`演示发布：${caps.length} 项能力已组装`)}
          >
            模拟发布
          </button>
        )}
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
