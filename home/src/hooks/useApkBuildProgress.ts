import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchRuntimeInfo } from '../api/client'
import { showAppDeliver, showWebDeliver } from '../data/deliverDisplay'
import type { PublishResult } from '../data/constants'
import { updateMyAppApkReady } from '../lib/myAppsStorage'

export interface DeliveryStep {
  id: string
  label: string
  status: 'done' | 'active' | 'pending' | 'error'
  detail?: string
}

const POLL_MS = 4000
const MAX_POLLS = 90

export function useApkBuildProgress(app: Pick<PublishResult, 'appId' | 'deliver' | 'apkReady'>) {
  const needWeb = showWebDeliver(app)
  const needApk = showAppDeliver(app)
  const [apkReady, setApkReady] = useState(Boolean(app.apkReady))
  const [pollCount, setPollCount] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [animTick, setAnimTick] = useState(0)
  const pollCountRef = useRef(0)

  useEffect(() => {
    if (app.apkReady) setApkReady(true)
  }, [app.apkReady])

  useEffect(() => {
    if (!needApk || apkReady || !app.appId) return

    let cancelled = false

    const poll = async () => {
      try {
        const info = await fetchRuntimeInfo(app.appId!)
        if (cancelled) return
        pollCountRef.current += 1
        setPollCount(pollCountRef.current)
        if (info.apk_ready) {
          setApkReady(true)
          updateMyAppApkReady(app.appId!, true)
        } else if (pollCountRef.current >= MAX_POLLS) {
          setTimedOut(true)
        }
      } catch {
        /* ignore transient network errors */
      }
    }

    poll()
    const pollId = window.setInterval(poll, POLL_MS)
    const animId = window.setInterval(() => setAnimTick((t) => t + 1), 600)

    return () => {
      cancelled = true
      clearInterval(pollId)
      clearInterval(animId)
    }
  }, [needApk, apkReady, app.appId])

  const steps = useMemo((): DeliveryStep[] => {
    const list: DeliveryStep[] = [
      {
        id: 'publish',
        label: '应用已创建',
        status: 'done',
        detail: '已保存到「我的应用」',
      },
    ]

    if (needWeb) {
      list.push({
        id: 'web',
        label: '网页运行时就绪',
        status: 'done',
        detail: '链接已就绪，可立即打开',
      })
    }

    if (needApk) {
      if (apkReady) {
        list.push({
          id: 'apk',
          label: 'Android APK 可下载',
          status: 'done',
          detail: '安装包已就绪，可扫码或下载',
        })
      } else if (timedOut) {
        list.push({
          id: 'apk',
          label: 'APK 仍在后台构建',
          status: 'error',
          detail: '请稍后刷新页面，或联系管理员执行 flutter-build-apk',
        })
      } else {
        list.push({
          id: 'apk',
          label: 'Flutter APK 打包中',
          status: 'active',
          detail: '后台异步构建，完成后自动更新下载链接',
        })
      }
    }

    return list
  }, [needWeb, needApk, apkReady, timedOut])

  const progress = useMemo(() => {
    if (!needApk) return 100
    if (apkReady) return 100
    const base = needWeb ? 35 : 20
    const maxBeforeDone = 92
    const bump = Math.min(animTick * 1.5 + pollCount * 2, maxBeforeDone - base)
    return Math.round(base + bump)
  }, [needWeb, needApk, apkReady, animTick, pollCount])

  const polling = needApk && !apkReady && !timedOut

  return { apkReady, polling, progress, steps, timedOut, needApk, needWeb }
}
