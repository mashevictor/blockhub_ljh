import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

/** 概览 | 流程预览 — 广场只读；预览不锁 UI、不写库 */
export default function PlazaWorkModeSwitch() {
  const run = usePlazaFlowRun()

  return (
    <div className="plaza-work-mode" role="tablist" aria-label="工作台模式">
      <button
        type="button"
        role="tab"
        className={`plaza-work-mode-btn${run.mode === 'overview' ? ' on' : ''}`}
        aria-selected={run.mode === 'overview'}
        onClick={() => run.enterOverviewMode()}
      >
        概览
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
        流程预览
      </button>
    </div>
  )
}
