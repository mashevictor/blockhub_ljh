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

interface PlanModule {
  order: number
  name: string
  goal?: string
  unit_orders?: number[]
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
  primary_kinds?: string[]
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
}

interface CourseItem {
  id: string
  record_no: string
  textbook_name: string
  subject: string
  grade: string
  role: string
  student_name: string
  catalog?: CatalogInfo & { toc_source?: string; toc_book_id?: string; edition_label?: string }
  plan: PlanUnit[]
  modules?: PlanModule[]
  schedule?: ScheduleItem[]
  subject_tips?: SubjectTips
  plan_source: string
  progress_pct: number
  status: string
  unit_progress?: UnitProgress
  progress_meta?: {
    current_unit_order?: number
    term_start?: string
    term_end?: string
    edition_label?: string
    adjusted?: boolean
    warning?: string
  }
  toc_source?: string
  toc_book_id?: string
}

interface DrillItem {
  id: string
  record_no: string
  course_id: string
  unit_name: string
  kind: string
  score: string
  result: string
  notes: string
}

type HubTab = 'today' | 'progress' | 'modules' | 'calendar' | 'follow'

interface UnitProgress {
  today?: string
  planned_unit_order?: number
  actual_unit_order?: number
  delta_units?: number
  pace?: string
  pace_label?: string
  planned_unit_name?: string
  actual_unit_name?: string
}

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
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function addDaysIso(iso: string, delta: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  const mm = `${dt.getMonth() + 1}`.padStart(2, '0')
  const dd = `${dt.getDate()}`.padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

function weekdayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const w = new Date(y, m - 1, d).getDay()
  return ['日', '一', '二', '三', '四', '五', '六'][w]
}

export function StudyCoachWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [drills, setDrills] = useState<DrillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [drillResetKey, setDrillResetKey] = useState(0)
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [drillValues, setDrillValues] = useState<Record<string, string>>({})
  const [activeCourseId, setActiveCourseId] = useState('')
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'ask' | 'confirm'>('ask')
  const [lastQuery, setLastQuery] = useState('')
  const [candidates, setCandidates] = useState<CatalogInfo[]>([])
  const [showAsk, setShowAsk] = useState(entrySource !== 'im')
  const [hubTab, setHubTab] = useState<HubTab>('progress')
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null)
  const [calAnchor, setCalAnchor] = useState(todayIso())
  const [paceValues, setPaceValues] = useState<Record<string, string>>({})
  const [paceResetKey, setPaceResetKey] = useState(0)

  const accent = primaryColor || '#0f766e'
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]
  const drillKind = drillValues.kind || ''
  const tips = activeCourse?.subject_tips
  const followLabels = tips?.follow_labels || KIND_LABEL

  const askSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '学哪一科、哪一本？',
        placeholder: '例：沪教版英语二年级下 / 人教语文三上 / 北师大数学七下',
        hint: '说清科目+年级+上下册。已入库：部编语文三上 / 人教数学三上 / 沪教英语三上（真实目录，无需上传 PDF）。',
      },
    ],
    [],
  )

  const paceSteps: GtgtStep[] = useMemo(() => {
    const choices = (activeCourse?.plan || []).map((u) => ({
      order: u.order,
      label: `${u.order}. ${u.unit_name.length > 28 ? `${u.unit_name.slice(0, 28)}…` : u.unit_name}`,
      name: u.unit_name,
    }))
    return [
      {
        key: 'unit_order',
        label: '老师/孩子现在实际讲到哪一课？',
        hint: '选课后，会把前面单元标为已掌握，并从今天起重排后续日历。用于校正「预测进度 vs 实际进度」。',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap', maxHeight: 280, overflow: 'auto' }}>
            {choices.map((c) => (
              <button
                key={c.order}
                type="button"
                className={value === String(c.order) ? 'btn' : 'btn btn-ghost'}
                style={
                  value === String(c.order)
                    ? { background: a, fontSize: 12, textAlign: 'left' }
                    : { fontSize: 12, textAlign: 'left' }
                }
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

  const todayItems = useMemo(() => {
    const day = todayIso()
    const sched = (activeCourse?.schedule || []).filter((s) => s.date === day)
    if (sched.length) return sched
    // 无当日排期：推第一个未完成小步骤
    for (const u of activeCourse?.plan || []) {
      if (u.status === 'mastered') continue
      for (const step of u.steps || []) {
        if (step.status === 'done') continue
        return [
          {
            date: day,
            unit_order: u.order,
            unit_name: u.unit_name,
            module_name: u.module_name,
            step_id: step.id,
            title: step.title,
            reminder: step.detail || u.focus || '',
            kind: step.kind || 'review',
            done: false,
          } as ScheduleItem,
        ]
      }
    }
    return [] as ScheduleItem[]
  }, [activeCourse])

  const weekDays = useMemo(() => {
    const start = calAnchor
    // 对齐到本周一
    const [y, m, d] = start.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const wd = dt.getDay() || 7
    const monday = addDaysIso(start, 1 - wd)
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

  const modules = useMemo(() => {
    if (activeCourse?.modules?.length) return activeCourse.modules
    const buckets = new Map<number, PlanModule>()
    for (const u of activeCourse?.plan || []) {
      const mo = u.module_order || 1
      const b = buckets.get(mo) || {
        order: mo,
        name: u.module_name || `阶段 ${mo}`,
        goal: '',
        unit_orders: [],
      }
      b.unit_orders = [...(b.unit_orders || []), u.order]
      if (!b.goal && u.focus) b.goal = u.focus
      buckets.set(mo, b)
    }
    return [...buckets.values()].sort((a, b) => a.order - b.order)
  }, [activeCourse])

  const drillSteps: GtgtStep[] = useMemo(() => {
    const unitChoices = (activeCourse?.plan || []).map((u) => u.unit_name)
    const kind = drillKind
    const unitHintBlock = selectedUnit
      ? [
          selectedUnit.focus ? `本单元重点：${selectedUnit.focus}` : '',
          selectedUnit.dictation_hint ? `大纲提示：${selectedUnit.dictation_hint}` : '',
          (selectedUnit.steps || [])
            .map((s) => s.title)
            .filter(Boolean)
            .slice(0, 3)
            .join(' → ')
            ? `小步骤：${(selectedUnit.steps || [])
                .map((s) => s.title)
                .slice(0, 3)
                .join(' → ')}`
            : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : ''

    const kindOptions: [string, string, string][] = [
      [
        'dictation',
        followLabels.dictation || '家默 / 听写',
        tips?.subject?.includes('数学')
          ? '公式/定义默写 → 对错 → 错项'
          : '默写范围 → 对了几个 → 错词清单',
      ],
      [
        'review',
        followLabels.review || '复习巩固',
        '复习了哪一块 → 还卡在哪 → 下次怎么盯',
      ],
      [
        'exam',
        followLabels.exam || '考试成绩',
        '哪次测验 → 得分/等第 → 错题与丢分点',
      ],
    ]

    const kindStep: GtgtStep = {
      key: 'kind',
      label: '① 先选跟进类型',
      hint: tips?.rhythm
        ? `本科目节奏：${tips.rhythm}`
        : '按科目选家默 / 复习 / 考试，再逐步填写。',
      render: ({ value, setValue, accent: a }) => (
        <div style={{ display: 'grid', gap: 10 }}>
          {kindOptions.map(([k, lab, desc]) => {
            const on = value === k
            return (
              <button
                key={k}
                type="button"
                className={on ? 'btn' : 'btn btn-ghost'}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  background: on ? a : undefined,
                  display: 'block',
                  width: '100%',
                }}
                onClick={() => setValue(k)}
              >
                <strong style={{ display: 'block', fontSize: 14 }}>{lab}</strong>
                <span style={{ display: 'block', fontSize: 12, marginTop: 4, opacity: on ? 0.95 : 0.75 }}>
                  {desc}
                </span>
              </button>
            )
          })}
        </div>
      ),
    }

    const unitStep: GtgtStep = {
      key: 'unit_name',
      label: '② 对应哪个单元？',
      placeholder: unitChoices[0] || '第一单元',
      hint: unitChoices.length
        ? '点选大纲单元。小步骤详情仅供参考，不会自动当成结果。'
        : '还没有大纲时可手填单元名。',
      render: unitChoices.length
        ? ({ value, setValue, accent: a }) => (
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {unitChoices.map((name) => {
                const short = name.length > 22 ? `${name.slice(0, 22)}…` : name
                return (
                  <button
                    key={name}
                    type="button"
                    className={value === name ? 'btn' : 'btn btn-ghost'}
                    style={
                      value === name
                        ? { background: a, fontSize: 12, textAlign: 'left' }
                        : { fontSize: 12, textAlign: 'left' }
                    }
                    onClick={() => setValue(name)}
                  >
                    {short}
                  </button>
                )
              })}
            </div>
          )
        : undefined,
    }

    if (kind === 'dictation') {
      return [
        kindStep,
        unitStep,
        {
          key: 'dictation_range',
          label: '③ 本次默写范围',
          placeholder: '例：Unit1 单词 listen/hear… + 关键句',
          hint: unitHintBlock || '写清这一次实际默的内容。',
          inputType: 'textarea',
        },
        {
          key: 'dictation_score',
          label: '④ 对了几个 / 一共几个',
          placeholder: '例：对 17 / 共 20；或 85 分',
        },
        {
          key: 'dictation_wrong',
          label: '⑤ 错词 / 错项（可空）',
          placeholder: '例：friend→freind',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑥ 补充说明（可空）',
          placeholder: '例：家长代记；今晚再默错词',
          optional: true,
          inputType: 'textarea',
        },
      ]
    }

    if (kind === 'review') {
      return [
        kindStep,
        unitStep,
        {
          key: 'review_focus',
          label: '③ 复习了什么',
          placeholder: '例：课文跟读两遍 + 练习 P23',
          hint: unitHintBlock || '写具体块：词汇 / 语法 / 例题 / 页码。',
          inputType: 'textarea',
        },
        {
          key: 'review_weak',
          label: '④ 还卡在哪（可空）',
          placeholder: '例：不规则动词仍混',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑤ 下次怎么盯（可空）',
          placeholder: '例：明天只盯错题本',
          optional: true,
          inputType: 'textarea',
        },
      ]
    }

    if (kind === 'exam') {
      return [
        kindStep,
        unitStep,
        {
          key: 'exam_name',
          label: '③ 哪一次测验',
          placeholder: '例：Unit4 单元测 / 校内周测',
          hint: unitHintBlock || '写清测验名称与范围。',
        },
        {
          key: 'exam_score',
          label: '④ 得分或等第',
          placeholder: '例：92 分 / A',
        },
        {
          key: 'exam_wrong',
          label: '⑤ 错题与丢分点（可空）',
          placeholder: '例：阅读丢 2 题；拼写 friend',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑥ 补充说明（可空）',
          optional: true,
          inputType: 'textarea',
        },
      ]
    }

    return [kindStep]
  }, [activeCourse?.plan, drillKind, selectedUnit, followLabels, tips])

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
      const list = data.candidates || []
      setLastQuery(data.query || q)
      setCandidates(list)
      setPhase('confirm')
      setMsg(list.length ? '请点选正确的册次' : '没定位到，换个说法再试')
    } catch (e) {
      setMsg(`定位失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const confirmBook = async (catalog: CatalogInfo) => {
    if (!token || !catalog.full_title) return
    setBusy(true)
    setMsg('正在按科目生成大任务、小步骤与日历…')
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
      setHubTab('progress')
      const c = data.course
      const src =
        c?.toc_source === 'library' || c?.plan_source === 'toc_library'
          ? '真实目录库'
          : c?.plan_source === 'deepseek'
            ? 'DeepSeek'
            : '模板'
      setMsg(
        `已就绪 · ${c?.textbook_name || ''} · ${c?.plan?.length || 0} 个单元（${src}）· 学期进度可校正`,
      )
      await load()
      if (c?.id) setActiveCourseId(c.id)
    } catch (e) {
      setMsg(`生成失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const resetAsk = () => {
    setPhase('ask')
    setCandidates([])
    setQueryValues({})
    setResetKey((k) => k + 1)
    setShowAsk(true)
    setMsg('')
  }

  const patchCourse = (course: CourseItem) => {
    setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)))
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
      setMsg(done ? '小任务已完成' : '已撤销完成')
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const completeSchedule = async (item: ScheduleItem, done = true) => {
    if (!token || !activeCourse) return
    setBusy(true)
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${activeCourse.id}/schedule/done`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            date: item.date,
            unit_order: item.unit_order,
            step_id: item.step_id,
            done,
          }),
        },
      )
      if (data.course) patchCourse(data.course)
      setMsg(done ? `已完成：${item.title}` : '已撤销')
    } catch (e) {
      // 兼容：旧服务无 schedule/done 时走 steps
      try {
        await completeStep(item.unit_order, item.step_id, done)
      } catch {
        setMsg(`更新失败：${String(e)}`)
      }
    } finally {
      setBusy(false)
    }
  }

  const rebuildSchedule = async () => {
    if (!token || !activeCourse) return
    setBusy(true)
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${activeCourse.id}/schedule/rebuild`,
        token,
        { method: 'POST', body: JSON.stringify({ start_offset_days: 0 }) },
      )
      if (data.course) patchCourse(data.course)
      setCalAnchor(todayIso())
      setMsg('已按当前单元进度重排后续日历')
      setHubTab('calendar')
    } catch (e) {
      setMsg(`重排失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const setCurrentUnit = async () => {
    if (!token || !activeCourse) return
    const order = Number(paceValues.unit_order || 0)
    if (!order) {
      setMsg('请先选择当前讲到的单元')
      return
    }
    setBusy(true)
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${activeCourse.id}/units/set-current`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            unit_order: order,
            mark_previous_mastered: true,
            rebuild: true,
          }),
        },
      )
      if (data.course) patchCourse(data.course)
      setPaceValues({})
      setPaceResetKey((k) => k + 1)
      setMsg(`已校正：当前单元 → 第 ${order} 课，后续日历已重排`)
      setHubTab('progress')
    } catch (e) {
      setMsg(`校正失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const setProgress = async (courseId: string, order: number, status: string) => {
    if (!token) return
    try {
      const data = await apiFetch<{ course: CourseItem }>(
        `/api/v1/study-coach/courses/${courseId}/progress`,
        token,
        { method: 'POST', body: JSON.stringify({ order, status }) },
      )
      if (data.course) patchCourse(data.course)
      else await load()
    } catch (e) {
      setMsg(`更新进度失败：${String(e)}`)
    }
  }

  const submitDrill = async () => {
    if (!token || !activeCourse) return
    const kind = drillValues.kind || ''
    if (!['review', 'dictation', 'exam'].includes(kind)) {
      setMsg('请先选择任务类型')
      return
    }
    const unit = (drillValues.unit_name || '').trim()
    if (!unit) {
      setMsg('请先选择学习单元')
      return
    }
    setBusy(true)
    setMsg('')
    let score = ''
    let result = ''
    let notes = ''
    if (kind === 'dictation') {
      score = (drillValues.dictation_score || '').trim()
      result = (drillValues.dictation_wrong || '').trim() ? '有错词' : score ? '已默写' : '已记录'
      notes = [
        drillValues.dictation_range && `范围：${drillValues.dictation_range.trim()}`,
        drillValues.dictation_score && `正确情况：${drillValues.dictation_score.trim()}`,
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
      setMsg(`${followLabels[kind] || KIND_LABEL[kind] || '跟进'}已记录 · ${unit}`)
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const onDrillChange = (k: string, v: string) => {
    if (k === 'kind') {
      setDrillValues((p) => (p.kind === v ? p : { kind: v }))
      setDrillResetKey((n) => n + 1)
      return
    }
    setDrillValues((p) => ({ ...p, [k]: v }))
  }

  const startFollowFromStep = (unitName: string, kind?: string) => {
    const k = kind && ['review', 'dictation', 'exam'].includes(kind) ? kind : 'review'
    setDrillValues({ kind: k, unit_name: unitName })
    setDrillResetKey((n) => n + 1)
    setHubTab('follow')
  }

  const courseDrills = drills.filter((d) => d.course_id === (activeCourse?.id || ''))
  const tabs: { id: HubTab; label: string }[] = [
    { id: 'progress', label: '单元进度' },
    { id: 'today', label: '今日跟进' },
    { id: 'modules', label: '大任务' },
    { id: 'calendar', label: '日历提醒' },
    { id: 'follow', label: '记一次' },
  ]

  return (
    <div>
      {phase === 'ask' && (showAsk || courses.length === 0) && (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
          meta={entrySource === 'im' ? '群消息入口 · Soft 步进' : '学生 / 家长 · Soft 步进'}
          accent={accent}
          variant="soft"
          flowHint="说科目课本 → 确认册次 → 生成大任务/小步骤/日历 → 每日跟进"
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
            <strong>是这几本吗？</strong>
            <span className="tag">根据「{lastQuery}」定位</span>
          </div>
          <p className="muted" style={{ margin: '8px 0 12px', fontSize: 13 }}>
            点选正确册次后，会按该科目生成：大任务（阶段）→ 单元小步骤 → 学习日历与提醒。
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
                    opacity: busy ? 0.7 : 1,
                  }}
                  onClick={() => void confirmBook(c)}
                >
                  <div style={{ fontWeight: 600 }}>{c.full_title}</div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                    {catalogLine(c)}
                    {typeof c.confidence === 'number' ? ` · ${Math.round(c.confidence * 100)}%` : ''}
                  </div>
                  {c.note ? <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{c.note}</div> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={resetAsk}>
              不对，换个说法
            </button>
          </div>
        </div>
      )}

      {msg && <p className="status-msg">{msg}</p>}

      {courses.length > 0 && (
        <>
          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>我的课本</h4>
          {loading && <p className="muted">加载中…</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {courses.map((c) => (
              <button
                key={c.id}
                type="button"
                className={c.id === activeCourse?.id ? 'btn' : 'btn btn-ghost'}
                style={c.id === activeCourse?.id ? { background: accent, fontSize: 12 } : { fontSize: 12 }}
                onClick={() => {
                  setActiveCourseId(c.id)
                  setHubTab('progress')
                  setExpandedUnit(null)
                }}
              >
                {c.subject || c.catalog?.subject || '课本'} · {c.progress_pct}%
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && courses.length === 0 && phase === 'ask' && (
        <p className="muted">
          推荐输入：部编语文三上 / 人教数学三上 / 沪教英语三上。命中目录库后按真实课名排学期进度，无需上传 PDF。
        </p>
      )}

      {activeCourse && (
        <>
          <div className="list-card" style={{ marginBottom: 12 }}>
            <div className="list-card-head">
              <strong>{activeCourse.textbook_name}</strong>
              <span className="tag">
                {activeCourse.progress_pct}% ·{' '}
                {activeCourse.toc_source === 'library' || activeCourse.plan_source === 'toc_library'
                  ? '真实目录库'
                  : activeCourse.plan_source === 'deepseek'
                    ? 'DeepSeek'
                    : '模板'}
              </span>
            </div>
            {activeCourse.catalog && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                {catalogLine(activeCourse.catalog)}
                {activeCourse.progress_meta?.edition_label
                  ? ` · ${activeCourse.progress_meta.edition_label}`
                  : ''}
              </p>
            )}
            {activeCourse.unit_progress?.pace_label && (
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>
                进度对照：{activeCourse.unit_progress.pace_label}
                {activeCourse.unit_progress.planned_unit_name
                  ? ` · 预测应在「${activeCourse.unit_progress.planned_unit_name}」`
                  : ''}
                {activeCourse.unit_progress.actual_unit_name
                  ? ` · 实际「${activeCourse.unit_progress.actual_unit_name}」`
                  : ''}
              </p>
            )}
            {tips?.rhythm && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                科目节奏：{tips.rhythm}
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
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                disabled={busy}
                onClick={() => void rebuildSchedule()}
              >
                重排后续日历
              </button>
            </div>
          </div>

          {hubTab === 'progress' && (
            <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
              <div className="list-card">
                <div className="list-card-head">
                  <strong>单元进度 · 预测 vs 实际</strong>
                  <span className="tag">
                    {activeCourse.progress_meta?.term_start || '?'} ~{' '}
                    {activeCourse.progress_meta?.term_end || '?'}
                  </span>
                </div>
                <p className="muted" style={{ margin: '8px 0', fontSize: 13 }}>
                  目录来自入库课本（非 PDF）。按学期教学周预测每课起止日；若与老师进度不一致，下方校正「讲到哪一课」。
                </p>
                {activeCourse.progress_meta?.warning && (
                  <p className="status-msg">{activeCourse.progress_meta.warning}</p>
                )}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
                  {(activeCourse.plan || []).map((u) => {
                    const up = activeCourse.unit_progress
                    const isPlanned = up?.planned_unit_order === u.order
                    const isActual = up?.actual_unit_order === u.order
                    return (
                      <li
                        key={u.order}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 8,
                          alignItems: 'center',
                          fontSize: 13,
                          padding: '8px 0',
                          borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                          background: isActual
                            ? 'color-mix(in srgb, currentColor 6%, transparent)'
                            : undefined,
                        }}
                      >
                        <span style={{ flex: '1 1 220px' }}>
                          {u.unit_code ? `${u.unit_code} · ` : ''}
                          {u.unit_name}
                          <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                            预测 {u.planned_start || '?'} ~ {u.planned_end || '?'}
                            {u.focus ? ` · ${u.focus}` : ''}
                          </span>
                        </span>
                        <span className="tag">{UNIT_LABEL[u.status] || u.status}</span>
                        {isPlanned && <span className="tag">学期预测</span>}
                        {isActual && <span className="tag">当前实际</span>}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          disabled={busy}
                          onClick={() => {
                            setPaceValues({ unit_order: String(u.order) })
                            setPaceResetKey((k) => k + 1)
                            void (async () => {
                              if (!token) return
                              setBusy(true)
                              try {
                                const data = await apiFetch<{ course: CourseItem }>(
                                  `/api/v1/study-coach/courses/${activeCourse.id}/units/set-current`,
                                  token,
                                  {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      unit_order: u.order,
                                      mark_previous_mastered: true,
                                      rebuild: true,
                                    }),
                                  },
                                )
                                if (data.course) patchCourse(data.course)
                                setMsg(`已设为当前：${u.unit_name}`)
                              } catch (e) {
                                setMsg(`校正失败：${String(e)}`)
                              } finally {
                                setBusy(false)
                              }
                            })()
                          }}
                        >
                          设为当前
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <GtgtStepComposer
                title="校正单元进度"
                meta="当预测与老师进度不一致时"
                accent={accent}
                variant="soft"
                flowHint="点选实际讲到的课 → 前面标掌握 → 从今天重排后续日历"
                steps={paceSteps}
                values={paceValues}
                onChange={(k, v) => setPaceValues((p) => ({ ...p, [k]: v }))}
                onComplete={setCurrentUnit}
                busy={busy}
                resetKey={paceResetKey}
                submitLabel="按此课校正进度"
              />
            </div>
          )}

          {hubTab === 'today' && (
            <div className="list-card" style={{ marginBottom: 12 }}>
              <div className="list-card-head">
                <strong>今日跟进 · {todayIso()}</strong>
                <span className="tag">{todayItems.filter((x) => !x.done).length} 待办</span>
              </div>
              {todayItems.length === 0 && (
                <p className="muted" style={{ marginTop: 8 }}>
                  今天没有待办。可去「大任务」展开小步骤，或「记一次」写入家默/复习/考试。
                </p>
              )}
              <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 10 }}>
                {todayItems.map((item) => (
                  <li
                    key={`${item.date}-${item.unit_order}-${item.step_id}`}
                    style={{
                      padding: '12px 0',
                      borderTop: '1px solid color-mix(in srgb, currentColor 12%, transparent)',
                      opacity: item.done ? 0.55 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
                      <div style={{ flex: '1 1 220px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                          {[item.module_name, item.unit_name].filter(Boolean).join(' · ')}
                          {item.kind ? ` · ${followLabels[item.kind] || KIND_LABEL[item.kind] || item.kind}` : ''}
                        </div>
                        {item.reminder && (
                          <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5 }}>{item.reminder}</p>
                        )}
                      </div>
                      <div className="row-actions" style={{ flexWrap: 'wrap' }}>
                        {!item.done && (
                          <button
                            type="button"
                            className="btn"
                            style={{ background: accent, fontSize: 12 }}
                            disabled={busy}
                            onClick={() => void completeSchedule(item, true)}
                          >
                            完成小任务
                          </button>
                        )}
                        {item.done && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 12 }}
                            disabled={busy}
                            onClick={() => void completeSchedule(item, false)}
                          >
                            撤销
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          onClick={() =>
                            startFollowFromStep(item.unit_name || '', item.kind)
                          }
                        >
                          记详细结果
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hubTab === 'modules' && (
            <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
              {modules.map((mod) => {
                const units = (activeCourse.plan || []).filter(
                  (u) =>
                    (mod.unit_orders || []).includes(u.order) ||
                    u.module_order === mod.order ||
                    u.module_name === mod.name,
                )
                const doneUnits = units.filter((u) => u.status === 'mastered').length
                return (
                  <div key={mod.order} className="list-card">
                    <div className="list-card-head">
                      <strong>
                        大任务 {mod.order} · {mod.name}
                      </strong>
                      <span className="tag">
                        {doneUnits}/{units.length || (mod.unit_orders || []).length} 单元
                      </span>
                    </div>
                    {mod.goal && (
                      <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                        目标：{mod.goal}
                      </p>
                    )}
                    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                      {units.map((u) => {
                        const open = expandedUnit === u.order
                        const stepDone = (u.steps || []).filter((s) => s.status === 'done').length
                        const stepAll = (u.steps || []).length
                        return (
                          <li key={u.order}>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '10px 12px',
                                display: 'block',
                              }}
                              onClick={() => setExpandedUnit(open ? null : u.order)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>
                                  {u.unit_code ? `${u.unit_code} · ` : ''}
                                  {u.unit_name}
                                </span>
                                <span className="tag">{UNIT_LABEL[u.status] || u.status}</span>
                              </div>
                              <span className="muted" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                {u.focus || '展开查看小步骤'}
                                {stepAll ? ` · 小任务 ${stepDone}/${stepAll}` : ''}
                                {u.estimated_days ? ` · 约 ${u.estimated_days} 天` : ''}
                              </span>
                            </button>
                            {open && (
                              <div style={{ padding: '0 4px 8px 12px' }}>
                                {(u.steps || []).length === 0 && (
                                  <p className="muted" style={{ fontSize: 12 }}>暂无小步骤</p>
                                )}
                                {(u.steps || []).map((step) => (
                                  <div
                                    key={step.id}
                                    style={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 8,
                                      alignItems: 'flex-start',
                                      padding: '8px 0',
                                      borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)',
                                      opacity: step.status === 'done' ? 0.55 : 1,
                                    }}
                                  >
                                    <div style={{ flex: '1 1 200px' }}>
                                      <div style={{ fontSize: 13, fontWeight: 600 }}>{step.title}</div>
                                      {step.detail && (
                                        <p className="muted" style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.45 }}>
                                          {step.detail}
                                        </p>
                                      )}
                                    </div>
                                    <div className="row-actions">
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: 12 }}
                                        disabled={busy}
                                        onClick={() =>
                                          void completeStep(u.order, step.id, step.status !== 'done')
                                        }
                                      >
                                        {step.status === 'done' ? '撤销' : '完成'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: 12 }}
                                        onClick={() => startFollowFromStep(u.unit_name, step.kind)}
                                      >
                                        记结果
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <div className="row-actions" style={{ marginTop: 8 }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ fontSize: 12 }}
                                    onClick={() => void setProgress(activeCourse.id, u.order, 'learning')}
                                  >
                                    标记学习中
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost"
                                    style={{ fontSize: 12 }}
                                    onClick={() => void setProgress(activeCourse.id, u.order, 'mastered')}
                                  >
                                    整单元掌握
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {hubTab === 'calendar' && (
            <div className="list-card" style={{ marginBottom: 12 }}>
              <div className="list-card-head">
                <strong>学习日历与提醒</strong>
                <span className="tag">{(activeCourse.schedule || []).length} 条</span>
              </div>
              <p className="muted" style={{ margin: '6px 0 10px', fontSize: 12 }}>
                按教学进度展开的两周视图。点「完成」会同步对应小任务；落后时可「按进度重排日历」。
              </p>
              <div className="row-actions" style={{ marginBottom: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setCalAnchor(addDaysIso(calAnchor, -7))}
                >
                  上一周
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setCalAnchor(todayIso())}
                >
                  回到今天
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 12 }}
                  onClick={() => setCalAnchor(addDaysIso(calAnchor, 7))}
                >
                  下一周
                </button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 8,
                }}
              >
                {weekDays.map((day) => {
                  const items = scheduleByDate.get(day) || []
                  const isToday = day === todayIso()
                  const pending = items.filter((x) => !x.done).length
                  return (
                    <div
                      key={day}
                      style={{
                        border: isToday
                          ? `2px solid ${accent}`
                          : '1px solid color-mix(in srgb, currentColor 14%, transparent)',
                        borderRadius: 10,
                        padding: 10,
                        minHeight: 88,
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
                      {items.slice(0, 3).map((it) => (
                        <button
                          key={`${it.step_id}-${it.unit_order}`}
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            fontSize: 11,
                            marginTop: 6,
                            padding: '4px 6px',
                            textDecoration: it.done ? 'line-through' : undefined,
                            opacity: it.done ? 0.55 : 1,
                          }}
                          title={it.reminder || it.title}
                          onClick={() => void completeSchedule(it, !it.done)}
                        >
                          {it.title}
                        </button>
                      ))}
                      {items.length > 3 && (
                        <span className="muted" style={{ fontSize: 11 }}>
                          +{items.length - 3} · 待办 {pending}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hubTab === 'follow' && (
            <>
              <GtgtStepComposer
                title="记一次学习跟进"
                meta={
                  drillKind
                    ? `${activeCourse.textbook_name} · ${followLabels[drillKind] || KIND_LABEL[drillKind] || drillKind}`
                    : `${activeCourse.textbook_name} · 请先选类型`
                }
                accent={accent}
                variant="soft"
                flowHint={
                  tips?.rhythm
                    ? `本科目：${tips.rhythm} · Soft 单字段推进`
                    : '①类型 → ②单元 → ③按类型填写 → 写入真库'
                }
                steps={drillSteps}
                values={drillValues}
                onChange={onDrillChange}
                onComplete={submitDrill}
                busy={busy}
                resetKey={drillResetKey}
                submitLabel={
                  drillKind === 'dictation'
                    ? `提交${followLabels.dictation || '家默'}记录`
                    : drillKind === 'review'
                      ? `提交${followLabels.review || '复习'}记录`
                      : drillKind === 'exam'
                        ? `提交${followLabels.exam || '考试'}记录`
                        : '下一步'
                }
              />

              <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>跟进记录</h4>
              {courseDrills.length === 0 && <p className="muted">暂无家默 / 复习 / 考试记录</p>}
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {courseDrills.map((d) => (
                  <li key={d.id} className="list-card">
                    <div className="list-card-head">
                      <strong>
                        {followLabels[d.kind] || KIND_LABEL[d.kind] || d.kind} · {d.unit_name}
                      </strong>
                      <span className="tag">
                        {[d.score, d.result].filter(Boolean).join(' · ') || '已记录'}
                      </span>
                    </div>
                    {d.notes && (
                      <p style={{ margin: '6px 0 0', fontSize: 13, whiteSpace: 'pre-wrap' }}>{d.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
