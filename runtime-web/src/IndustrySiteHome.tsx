import { useMemo, type CSSProperties } from 'react'
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
  industryLabel: string
  skin: MicrositeRuntimeSkin | null
  micrositeId: string
  menu: IndustryMenuItem[]
  onEnterScene: (_route: string) => void
  onPickSkin: (id: string) => void
}

/**
 * 独立站首页：单一主路径
 * 第一步只引导「点左侧场景」；换皮收进折叠区；去掉多个并列主按钮。
 */
export default function IndustrySiteHome({
  appName,
  industryLabel,
  skin,
  micrositeId,
  menu,
  onPickSkin,
}: Props) {
  const skins = listMicrositeRuntimeSkins()
  const title = industryLabel || appName || '行业应用'
  const sceneCount = menu.length
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const m of menu) set.add(m.category || '场景')
    return set.size
  }, [menu])

  return (
    <div className="ind-home ind-home--editorial-guided" key={micrositeId}>
      <section className="ind-hero ind-hero--cover">
        <p className="ind-hero-eyebrow">Industry Runtime · 独立站工作台</p>
        <h2 className="ind-hero-title">{title}</h2>
        <p className="ind-hero-sub">
          已装 <strong>{sceneCount}</strong> 个场景 · <strong>{categories}</strong> 个分类。
          首页只做封面；业务入口在左侧导航，点场景即可进入。
        </p>

        <div className="ind-step-rail" aria-label="操作步骤">
          <div className="ind-step-rail-item is-current">
            <span className="ind-step-num">1</span>
            <div>
              <strong>点左侧场景</strong>
              <p>展开分类 → 点场景名称即可进入（唯一主操作）</p>
            </div>
          </div>
          <div className="ind-step-rail-item is-next">
            <span className="ind-step-num">2</span>
            <div>
              <strong>场景页填写</strong>
              <p>进入后用 &gt;&gt; 单字段推进，读写真 API</p>
            </div>
          </div>
          <div className="ind-step-rail-item is-next">
            <span className="ind-step-num">3</span>
            <div>
              <strong>需要时再改页</strong>
              <p>右上角折叠的 CapShip 胶囊，不挡导航</p>
            </div>
          </div>
        </div>

        <p className="ind-primary-hint" role="status">
          <span className="ind-primary-arrow" aria-hidden>
            ←
          </span>
          <strong>第一步：请点击左侧任意场景名称</strong>
          <span>例如「请假申请」「制度政策问答」</span>
        </p>
      </section>

      <details className="ind-skin-picker ind-skin-picker--compact ind-skin-details">
        <summary>
          <strong>换皮（可选）</strong>
          <span>
            当前：{skin?.styleLabel || micrositeId || '默认'} · 不改场景与能力
          </span>
        </summary>
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
              title={s.styleLabel}
            >
              {s.styleLabel.split('·')[0].trim()}
            </button>
          ))}
        </div>
      </details>
    </div>
  )
}
