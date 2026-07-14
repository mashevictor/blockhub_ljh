import { createContext, useContext, type ReactNode } from 'react'

export type FloatingDockVariant = 'default' | 'capsule'

export interface FloatingDockContextValue {
  variant: FloatingDockVariant
  collapsed: boolean
  expand: () => void
  collapse: () => void
}

const FloatingDockContext = createContext<FloatingDockContextValue | null>(null)

export function FloatingDockProvider({
  value,
  children,
}: {
  value: FloatingDockContextValue
  children: ReactNode
}) {
  return (
    <FloatingDockContext.Provider value={value}>
      {children}
    </FloatingDockContext.Provider>
  )
}

export function useFloatingDock(): FloatingDockContextValue | null {
  return useContext(FloatingDockContext)
}
