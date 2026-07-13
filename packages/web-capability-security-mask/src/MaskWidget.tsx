import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

const SAMPLE = {
  phone: '13812345678',
  idCard: '310101199001011234',
  email: 'zhangsan@company.com',
  salary: '28500.00',
}

type MaskMode = 'phone' | 'idCard' | 'email' | 'salary'

const LABELS: Record<MaskMode, string> = {
  phone: '手机号',
  idCard: '身份证',
  email: '邮箱',
  salary: '薪资',
}

function maskValue(mode: MaskMode, raw: string): string {
  if (mode === 'phone') return raw.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  if (mode === 'idCard') return raw.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2')
  if (mode === 'email') {
    const [user, domain] = raw.split('@')
    return `${user.slice(0, 2)}***@${domain}`
  }
  return '¥ ****'
}

export default function MaskWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [mode, setMode] = useState<MaskMode>('phone')
  const [revealed, setRevealed] = useState(false)

  const raw = SAMPLE[mode]
  const display = revealed ? raw : maskValue(mode, raw)

  return (
    <div className="widget mask-widget">
      <h3>数据脱敏展示</h3>
      <p className="muted">按字段策略脱敏，授权后可查看原文</p>
      <div className="agent-picker">
        {(Object.keys(LABELS) as MaskMode[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`agent-chip${mode === k ? ' active' : ''}`}
            style={mode === k ? { borderColor: primaryColor, color: primaryColor } : undefined}
            onClick={() => { setMode(k); setRevealed(false) }}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>
      <div className="nl-result">
        <strong>{LABELS[mode]}</strong>
        <p style={{ fontSize: 20, letterSpacing: 1, margin: '8px 0' }}>{display}</p>
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setRevealed((v) => !v)}
      >
        {revealed ? '恢复脱敏' : '申请查看原文（演示）'}
      </button>
    </div>
  )
}
