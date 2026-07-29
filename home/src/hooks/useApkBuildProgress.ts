import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
  const needWeb = showWebDeliver(app)
  const needApk = showAppDeliver(app)
  const [apkReady, setApkReady] = useState(Boolean(app.apkReady))
  const [pollCount, setPollCount] = useState(0)
  const [buildFailed, setBuildFailed] = useState(false)
  const [buildStatus, setBuildStatus] = useState<string | undefined>()
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
        } else if (info.apk_build_status === 'failed') {
          setBuildFailed(true)
        } else if (pollCountRef.current >= MAX_POLLS) {
          setBuildFailed(true)
        }
        setBuildStatus(info.apk_build_status)
      } catch {
        /* ignore transient network errors */
      }
    }

    poll()
    const pollId = window.setInterval(poll, POLL_MS)
    const animId = window.setInterval(() => setAnimTick((n) => n + 1), 600)

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
        label: t('home.delivery.step.publish'),
        status: 'done',
        detail: t('home.delivery.step.publish_detail'),
      },
    ]

    if (needWeb) {
      list.push({
        id: 'web',
        label: t('home.delivery.step.web'),
        status: 'done',
        detail: t('home.delivery.step.web_detail'),
      })
    }

    if (needApk) {
      if (apkReady) {
        list.push({
          id: 'apk',
          label: t('home.delivery.step.apk_ready'),
          status: 'done',
          detail: t('home.delivery.step.apk_ready_detail'),
        })
      } else if (buildFailed) {
        list.push({
          id: 'apk',
          label: t('home.delivery.step.apk_error'),
          status: 'error',
          detail: t('home.delivery.step.apk_error_detail'),
        })
      } else {
        const statusHint =
          buildStatus === 'building'
            ? t('home.delivery.step.apk_building_gradle')
            : buildStatus === 'pending'
              ? t('home.delivery.step.apk_building_pending')
              : t('home.delivery.step.apk_building_async')
        list.push({
          id: 'apk',
          label: t('home.delivery.step.apk_building'),
          status: 'active',
          detail: statusHint,
        })
      }
    }

    return list
  }, [needWeb, needApk, apkReady, buildFailed, buildStatus, t])

  const progress = useMemo(() => {
    if (!needApk) return 100
    if (apkReady) return 100
    const base = needWeb ? 35 : 20
    const maxBeforeDone = 92
    const bump = Math.min(animTick * 1.5 + pollCount * 2, maxBeforeDone - base)
    return Math.round(base + bump)
  }, [needWeb, needApk, apkReady, animTick, pollCount])

  const polling = needApk && !apkReady && !buildFailed

  return { apkReady, polling, progress, steps, timedOut: buildFailed, needApk, needWeb }
}
