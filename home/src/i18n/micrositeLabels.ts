/** Microsite template display labels — keys in home.json (`home.industry.ms.tpl.*`). */

import type { IndustryMicrositeTemplate } from '../data/industryMicrositeTemplates'
import type { MicrositePreviewChrome } from '../data/industryMicrositePreviewHtml'
import type { TranslateFn } from './industryLabels'

function tr(t: TranslateFn, key: string, fallback: string): string {
  const text = t(key)
  return text === key ? fallback : text
}

/** Style chip title: "Helios · Full-screen open" */
export function micrositeStyleLabel(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.style`, tpl.styleLabel)
}

export function micrositeName(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.name`, tpl.name)
}

export function micrositeCategory(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.category`, tpl.category)
}

export function micrositeBrand(t: TranslateFn, tpl: IndustryMicrositeTemplate): string {
  return tr(t, `home.industry.ms.tpl.${tpl.id}.brand`, tpl.brand)
}

/** iframe preview chrome strings (nav / CTA / section titles). */
export function micrositePreviewChrome(t: TranslateFn): MicrositePreviewChrome {
  const g = (key: string, fallback: string) => tr(t, `home.industry.ms.preview.${key}`, fallback)
  return {
    brandSuffix: g('brand_suffix', '方案'),
    navScenes: g('nav_scenes', '业务场景'),
    navHighlights: g('nav_highlights', '方案亮点'),
    navContact: g('nav_contact', '获取方案'),
    ctaGet: g('cta_get', '获取方案'),
    ctaScenes: g('cta_scenes', '查看场景'),
    sectionScenes: g('section_scenes', '业务场景'),
    sectionHighlights: g('section_highlights', '方案亮点'),
    scenesLead: g('scenes_lead', '文案来自「{{name}}」行业包；下方仅切换视觉模板「{{style}}」。'),
    highlightsLead: g('highlights_lead', '行业内容固定，模板只决定版式与视觉气质。'),
    contactLead: g('contact_lead', '确认风格后，可在积木仓用此模板编排正式能力并发布。'),
    backSite: g('back_site', '返回方案站'),
    composeApp: g('compose_app', '去编排应用'),
    footerPreview: g('footer_preview', '{{name}}行业预览'),
    fallbackScene: g('fallback_scene', '可扩展场景'),
    fallbackSceneDetail: g('fallback_scene_detail', '按需增减{{name}}正式能力模块。'),
    fallbackHighlight: g('fallback_highlight', '场景闭环'),
    sceneCardDetail: g('scene_card_detail', '{{name}}业务场景，可落地为正式能力。'),
    highlightCardDetail: g('highlight_card_detail', '{{name}}方案亮点，便于投放转化与内部对齐。'),
    defaultHeadline: g('default_headline', '{{name}}智能应用方案'),
  }
}
