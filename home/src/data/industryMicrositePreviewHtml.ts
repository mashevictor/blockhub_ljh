/**
 * 行业站预览：沿用所选模板的 style.css，正文全部用当前行业文案，避免「切模板却看到别的行业文案」。
 */

import type { IndustryMicrositeTemplate } from './industryMicrositeTemplates'

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface MicrositePreviewChrome {
  brandSuffix: string
  navScenes: string
  navHighlights: string
  navContact: string
  ctaGet: string
  ctaScenes: string
  sectionScenes: string
  sectionHighlights: string
  scenesLead: string
  highlightsLead: string
  contactLead: string
  backSite: string
  composeApp: string
  footerPreview: string
  fallbackScene: string
  fallbackSceneDetail: string
  fallbackHighlight: string
  sceneCardDetail: string
  highlightCardDetail: string
  defaultHeadline: string
}

export interface MicrositePreviewCopy {
  packKey: string
  packName: string
  tagline: string
  overview: string
  highlights: string[]
  scenes: Array<{ name: string; detail?: string }>
  /** When omitted, Chinese defaults are used (zh-CN). */
  chrome?: Partial<MicrositePreviewChrome>
  /** html lang attribute */
  lang?: string
}

const ZH_CHROME: MicrositePreviewChrome = {
  brandSuffix: '方案',
  navScenes: '业务场景',
  navHighlights: '方案亮点',
  navContact: '获取方案',
  ctaGet: '获取方案',
  ctaScenes: '查看场景',
  sectionScenes: '业务场景',
  sectionHighlights: '方案亮点',
  scenesLead: '文案来自「{{name}}」行业包；下方仅切换视觉模板「{{style}}」。',
  highlightsLead: '行业内容固定，模板只决定版式与视觉气质。',
  contactLead: '确认风格后，可在积木仓用此模板编排正式能力并发布。',
  backSite: '返回方案站',
  composeApp: '去编排应用',
  footerPreview: '{{name}}行业预览',
  fallbackScene: '可扩展场景',
  fallbackSceneDetail: '按需增减{{name}}正式能力模块。',
  fallbackHighlight: '场景闭环',
  sceneCardDetail: '{{name}}业务场景，可落地为正式能力。',
  highlightCardDetail: '{{name}}方案亮点，便于投放转化与内部对齐。',
  defaultHeadline: '{{name}}智能应用方案',
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '')
}

export function buildIndustryMicrositeSrcDoc(
  copy: MicrositePreviewCopy,
  template: IndustryMicrositeTemplate,
  assetOrigin = '',
): string {
  const chrome: MicrositePreviewChrome = { ...ZH_CHROME, ...copy.chrome }
  const vars = { name: copy.packName, style: template.styleLabel }
  const brand = `${copy.packName}${chrome.brandSuffix}`
  const headline = copy.tagline || fill(chrome.defaultHeadline, vars)
  const lead = copy.overview || copy.tagline || ''
  const scenes = copy.scenes.slice(0, 3)
  while (scenes.length < 3) {
    scenes.push({
      name: chrome.fallbackScene,
      detail: fill(chrome.fallbackSceneDetail, vars),
    })
  }
  const highlights = (
    copy.highlights.length
      ? copy.highlights
      : [chrome.fallbackHighlight, chrome.navScenes, chrome.composeApp]
  ).slice(0, 3)

  const sceneCards = scenes
    .map(
      (s) =>
        `<article class="card"><h3>${esc(s.name)}</h3><p>${esc(s.detail || fill(chrome.sceneCardDetail, vars))}</p></article>`,
    )
    .join('')

  const highlightCards = highlights
    .map(
      (h) =>
        `<article class="card"><h3>${esc(h)}</h3><p>${esc(fill(chrome.highlightCardDetail, vars))}</p></article>`,
    )
    .join('')

  const origin = (assetOrigin || '').replace(/\/$/, '')
  const cssHref = `${origin}/industry-microsites/${template.id}/style.css`
  const lang = copy.lang || 'zh-CN'

  return `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <title>${esc(brand)} · ${esc(copy.packName)}</title>
  <link rel="stylesheet" href="${esc(cssHref)}" />
  <style>
    /* iframe 内预览：避免模板页过大 margin 撑破高度观感 */
    html, body { margin: 0; }
  </style>
</head>
<body data-pack="${esc(copy.packKey)}" data-preview-industry="1">
  <div class="wrap">
    <div class="topbar">
      <div class="brand">${esc(brand)}</div>
      <nav class="nav">
        <a href="#scenes">${esc(chrome.navScenes)}</a>
        <a href="#highlights">${esc(chrome.navHighlights)}</a>
        <a href="#contact">${esc(chrome.navContact)}</a>
      </nav>
    </div>
  </div>
  <header class="hero wrap">
    <div class="hero-copy">
      <span class="badge">${esc(copy.packName)}</span>
      <h1 class="reveal">${esc(headline)}</h1>
      <p class="lead reveal d2">${esc(lead)}</p>
      <div class="cta-row reveal d3">
        <a class="btn" href="#contact">${esc(chrome.ctaGet)}</a>
        <a class="btn ghost" href="#scenes">${esc(chrome.ctaScenes)}</a>
      </div>
    </div>
    <div class="hero-visual reveal d2" role="img" aria-label="${esc(copy.packName)}"></div>
  </header>

  <section class="wrap block" id="scenes">
    <h2>${esc(chrome.sectionScenes)}</h2>
    <p class="section-lead">${esc(fill(chrome.scenesLead, vars))}</p>
    <div class="grid-3">${sceneCards}</div>
  </section>

  <section class="wrap block" id="highlights">
    <h2>${esc(chrome.sectionHighlights)}</h2>
    <p class="section-lead">${esc(chrome.highlightsLead)}</p>
    <div class="grid-3">${highlightCards}</div>
  </section>

  <section class="wrap block" id="contact">
    <h2>${esc(chrome.navContact)}</h2>
    <p class="section-lead">${esc(chrome.contactLead)}</p>
    <div class="cta-row">
      <a class="btn" href="/industry/${esc(copy.packKey)}">${esc(chrome.backSite)}</a>
      <a class="btn ghost" href="/#contact-create?mode=industry&amp;pack=${esc(copy.packKey)}">${esc(chrome.composeApp)}</a>
    </div>
  </section>

  <footer class="wrap">
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">
      <span>© ${esc(brand)} · ${esc(template.styleLabel)}</span>
      <span>${esc(fill(chrome.footerPreview, vars))}</span>
    </div>
  </footer>
</body>
</html>`
}
