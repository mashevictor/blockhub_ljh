import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AgentChevronGlyph, AgentButtonContent } from '../AgentChevron'
import type { DemoBookingDelivery } from '../../api/client'
import { ROUTES } from '../../routes/paths'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'

interface Props {
  delivery: DemoBookingDelivery
  compact?: boolean
}

function summaryLines(text: string): string[] {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
}

function TryOnlineButton({ className }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const goTry = () => {
    if (location.pathname === '/' || location.pathname === '') {
      scrollToHomeSection('contact-create')
      return
    }
    navigate(ROUTES.contactCreate)
  }
  return (
    <button type="button" className={className} onClick={goTry}>
      <AgentButtonContent trailing={false}>在线体验</AgentButtonContent>
    </button>
  )
}

export default function DemoBookingSuccess({ delivery, compact = false }: Props) {
  const { shareUrl, agentSummary, contactEmail, contactPhoneMasked, emailSent, smsSent, local } = delivery
  const [linkCopied, setLinkCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)

  const contactHint = [
    contactEmail && !local ? `完整资料已发送至 ${contactEmail}` : null,
    contactPhoneMasked && smsSent ? `并已短信通知 ${contactPhoneMasked}` : null,
    contactPhoneMasked && !smsSent && shareUrl ? `手机 ${contactPhoneMasked} 可在下方打开资料包` : null,
    local ? '当前为离线保存，联网后请重新提交以获取资料包' : null,
  ]
    .filter(Boolean)
    .join('，')

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const copySummary = async () => {
    if (!agentSummary) return
    try {
      await navigator.clipboard.writeText(agentSummary)
      setSummaryCopied(true)
      window.setTimeout(() => setSummaryCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`demo-booking-success-card${compact ? ' is-compact' : ''}`}>
      <div className="demo-booking-success-check" aria-hidden>
        ✓
      </div>
      <h3 className="demo-booking-success-title">预约已收到</h3>
      {contactHint && <p className="demo-booking-success-contact">{contactHint}</p>}
      <p className="demo-booking-success-meta">
        顾问将在 24 小时内联系您 · 可先转发资料给同事
        {emailSent === false && contactEmail && !local ? ' · 邮件暂未发出，请使用下方链接' : ''}
      </p>

      {agentSummary && (
        <div className="demo-booking-summary-box">
          <div className="demo-booking-summary-head">
            <AgentChevronGlyph size="xs" />
            为您生成的「内部转发摘要」（可直接复制给同事）
          </div>
          {summaryLines(agentSummary).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="demo-booking-summary-cite">
            <AgentChevronGlyph size="xs" />
            摘要由智能体根据官方案例与安全资料整理 · 刚刚生成
          </div>
          <button type="button" className="demo-booking-copy-summary" onClick={copySummary}>
            {summaryCopied ? '已复制摘要' : '复制摘要'}
          </button>
        </div>
      )}

      {shareUrl ? (
        <>
          <Link to={ROUTES.share(delivery.shareToken)} className="b2b-btn-primary agent-action-btn demo-booking-success-btn">
            <AgentButtonContent trailing={false}>打开我的专属资料包</AgentButtonContent>
          </Link>
          <button type="button" className="b2b-btn-outline agent-action-btn demo-booking-success-btn" onClick={copyLink}>
            <AgentButtonContent trailing={false}>
              {linkCopied ? '链接已复制' : '复制链接 · 转发给同事'}
            </AgentButtonContent>
          </button>
          <TryOnlineButton className="b2b-btn-outline agent-action-btn demo-booking-success-btn" />
          {!compact && (
            <p className="demo-booking-success-url" title={shareUrl}>
              专属链接：<span>{shareUrl}</span>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="demo-booking-success-offline">资料链接将在网络恢复后生成，顾问也会主动联系您。</p>
          <TryOnlineButton className="b2b-btn-primary agent-action-btn demo-booking-success-btn" />
        </>
      )}
    </div>
  )
}
