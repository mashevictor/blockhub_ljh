import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import {
  PRICING_B_TIERS,
  PRICING_C_TIERS,
  PRICING_DEPLOY_TIERS,
  PRICING_FAQ,
  SMART_PAGE_HINT,
  SMART_PAGE_LABEL,
  type PricingTier,
} from '../../data/sitePricing'
import { enrichCardStyle, pricingTierTheme } from '../../data/enrichVisualThemes'
import { ROLE_PAGES } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

function TierGrid({ tiers }: { tiers: PricingTier[] }) {
  return (
    <div className="enrich-pricing-grid enrich-pricing-grid--page">
      {tiers.map((tier) => {
        const theme = pricingTierTheme(tier.id)
        return (
          <article
            key={tier.id}
            className={`enrich-card enrich-tier${tier.featured ? ' is-featured' : ''}`}
            style={enrichCardStyle(theme) as CSSProperties}
          >
            <EnrichCardVisual icon={theme.icon} label={tier.name} sublabel={tier.range} />
            <div className="enrich-card-body enrich-card-body--compact">
              <div className="enrich-tier-range">{tier.range}</div>
              <ul className="enrich-tier-features">
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function PricingPage() {
  usePageMeta({
    title: '定价说明 · 积木仓',
    description: `C 端 Free/Plus 与 B 端 Team/Business/Enterprise；含对话改页与${SMART_PAGE_LABEL}配额说明`,
  })

  return (
    <MarketingSiteShell skin="landed" pageTitle="定价框架" pageEyebrow="定价说明">
      <section className="enrich-panel" aria-labelledby="pricing-c-title" style={{ marginBottom: 28 }}>
        <div className="enrich-panel-head">
          <h2 id="pricing-c-title">C 端 · 创作者</h2>
          <p>
            个人试用与接单。{SMART_PAGE_LABEL}：{SMART_PAGE_HINT}。
          </p>
        </div>
        <TierGrid tiers={PRICING_C_TIERS} />
      </section>

      <section className="enrich-panel" aria-labelledby="pricing-b-title" style={{ marginBottom: 28 }}>
        <div className="enrich-panel-head">
          <h2 id="pricing-b-title">B 端 · 组织坐席</h2>
          <p>多人协作、行业包、改页审批与双端构建。个人 Plus 不自动等于一个坐席。</p>
        </div>
        <TierGrid tiers={PRICING_B_TIERS} />
      </section>

      <section className="enrich-panel" aria-labelledby="pricing-deploy-title" style={{ marginBottom: 28 }}>
        <div className="enrich-panel-head">
          <h2 id="pricing-deploy-title">部署形态</h2>
          <p>公有云含在 Team/Business 订阅内；混合与私有化按合同。</p>
        </div>
        <TierGrid tiers={PRICING_DEPLOY_TIERS} />
      </section>

      <section className="enrich-panel enrich-pricing-faq" aria-labelledby="pricing-faq-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-faq-title">常见问题</h2>
          <p>套餐边界、{SMART_PAGE_LABEL}、付款与试点</p>
        </div>
        <div className="enrich-panel-body">
          <dl className="enrich-faq-dl enrich-faq-dl--grid">
            {PRICING_FAQ.map((item) => (
              <div key={item.q} className="enrich-faq-item">
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="enrich-panel enrich-role-links" aria-labelledby="pricing-roles-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-roles-title">按角色查看</h2>
          <p>采购、业务负责人与信息部门的不同关注点</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-role-chip-grid">
            {ROLE_PAGES.map((role) => (
              <Link key={role.key} to={ROUTES.rolePage(role.key)} className="enrich-role-chip">
                <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                {role.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="enrich-section-foot enrich-detail-actions">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>预约演示 · 获取专属报价说明</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
