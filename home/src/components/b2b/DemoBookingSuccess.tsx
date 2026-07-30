import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
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
      <AgentButtonContent trailing={false}>{t('home.booking.success.try_online')}</AgentButtonContent>
    </button>
  )
}

export default function DemoBookingSuccess({ delivery, compact = false }: Props) {
  const t = useT()
  const { shareUrl, agentSummary, contactEmail, contactPhoneMasked, emailSent, smsSent, local } = delivery
  const [linkCopied, setLinkCopied] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)

  const contactHint = [
    contactEmail && !local ? t('home.booking.success.sent_email', { email: contactEmail }) : null,
    contactPhoneMasked && smsSent
      ? t('home.booking.success.sent_sms', { phone: contactPhoneMasked })
      : null,
    contactPhoneMasked && !smsSent && shareUrl
      ? t('home.booking.success.phone_open', { phone: contactPhoneMasked })
      : null,
    local ? t('home.booking.success.local_save') : null,
  ]
    .filter(Boolean)
    .join(t('home.booking.success.hint_join'))

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
      <h3 className="demo-booking-success-title">{t('home.booking.success.title')}</h3>
      {contactHint && <p className="demo-booking-success-contact">{contactHint}</p>}
      <p className="demo-booking-success-meta">
        {t('home.booking.success.meta')}
        {emailSent === false && contactEmail && !local ? t('home.booking.success.meta_email_fail') : ''}
      </p>

      {agentSummary && (
        <div className="demo-booking-summary-box">
          <div className="demo-booking-summary-head">
            <AgentChevronGlyph size="xs" />
            {t('home.booking.success.summary_head')}
          </div>
          {summaryLines(agentSummary).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <div className="demo-booking-summary-cite">
            <AgentChevronGlyph size="xs" />
            {t('home.booking.success.summary_cite')}
          </div>
          <button type="button" className="demo-booking-copy-summary" onClick={copySummary}>
            {summaryCopied ? t('home.booking.success.copied_summary') : t('home.booking.success.copy_summary')}
          </button>
        </div>
      )}

      {shareUrl ? (
        <>
          <Link to={ROUTES.share(delivery.shareToken)} className="b2b-btn-primary agent-action-btn demo-booking-success-btn">
            <AgentButtonContent trailing={false}>{t('home.booking.success.open_pack')}</AgentButtonContent>
          </Link>
          <button type="button" className="b2b-btn-outline agent-action-btn demo-booking-success-btn" onClick={copyLink}>
            <AgentButtonContent trailing={false}>
              {linkCopied ? t('home.booking.success.copied_link') : t('home.booking.success.copy_link')}
            </AgentButtonContent>
          </button>
          <TryOnlineButton className="b2b-btn-outline agent-action-btn demo-booking-success-btn" />
          {!compact && (
            <p className="demo-booking-success-url" title={shareUrl}>
              {t('home.booking.success.exclusive_url')}<span>{shareUrl}</span>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="demo-booking-success-offline">{t('home.booking.success.offline_pack')}</p>
          <TryOnlineButton className="b2b-btn-primary agent-action-btn demo-booking-success-btn" />
        </>
      )}
    </div>
  )
}
