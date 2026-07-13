import type { CSSProperties } from 'react'
import type { NewsCategory } from './siteNews'

export interface EnrichCardTheme {
  color: string
  from: string
  to: string
  icon: string
}

const DEFAULT_THEME: EnrichCardTheme = {
  color: '#0d47a1',
  from: '#eff6ff',
  to: '#dbeafe',
  icon: '📦',
}

/** 案例 · 按行业一色 */
export const CASE_INDUSTRY_THEMES: Record<string, EnrichCardTheme> = {
  制造: { color: '#3b82f6', from: '#eff6ff', to: '#dbeafe', icon: '🏭' },
  零售: { color: '#f97316', from: '#fff7ed', to: '#ffedd5', icon: '🛒' },
  物流: { color: '#ca8a04', from: '#fffbeb', to: '#fef3c7', icon: '📦' },
}

export function caseIndustryTheme(industry: string): EnrichCardTheme {
  return CASE_INDUSTRY_THEMES[industry] ?? DEFAULT_THEME
}

/** 新闻 · 按分类一色 */
export const NEWS_CATEGORY_THEMES: Record<NewsCategory, EnrichCardTheme> = {
  product: { color: '#0d47a1', from: '#eff6ff', to: '#dbeafe', icon: '🚀' },
  customer: { color: '#00b894', from: '#ecfdf5', to: '#d1fae5', icon: '🤝' },
  insight: { color: '#7c3aed', from: '#f5f3ff', to: '#ede9fe', icon: '💡' },
}

/** 信任资料 · 按文档一色 */
export const TRUST_DOC_THEMES: Record<string, EnrichCardTheme> = {
  'security-whitepaper': { color: '#0d47a1', from: '#eff6ff', to: '#dbeafe', icon: '🛡' },
  integration: { color: '#0891b2', from: '#ecfeff', to: '#cffafe', icon: '🔗' },
  dpa: { color: '#059669', from: '#ecfdf5', to: '#d1fae5', icon: '📋' },
  deployment: { color: '#6366f1', from: '#eef2ff', to: '#e0e7ff', icon: '☁' },
  'security-faq': { color: '#d97706', from: '#fffbeb', to: '#fef3c7', icon: '❓' },
  'audit-log': { color: '#64748b', from: '#f8fafc', to: '#f1f5f9', icon: '📊' },
}

export function trustDocTheme(id: string): EnrichCardTheme {
  return TRUST_DOC_THEMES[id] ?? DEFAULT_THEME
}

/** 定价 · 按套餐一色 */
export const PRICING_TIER_THEMES: Record<string, EnrichCardTheme> = {
  saas: { color: '#64748b', from: '#f8fafc', to: '#f1f5f9', icon: '☁' },
  hybrid: { color: '#0d47a1', from: '#eff6ff', to: '#dbeafe', icon: '⭐' },
  private: { color: '#7c3aed', from: '#f5f3ff', to: '#ede9fe', icon: '🏢' },
}

export function pricingTierTheme(id: string): EnrichCardTheme {
  return PRICING_TIER_THEMES[id] ?? DEFAULT_THEME
}

export function enrichCardStyle(theme: EnrichCardTheme): CSSProperties {
  return {
    '--card-accent': theme.color,
    '--card-from': theme.from,
    '--card-to': theme.to,
  } as React.CSSProperties
}
