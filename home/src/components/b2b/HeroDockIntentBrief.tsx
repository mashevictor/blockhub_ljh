import { HERO_DOCK_DEMO_PROBLEM } from '../../data/heroDockDemo'
import { ChevronDotSign } from '../ChevronDotLoader'

interface Props {
  visible: boolean
}

export default function HeroDockIntentBrief({ visible }: Props) {
  if (!visible) return null

  return (
    <div className="hero-dock-intent-brief">
      <div className="hero-dock-intent-brief-head">
        <ChevronDotSign size="btn" className="hero-dock-intent-brief-chev" />
        <strong>{HERO_DOCK_DEMO_PROBLEM.title}</strong>
      </div>
      <p className="hero-dock-intent-brief-body">{HERO_DOCK_DEMO_PROBLEM.body}</p>
      <p className="hero-dock-intent-brief-foot">{HERO_DOCK_DEMO_PROBLEM.foot}</p>
    </div>
  )
}
