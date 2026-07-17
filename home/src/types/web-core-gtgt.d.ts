import type { ReactNode } from 'react'

export type GtgtStep = {
  key: string
  label: string
  placeholder?: string
  hint?: string
  optional?: boolean
  inputType?: string
  render?: (ctx: {
    value: string
    setValue: (v: string) => void
    accent: string
  }) => ReactNode
}

export declare function GtgtStepComposer(props: {
  title: string
  meta?: string
  accent?: string
  steps: GtgtStep[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onComplete: () => void | Promise<void>
  busy?: boolean
  submitLabel?: string
  flowHint?: string
  resetKey?: string | number
  children?: ReactNode
}): ReactNode

export {}
