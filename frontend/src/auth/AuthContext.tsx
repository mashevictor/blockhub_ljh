import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchMe, type AuthUser } from './session'
import { getTokenRole } from './token'
import { RUNTIME_USER_KEY, getToken } from './storage'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  role: string | undefined
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMe()
      .then((u) => {
        if (cancelled) return
        setUser(u)
        // 已有 Admin token 时补写 Runtime user，打开 /r 不再二次登录
        const token = getToken()
        if (token) {
          localStorage.setItem(
            RUNTIME_USER_KEY,
            JSON.stringify({
              email: u.email || '',
              role: u.role,
              display_name: u.display_name,
            }),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      role: user?.role ?? getTokenRole(),
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
