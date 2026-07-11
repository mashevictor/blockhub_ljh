import { createContext, useContext, type ReactNode } from 'react'

const HomePageReadyContext = createContext(true)

export function HomePageReadyProvider({
  ready,
  children,
}: {
  ready: boolean
  children: ReactNode
}) {
  return (
    <HomePageReadyContext.Provider value={ready}>
      {children}
    </HomePageReadyContext.Provider>
  )
}

export function useHomePageReady(): boolean {
  return useContext(HomePageReadyContext)
}
