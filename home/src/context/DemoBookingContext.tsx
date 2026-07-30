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
import { useT } from '@blockhub/i18n/react'
import { submitDemoBookingWithFallback, type DemoBookingDelivery } from '../api/client'
import { scrollToHomeSection } from '../hooks/useHomeActiveSection'
import { useAgentPageContext } from './AgentPageContext'
import {
  BOOKING_FIELDS,
  BOOKING_REVIEW_CONTEXT,
  bookingContextForStep,
  filledBookingCount,
  missingRequiredFields,
  parseBookingInput,
  type BookingFieldKey,
} from '../data/demoBookingFlow'
import {
  bookingListJoin,
  localizeBookingField,
  validateBookingFieldLocalized,
} from '../i18n/bookingLabels'

interface Value {
  values: Partial<Record<BookingFieldKey, string>>
  stepIndex: number
  submitted: boolean
  submitting: boolean
  delivery: DemoBookingDelivery | null
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
  const t = useT()
  const [values, setValues] = useState<Partial<Record<BookingFieldKey, string>>>({})
  const [stepIndex, setStepIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [delivery, setDelivery] = useState<DemoBookingDelivery | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [inView, setInView] = useState(false)
  const [draft, setDraft] = useState('')
  const floatingInputRef = useRef<HTMLInputElement | null>(null)
  const { setContextKey } = useAgentPageContext()

  const rawCurrent = BOOKING_FIELDS[stepIndex]
  const currentField = rawCurrent ? localizeBookingField(t, rawCurrent) : undefined
  const filledCount = filledBookingCount(values)

  const missingHint = useMemo(() => {
    const missing = missingRequiredFields(values)
    if (!missing.length) return null
    const labels = missing.map((f) => localizeBookingField(t, f).label)
    return t('home.booking.missing', { list: bookingListJoin(t, labels) })
  }, [values, t])

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
    requestAnimationFrame(() => {
      floatingInputRef.current?.focus({ preventScroll: true })
    })
  }, [inView, stepIndex, submitted])

  const finalizeBooking = useCallback(
    async (nextValues: Partial<Record<BookingFieldKey, string>>) => {
      const missing = missingRequiredFields(nextValues)
      if (missing.length) {
        const labels = missing.map((f) => localizeBookingField(t, f).label)
        setFieldError(t('home.booking.fill_required', { list: bookingListJoin(t, labels) }))
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
        const result = await submitDemoBookingWithFallback(toPayload(nextValues))
        setDelivery(result)
        scrollToHomeSection('contact-demo')
      } catch {
        setFieldError(t('home.booking.save_fail'))
        setSubmitted(false)
      } finally {
        setSubmitting(false)
      }
    },
    [t],
  )

  const retrySubmit = useCallback(async () => {
    if (!submitted || submitting) return
    setSubmitting(true)
    setFieldError(null)
    try {
      const result = await submitDemoBookingWithFallback(toPayload(values))
      setDelivery(result)
    } catch {
      setFieldError(t('home.booking.save_fail'))
    } finally {
      setSubmitting(false)
    }
  }, [submitted, submitting, values, t])

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
    if (submitted || submitting || !rawCurrent) return
    const parsed = parseBookingInput(draft)
    const err = validateBookingFieldLocalized(t, rawCurrent, parsed)
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError(null)
    advanceAfterField(rawCurrent, parsed.trim())
  }, [advanceAfterField, rawCurrent, draft, submitted, submitting, t])

  const skipOptional = useCallback(() => {
    if (!rawCurrent || rawCurrent.required || submitted || submitting) return
    setFieldError(null)
    setDraft('')
    if (rawCurrent.key === 'company' || stepIndex + 1 >= BOOKING_FIELDS.length) {
      void finalizeBooking(values)
      return
    }
    setStepIndex(stepIndex + 1)
  }, [rawCurrent, finalizeBooking, stepIndex, submitted, submitting, values])

  const registerFloatingInput = useCallback((el: HTMLInputElement | null) => {
    floatingInputRef.current = el
  }, [])

  const focusFloatingInput = useCallback(() => {
    floatingInputRef.current?.focus({ preventScroll: true })
  }, [])

  const value = useMemo(
    (): Value => ({
      values,
      stepIndex,
      submitted,
      submitting,
      delivery,
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
      delivery,
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
      delivery: null,
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
