import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

/** A+B：编排 | 试运营 分段；回编排 = 停止解锁 */
export default function PlazaWorkModeSwitch() {
  const run = usePlazaFlowRun()

  return (
    <div className="plaza-work-mode" role="tablist" aria-label="工作模式">
      <button
        type="button"
        role="tab"
        className={`plaza-work-mode-btn${run.mode === 'edit' ? ' on' : ''}`}
        aria-selected={run.mode === 'edit'}
        onClick={() => run.enterEditMode()}
      >
        编排
      </button>
      <button
        type="button"
        role="tab"
        className={`plaza-work-mode-btn${run.mode === 'run' ? ' on' : ''}`}
        aria-selected={run.mode === 'run'}
        onClick={() => run.enterRunMode()}
      >
        试运营
      </button>
    </div>
  )
}
