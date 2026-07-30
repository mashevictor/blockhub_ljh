import { useT } from '@blockhub/i18n/react'

const CASE_IDS = [0, 1, 2] as const

export default function B2BCaseSection() {
  const t = useT()

  return (
    <section id="case" className="b2b-section b2b-case-wrap">
      <div className="b2b-section-title">
        <span className="b2b-eyebrow">{t('home.landing.cases.legacy.eyebrow')}</span>
        <h2>{t('home.landing.cases.legacy.title')}</h2>
        <p>{t('home.landing.cases.legacy.lead')}</p>
      </div>
      <div className="b2b-case-grid">
        {CASE_IDS.map((id) => (
          <article key={id} className="b2b-case-item">
            <div className="b2b-case-name">{t(`home.landing.cases.legacy.${id}.name`)}</div>
            <p>{t(`home.landing.cases.legacy.${id}.desc`)}</p>
            <div className="b2b-case-result">{t(`home.landing.cases.legacy.${id}.result`)}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
