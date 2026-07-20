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

/** 独立站 Runtime 标题首页：大标题 + 场景入口卡片（禁止能力按钮墙） */
export default function IndustrySiteHome({
  appName,
  skin,
  micrositeId,
  menu,
  onEnterScene,
  onPickSkin,
}: Props) {
  const featured = menu.slice(0, 8)
  const skins = listMicrositeRuntimeSkins()

  return (
    <div className="ind-home">
      <section className="ind-hero" style={{ borderRadius: skin?.radius || '16px' }}>
        <p className="ind-hero-eyebrow">独立站方案 · Runtime</p>
        <h2 className="ind-hero-title">{appName}</h2>
        <p className="ind-hero-sub">
          {skin
            ? `当前视觉：${skin.styleLabel}。从左侧选场景进入业务页，或在下方更换模板气质。`
            : '从左侧选场景进入业务页；可在下方选择独立站视觉模板。'}
        </p>
        {featured[0]?.route ? (
          <button
            type="button"
            className="btn ind-hero-cta"
            onClick={() => onEnterScene(featured[0].route || '/')}
          >
            进入「{featured[0].label}」→
          </button>
        ) : null}
      </section>

      <section className="ind-skin-picker" aria-label="视觉模板">
        <div className="ind-skin-picker-head">
          <strong>页面模板</strong>
          <span>切换仅改布局气质，场景与真 API 不变</span>
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
              <span>{s.style}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="ind-scene-grid" aria-label="推荐场景">
        <h3>场景入口</h3>
        <div className="ind-scene-cards">
          {featured.map((m) => (
            <button
              key={m.key}
              type="button"
              className="ind-scene-card"
              onClick={() => onEnterScene(m.route || `/${m.key}`)}
            >
              <span className="ind-scene-cat">{m.category || '场景'}</span>
              <strong>{m.label}</strong>
              <span className="ind-scene-go">打开 →</span>
            </button>
          ))}
        </div>
        {menu.length > featured.length ? (
          <p className="ind-scene-more">其余 {menu.length - featured.length} 个场景见左侧导航</p>
        ) : null}
      </section>
    </div>
  )
}
