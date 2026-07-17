import type { GtgtStep } from './web-core-gtgt'

export type FormFieldDef = {
  key: string
  label: string
  placeholder?: string
  optional?: boolean
  type?: string
}

export type ResolveFormStepsOptions = {
  defaults?: FormFieldDef[]
  formFields?: unknown
  pageMockFields?: unknown
}

export declare function normalizeInputType(type?: string): string | undefined
export declare function resolveFormFieldDefs(opts: ResolveFormStepsOptions): FormFieldDef[]
export declare function resolveFormSteps(opts: ResolveFormStepsOptions): GtgtStep[]

export {}
