import { useEffect, useState } from 'react'
import { fetchCodegenJob } from '../api/client'

export type CodegenPhase = 'idle' | 'pending' | 'running' | 'ready' | 'failed'

/** 轮询 AI 页面生成任务 */
export function useCodegenProgress(jobId?: string | null) {
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
    setDetail('AI 页面生成排队中…')

    const tick = async () => {
      try {
        const job = await fetchCodegenJob(jobId)
        if (cancelled) return
        const st = (job.status || 'pending') as CodegenPhase
        setStatus(st === 'pending' || st === 'running' || st === 'ready' || st === 'failed' ? st : 'pending')
        if (st === 'ready') {
          setDetail(
            `已生成 ${job.result?.page_count ?? 0} 个预览页` +
              (job.result?.llm ? '（DeepSeek）' : '（规则兜底）'),
          )
          setRoutes(job.result?.routes ?? [])
          return true
        }
        if (st === 'failed') {
          setDetail(job.error || 'AI 生成失败')
          return true
        }
        setDetail(st === 'running' ? 'DeepSeek 正在生成页面…' : 'AI 页面生成排队中…')
      } catch {
        if (!cancelled) setDetail('查询生成状态失败，稍后重试')
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
  }, [jobId])

  return { status, detail, routes }
}
