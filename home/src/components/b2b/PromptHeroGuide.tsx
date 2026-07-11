import type { ComponentType, SVGProps } from 'react'
import AgentSignLine from '../AgentSignLine'
import { IconMessage, IconLayers, IconDevices } from '../icons'
type StepIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const STEPS: { num: string; title: string; desc: string; Icon: StepIcon }[] = [
  {
    num: '01',
    title: '描述需求',
    desc: '用自然语言说出业务场景，或在下方输入框直接描述。',
    Icon: IconMessage,
  },
  {
    num: '02',
    title: '编排模块',
    desc: '输入 >> 多选行业、场景与能力模块，AI 自动补全组合。',
    Icon: IconLayers,
  },
  {
    num: '03',
    title: '生成应用',
    desc: '选择网页 / App / 双端，一键发布到应用广场。',
    Icon: IconDevices,
  },
]

export default function PromptHeroGuide() {
  return (
    <section className="prompt-hero-guide" aria-labelledby="prompt-hero-guide-title">
      <header className="prompt-hero-guide-head">
        <AgentSignLine
          variant="section"
          as="h1"
          className="minimal-hero-title prompt-hero-guide-title"
        />
        <p className="prompt-hero-guide-subtitle" id="prompt-hero-guide-title">
          描述需求，或输入 <span className="minimal-brand-chev">&gt;&gt;</span> 开始智能交互
        </p>
      </header>

      <figure className="prompt-hero-guide-visual">
        <img
          src="/design/chevron-input-hint.svg"
          alt="描述需求后输入 >> 多选行业与模块"
          className="prompt-hero-guide-banner prompt-hero-guide-banner-svg"
          width={640}
          height={120}
          loading="lazy"
        />
      </figure>

      <div className="prompt-hero-guide-steps">
        {STEPS.map(({ num, title, desc, Icon }) => (
          <article key={num} className="prompt-hero-guide-step">
            <span className="prompt-hero-guide-step-icon" aria-hidden>
              <Icon size={22} />
            </span>
            <span className="prompt-hero-guide-step-num">{num}</span>
            <h3 className="prompt-hero-guide-step-title">{title}</h3>
            <p className="prompt-hero-guide-step-desc">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
