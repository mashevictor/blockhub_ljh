import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { submitDemoBookingWithFallback } from '../api/client'
import { useAgentPageContext } from './AgentPageContext'
import {
  BOOKING_FIELDS,
  BOOKING_REVIEW_CONTEXT,
  bookingContextForStep,
  filledBookingCount,
  missingRequiredFields,
  parseBookingInput,
  validateBookingField,
  type BookingFieldKey,
} from '../data/demoBookingFlow'

interface Value {
  values: Partial<Record<BookingFieldKey, string>>
  stepIndex: number
  submitted: boolean
  submitting: boolean
  fieldError: string | null
  inView: boolean
  draft: string
  currentField: (typeof BOOKING_FIELDS)[number] | undefined
  filledCount: number
  missingHint: string | null
  setDraft: (v: string) => void
  setInView: (v: boolean) => void
  submitDraft: () => void
  skipOptional: () => void
  retrySubmit: () => void
  focusFloatingInput: () => void
  registerFloatingInput: (el: HTMLInputElement | null) => void
}

const DemoBookingContext = createContext<Value | null>(null)

function toPayload(values: Partial<Record<BookingFieldKey, string>>) {
  return {
    contact: values.contact?.trim() ?? '',
    salutation: values.salutation?.trim() ?? '',
    company_name: values.company?.trim() ?? '',
    source: 'home',
  }
}

export function DemoBookingProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Partial<Record<BookingFieldKey, string>>>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [inView, setInView] = useState(false)
  const [draft, setDraft] = useState('')
  const floatingInputRef = useRef<HTMLInputElement | null>(null)
  const { setContextKey } = useAgentPageContext()

  const currentField = BOOKING_FIELDS[stepIndex]
  const filledCount = filledBookingCount(values)

  const missingHint = useMemo(() => {
    const missing = missingRequiredFields(values)
    if (!missing.length) return null
    return `缺少：${missing.map((f) => f.label).join('、')}`
  }, [values])

  useEffect(() => {
    if (!inView) return
    if (submitted) {
      setContextKey(BOOKING_REVIEW_CONTEXT)
      return
    }
    if (stepIndex >= BOOKING_FIELDS.length) return
    setContextKey(bookingContextForStep(stepIndex))
  }, [inView, stepIndex, submitted, setContextKey])

  useEffect(() => {
    if (!inView || submitted || stepIndex >= BOOKING_FIELDS.length) return
    requestAnimationFrame(() => floatingInputRef.current?.focus())
  }, [inView, stepIndex, submitted])

  const finalizeBooking = useCallback(
    async (nextValues: Partial<Record<BookingFieldKey, string>>) => {
      const missing = missingRequiredFields(nextValues)
      if (missing.length) {
        setFieldError(`请填写${missing.map((f) => f.label).join('、')}`)
        const jump = BOOKING_FIELDS.findIndex((f) => f.key === missing[0].key)
        if (jump >= 0) setStepIndex(jump)
        return
      }
      setValues(nextValues)
      setDraft('')
      setSubmitted(true)
      setFieldError(null)
      setSubmitting(true)
      try {
        await submitDemoBookingWithFallback(toPayload(nextValues))
      } catch {
        setFieldError('保存失败，请稍后重试')
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  const retrySubmit = useCallback(async () => {
    if (!submitted || submitting) return
    setSubmitting(true)
    setFieldError(null)
    try {
      await submitDemoBookingWithFallback(toPayload(values))
    } catch {
      setFieldError('保存失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }, [submitted, submitting, values])

  const advanceAfterField = useCallback(
    (field: (typeof BOOKING_FIELDS)[number], value: string) => {
      const nextValues = { ...values, [field.key]: value }
      const isFinal = field.key === 'company' || stepIndex + 1 >= BOOKING_FIELDS.length

      if (!isFinal) setDraft('')

      if (isFinal) {
        setValues(nextValues)
        void finalizeBooking(nextValues)
        return
      }

      setValues(nextValues)
      setStepIndex(stepIndex + 1)
    },
    [finalizeBooking, stepIndex, values],
  )

  const submitDraft = useCallback(() => {
    if (submitted || submitting || !currentField) return
    const parsed = parseBookingInput(draft)
    const err = validateBookingField(currentField, parsed)
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError(null)
    advanceAfterField(currentField, parsed.trim())
  }, [advanceAfterField, currentField, draft, submitted, submitting])

  const skipOptional = useCallback(() => {
    if (!currentField || currentField.required || submitted || submitting) return
    setFieldError(null)
    setDraft('')
    if (currentField.key === 'company' || stepIndex + 1 >= BOOKING_FIELDS.length) {
      void finalizeBooking(values)
      return
    }
    setStepIndex(stepIndex + 1)
  }, [currentField, finalizeBooking, stepIndex, submitted, submitting, values])

  const registerFloatingInput = useCallback((el: HTMLInputElement | null) => {
    floatingInputRef.current = el
  }, [])

  const focusFloatingInput = useCallback(() => {
    floatingInputRef.current?.focus()
  }, [])

  const value = useMemo(
    (): Value => ({
      values,
      stepIndex,
      submitted,
      submitting,
      fieldError,
      inView,
      draft,
      currentField,
      filledCount,
      missingHint,
      setDraft,
      setInView,
      submitDraft,
      skipOptional,
      retrySubmit,
      focusFloatingInput,
      registerFloatingInput,
    }),
    [
      values,
      stepIndex,
      submitted,
      submitting,
      fieldError,
      inView,
      draft,
      currentField,
      filledCount,
      missingHint,
      submitDraft,
      skipOptional,
      retrySubmit,
      focusFloatingInput,
      registerFloatingInput,
    ],
  )

  return <DemoBookingContext.Provider value={value}>{children}</DemoBookingContext.Provider>
}

export function useDemoBooking() {
  const ctx = useContext(DemoBookingContext)
  if (!ctx) {
    return {
      inView: false,
      submitted: false,
      submitting: false,
      values: {} as Partial<Record<BookingFieldKey, string>>,
      stepIndex: 0,
      fieldError: null,
      draft: '',
      currentField: undefined,
      filledCount: 0,
      missingHint: null,
      setDraft: () => {},
      setInView: () => {},
      submitDraft: () => {},
      skipOptional: () => {},
      retrySubmit: () => {},
      focusFloatingInput: () => {},
      registerFloatingInput: () => {},
    }
  }
  return ctx
}

export function useDemoBookingActive() {
  const { inView } = useDemoBooking()
  return inView
}
