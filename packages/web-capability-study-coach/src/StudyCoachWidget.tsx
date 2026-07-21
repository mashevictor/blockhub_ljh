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
}

interface ScheduleItem {
  date: string
  unit_order: number
  unit_name?: string
  step_id: string
  title: string
  done?: boolean
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

interface UnitProgress {
  actual_unit_order?: number
  planned_unit_name?: string
  actual_unit_name?: string
  pace_label?: string
}

interface CourseItem {
  id: string
  textbook_name: string
  subject: string
  catalog?: CatalogInfo
  plan: PlanUnit[]
  schedule?: ScheduleItem[]
  subject_tips?: { rhythm?: string; follow_labels?: Record<string, string> }
  plan_source: string
  progress_pct: number
  unit_progress?: UnitProgress
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

interface TonightItem {
  id: string
  type?: string
  prompt: string
  answer?: string
  done?: boolean
  correct?: boolean | null
}

interface TonightPayload {
  title?: string
  instructions?: string
  disclaimer?: string
  child_name?: string
  level?: string
  items?: TonightItem[]
  drill_kind?: string
  completed_score?: string
}

interface TonightRecord {
  id: string
  course_id: string
  unit_order: number
  unit_name: string
  template: string
  template_label?: string
  status: string
  payload: TonightPayload
  source?: string
  drill_id?: string
}

type FlowPhase = 'book' | 'tonight' | 'preview' | 'practice' | 'done'
type ExtraPanel = 'none' | 'catalog' | 'calendar' | 'record'

const TEMPLATES: { key: string; label: string; tip: string }[] = [
  { key: 'dictation', label: '本课听写单', tip: '生字词默写' },
  { key: 'word_cards', label: '本课单词卡', tip: '英语正反面' },
  { key: 'math_drill', label: '本课口算/巩固', tip: '10 道短练' },
  { key: 'wrongbook', label: '错题巩固', tip: '从最近错词再练' },
  { key: 'read_aloud', label: '本课朗读清单', tip: '按步骤朗读' },
]

const FLOW: { id: FlowPhase; label: string }[] = [
  { id: 'book', label: '课本' },
  { id: 'tonight', label: '今晚练什么' },
  { id: 'preview', label: '过一眼' },
  { id: 'practice', label: '开练' },
]

const UNIT_LABEL: Record<string, string> = {
  pending: '未开始',
  learning: '学习中',
  review: '复习中',
  mastered: '已掌握',
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
  const { token, primaryColor, appId, entrySource } = useRuntime()
  const accent = primaryColor || '#0f766e'

  const [courses, setCourses] = useState<CourseItem[]>([])
  const [drills, setDrills] = useState<DrillItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const [queryValues, setQueryValues] = useState<Record<string, string>>({})
  const [genValues, setGenValues] = useState<Record<string, string>>({ level: '中' })
  const [phase, setPhase] = useState<'ask' | 'confirm'>('ask')
  const [lastQuery, setLastQuery] = useState('')
  const [candidates, setCandidates] = useState<CatalogInfo[]>([])
  const [showAsk, setShowAsk] = useState(entrySource !== 'im')
  const [activeCourseId, setActiveCourseId] = useState('')
  const [focusUnitOrder, setFocusUnitOrder] = useState<number | null>(null)
  const [flow, setFlow] = useState<FlowPhase>('book')
  const [pickedTemplate, setPickedTemplate] = useState('')
  const [tonight, setTonight] = useState<TonightRecord | null>(null)
  const [practiceItems, setPracticeItems] = useState<TonightItem[]>([])
  const [extra, setExtra] = useState<ExtraPanel>('none')
  const [calAnchor] = useState(todayIso())
  const [genResetKey, setGenResetKey] = useState(0)

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]

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

  const askSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '学哪一科、哪一本？',
        placeholder: '例：部编语文三上 / 人教数学三上 / 沪教英语三上',
        hint: '确认册次后进入「今晚练什么」。',
      },
    ],
    [],
  )

  const genSteps: GtgtStep[] = useMemo(
    () => [
      { key: 'child_name', label: '孩子称呼（可空）', placeholder: '如：豆豆', optional: true },
      {
        key: 'level',
        label: '难度',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap' }}>
            {['易', '中', '难'].map((lv) => (
              <button
                key={lv}
                type="button"
                className={value === lv ? 'btn' : 'btn btn-ghost'}
                style={value === lv ? { background: a, fontSize: 12 } : { fontSize: 12 }}
                onClick={() => setValue(lv)}
              >
                {lv}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'note', label: '备注（可空）', placeholder: '今晚特别想练…', optional: true, inputType: 'textarea' },
    ],
    [],
  )

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
      if (list.length > 0) setShowAsk(false)
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
      if (!list.length) {
        setMsg('没匹配到册次，换个说法再试（如：部编语文三年级上册）')
        return
      }
      setLastQuery(data.query || q)
      setCandidates(list)
      setPhase('confirm')
      setFlow('book')
    } catch (e) {
      setMsg(`定位失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const confirmBook = async (catalog: CatalogInfo) => {
    if (!token) return
    setBusy(true)
    setMsg('')
    try {
      const data = await apiFetch<{ course: CourseItem }>('/api/v1/study-coach/courses', token, {
        method: 'POST',
        body: JSON.stringify({
          textbook_name: catalog.full_title || lastQuery,
          query: lastQuery,
          subject: catalog.subject || '',
          grade: catalog.grade || '',
          role: 'student',
          catalog,
          app_public_id: appId || '',
        }),
      })
      setPhase('ask')
      setCandidates([])
      setQueryValues({})
      setResetKey((k) => k + 1)
      setShowAsk(false)
      await load()
      if (data.course?.id) setActiveCourseId(data.course.id)
      setFlow('tonight')
      setMsg('课本已就绪 · 选一个今晚模板开始')
    } catch (e) {
      setMsg(`创建失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const generateTonight = async () => {
    if (!token || !activeCourse || !currentUnit || !pickedTemplate) {
      setMsg('请先选课本、单元和模板')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const data = await apiFetch<{ tonight: TonightRecord }>('/api/v1/study-coach/tonight/generate', token, {
        method: 'POST',
        body: JSON.stringify({
          course_id: activeCourse.id,
          unit_order: currentUnit.order,
          template: pickedTemplate,
          child_name: genValues.child_name || '',
          level: genValues.level || '中',
          note: genValues.note || '',
          app_public_id: appId || '',
        }),
      })
      setTonight(data.tonight)
      setPracticeItems(data.tonight?.payload?.items || [])
      setFlow('preview')
      setMsg(data.tonight?.source === 'deepseek' ? '已生成 · 请家长过一眼' : '已用规则模板生成 · 请过一眼')
    } catch (e) {
      setMsg(`生成失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const startPractice = async () => {
    if (!token || !tonight) return
    setBusy(true)
    try {
      const data = await apiFetch<{ tonight: TonightRecord }>(
        `/api/v1/study-coach/tonight/${tonight.id}/start`,
        token,
        { method: 'POST', body: '{}' },
      )
      setTonight(data.tonight)
      setPracticeItems(data.tonight?.payload?.items || practiceItems)
      setFlow('practice')
    } catch (e) {
      setMsg(`开练失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const toggleItem = (id: string, field: 'done' | 'correct', value: boolean) => {
    setPracticeItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        if (field === 'done') return { ...it, done: value }
        return { ...it, correct: value, done: true }
      }),
    )
  }

  const finishPractice = async () => {
    if (!token || !tonight) return
    setBusy(true)
    try {
      const data = await apiFetch<{ tonight: TonightRecord }>(
        `/api/v1/study-coach/tonight/${tonight.id}/complete`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ items: practiceItems, complete_first_step: true }),
        },
      )
      setTonight(data.tonight)
      setFlow('done')
      setMsg('已写入真库 · 下次可用「错题巩固」')
      await load()
    } catch (e) {
      setMsg(`完成失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const recordOnly = async () => {
    if (!token || !tonight) return
    setBusy(true)
    try {
      await apiFetch(`/api/v1/study-coach/tonight/${tonight.id}/record-only`, token, {
        method: 'POST',
        body: '{}',
      })
      setFlow('done')
      setMsg('已记下草稿（未开练）')
      await load()
    } catch (e) {
      setMsg(`保存失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const jumpFlow = (id: FlowPhase) => {
    if (id === 'book') {
      setFlow('book')
      if (!courses.length) setShowAsk(true)
      return
    }
    if (!activeCourse) {
      setMsg('请先定位一本课本')
      setFlow('book')
      setShowAsk(true)
      return
    }
    if (id === 'tonight') {
      setFlow('tonight')
      return
    }
    if (id === 'preview' && tonight) {
      setFlow('preview')
      return
    }
    if (id === 'practice' && tonight) {
      setFlow(tonight.status === 'practicing' || tonight.status === 'done' ? 'practice' : 'preview')
      return
    }
    setMsg('请先生成今晚练习')
  }

  const weekDays = useMemo(() => {
    const [y, m, d] = calAnchor.split('-').map(Number)
    const dt = new Date(y, m - 1, d)
    const wd = dt.getDay() || 7
    const monday = addDaysIso(calAnchor, 1 - wd)
    return Array.from({ length: 7 }, (_, i) => addDaysIso(monday, i))
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

  const courseDrills = drills.filter((d) => d.course_id === (activeCourse?.id || ''))
  const flowIndex = FLOW.findIndex((f) => f.id === flow)

  return (
    <div style={{ color: '#0f172a' }}>
      {/* 流程条 */}
      <div
        style={{
          marginBottom: 14,
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          background: 'linear-gradient(180deg,#f8fafc,#fff)',
        }}
      >
        <strong style={{ fontSize: 13 }}>今晚学习链路</strong>
        <p className="muted" style={{ margin: '4px 0 10px', fontSize: 12, color: '#64748b' }}>
          对标：说出今天要练 → 过一眼 → 孩子开练（点节点可跳转）
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          {FLOW.map((f, i) => {
            const on = flow === f.id || (flow === 'done' && f.id === 'practice')
            const reached = i <= flowIndex || (flow === 'done' && i <= 3)
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => jumpFlow(f.id)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                    background: on ? `color-mix(in srgb, ${accent} 12%, #fff)` : reached ? '#fff' : '#f8fafc',
                    color: '#0f172a',
                    cursor: 'pointer',
                    fontWeight: on ? 700 : 500,
                    fontSize: 13,
                  }}
                >
                  {i + 1}. {f.label}
                </button>
                {i < FLOW.length - 1 ? <span style={{ color: '#94a3b8', fontWeight: 700 }}>→</span> : null}
              </div>
            )
          })}
        </div>
      </div>

      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}

      {/* 阶段：课本 */}
      {(flow === 'book' || !activeCourse) && (
        <>
          {(showAsk || courses.length === 0) && phase === 'ask' && (
            <GtgtStepComposer
              title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
              meta="先选课本"
              accent={accent}
              variant="soft"
              flowHint="说课本 → 确认册次 → 今晚练什么"
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
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {candidates.map((c, i) => (
                  <li key={`${c.full_title}-${i}`}>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      style={{ width: '100%', textAlign: 'left', background: i === 0 ? accent : undefined }}
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
                    setFlow('tonight')
                    setTonight(null)
                  }}
                >
                  {(c.subject || c.catalog?.subject || '课本') + ` · ${c.progress_pct}%`}
                </button>
              ))}
              {activeCourse && (
                <button type="button" className="btn" style={{ background: accent, fontSize: 12 }} onClick={() => setFlow('tonight')}>
                  去选今晚练什么 →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {activeCourse && flow !== 'book' && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <div className="list-card-head">
            <strong>{activeCourse.textbook_name}</strong>
            <span className="tag">{activeCourse.progress_pct}%</span>
          </div>
          {currentUnit && (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              当前课：{currentUnit.unit_code ? `${currentUnit.unit_code} · ` : ''}
              {currentUnit.unit_name}
              <span className="muted"> · {UNIT_LABEL[currentUnit.status] || currentUnit.status}</span>
            </p>
          )}
          {currentUnit?.focus && (
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              重点：{currentUnit.focus}
            </p>
          )}
        </div>
      )}

      {/* 今晚练什么 */}
      {activeCourse && flow === 'tonight' && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: 14 }}>选一个家长模板（对标 ThinkAI「今晚练什么」）</strong>
          <p className="muted" style={{ margin: '6px 0 12px', fontSize: 12 }}>
            录入与转介绍是并列获客；这里是并列练习入口——不是前后步骤。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 8 }}>
            {TEMPLATES.map((t) => {
              const on = pickedTemplate === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPickedTemplate(t.key)}
                  style={{
                    textAlign: 'left',
                    padding: 12,
                    borderRadius: 10,
                    border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                    background: on ? `color-mix(in srgb, ${accent} 10%, #fff)` : '#fff',
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                >
                  <strong style={{ fontSize: 13 }}>{t.label}</strong>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{t.tip}</div>
                </button>
              )
            })}
          </div>
          {pickedTemplate && (
            <div style={{ marginTop: 14 }}>
              <GtgtStepComposer
                title={`生成：${TEMPLATES.find((t) => t.key === pickedTemplate)?.label}`}
                meta={currentUnit?.unit_name || '当前课'}
                accent={accent}
                variant="soft"
                flowHint="可空字段可跳过 · 确认后生成练习草稿"
                steps={genSteps}
                values={genValues}
                onChange={(k, v) => setGenValues((p) => ({ ...p, [k]: v }))}
                onComplete={() => void generateTonight()}
                busy={busy}
                resetKey={genResetKey}
                submitLabel="生成今晚练习"
              />
            </div>
          )}
        </div>
      )}

      {/* 过一眼 */}
      {tonight && flow === 'preview' && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <div className="list-card-head">
            <strong>{tonight.payload?.title || tonight.template_label}</strong>
            <span className="tag">{tonight.source === 'deepseek' ? 'AI' : '规则兜底'}</span>
          </div>
          <p style={{ margin: '8px 0', fontSize: 13, lineHeight: 1.55 }}>{tonight.payload?.instructions}</p>
          <p className="muted" style={{ fontSize: 12, color: '#b45309' }}>
            {tonight.payload?.disclaimer || 'AI 可能出错，请家长过一眼再交给孩子。'}
          </p>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            {(tonight.payload?.items || []).map((it, idx) => (
              <li key={it.id} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{idx + 1}.</span> {it.prompt}
              </li>
            ))}
          </ul>
          <div className="row-actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void startPractice()}>
              交给孩子开练
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => {
                setFlow('tonight')
                setGenResetKey((k) => k + 1)
              }}
            >
              重做一份
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void recordOnly()}>
              先记下不练
            </button>
          </div>
        </div>
      )}

      {/* 开练 */}
      {tonight && flow === 'practice' && (
        <div className="list-card" style={{ marginBottom: 12 }}>
          <div className="list-card-head">
            <strong>开练 · {tonight.payload?.title}</strong>
            <span className="tag">
              {practiceItems.filter((i) => i.done).length}/{practiceItems.length}
            </span>
          </div>
          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 }}>
            {practiceItems.map((it, idx) => (
              <li
                key={it.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: it.done ? '#f0fdf4' : '#fff',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {idx + 1}. {it.prompt}
                </div>
                {it.answer ? (
                  <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                    参考：{it.answer}
                  </p>
                ) : null}
                <div className="row-actions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => toggleItem(it.id, 'done', !it.done)}>
                    {it.done ? '撤销完成' : '做完了'}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => toggleItem(it.id, 'correct', true)}>
                    对了
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => toggleItem(it.id, 'correct', false)}>
                    错了
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn"
            style={{ background: accent, marginTop: 14 }}
            disabled={busy}
            onClick={() => void finishPractice()}
          >
            结束并记入真库
          </button>
        </div>
      )}

      {flow === 'done' && (
        <div className="list-card" style={{ marginBottom: 12, borderColor: accent }}>
          <strong>今晚练完了</strong>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>
            {tonight?.payload?.completed_score ? `结果：${tonight.payload.completed_score}。` : ''}
            下次可从「错题巩固」继续；或换模板再练一课。
          </p>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              style={{ background: accent }}
              onClick={() => {
                setTonight(null)
                setPickedTemplate('wrongbook')
                setFlow('tonight')
                setGenResetKey((k) => k + 1)
              }}
            >
              再练：错题巩固
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setTonight(null)
                setPickedTemplate('')
                setFlow('tonight')
              }}
            >
              选其他模板
            </button>
          </div>
        </div>
      )}

      {/* 更多：目录 / 日历 / 最近记录 */}
      {activeCourse && (
        <div style={{ marginTop: 8 }}>
          <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
            {(
              [
                ['none', '收起更多'],
                ['catalog', '课本目录'],
                ['calendar', '本周日历'],
                ['record', '最近记录'],
              ] as const
            ).map(([id, lab]) => (
              <button
                key={id}
                type="button"
                className={extra === id ? 'btn' : 'btn btn-ghost'}
                style={extra === id ? { background: accent, fontSize: 12 } : { fontSize: 12 }}
                onClick={() => setExtra(id)}
              >
                {lab}
              </button>
            ))}
          </div>

          {extra === 'catalog' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {(activeCourse.plan || []).map((u) => (
                <li key={u.order} className="list-card" style={{ padding: 10 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: '100%', textAlign: 'left', fontSize: 13 }}
                    onClick={() => {
                      setFocusUnitOrder(u.order)
                      setFlow('tonight')
                      setExtra('none')
                    }}
                  >
                    <strong>
                      {u.order}. {u.unit_name}
                    </strong>
                    <span className="muted"> · {UNIT_LABEL[u.status] || u.status}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {extra === 'calendar' && (
            <div style={{ display: 'grid', gap: 8 }}>
              {weekDays.map((day) => {
                const items = scheduleByDate.get(day) || []
                return (
                  <div key={day} className="list-card" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 13 }}>
                      {day} 周{weekdayLabel(day)}
                    </strong>
                    {items.length === 0 ? (
                      <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        无安排
                      </p>
                    ) : (
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
                        {items.map((s) => (
                          <li key={`${s.date}-${s.step_id}-${s.unit_order}`}>
                            {s.title}
                            {s.done ? ' ✓' : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {extra === 'record' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {courseDrills.length === 0 && (
                <li className="muted" style={{ fontSize: 12 }}>
                  空库 · 开练结束后会出现在这里
                </li>
              )}
              {courseDrills.slice(0, 12).map((d) => (
                <li key={d.id} className="list-card" style={{ padding: 10 }}>
                  <strong style={{ fontSize: 13 }}>{d.unit_name}</strong>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                    {d.kind} · {d.score || d.result || '已记'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
