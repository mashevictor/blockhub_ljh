import { useMemo, type CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
  const skins = listMicrositeRuntimeSkins()
  const title = industryLabel || appName || t('runtime.home.fallback_title')
  const sceneCount = menu.length
  const sceneFallback = t('runtime.nav.scene_fallback')
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const m of menu) set.add(m.category || sceneFallback)
    return set.size
  }, [menu, sceneFallback])

  return (
    <div className="ind-home ind-home--editorial-guided" key={micrositeId}>
      <section className="ind-hero ind-hero--cover">
        <p className="ind-hero-eyebrow">{t('runtime.home.eyebrow')}</p>
        <h2 className="ind-hero-title">{title}</h2>
        <p className="ind-hero-sub">
          {t('runtime.home.sub', { scenes: sceneCount, cats: categories })}
        </p>

        <div className="ind-step-rail" aria-label={t('runtime.home.steps_aria')}>
          <div className="ind-step-rail-item is-current">
            <span className="ind-step-num">1</span>
            <div>
              <strong>{t('runtime.home.step1_title')}</strong>
              <p>{t('runtime.home.step1_body')}</p>
            </div>
          </div>
          <div className="ind-step-rail-item is-next">
            <span className="ind-step-num">2</span>
            <div>
              <strong>{t('runtime.home.step2_title')}</strong>
              <p>{t('runtime.home.step2_body')}</p>
            </div>
          </div>
          <div className="ind-step-rail-item is-next">
            <span className="ind-step-num">3</span>
            <div>
              <strong>{t('runtime.home.step3_title')}</strong>
              <p>{t('runtime.home.step3_body')}</p>
            </div>
          </div>
        </div>

        <p className="ind-primary-hint" role="status">
          <span className="ind-primary-arrow" aria-hidden>
            ←
          </span>
          <strong>{t('runtime.home.hint_title')}</strong>
          <span>{t('runtime.home.hint_ex')}</span>
        </p>
      </section>

      <details className="ind-skin-picker ind-skin-picker--compact ind-skin-details">
        <summary>
          <strong>{t('runtime.home.skin_title')}</strong>
          <span>
            {t('runtime.home.skin_current', {
              name: skin?.styleLabel || micrositeId || t('runtime.home.skin_default'),
            })}
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
