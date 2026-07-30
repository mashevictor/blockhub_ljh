import { useT } from '@blockhub/i18n/react'
import { ChevronDotSign } from './ChevronDotLoader'
import type { ChevronDotSize } from '../data/chevronDotGrid'

type Variant = 'hero' | 'eyebrow' | 'section' | 'inline'

const SIGN_SIZE: Record<Variant, ChevronDotSize> = {
  hero: 'md',
  eyebrow: 'btn',
  section: 'sm',
  inline: 'btn',
}

interface Props {
  variant?: Variant
  className?: string
  as?: 'p' | 'h1' | 'h2' | 'span'
}

/** >> brand slogan — follows global home locale (CapShip page uses its own copy) */
export default function AgentSignLine({
  variant = 'inline',
  className = '',
  as: Tag = variant === 'hero' ? 'h2' : variant === 'section' ? 'h2' : 'p',
}: Props) {
  const t = useT()
  const line = t('home.brand.agent_sign')
  return (
    <Tag
      className={`agent-sign-line agent-sign-line--${variant} ${className}`.trim()}
      aria-label={line}
    >
      <ChevronDotSign
        size={SIGN_SIZE[variant]}
        className="agent-sign-chev-dot"
        introTarget={variant === 'eyebrow'}
      />
      {line}
    </Tag>
  )
}
