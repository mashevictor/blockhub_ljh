import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface PlanStep {
  id: string
  title: string
  kind?: string
  detail?: string
  status?: string
}

interface PlanUnit {
  order: number
  module_order?: number
  module_name?: string
  unit_code?: string
  unit_name: string
  focus?: string
  dictation_hint?: string
  estimated_days?: number
  status: string
  steps?: PlanStep[]
  planned_start?: string
  planned_end?: string
}

interface ScheduleItem {
  date: string
  unit_order: number
  unit_name?: string
  module_name?: string
  step_id: string
  title: string
  reminder?: string
  kind?: string
  done?: boolean
}

interface SubjectTips {
  subject?: string
  rhythm?: string
  follow_labels?: Record<string, string>
}

interface CatalogInfo {
  publisher?: string
  series?: string
  subject?: string
  school_system?: string
  stage?: string
  grade?: string
  semester?: string
  full_title?: string
  confidence?: number
  note?: string
  toc_source?: string
  edition_label?: string
}

interface UnitProgress {
  planned_unit_order?: number
  actual_unit_order?: number
  delta_units?: number
  pace?: string
  pace_label?: string
  planned_unit_name?: string
  actual_unit_name?: string
}

interface CourseItem {
  id: string
  textbook_name: string
  subject: string
  catalog?: CatalogInfo
  plan: PlanUnit[]
  schedule?: ScheduleItem[]
  subject_tips?: SubjectTips
  plan_source: string
  progress_pct: number
  unit_progress?: UnitProgress
  progress_meta?: {
    current_unit_order?: number
    term_start?: string
    term_end?: string
    edition_label?: string
    warning?: string
  }
  toc_source?: string
}

interface DrillItem {
  id: string
  course_id: string
  unit_name: string
  kind: string
  score: string
  result: string
  notes: string
}

/** 主路径：学这一课 / 课本目录 / 记一次；日历与校正为辅助 */
type HubTab = 'learn' | 'catalog' | 'record' | 'calendar'

const UNIT_LABEL: Record<string, string> = {
  pending: '未开始',
  learning: '学习中',
  review: '复习中',
  mastered: '已掌握',
}

const KIND_LABEL: Record<string, string> = {
  review: '复习',
  dictation: '家默',
  exam: '考试',
}

function catalogLine(c: CatalogInfo) {
  return [c.publisher || c.series, c.school_system, c.stage, c.grade, c.semester, c.subject]
    .filter(Boolean)
    .join(' · ')
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')}`
}

function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()]
}

export function StudyCoachWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [drills, setDrills] = useState<DrillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [drillResetKey, setDrillResetKey] = useState(0)
  const [paceResetKey, setPaceResetKey] = useState(0)
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [drillValues, setDrillValues] = useState<Record<string, string>>({})
  const [paceValues, setPaceValues] = useState<Record<string, string>>({})
  const [activeCourseId, setActiveCourseId] = useState('')
  const [focusUnitOrder, setFocusUnitOrder] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'ask' | 'confirm'>('ask')
  const [lastQuery, setLastQuery] = useState('')
  const [candidates, setCandidates] = useState<CatalogInfo[]>([])
  const [showAsk, setShowAsk] = useState(entrySource !== 'im')
  const [hubTab, setHubTab] = useState<HubTab>('learn')
  const [showPaceFix, setShowPaceFix] = useState(false)
  const [calAnchor, setCalAnchor] = useState(todayIso())

  const accent = primaryColor || '#0f766e'
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]
  const tips = activeCourse?.subject_tips
  const followLabels = tips?.follow_labels || KIND_LABEL
  const drillKind = drillValues.kind || ''

  const currentUnit = useMemo(() => {
    const plan = activeCourse?.plan || []
    if (!plan.length) return null
    if (focusUnitOrder != null) {
      const hit = plan.find((u) => u.order === focusUnitOrder)
      if (hit) return hit
    }
    const actual = activeCourse?.unit_progress?.actual_unit_order
    if (actual) {
      const hit = plan.find((u) => u.order === actual)
      if (hit && hit.status !== 'mastered') return hit
    }
    return plan.find((u) => u.status !== 'mastered') || plan[plan.length - 1]
  }, [activeCourse, focusUnitOrder])

  const nextStep = useMemo(() => {
    if (!currentUnit) return null
    return (currentUnit.steps || []).find((s) => s.status !== 'done') || null
  }, [currentUnit])

  const askSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '学哪一科、哪一本？',
        placeholder: '例：部编语文三上 / 人教数学三上 / 沪教英语三上',
        hint: '已入库真实目录的册次可直接跟学；确认后默认进入「学这一课」。',
      },
    ],
    [],
  )

  const paceSteps: GtgtStep[] = useMemo(() => {
    const choices = (activeCourse?.plan || []).map((u) => ({
      order: u.order,
      label: `${u.order}. ${u.unit_name.length > 26 ? `${u.unit_name.slice(0, 26)}…` : u.unit_name}`,
    }))
    return [
      {
        key: 'unit_order',
        label: '实际讲到哪一课？（辅助校正）',
        hint: '仅当与老师进度差很多时用。选课后会同步标记前面已掌握，并重排后续日历。',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap', maxHeight: 220, overflow: 'auto' }}>
            {choices.map((c) => (
              <button
                key={c.order}
                type="button"
                className={value === String(c.order) ? 'btn' : 'btn btn-ghost'}
                style={{
                  fontSize: 12,
                  textAlign: 'left',
                  ...(value === String(c.order) ? { background: a } : {}),
                }}
                onClick={() => setValue(String(c.order))}
              >
                {c.label}
              </button>
            ))}
          </div>
        ),
      },
    ]
  }, [activeCourse?.plan])

  const selectedUnit = useMemo(() => {
    const name = (drillValues.unit_name || '').trim()
    return (activeCourse?.plan || []).find((u) => u.unit_name === name)
  }, [activeCourse?.plan, drillValues.unit_name])

  const drillSteps: GtgtStep[] = useMemo(() => {
    const unitChoices = (activeCourse?.plan || []).map((u) => u.unit_name)
    const kind = drillKind
    const unitHint = selectedUnit
      ? [selectedUnit.focus, selectedUnit.dictation_hint].filter(Boolean).join(' · ')
      : ''

    const kindStep: GtgtStep = {
      key: 'kind',
      label: '① 记什么',
      hint: tips?.rhythm ? `本科目：${tips.rhythm}` : '家默 / 复习 / 考试',
      render: ({ value, setValue, accent: a }) => (
        <div style={{ display: 'grid', gap: 8 }}>
          {(
            [
              ['dictation', followLabels.dictation || '家默'],
              ['review', followLabels.review || '复习'],
              ['exam', followLabels.exam || '考试'],
            ] as const
          ).map(([k, lab]) => (
            <button
              key={k}
              type="button"
              className={value === k ? 'btn' : 'btn btn-ghost'}
              style={{ textAlign: 'left', background: value === k ? a : undefined }}
              onClick={() => setValue(k)}
            >
              {lab}
            </button>
          ))}
        </div>
      ),
    }

    const unitStep: GtgtStep = {
      key: 'unit_name',
      label: '② 对应哪一课',
      placeholder: currentUnit?.unit_name || unitChoices[0] || '',
      render: unitChoices.length
        ? ({ value, setValue, accent: a }) => (
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {unitChoices.slice(0, 24).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={value === name ? 'btn' : 'btn btn-ghost'}
                  style={{
                    fontSize: 12,
                    textAlign: 'left',
                    ...(value === name ? { background: a } : {}),
                  }}
                  onClick={() => setValue(name)}
                >
                  {name.length > 20 ? `${name.slice(0, 20)}…` : name}
                </button>
              ))}
            </div>
          )
        : undefined,
    }

    if (kind === 'dictation') {
      return [
        kindStep,
        unitStep,
        { key: 'dictation_range', label: '③ 默写范围', inputType: 'textarea', hint: unitHint || undefined },
        { key: 'dictation_score', label: '④ 对了几个 / 一共几个' },
        { key: 'dictation_wrong', label: '⑤ 错项（可空）', optional: true, inputType: 'textarea' },
        { key: 'notes', label: '⑥ 备注（可空）', optional: true, inputType: 'textarea' },
      ]
    }
    if (kind === 'review') {
      return [
        kindStep,
        unitStep,
        { key: 'review_focus', label: '③ 复习了什么', inputType: 'textarea', hint: unitHint || undefined },
        { key: 'review_weak', label: '④ 还卡在哪（可空）', optional: true, inputType: 'textarea' },
        { key: 'notes', label: '⑤ 下次计划（可空）', optional: true, inputType: 'textarea' },
      ]
    }
    if (kind === 'exam') {
      return [
        kindStep,
        unitStep,
        { key: 'exam_name', label: '③ 哪次测验', hint: unitHint || undefined },
        { key: 'exam_score', label: '④ 得分或等第' },
        { key: 'exam_wrong', label: '⑤ 错题（可空）', optional: true, inputType: 'textarea' },
        { key: 'notes', label: '⑥ 备注（可空）', optional: true, inputType: 'textarea' },
      ]
    }
    return [kindStep]
  }, [activeCourse?.plan, drillKind, selectedUnit, followLabels, tips, currentUnit])

  const weekDays = useMemo(() => {
    const [y, m, d] = calAnchor.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const wd = dt.getDay() || 7
    const monday = addDaysIso(calAnchor, 1 - wd)
    return Array.from({ length: 14 }, (_, i) => addDaysIso(monday, i))
  }, [calAnchor])

  const scheduleByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    for (const s of activeCourse?.schedule || []) {
      const list = map.get(s.date) || []
      list.push(s)
      map.set(s.date, list)
    }
    return map
  }, [activeCourse?.schedule])

  const load = useCallback(async () => {
    if (!token) {
      setCourses([])
      setDrills([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const [cData, dData] = await Promise.all([
        apiFetch<{ items: CourseItem[] }>(`/api/v1/study-coach/courses${q}`, token),
        apiFetch<{ items: DrillItem[] }>(`/api/v1/study-coach/drills${q}`, token),
      ])
      const list = cData.items || []
      setCourses(list)
      setDrills(dData.items || [])
      setActiveCourseId((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev
        return list[0]?.id || ''
      })
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setCourses([])
      setDrills([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const patchCourse = (course: CourseItem) => {
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)))
  }

  const locateBook = async () => {
    if (!token || !queryValues.query?.trim()) return
    setBusy(true)
    setMsg('')
    const q = queryValues.query.trim()
    try {
      const data = await apiFetch<{ candidates: CatalogInfo[]; query: string }>(
        '/api/v1/study-coach/locate',
        token,
        { method: 'POST', body: JSON.stringify({ query: q, role: 'student' }) },
      )
      setLastQuery(data.query || q)
      setCandidates(data.candidates || [])
      setPhase('confirm')
      setMsg((data.candidates || []).length ? '请确认册次，确认后开始跟学' : '没定位到，换个说法')
    } catch (e) {
      setMsg(`定位失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const confirmBook = async (catalog: CatalogInfo) => {
    if (!token || !catalog.full_title) return
    setBusy(true)
    setMsg('正在生成学习计划…')
    try {
      const data = await apiFetch<{ course: CourseItem }>('/api/v1/study-coach/courses', token, {
        method: 'POST',
        body: JSON.stringify({
          query: lastQuery,
          textbook_name: catalog.full_title,
          catalog,
          role: 'student',
          student_name: user?.display_name || '',
          app_public_id: appId || '',
        }),
      })
      setQueryValues({})
      setCandidates([])
      setPhase('ask')
      setResetKey((k) => k + 1)
      setShowAsk(false)
      setHubTab('learn')
      setFocusUnitOrder(null)
      const c = data.course
      setMsg(`可以开始学了 · ${c?.textbook_name || ''} · ${c?.plan?.length || 0} 课`)
      await load()
      if (c?.id) setActiveCourseId(c.id)
    } catch (e) {
      setMsg(`生成失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const completeStep = async (unitOrder: number, stepId: string, done = true) => {
    if (!token || !activeCourse) return
    setBusy(true)
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${activeCourse.id}/steps/complete`,
        token,
        { method: 'POST', body: JSON.stringify({ unit_order: unitOrder, step_id: stepId, done }) },
      )
      if (data.course) patchCourse(data.course)
      setMsg(done ? '本步已完成，继续下一步' : '已撤销')
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const openUnit = async (order: number) => {
    setFocusUnitOrder(order)
    setHubTab('learn')
    if (!token || !activeCourse) return
    // 安静进入学习：标记学习中，不把「设为当前」当主操作暴露
    try {
      await apiFetch(`/api/v1/study-coach/courses/${activeCourse.id}/progress`, token, {
        method: 'POST',
        body: JSON.stringify({ order, status: 'learning' }),
      })
      await load()
    } catch {
      /* 忽略，本地仍可聚焦该课 */
    }
  }

  const setCurrentUnit = async () => {
    if (!token || !activeCourse) return
    const order = Number(paceValues.unit_order || 0)
    if (!order) {
      setMsg('请先选择实际讲到的课')
      return
    }
    setBusy(true)
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${activeCourse.id}/units/set-current`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ unit_order: order, mark_previous_mastered: true, rebuild: true }),
        },
      )
      if (data.course) patchCourse(data.course)
      setPaceValues({})
      setPaceResetKey((k) => k + 1)
      setFocusUnitOrder(order)
      setShowPaceFix(false)
      setHubTab('learn')
      setMsg(`已同步到第 ${order} 课，可以继续学`)
    } catch (e) {
      setMsg(`同步失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const submitDrill = async () => {
    if (!token || !activeCourse) return
    const kind = drillValues.kind || ''
    if (!['review', 'dictation', 'exam'].includes(kind)) {
      setMsg('请先选择要记的类型')
      return
    }
    const unit = (drillValues.unit_name || currentUnit?.unit_name || '').trim()
    if (!unit) {
      setMsg('请选择对应课文/单元')
      return
    }
    setBusy(true)
    let score = ''
    let result = ''
    let notes = ''
    if (kind === 'dictation') {
      score = (drillValues.dictation_score || '').trim()
      result = (drillValues.dictation_wrong || '').trim() ? '有错词' : score ? '已默写' : '已记录'
      notes = [
        drillValues.dictation_range && `范围：${drillValues.dictation_range.trim()}`,
        drillValues.dictation_score && `正确：${drillValues.dictation_score.trim()}`,
        drillValues.dictation_wrong && `错词：${drillValues.dictation_wrong.trim()}`,
        drillValues.notes && `备注：${drillValues.notes.trim()}`,
      ]
        .filter(Boolean)
        .join('\n')
    } else if (kind === 'review') {
      result = '已复习'
      notes = [
        drillValues.review_focus && `复习：${drillValues.review_focus.trim()}`,
        drillValues.review_weak && `薄弱：${drillValues.review_weak.trim()}`,
        drillValues.notes && `下次：${drillValues.notes.trim()}`,
      ]
        .filter(Boolean)
        .join('\n')
    } else {
      score = (drillValues.exam_score || '').trim()
      result = score || '已考试'
      notes = [
        drillValues.exam_name && `测验：${drillValues.exam_name.trim()}`,
        drillValues.exam_score && `成绩：${drillValues.exam_score.trim()}`,
        drillValues.exam_wrong && `错题：${drillValues.exam_wrong.trim()}`,
        drillValues.notes && `备注：${drillValues.notes.trim()}`,
      ]
        .filter(Boolean)
        .join('\n')
    }
    try {
      await apiFetch('/api/v1/study-coach/drills', token, {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourse.id,
          unit_name: unit,
          kind,
          score,
          result,
          notes,
          app_public_id: appId || '',
        }),
      })
      setDrillValues({})
      setDrillResetKey((k) => k + 1)
      setMsg(`${followLabels[kind] || KIND_LABEL[kind]}已记下`)
      await load()
      setHubTab('learn')
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const onDrillChange = (k: string, v: string) => {
    if (k === 'kind') {
      setDrillValues((p) => (p.kind === v ? p : { kind: v, unit_name: currentUnit?.unit_name || p.unit_name || '' }))
      setDrillResetKey((n) => n + 1)
      return
    }
    setDrillValues((p) => ({ ...p, [k]: v }))
  }

  const startRecord = (kind?: string) => {
    setDrillValues({
      kind: kind && ['dictation', 'review', 'exam'].includes(kind) ? kind : '',
      unit_name: currentUnit?.unit_name || '',
    })
    setDrillResetKey((n) => n + 1)
    setHubTab('record')
  }

  const courseDrills = drills.filter((d) => d.course_id === (activeCourse?.id || ''))
  const tabs: { id: HubTab; label: string }[] = [
    { id: 'learn', label: '学这一课' },
    { id: 'catalog', label: '课本目录' },
    { id: 'record', label: '记一次' },
    { id: 'calendar', label: '日历' },
  ]

  const stepDone = (currentUnit?.steps || []).filter((s) => s.status === 'done').length
  const stepAll = (currentUnit?.steps || []).length

  return (
    <div>
      {phase === 'ask' && (showAsk || courses.length === 0) && (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
          meta="先选课本，再按课跟学"
          accent={accent}
          variant="soft"
          flowHint="说课本 → 确认册次 → 学这一课的小步骤 → 需要时再记家默/考试"
          steps={askSteps}
          values={queryValues}
          onChange={(k, v) => setQueryValues((p) => ({ ...p, [k]: v }))}
          onComplete={locateBook}
          busy={busy}
          resetKey={resetKey}
          submitLabel="帮我定位这本课本"
        />
      )}

      {phase === 'ask' && !showAsk && courses.length > 0 && (
        <button type="button" className="btn btn-ghost" onClick={() => setShowAsk(true)}>
          + 再加一本课本
        </button>
      )}

      {phase === 'confirm' && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <div className="list-card-head">
            <strong>确认要学的册次</strong>
            <span className="tag">「{lastQuery}」</span>
          </div>
          <p className="muted" style={{ margin: '8px 0 12px', fontSize: 13 }}>
            点选后按真实目录生成学期跟学计划，默认进入「学这一课」。
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {candidates.map((c, i) => (
              <li key={`${c.full_title}-${i}`}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: i === 0 ? accent : undefined,
                  }}
                  onClick={() => void confirmBook(c)}
                >
                  <div style={{ fontWeight: 600 }}>{c.full_title}</div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>{catalogLine(c)}</div>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              setPhase('ask')
              setCandidates([])
              setResetKey((k) => k + 1)
            }}
          >
            不对，换个说法
          </button>
        </div>
      )}

      {msg && <p className="status-msg">{msg}</p>}

      {courses.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
          {courses.map((c) => (
            <button
              key={c.id}
              type="button"
              className={c.id === activeCourse?.id ? 'btn' : 'btn btn-ghost'}
              style={c.id === activeCourse?.id ? { background: accent, fontSize: 12 } : { fontSize: 12 }}
              onClick={() => {
                setActiveCourseId(c.id)
                setFocusUnitOrder(null)
                setHubTab('learn')
              }}
            >
              {(c.subject || c.catalog?.subject || '课本') + ` · ${c.progress_pct}%`}
            </button>
          ))}
        </div>
      )}

      {!loading && courses.length === 0 && phase === 'ask' && (
        <p className="muted">推荐：部编语文三上 / 人教数学三上 / 沪教英语三上</p>
      )}

      {activeCourse && (
        <>
          <div className="list-card" style={{ marginBottom: 12 }}>
            <div className="list-card-head">
              <strong>{activeCourse.textbook_name}</strong>
              <span className="tag">{activeCourse.progress_pct}% 学完</span>
            </div>
            {tips?.rhythm && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                {tips.rhythm}
              </p>
            )}
            <div className="row-actions" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={hubTab === t.id ? 'btn' : 'btn btn-ghost'}
                  style={hubTab === t.id ? { background: accent, fontSize: 12 } : { fontSize: 12 }}
                  onClick={() => setHubTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {hubTab === 'learn' && currentUnit && (
            <div className="list-card" style={{ marginBottom: 12 }}>
              <div className="list-card-head">
                <strong>
                  {currentUnit.unit_code ? `${currentUnit.unit_code} · ` : ''}
                  {currentUnit.unit_name}
                </strong>
                <span className="tag">
                  {UNIT_LABEL[currentUnit.status] || currentUnit.status}
                  {stepAll ? ` · ${stepDone}/${stepAll}` : ''}
                </span>
              </div>
              {currentUnit.focus && (
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>本课重点：{currentUnit.focus}</p>
              )}
              {currentUnit.dictation_hint && (
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  提示：{currentUnit.dictation_hint}
                </p>
              )}

              {nextStep ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${accent}`,
                  }}
                >
                  <div className="muted" style={{ fontSize: 12 }}>
                    下一步要做
                  </div>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{nextStep.title}</div>
                  {nextStep.detail && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}>{nextStep.detail}</p>
                  )}
                  <div className="row-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{ background: accent }}
                      disabled={busy}
                      onClick={() => void completeStep(currentUnit.order, nextStep.id, true)}
                    >
                      做完了，下一步
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => startRecord(nextStep.kind)}
                    >
                      记详细结果
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ marginTop: 12, fontSize: 13 }}>
                  本课小步骤都完成了。可去「课本目录」学下一课，或「记一次」留下家默/测验记录。
                </p>
              )}

              <h4 style={{ margin: '16px 0 8px', fontSize: 13 }}>本课小步骤</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                {(currentUnit.steps || []).map((step, idx) => {
                  const done = step.status === 'done'
                  const active = nextStep?.id === step.id
                  return (
                    <li
                      key={step.id}
                      style={{
                        padding: '10px 0',
                        borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                        opacity: done ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontSize: 13, fontWeight: active ? 700 : 600 }}>
                            {idx + 1}. {step.title}
                            {done ? ' · 已完成' : active ? ' · 进行中' : ''}
                          </div>
                          {step.detail && (
                            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                              {step.detail}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          disabled={busy}
                          onClick={() => void completeStep(currentUnit.order, step.id, !done)}
                        >
                          {done ? '撤销' : '完成'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="row-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => {
                    const plan = activeCourse.plan || []
                    const idx = plan.findIndex((u) => u.order === currentUnit.order)
                    const next = plan.slice(idx + 1).find((u) => u.status !== 'mastered') || plan[idx + 1]
                    if (next) void openUnit(next.order)
                    else setHubTab('catalog')
                  }}
                >
                  学下一课
                </button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => startRecord()}>
                  记一次跟进
                </button>
              </div>
            </div>
          )}

          {hubTab === 'catalog' && (
            <div className="list-card" style={{ marginBottom: 12 }}>
              <div className="list-card-head">
                <strong>课本目录</strong>
                <span className="tag">{(activeCourse.plan || []).length} 课</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 10px', fontSize: 12 }}>
                点某一课开始学。进度校正在底部折叠里，不是主操作。
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
                {(activeCourse.plan || []).map((u) => {
                  const focused = currentUnit?.order === u.order
                  const doneN = (u.steps || []).filter((s) => s.status === 'done').length
                  const allN = (u.steps || []).length
                  return (
                    <li key={u.order}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 12px',
                          background: focused
                            ? 'color-mix(in srgb, currentColor 8%, transparent)'
                            : undefined,
                        }}
                        onClick={() => void openUnit(u.order)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {u.unit_code ? `${u.unit_code} · ` : ''}
                            {u.unit_name}
                          </span>
                          <span className="tag">{UNIT_LABEL[u.status] || u.status}</span>
                        </div>
                        <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                          {u.focus || '点此开始学'}
                          {allN ? ` · 步骤 ${doneN}/${allN}` : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <details style={{ marginTop: 16 }} open={showPaceFix}>
                <summary
                  style={{ cursor: 'pointer', fontSize: 13 }}
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPaceFix((v) => !v)
                  }}
                >
                  辅助：老师进度不一致时，同步到某一课
                  {activeCourse.unit_progress?.pace_label
                    ? `（${activeCourse.unit_progress.pace_label}）`
                    : ''}
                </summary>
                <div style={{ marginTop: 10 }}>
                  <p className="muted" style={{ fontSize: 12 }}>
                    这是辅助功能，不是日常学习主路径。
                  </p>
                  {showPaceFix && (
                    <GtgtStepComposer
                      title="同步实际进度"
                      meta="低频辅助"
                      accent={accent}
                      variant="soft"
                      flowHint="选实际讲到的课 → 前面标掌握 → 重排后续日历"
                      steps={paceSteps}
                      values={paceValues}
                      onChange={(k, v) => setPaceValues((p) => ({ ...p, [k]: v }))}
                      onComplete={setCurrentUnit}
                      busy={busy}
                      resetKey={paceResetKey}
                      submitLabel="同步并继续学"
                    />
                  )}
                </div>
              </details>
            </div>
          )}

          {hubTab === 'record' && (
            <>
              <GtgtStepComposer
                title="记一次学习结果"
                meta={currentUnit ? currentUnit.unit_name : activeCourse.textbook_name}
                accent={accent}
                variant="soft"
                flowHint="类型 → 课文 → 按科目填写 → 写入真库"
                steps={drillSteps}
                values={drillValues}
                onChange={onDrillChange}
                onComplete={submitDrill}
                busy={busy}
                resetKey={drillResetKey}
                submitLabel="提交记录"
              />
              <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>最近记录</h4>
              {courseDrills.length === 0 && <p className="muted">还没有家默 / 复习 / 考试记录</p>}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {courseDrills.slice(0, 8).map((d) => (
                  <li key={d.id} className="list-card">
                    <div className="list-card-head">
                      <strong>
                        {followLabels[d.kind] || KIND_LABEL[d.kind] || d.kind} · {d.unit_name}
                      </strong>
                      <span className="tag">{[d.score, d.result].filter(Boolean).join(' · ') || '已记'}</span>
                    </div>
                    {d.notes && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{d.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {hubTab === 'calendar' && (
            <div className="list-card" style={{ marginBottom: 12 }}>
              <div className="list-card-head">
                <strong>学习日历</strong>
                <span className="tag">{(activeCourse.schedule || []).length} 条</span>
              </div>
              <div className="row-actions" style={{ marginBottom: 10 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setCalAnchor(addDaysIso(calAnchor, -7))}>
                  上一周
                </button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setCalAnchor(todayIso())}>
                  今天
                </button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setCalAnchor(addDaysIso(calAnchor, 7))}>
                  下一周
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {weekDays.map((day) => {
                  const items = scheduleByDate.get(day) || []
                  const isToday = day === todayIso()
                  return (
                    <div
                      key={day}
                      style={{
                        border: isToday ? `2px solid ${accent}` : '1px solid color-mix(in srgb, currentColor 14%, transparent)',
                        borderRadius: 10,
                        padding: 10,
                        minHeight: 72,
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {day.slice(5)} · 周{weekdayLabel(day)}
                        {isToday ? ' · 今' : ''}
                      </div>
                      {items.length === 0 && (
                        <p className="muted" style={{ margin: '6px 0 0', fontSize: 11 }}>
                          无安排
                        </p>
                      )}
                      {items.slice(0, 2).map((it) => (
                        <button
                          key={`${it.step_id}-${it.unit_order}`}
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            fontSize: 11,
                            marginTop: 6,
                            padding: '4px 6px',
                            textDecoration: it.done ? 'line-through' : undefined,
                          }}
                          onClick={() => {
                            setFocusUnitOrder(it.unit_order)
                            setHubTab('learn')
                          }}
                        >
                          {it.title}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
