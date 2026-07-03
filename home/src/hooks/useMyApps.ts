import { useCallback, useEffect, useState } from 'react'
import { loadMyApps, MY_APPS_UPDATED_EVENT, type StoredMyApp } from '../lib/myAppsStorage'

export function useMyApps(): StoredMyApp[] {
  const [apps, setApps] = useState<StoredMyApp[]>(() => loadMyApps())

  const refresh = useCallback(() => {
    setApps(loadMyApps())
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(MY_APPS_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(MY_APPS_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  return apps
}
