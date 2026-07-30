import { useT } from '@blockhub/i18n/react'
import { heroDockDemoProblem } from '../../data/heroDockDemo'
import { ChevronDotSign } from '../ChevronDotLoader'

interface Props {
  visible: boolean
}

export default function HeroDockIntentBrief({ visible }: Props) {
  const t = useT()
  if (!visible) return null

  const problem = heroDockDemoProblem(t)

  return (
    <div className="hero-dock-intent-brief">
      <div className="hero-dock-intent-brief-head">
        <ChevronDotSign size="btn" className="hero-dock-intent-brief-chev" />
        <strong>{problem.title}</strong>
      </div>
      <p className="hero-dock-intent-brief-body">{problem.body}</p>
      <p className="hero-dock-intent-brief-foot">{problem.foot}</p>
    </div>
  )
}
