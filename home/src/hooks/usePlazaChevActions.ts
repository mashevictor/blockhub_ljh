import { useMemo } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
  const dock = useFloatingDock()
  const run = usePlazaFlowRun()

  return useMemo((): PlazaChevAction[] => {
    const items: PlazaChevAction[] = [
      { id: 'expand', label: t('home.plaza.chev.expand'), onClick: () => dock?.expand() },
      {
        id: 'run',
        label:
          run.phase === 'running'
            ? t('home.plaza.chev.pause_preview')
            : run.phase === 'paused'
              ? t('home.plaza.chev.resume_preview')
              : run.phase === 'completed' || run.phase === 'stopped'
                ? t('home.plaza.chev.replay_preview')
                : run.phase === 'error'
                  ? t('home.plaza.chev.retry_preview')
                  : t('home.plaza.chev.start_preview'),
        onClick: () => {
          if (run.phase === 'paused') run.resume()
          else if (run.phase === 'running') run.pause()
          else if (run.phase === 'completed' || run.phase === 'stopped' || run.phase === 'error') run.retry()
          else {
            run.enterPreviewMode()
            run.start()
          }
        },
        disabled: !run.steps.length,
      },
    ]
    if (run.phase === 'running') {
      items.push({ id: 'pause', label: t('home.plaza.chev.pause_preview'), onClick: () => run.pause() })
    }
    if (run.phase === 'running' || run.phase === 'paused') {
      items.push({ id: 'stop', label: t('home.plaza.chev.stop_preview'), onClick: () => run.stop() })
    }
    if (run.phase === 'completed' || run.phase === 'stopped' || run.phase === 'error') {
      items.push({ id: 'reset', label: t('home.plaza.chev.back_overview'), onClick: () => run.reset() })
    }
    items.push(
      { id: 'open', label: t('home.plaza.chev.open_runtime'), onClick: opts.onOpenApp },
      { id: 'copy', label: t('home.plaza.chev.copy_link'), onClick: opts.onCopyLink },
    )
    if (focus.source === 'my' && focus.isCreator) {
      items.push({ id: 'fullscreen', label: t('home.plaza.chev.fullscreen'), onClick: opts.onFullscreen })
    }
    return items
  }, [dock, run, focus, opts.onOpenApp, opts.onCopyLink, opts.onFullscreen, t])
}
