import { useMemo, useState, type CSSProperties } from 'react'
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
  /** 行业包中文名，如「通用办公」；优先于 appName 做英雄大字 */
  industryLabel: string
  skin: MicrositeRuntimeSkin | null
  micrositeId: string
  menu: IndustryMenuItem[]
  onEnterScene: (route: string) => void
  onPickSkin: (id: string) => void
}

/**
 * 独立站 Runtime 首页 = 设计稿 01（侧栏树封面）+ 02（三步引导串联）
 * 英雄区只放行业大字；场景在壳侧栏；模板为小芯片。
 */
export default function IndustrySiteHome({
  appName,
  industryLabel,
  skin,
  micrositeId,
  menu,
  onEnterScene,
  onPickSkin,
}: Props) {
  const skins = listMicrositeRuntimeSkins()
  const primary = menu[0]
  const [focusKey, setFocusKey] = useState(primary?.key || '')
  const [guideStep, setGuideStep] = useState<1 | 2 | 3>(1)

  const focused = useMemo(
    () => menu.find((m) => m.key === focusKey) || primary || null,
    [menu, focusKey, primary],
  )

  const capKey =
    focused?.capability_key ||
    (focused as { capabilityKey?: string } | null)?.capabilityKey ||
    focused?.key ||
    '—'

  const title = industryLabel || appName || '行业应用'
  const sceneCount = menu.length

  const enterFocused = () => {
    if (!focused) return
    setGuideStep(3)
    onEnterScene(focused.route || `/${focused.key}`)
  }

  return (
    <div className="ind-home ind-home--editorial-guided" key={micrositeId}>
      <section className="ind-hero ind-hero--cover" style={{ borderRadius: skin?.radius || '16px' }}>
        <p className="ind-hero-eyebrow">已选行业 · 独立站 Runtime</p>
        <h2 className="ind-hero-title">{title}</h2>
        <p className="ind-hero-sub">
          共 <strong>{sceneCount}</strong> 个场景在左侧按分类展开。首页不做 Tab 墙；按下面三步进入能力填写。
        </p>

        <div className="ind-guide-steps" role="tablist" aria-label="使用引导">
          <button
            type="button"
            role="tab"
            aria-selected={guideStep === 1}
            className={`ind-guide-step${guideStep === 1 ? ' on' : ''}`}
            onClick={() => setGuideStep(1)}
          >
            <span className="ind-guide-n">STEP 1</span>
            <strong>左侧选场景</strong>
            <span>父子级分类，点名称即可</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={guideStep === 2}
            className={`ind-guide-step${guideStep === 2 ? ' on' : ''}`}
            onClick={() => setGuideStep(2)}
          >
            <span className="ind-guide-n">STEP 2</span>
            <strong>看串联路径</strong>
            <span>场景如何落到能力包</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={guideStep === 3}
            className={`ind-guide-step${guideStep === 3 ? ' on' : ''}`}
            onClick={() => setGuideStep(3)}
          >
            <span className="ind-guide-n">STEP 3</span>
            <strong>开始填写</strong>
            <span>进入 Runtime · &gt;&gt; 推进</span>
          </button>
        </div>

        <div className="ind-hero-cta-row">
          {primary ? (
            <button
              type="button"
              className="btn ind-hero-cta"
              onClick={() => {
                setFocusKey(primary.key)
                setGuideStep(3)
                onEnterScene(primary.route || `/${primary.key}`)
              }}
            >
              从「{primary.label}」开始 →
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              const el = document.querySelector('.runtime-sidebar details')
              if (el instanceof HTMLDetailsElement) el.open = true
              setGuideStep(1)
            }}
          >
            查看左侧 {sceneCount} 个场景
          </button>
        </div>
      </section>

      <div className="ind-board">
        <section className="ind-path-card" aria-label="场景能力串联">
          <div className="ind-path-head">
            <h3>当前串联路径</h3>
            <p>点左侧场景后这里会更新；再点「进入」开跑。</p>
          </div>
          <div className="ind-path-pills">
            <span className="ind-pill">{focused?.label || '未选场景'}</span>
            <span className="ind-path-arrow" aria-hidden>
              →
            </span>
            <span className="ind-pill ind-pill--cap">{capKey}</span>
            <span className="ind-path-arrow" aria-hidden>
              →
            </span>
            <span className="ind-pill">打开填写</span>
          </div>
          <div className="ind-path-action">
            <div>
              <strong>{focused?.label || '请先选场景'}</strong>
              <small>
                {focused?.category || '业务场景'} · 真 API · 空库即空列表
              </small>
            </div>
            <button type="button" className="btn" disabled={!focused} onClick={enterFocused}>
              进入场景 →
            </button>
          </div>
          {/* 焦点列表：便于在首页预览串联，不铺满 60+ Tab */}
          <div className="ind-focus-list" aria-label="快速聚焦场景">
            {menu.slice(0, 8).map((m) => (
              <button
                key={m.key}
                type="button"
                className={`ind-focus-chip${m.key === focused?.key ? ' on' : ''}`}
                onClick={() => {
                  setFocusKey(m.key)
                  setGuideStep(2)
                }}
              >
                {m.label}
              </button>
            ))}
            {menu.length > 8 ? (
              <span className="ind-focus-more">其余 {menu.length - 8} 个见左侧导航</span>
            ) : null}
          </div>
        </section>

        <section className="ind-skin-picker ind-skin-picker--compact" aria-label="页面模板">
          <div className="ind-skin-picker-head">
            <strong>换皮（可选）</strong>
            <span>小芯片 · 只改版式气质，不改场景与能力关系</span>
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
                title={`${s.styleLabel} · ${s.layout}/${s.nav}`}
              >
                {s.styleLabel.split('·')[0].trim()}
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="ind-how" aria-label="怎么用">
        <div>
          <b>① 左侧选场景</b>
          <span>父子级折叠，避免顶栏密密麻麻。</span>
        </div>
        <div>
          <b>② 看串联路径</b>
          <span>一个场景对应能力包，真 API 读写。</span>
        </div>
        <div>
          <b>③ 进入填写</b>
          <span>用 &gt;&gt; 单字段推进；换皮不影响数据。</span>
        </div>
      </section>
    </div>
  )
}
