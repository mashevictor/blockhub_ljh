import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface PlanUnit {
  order: number
  unit_code?: string
  unit_name: string
  focus?: string
  dictation_hint?: string
  estimated_days?: number
  status: string
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
  catalog?: CatalogInfo
  plan: PlanUnit[]
  plan_source: string
  progress_pct: number
  status: string
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

export function StudyCoachWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [drills, setDrills] = useState<DrillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [drillResetKey, setDrillResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ role: 'student' })
  const [drillValues, setDrillValues] = useState<Record<string, string>>({ kind: 'dictation' })
  const [activeCourseId, setActiveCourseId] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#6366f1'
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'role',
        label: '角色',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {([
              ['student', '学生'],
              ['parent', '家长'],
              ['teacher', '老师'],
            ] as const).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'student') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'student') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'textbook_name', label: '课本定位', placeholder: '沪教版英语五四制·小学二年级下' },
      { key: 'subject', label: '科目（可空，由 DeepSeek 补全）', placeholder: '英语', optional: true },
      { key: 'grade', label: '年级册次（可空）', placeholder: '小学二年级下', optional: true },
      { key: 'student_name', label: '学生姓名', placeholder: user?.display_name || '', optional: true },
    ],
    [user?.display_name],
  )

  const drillSteps: GtgtStep[] = useMemo(() => {
    const unitChoices = (activeCourse?.plan || []).map((u) => u.unit_name)
    return [
      {
        key: 'kind',
        label: '跟进类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {([
              ['dictation', '家默'],
              ['review', '复习'],
              ['exam', '考试'],
            ] as const).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'dictation') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'dictation') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'unit_name',
        label: '学习单元',
        placeholder: unitChoices[0] || '第一单元',
        render: unitChoices.length
          ? ({ value, setValue, accent: a }) => (
              <div className="row-actions" style={{ flexWrap: 'wrap' }}>
                {unitChoices.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={(value || unitChoices[0]) === name ? 'btn' : 'btn btn-ghost'}
                    style={(value || unitChoices[0]) === name ? { background: a, fontSize: 12 } : { fontSize: 12 }}
                    onClick={() => {
                      setValue(name)
                      const unit = (activeCourse?.plan || []).find((u) => u.unit_name === name)
                      if (unit?.dictation_hint) {
                        setDrillValues((p) => ({ ...p, unit_name: name, notes: p.notes || unit.dictation_hint || '' }))
                      }
                    }}
                  >
                    {name.length > 16 ? `${name.slice(0, 16)}…` : name}
                  </button>
                ))}
              </div>
            )
          : undefined,
      },
      { key: 'score', label: '得分/题量', placeholder: '95 或 8/10', optional: true },
      {
        key: 'result',
        label: '结果',
        optional: true,
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {([
              ['pass', '通过'],
              ['partial', '部分'],
              ['fail', '需巩固'],
            ] as const).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={value === k ? 'btn' : 'btn btn-ghost'}
                style={value === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'notes', label: '备注', placeholder: '错词 / 薄弱点…', optional: true },
    ]
  }, [activeCourse?.plan])

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

  const submitCourse = async () => {
    if (!token || !values.textbook_name?.trim()) return
    setBusy(true)
    setMsg('')
    const role = ['student', 'parent', 'teacher'].includes(values.role) ? values.role : 'student'
    try {
      const data = await apiFetch<{ course: CourseItem }>('/api/v1/study-coach/courses', token, {
        method: 'POST',
        body: JSON.stringify({
          role,
          textbook_name: values.textbook_name.trim(),
          subject: (values.subject || '').trim(),
          grade: (values.grade || '').trim(),
          student_name: (values.student_name || '').trim() || user?.display_name || '',
          app_public_id: appId || '',
        }),
      })
      setValues({ role: 'student' })
      setResetKey((k) => k + 1)
      setMsg(`已定位 · ${data.course?.textbook_name || ''} · ${data.course?.plan?.length || 0} 单元 · ${data.course?.plan_source === 'deepseek' ? 'DeepSeek' : '模板'}`)
      await load()
      if (data.course?.id) setActiveCourseId(data.course.id)
    } catch (e) {
      setMsg(`创建失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const setProgress = async (courseId: string, order: number, status: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/study-coach/courses/${courseId}/progress`, token, {
        method: 'POST',
        body: JSON.stringify({ order, status }),
      })
      await load()
    } catch (e) {
      setMsg(`更新进度失败：${String(e)}`)
    }
  }

  const submitDrill = async () => {
    if (!token || !activeCourse) return
    const unit = (drillValues.unit_name || activeCourse.plan?.[0]?.unit_name || '').trim()
    if (!unit) {
      setMsg('请先选择学习单元')
      return
    }
    setBusy(true)
    setMsg('')
    const kind = ['review', 'dictation', 'exam'].includes(drillValues.kind) ? drillValues.kind : 'dictation'
    try {
      await apiFetch('/api/v1/study-coach/drills', token, {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourse.id,
          unit_name: unit,
          kind,
          score: (drillValues.score || '').trim(),
          result: (drillValues.result || '').trim(),
          notes: (drillValues.notes || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setDrillValues({ kind: 'dictation', unit_name: unit })
      setDrillResetKey((k) => k + 1)
      setMsg(`${KIND_LABEL[kind] || '跟进'}已记录`)
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const courseDrills = drills.filter((d) => d.course_id === (activeCourse?.id || ''))

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建课本学习</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`输入版本+科目+学制+年级册次 → DeepSeek 定位具体目录 → 进度/家默/考试${user?.display_name ? ` · ${user.display_name}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submitCourse}
          busy={busy}
          resetKey={resetKey}
          submitLabel="定位课本并生成规划"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>我的课本</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && courses.length === 0 && <p className="muted">暂无课本，输入课本名称即可生成网页/App 学习闭环</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {courses.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === activeCourse?.id ? 'btn' : 'btn btn-ghost'}
            style={c.id === activeCourse?.id ? { background: accent, fontSize: 12 } : { fontSize: 12 }}
            onClick={() => setActiveCourseId(c.id)}
          >
            {c.textbook_name} · {c.progress_pct}%
          </button>
        ))}
      </div>

      {activeCourse && (
        <>
          <div className="list-card" style={{ marginBottom: 12 }}>
            <div className="list-card-head">
              <strong>{activeCourse.record_no} · {activeCourse.textbook_name}</strong>
              <span className="tag">{activeCourse.progress_pct}% · {activeCourse.plan_source === 'deepseek' ? 'DeepSeek定位' : '模板'}</span>
            </div>
            {activeCourse.catalog && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                {[
                  activeCourse.catalog.publisher || activeCourse.catalog.series,
                  activeCourse.catalog.school_system,
                  activeCourse.catalog.stage,
                  activeCourse.catalog.grade,
                  activeCourse.catalog.semester,
                  activeCourse.catalog.subject,
                ].filter(Boolean).join(' · ')}
                {typeof activeCourse.catalog.confidence === 'number'
                  ? ` · 置信度 ${Math.round(activeCourse.catalog.confidence * 100)}%`
                  : ''}
                {activeCourse.catalog.note ? ` · ${activeCourse.catalog.note}` : ''}
              </p>
            )}
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {activeCourse.student_name}
              {activeCourse.subject ? ` · ${activeCourse.subject}` : ''}
              {activeCourse.grade ? ` · ${activeCourse.grade}` : ''}
            </p>
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {(activeCourse.plan || []).map((u) => (
                <li key={u.order} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13 }}>
                  <span style={{ flex: '1 1 200px' }}>
                    {u.unit_code ? `${u.unit_code} · ` : ''}{u.order}. {u.unit_name}
                    {u.focus ? <span className="muted" style={{ display: 'block', fontSize: 12 }}>重点：{u.focus}</span> : null}
                    {u.dictation_hint ? <span className="muted" style={{ display: 'block', fontSize: 12 }}>家默：{u.dictation_hint}</span> : null}
                  </span>
                  <span className="tag">{UNIT_LABEL[u.status] || u.status}</span>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void setProgress(activeCourse.id, u.order, 'learning')}>开始学</button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void setProgress(activeCourse.id, u.order, 'mastered')}>掌握</button>
                </li>
              ))}
            </ul>
          </div>

          <GtgtStepComposer
            title="复习 / 家默 / 考试"
            meta={activeCourse.textbook_name}
            accent={accent}
            flowHint="家长可做家默盯检 · 学生考试 · 老师跟进复习"
            steps={drillSteps}
            values={{
              kind: drillValues.kind || 'dictation',
              unit_name: drillValues.unit_name || activeCourse.plan?.[0]?.unit_name || '',
              score: drillValues.score || '',
              result: drillValues.result || '',
              notes: drillValues.notes || '',
            }}
            onChange={(k, v) => setDrillValues((p) => ({ ...p, [k]: v }))}
            onComplete={submitDrill}
            busy={busy}
            resetKey={drillResetKey}
            submitLabel="记录跟进"
          />

          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>跟进记录</h4>
          {courseDrills.length === 0 && <p className="muted">暂无家默/考试记录</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {courseDrills.map((d) => (
              <li key={d.id} className="list-card">
                <div className="list-card-head">
                  <strong>{d.record_no} · {KIND_LABEL[d.kind] || d.kind}</strong>
                  <span className="tag">{d.result || d.score || '已记录'}</span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0' }}>{d.unit_name}</p>
                {d.notes && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{d.notes}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
