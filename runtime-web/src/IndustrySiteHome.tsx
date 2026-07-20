import type { CSSProperties } from 'react'
import type { MicrositeRuntimeSkin } from './micrositeRuntimeSkin'
import { listMicrositeRuntimeSkins } from './micrositeRuntimeSkin'

export type IndustryMenuItem = {
  key: string
  label: string
  route?: string
  category?: string
  capability_key?: string
}

type Props = {
  appName: string
  skin: MicrositeRuntimeSkin | null
  micrositeId: string
  menu: IndustryMenuItem[]
  onEnterScene: (route: string) => void
  onPickSkin: (id: string) => void
}

function SceneCard({
  m,
  variant,
  onEnter,
}: {
  m: IndustryMenuItem
  variant?: 'tile' | 'row' | 'pill' | 'feature'
  onEnter: () => void
}) {
  return (
    <button type="button" className={`ind-scene-card is-${variant || 'tile'}`} onClick={onEnter}>
      <span className="ind-scene-cat">{m.category || '场景'}</span>
      <strong>{m.label}</strong>
      <span className="ind-scene-go">打开 →</span>
    </button>
  )
}

function SkinPicker({
  skins,
  micrositeId,
  onPickSkin,
}: {
  skins: MicrositeRuntimeSkin[]
  micrositeId: string
  onPickSkin: (id: string) => void
}) {
  return (
    <section className="ind-skin-picker" aria-label="视觉模板">
      <div className="ind-skin-picker-head">
        <strong>页面模板 · 切换即重排布局</strong>
        <span>20 套结构不同（侧栏 / 全屏 / 拼贴 / 杂志…），场景与真 API 不变</span>
      </div>
      <div className="ind-skin-chips">
        {skins.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ind-skin-chip${s.id === micrositeId ? ' on' : ''}`}
            style={
              s.id === micrositeId
                ? ({ borderColor: s.accent, color: s.accent } as CSSProperties)
                : undefined
            }
            onClick={() => onPickSkin(s.id)}
          >
            <strong>{s.styleLabel}</strong>
            <span>
              {s.layout} · {s.nav}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** 独立站 Runtime 标题首页：按模板 layout 重排结构 */
export default function IndustrySiteHome({
  appName,
  skin,
  micrositeId,
  menu,
  onEnterScene,
  onPickSkin,
}: Props) {
  const layout = skin?.layout || 'sidebar'
  const featured = menu.slice(0, layout === 'bento' || layout === 'magazine' || layout === 'waterfall' ? 12 : 8)
  const skins = listMicrositeRuntimeSkins()
  const primary = featured[0]

  const hero = (
    <section className={`ind-hero ind-hero--${layout}`} style={{ borderRadius: skin?.radius || '16px' }}>
      <p className="ind-hero-eyebrow">独立站方案 · Runtime · {skin?.styleLabel || '默认'}</p>
      <h2 className="ind-hero-title">{appName}</h2>
      <p className="ind-hero-sub">
        当前布局：<strong>{layout}</strong>
        {skin ? `（${skin.styleLabel}）` : ''}。切换上方模板会重新排版整页。
      </p>
      {primary?.route ? (
        <button type="button" className="btn ind-hero-cta" onClick={() => onEnterScene(primary.route || '/')}>
          进入「{primary.label}」→
        </button>
      ) : null}
    </section>
  )

  const picker = <SkinPicker skins={skins} micrositeId={micrositeId} onPickSkin={onPickSkin} />

  const cards = (variant: 'tile' | 'row' | 'pill' | 'feature' = 'tile') => (
    <section className={`ind-scene-grid ind-scene-grid--${layout}`} aria-label="场景入口">
      <h3>场景入口</h3>
      <div className={`ind-scene-cards ind-scene-cards--${layout}`}>
        {featured.map((m) => (
          <SceneCard
            key={m.key}
            m={m}
            variant={variant}
            onEnter={() => onEnterScene(m.route || `/${m.key}`)}
          />
        ))}
      </div>
      {menu.length > featured.length ? (
        <p className="ind-scene-more">其余 {menu.length - featured.length} 个场景见导航</p>
      ) : null}
    </section>
  )

  // —— 按 layout 组装不同结构 ——
  if (layout === 'fullscreen') {
    return (
      <div className={`ind-home ind-layout-fullscreen`} key={micrositeId}>
        <div className="ind-fullbleed">
          {hero}
          <div className="ind-fullbleed-dock">
            {featured.slice(0, 5).map((m) => (
              <button
                key={m.key}
                type="button"
                className="ind-dock-btn"
                onClick={() => onEnterScene(m.route || `/${m.key}`)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {picker}
      </div>
    )
  }

  if (layout === 'feature') {
    return (
      <div className="ind-home ind-layout-feature" key={micrositeId}>
        {picker}
        <div className="ind-feature-split">
          <div className="ind-feature-main">
            {hero}
            {primary ? (
              <SceneCard
                m={primary}
                variant="feature"
                onEnter={() => onEnterScene(primary.route || '/')}
              />
            ) : null}
          </div>
          <aside className="ind-feature-rail">
            <h3>更多场景</h3>
            {featured.slice(1).map((m) => (
              <SceneCard key={m.key} m={m} variant="row" onEnter={() => onEnterScene(m.route || `/${m.key}`)} />
            ))}
          </aside>
        </div>
      </div>
    )
  }

  if (layout === 'split') {
    return (
      <div className="ind-home ind-layout-split" key={micrositeId}>
        {picker}
        <div className="ind-asym">
          <div className="ind-asym-left">{hero}</div>
          <div className="ind-asym-right">{cards('row')}</div>
        </div>
      </div>
    )
  }

  if (layout === 'centered') {
    return (
      <div className="ind-home ind-layout-centered" key={micrositeId}>
        {picker}
        <div className="ind-center-col">
          {hero}
          {cards('pill')}
        </div>
      </div>
    )
  }

  if (layout === 'story' || layout === 'cinema') {
    return (
      <div className={`ind-home ind-layout-${layout}`} key={micrositeId}>
        {picker}
        {hero}
        <div className="ind-story-chapters">
          {featured.map((m, i) => (
            <article key={m.key} className="ind-story-chapter">
              <span className="ind-story-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{m.label}</h3>
                <p>{m.category || '业务场景'}</p>
                <button type="button" className="btn btn-ghost" onClick={() => onEnterScene(m.route || `/${m.key}`)}>
                  打开场景 →
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (layout === 'rows') {
    return (
      <div className="ind-home ind-layout-rows" key={micrositeId}>
        {picker}
        {hero}
        {cards('row')}
      </div>
    )
  }

  if (layout === 'bento' || layout === 'magazine' || layout === 'waterfall' || layout === 'topstrip') {
    return (
      <div className={`ind-home ind-layout-${layout}`} key={micrositeId}>
        {picker}
        {hero}
        {cards(layout === 'topstrip' ? 'pill' : 'tile')}
      </div>
    )
  }

  // sidebar / default
  return (
    <div className="ind-home ind-layout-sidebar" key={micrositeId}>
      {picker}
      {hero}
      {cards('tile')}
    </div>
  )
}
