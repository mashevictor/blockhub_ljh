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

export interface MicrositePreviewCopy {
  packKey: string
  packName: string
  tagline: string
  overview: string
  highlights: string[]
  scenes: Array<{ name: string; detail?: string }>
}

export function buildIndustryMicrositeSrcDoc(
  copy: MicrositePreviewCopy,
  template: IndustryMicrositeTemplate,
  assetOrigin = '',
): string {
  const brand = `${copy.packName}方案`
  const headline = copy.tagline || `${copy.packName}智能应用方案`
  const lead = copy.overview || copy.tagline || ''
  const scenes = copy.scenes.slice(0, 3)
  while (scenes.length < 3) {
    scenes.push({ name: '可扩展场景', detail: `按需增减${copy.packName}正式能力模块。` })
  }
  const highlights = (copy.highlights.length ? copy.highlights : ['场景闭环', '可编排能力', '多端发布']).slice(0, 3)

  const sceneCards = scenes
    .map(
      (s) =>
        `<article class="card"><h3>${esc(s.name)}</h3><p>${esc(s.detail || `${copy.packName}业务场景，可落地为正式能力。`)}</p></article>`,
    )
    .join('')

  const highlightCards = highlights
    .map(
      (h) =>
        `<article class="card"><h3>${esc(h)}</h3><p>${esc(copy.packName)}方案亮点，便于投放转化与内部对齐。</p></article>`,
    )
    .join('')

  const origin = (assetOrigin || '').replace(/\/$/, '')
  const cssHref = `${origin}/industry-microsites/${template.id}/style.css`

  return `<!DOCTYPE html>
<html lang="zh-CN">
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
        <a href="#scenes">业务场景</a>
        <a href="#highlights">方案亮点</a>
        <a href="#contact">获取方案</a>
      </nav>
    </div>
  </div>
  <header class="hero wrap">
    <div class="hero-copy">
      <span class="badge">${esc(copy.packName)}</span>
      <h1 class="reveal">${esc(headline)}</h1>
      <p class="lead reveal d2">${esc(lead)}</p>
      <div class="cta-row reveal d3">
        <a class="btn" href="#contact">获取方案</a>
        <a class="btn ghost" href="#scenes">查看场景</a>
      </div>
    </div>
    <div class="hero-visual reveal d2" role="img" aria-label="${esc(copy.packName)}"></div>
  </header>

  <section class="wrap block" id="scenes">
    <h2>业务场景</h2>
    <p class="section-lead">文案来自「${esc(copy.packName)}」行业包；下方仅切换视觉模板「${esc(template.styleLabel)}」。</p>
    <div class="grid-3">${sceneCards}</div>
  </section>

  <section class="wrap block" id="highlights">
    <h2>方案亮点</h2>
    <p class="section-lead">行业内容固定，模板只决定版式与视觉气质。</p>
    <div class="grid-3">${highlightCards}</div>
  </section>

  <section class="wrap block" id="contact">
    <h2>获取方案</h2>
    <p class="section-lead">确认风格后，可在积木仓用此模板编排正式能力并发布。</p>
    <div class="cta-row">
      <a class="btn" href="/industry/${esc(copy.packKey)}">返回方案站</a>
      <a class="btn ghost" href="/#contact-create">去编排应用</a>
    </div>
  </section>

  <footer class="wrap">
    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap">
      <span>© ${esc(brand)} · ${esc(template.styleLabel)}</span>
      <span>${esc(copy.packName)}行业预览</span>
    </div>
  </footer>
</body>
</html>`
}
