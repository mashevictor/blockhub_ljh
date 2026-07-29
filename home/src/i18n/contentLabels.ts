/** P3 marketing content — keys in content.json (`content.*`). */

import type { CaseStudy } from '../data/siteCases'
import type { TrustDocArticle } from '../data/enrichmentContent'
import type { NewsArticle, NewsCategory } from '../data/siteNews'
import type { RolePage } from '../data/siteRoles'
import type { PricingTier, PricingFaq } from '../data/sitePricing'
import { NEWS_CATEGORY_LABELS } from '../data/siteNews'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function contentTr(t: TranslateFn, key: string, fallback: string): string {
  const fullKey = `content.${key}`
  const text = t(fullKey)
  return text === fullKey ? fallback : text
}

/** Resolved capability name from showcase catalog. */
export function showcaseCapName(t: TranslateFn, id: string, fallback?: string): string {
  const fb = fallback ?? id
  return contentTr(t, `showcase.cap.${id}.name`, fb)
}

/** Short capability description under the name. */
export function showcaseCapDesc(t: TranslateFn, id: string, fallback?: string): string {
  const fb = fallback ?? ''
  return contentTr(t, `showcase.cap.${id}.desc`, fb)
}

export function showcasePlatName(t: TranslateFn, id: string, fallback?: string): string {
  const fb = fallback ?? id
  return contentTr(t, `showcase.plat.${id}.name`, fb)
}

export function showcasePlatSub(t: TranslateFn, id: string, fallback?: string): string {
  const fb = fallback ?? ''
  return contentTr(t, `showcase.plat.${id}.sub`, fb)
}

export function newsCategoryLabel(t: TranslateFn, cat: NewsCategory): string {
  return contentTr(t, `news.cat.${cat}`, NEWS_CATEGORY_LABELS[cat])
}

export function solutionLabel(
  t: TranslateFn,
  packKey: string,
  index: number,
  fallback: string,
): string {
  return contentTr(t, `solution.${packKey}.${index}`, fallback)
}

export function localizeSolutions(t: TranslateFn, packKey: string, solutions: string[]): string[] {
  return solutions.map((s, i) => solutionLabel(t, packKey, i, s))
}

export function localizeCaseStudy(t: TranslateFn, study: CaseStudy): CaseStudy {
  const slug = study.slug
  const prefix = `case.${slug}`
  return {
    ...study,
    name: contentTr(t, `${prefix}.name`, study.name),
    industry: contentTr(t, `${prefix}.industry`, study.industry),
    tag: study.tag ? contentTr(t, `${prefix}.tag`, study.tag) : study.tag,
    summary: contentTr(t, `${prefix}.summary`, study.summary),
    pilotNote: contentTr(t, `${prefix}.pilot`, study.pilotNote),
    metrics: study.metrics.map((m, i) => ({
      ...m,
      label: contentTr(t, `${prefix}.metric.${i}.label`, m.label),
    })),
    story: study.story.map((p, i) => contentTr(t, `${prefix}.story.${i}`, p)),
  }
}

export function localizeNewsArticle(t: TranslateFn, article: NewsArticle): NewsArticle {
  const slug = article.slug
  const prefix = `news.${slug}`
  return {
    ...article,
    title: contentTr(t, `${prefix}.title`, article.title),
    summary: contentTr(t, `${prefix}.summary`, article.summary),
    body: article.body.map((p, i) => contentTr(t, `${prefix}.body.${i}`, p)),
  }
}

export function localizeRolePage(t: TranslateFn, role: RolePage): RolePage {
  const k = role.key
  return {
    ...role,
    title: contentTr(t, `role.${k}.title`, role.title),
    subtitle: contentTr(t, `role.${k}.subtitle`, role.subtitle),
    cta: contentTr(t, `role.${k}.cta`, role.cta),
    topQuestions: role.topQuestions.map((q, i) => contentTr(t, `role.${k}.q.${i}`, q)),
    downloads: role.downloads.map((dl, i) => ({
      ...dl,
      title: contentTr(t, `role.${k}.dl.${i}`, dl.title),
    })),
  }
}

export function localizePricingTier(t: TranslateFn, tier: PricingTier): PricingTier {
  const prefix = `pricing.${tier.id}`
  const limits = tier.limits ?? []
  const nameKey = `home.pricing.tier.${tier.id}.name`
  const ctaKey = `home.pricing.tier.${tier.id}.cta`
  const badgeKey = `home.pricing.tier.${tier.id}.badge`
  const name = t(nameKey)
  const cta = t(ctaKey)
  const badge = t(badgeKey)
  return {
    ...tier,
    name: name === nameKey ? tier.name : name,
    ctaLabel: cta === ctaKey ? tier.ctaLabel : cta,
    tag: tier.tag
      ? (badge === badgeKey ? tier.tag : badge)
      : tier.tag,
    range: contentTr(t, `${prefix}.range`, tier.range),
    desc: contentTr(t, `${prefix}.desc`, tier.desc),
    features: tier.features.map((f, i) => contentTr(t, `${prefix}.f${i}`, f)),
    limits: limits.length
      ? limits.map((l, i) => contentTr(t, `${prefix}.l${i}`, l))
      : tier.limits,
  }
}

export function localizePricingFaq(t: TranslateFn, item: PricingFaq, index: number): PricingFaq {
  return {
    q: contentTr(t, `pricing.faq.${index}.q`, item.q),
    a: contentTr(t, `pricing.faq.${index}.a`, item.a),
  }
}

export function pricingSmartPageLabel(t: TranslateFn, fallback: string): string {
  return contentTr(t, 'pricing.smart_page', fallback)
}

export function pricingSmartPageHint(t: TranslateFn, fallback: string): string {
  return contentTr(t, 'pricing.smart_hint', fallback)
}

export function pricingComposeEditLabel(t: TranslateFn, fallback: string): string {
  return contentTr(t, 'pricing.compose_edit', fallback)
}

export function pricingComposeEditHint(t: TranslateFn, fallback: string): string {
  return contentTr(t, 'pricing.compose_hint', fallback)
}

export function pricingTip(t: TranslateFn, fallback: string): string {
  return contentTr(t, 'pricing.tip', fallback)
}

export function localizeTrustArticle(t: TranslateFn, article: TrustDocArticle): TrustDocArticle {
  const id = article.id
  const prefix = `trust.${id}`
  return {
    ...article,
    title: contentTr(t, `${prefix}.title`, article.title),
    subtitle: contentTr(t, `${prefix}.subtitle`, article.subtitle),
    sections: article.sections.map((sec, si) => ({
      heading: contentTr(t, `${prefix}.sec.${si}.h`, sec.heading),
      paragraphs: sec.paragraphs.map((p, pi) => contentTr(t, `${prefix}.sec.${si}.p.${pi}`, p)),
    })),
    relatedLinks: article.relatedLinks.map((link, li) => ({
      ...link,
      label: contentTr(t, `${prefix}.link.${li}`, link.label),
    })),
  }
}

/** Trust catalog card / homepage strip — title & description (maps to content.trust.{id}.title/subtitle). */
export function trustDocTitle(t: TranslateFn, id: string, fallback: string): string {
  return contentTr(t, `trust.${id}.title`, fallback)
}

export function trustDocDescription(t: TranslateFn, id: string, fallback: string): string {
  return contentTr(t, `trust.${id}.subtitle`, fallback)
}

export function localizeTrustDocCard<T extends { id: string; title: string; description: string }>(
  t: TranslateFn,
  doc: T,
): T {
  return {
    ...doc,
    title: trustDocTitle(t, doc.id, doc.title),
    description: trustDocDescription(t, doc.id, doc.description),
  }
}

/** Localize capability pick label when shown in suggest UI. */
export function localizeCapabilityPickLabel(
  t: TranslateFn,
  pick: { type: string; key: string; label: string },
): string {
  if (pick.type === 'capability') {
    return showcaseCapName(t, pick.key, pick.label)
  }
  return pick.label
}
