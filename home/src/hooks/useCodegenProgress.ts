import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { fetchCodegenJob } from '../api/client'

export type CodegenPhase = 'idle' | 'pending' | 'running' | 'ready' | 'failed'

/** 轮询 AI 页面生成任务 */
export function useCodegenProgress(jobId?: string | null) {
  const t = useT()
  const [status, setStatus] = useState<CodegenPhase>('idle')
  const [detail, setDetail] = useState('')
  const [routes, setRoutes] = useState<string[]>([])

  useEffect(() => {
    if (!jobId) {
      setStatus('idle')
      setDetail('')
      setRoutes([])
      return
    }
    let cancelled = false
    let ticks = 0
    setStatus('pending')
    setDetail(t('home.publish.codegen.queued'))

    const tick = async () => {
      try {
        const job = await fetchCodegenJob(jobId)
        if (cancelled) return
        const st = (job.status || 'pending') as CodegenPhase
        setStatus(st === 'pending' || st === 'running' || st === 'ready' || st === 'failed' ? st : 'pending')
        if (st === 'ready') {
          setDetail(
            t('home.publish.codegen.pages_done', { n: job.result?.page_count ?? 0 }) +
              (job.result?.llm ? t('home.publish.codegen.via_llm') : t('home.publish.codegen.via_rules')),
          )
          setRoutes(job.result?.routes ?? [])
          return true
        }
        if (st === 'failed') {
          setDetail(job.error || t('home.publish.codegen.failed_detail'))
          return true
        }
        setDetail(st === 'running' ? t('home.publish.codegen.running') : t('home.publish.codegen.queued'))
      } catch {
        if (!cancelled) setDetail(t('home.publish.codegen.poll_error'))
      }
      return false
    }

    void tick()
    const timer = window.setInterval(() => {
      ticks += 1
      if (ticks > 60) {
        window.clearInterval(timer)
        return
      }
      void tick().then((done) => {
        if (done) window.clearInterval(timer)
      })
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [jobId, t])

  return { status, detail, routes }
}
