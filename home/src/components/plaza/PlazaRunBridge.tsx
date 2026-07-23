import type { ReactNode } from 'react'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import { PlazaFlowRunProvider } from '../../context/PlazaFlowRunContext'

/** 广场页统一流程预览状态机 — 列表状态按钮与底部悬浮框共用 */
export default function PlazaRunBridge({ children }: { children: ReactNode }) {
  const { focus } = usePlazaFocus()
  return (
    <PlazaFlowRunProvider
      appKey={focus?.appKey ?? null}
      moduleLabels={focus?.moduleLabels ?? []}
    >
      {children}
    </PlazaFlowRunProvider>
  )
}
