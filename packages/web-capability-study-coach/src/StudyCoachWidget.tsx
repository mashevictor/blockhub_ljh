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

function catalogLine(c: CatalogInfo) {
  return [
    c.publisher || c.series,
    c.school_system,
    c.stage,
    c.grade,
    c.semester,
    c.subject,
  ]
    .filter(Boolean)
    .join(' · ')
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
  const [drillValues, setDrillValues] = useState<Record<string, string>>({ kind: 'dictation' })
  const [activeCourseId, setActiveCourseId] = useState('')
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'ask' | 'confirm'>('ask')
  const [lastQuery, setLastQuery] = useState('')
  const [candidates, setCandidates] = useState<CatalogInfo[]>([])
  const [showAsk, setShowAsk] = useState(entrySource !== 'im')

  const accent = primaryColor || '#6366f1'
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]

  const askSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '你在学哪本课本？',
        placeholder: '例如：沪教英语二年级下 / 人教版语文三年级上',
        hint: '口语说即可，不用自己拆出版社、学制、年级',
      },
    ],
    [],
  )

  const drillSteps: GtgtStep[] = useMemo(() => {
    const unitChoices = (activeCourse?.plan || []).map((u) => u.unit_name)
    return [
      {
        key: 'kind',
        label: '记一次跟进',
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
        label: '对应单元',
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
                        setDrillValues((p) => ({
                          ...p,
                          unit_name: name,
                          notes: p.notes || unit.dictation_hint || '',
                        }))
                      }
                    }}
                  >
                    {name.length > 18 ? `${name.slice(0, 18)}…` : name}
                  </button>
                ))}
              </div>
            )
          : undefined,
      },
      {
        key: 'notes',
        label: '结果备注（可空）',
        placeholder: '得分、错词、薄弱点…',
        optional: true,
      },
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
    setMsg('正在生成学习大纲…')
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
      setMsg(
        `已确认 · ${data.course?.textbook_name || ''} · ${data.course?.plan?.length || 0} 个单元 · ${
          data.course?.plan_source === 'deepseek' ? 'DeepSeek 大纲' : '模板大纲'
        }`,
      )
      await load()
      if (data.course?.id) setActiveCourseId(data.course.id)
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
    const notes = (drillValues.notes || '').trim()
    try {
      await apiFetch('/api/v1/study-coach/drills', token, {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourse.id,
          unit_name: unit,
          kind,
          score: '',
          result: '',
          notes,
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
      {phase === 'ask' && (showAsk || courses.length === 0) && (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
          meta={entrySource === 'im' ? '群消息入口' : '说书名即可'}
          accent={accent}
          flowHint="一句话书名 → 确认册次 → 生成规划 / 进度 / 家默"
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
            点选正确册次后，再生成 Module / Unit 学习大纲
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

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>我的课本</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && courses.length === 0 && phase === 'ask' && (
        <p className="muted">先说课本名，确认册次后会生成真实学习大纲</p>
      )}
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
              <strong>{activeCourse.textbook_name}</strong>
              <span className="tag">
                {activeCourse.progress_pct}% · {activeCourse.plan_source === 'deepseek' ? 'DeepSeek 大纲' : '模板大纲'}
              </span>
            </div>
            {activeCourse.catalog && (
              <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                {catalogLine(activeCourse.catalog)}
                {typeof activeCourse.catalog.confidence === 'number'
                  ? ` · 置信度 ${Math.round(activeCourse.catalog.confidence * 100)}%`
                  : ''}
              </p>
            )}
            <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {(activeCourse.plan || []).map((u) => (
                <li
                  key={u.order}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 13 }}
                >
                  <span style={{ flex: '1 1 200px' }}>
                    {u.unit_code ? `${u.unit_code} · ` : ''}
                    {u.order}. {u.unit_name}
                    {u.focus ? (
                      <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                        重点：{u.focus}
                      </span>
                    ) : null}
                    {u.dictation_hint ? (
                      <span className="muted" style={{ display: 'block', fontSize: 12 }}>
                        家默：{u.dictation_hint}
                      </span>
                    ) : null}
                  </span>
                  <span className="tag">{UNIT_LABEL[u.status] || u.status}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => void setProgress(activeCourse.id, u.order, 'learning')}
                  >
                    开始学
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    onClick={() => void setProgress(activeCourse.id, u.order, 'mastered')}
                  >
                    掌握
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <GtgtStepComposer
            title="复习 / 家默 / 考试"
            meta={activeCourse.textbook_name}
            accent={accent}
            flowHint="选类型 → 选单元 → 可选写一句结果"
            steps={drillSteps}
            values={{
              kind: drillValues.kind || 'dictation',
              unit_name: drillValues.unit_name || activeCourse.plan?.[0]?.unit_name || '',
              notes: drillValues.notes || '',
            }}
            onChange={(k, v) => setDrillValues((p) => ({ ...p, [k]: v }))}
            onComplete={submitDrill}
            busy={busy}
            resetKey={drillResetKey}
            submitLabel="记下这次跟进"
          />

          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>跟进记录</h4>
          {courseDrills.length === 0 && <p className="muted">暂无家默/考试记录</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {courseDrills.map((d) => (
              <li key={d.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {KIND_LABEL[d.kind] || d.kind} · {d.unit_name}
                  </strong>
                  <span className="tag">{d.result || d.score || '已记录'}</span>
                </div>
                {d.notes && <p style={{ margin: '6px 0 0', fontSize: 13 }}>{d.notes}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
