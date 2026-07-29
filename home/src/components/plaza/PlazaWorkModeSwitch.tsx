import { useT } from '@blockhub/i18n/react'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

/** 概览 | 流程预览 — 广场只读；预览不锁 UI、不写库 */
export default function PlazaWorkModeSwitch() {
  const t = useT()
  const run = usePlazaFlowRun()

  return (
    <div className="plaza-work-mode" role="tablist" aria-label={t('home.plaza.work.aria')}>
      <button
        type="button"
        role="tab"
        className={`plaza-work-mode-btn${run.mode === 'overview' ? ' on' : ''}`}
        aria-selected={run.mode === 'overview'}
        onClick={() => run.enterOverviewMode()}
      >
        {t('home.plaza.work.overview')}
      </button>
      <button
        type="button"
        role="tab"
        className={`plaza-work-mode-btn${run.mode === 'preview' ? ' on' : ''}`}
        aria-selected={run.mode === 'preview'}
        onClick={() => {
          run.enterPreviewMode()
          if (run.phase === 'idle' || run.phase === 'stopped' || run.phase === 'completed') {
            run.start()
          }
        }}
      >
        {t('home.plaza.work.preview')}
      </button>
    </div>
  )
}
