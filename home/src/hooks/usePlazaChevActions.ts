import { useMemo } from 'react'
import { useFloatingDock } from '../context/FloatingDockContext'
import { usePlazaFlowRun } from '../context/PlazaFlowRunContext'
import type { PlazaFocusTarget } from '../context/PlazaFocusContext'
import type { PlazaChevAction } from '../components/plaza/PlazaChevMenu'

export function usePlazaChevActions(
  focus: PlazaFocusTarget,
  opts: {
    onOpenApp: () => void
    onFullscreen: () => void
    onCopyLink: () => void
  },
): PlazaChevAction[] {
  const dock = useFloatingDock()
  const run = usePlazaFlowRun()

  return useMemo((): PlazaChevAction[] => {
    const items: PlazaChevAction[] = [
      { id: 'expand', label: '展开双轨编排', onClick: () => dock?.expand() },
      {
        id: 'run',
        label: run.phase === 'running' || run.phase === 'paused' ? '继续执行' : '试运行流程',
        onClick: () => {
          if (run.phase === 'paused') run.resume()
          else if (run.phase === 'completed' || run.phase === 'stopped' || run.phase === 'error') run.retry()
          else run.start()
        },
        disabled: !run.steps.length,
      },
    ]
    if (run.phase === 'running') {
      items.push({ id: 'pause', label: '暂停执行', onClick: () => run.pause() })
    }
    if (run.phase === 'running' || run.phase === 'paused') {
      items.push({ id: 'stop', label: '停止执行', onClick: () => run.stop() })
    }
    if (run.phase === 'error') {
      items.push({ id: 'retry', label: '重试', onClick: () => run.retry() })
    }
    items.push(
      { id: 'open', label: '打开应用', onClick: opts.onOpenApp },
      { id: 'copy', label: '复制网页链接', onClick: opts.onCopyLink },
    )
    if (focus.source === 'my' && focus.isCreator) {
      items.push({ id: 'fullscreen', label: '全屏编排 / 分享发布', onClick: opts.onFullscreen })
    }
    return items
  }, [dock, run, focus, opts.onOpenApp, opts.onCopyLink, opts.onFullscreen])
}
