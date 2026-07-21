import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'
import {
  SC,
  SC_CSS,
  SC_FALLBACK_BRAND,
  SC_TEMPLATES,
  ScIcon,
  ScProgressRing,
  ScSheet,
  scType,
  scVars,
  type ScTemplateKey,
} from './studyCoachVisual'

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

const FLOW: { id: FlowPhase; label: string; icon: 'flowBook' | 'flowTonight' | 'flowPreview' | 'flowPractice' }[] = [
  { id: 'book', label: '课本', icon: 'flowBook' },
  { id: 'tonight', label: '今晚练什么', icon: 'flowTonight' },
  { id: 'preview', label: '过一眼', icon: 'flowPreview' },
  { id: 'practice', label: '开练', icon: 'flowPractice' },
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
  const accent = primaryColor || SC_FALLBACK_BRAND

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
  const [flipped, setFlipped] = useState<Record<string, boolean>>({})
  const [hoverTpl, setHoverTpl] = useState('')

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
    () => [{ key: 'query', label: '学哪一科、哪一本？', placeholder: '部编语文三上 / 人教数学一下' }],
    [],
  )
  const genSteps: GtgtStep[] = useMemo(
    () => [
      { key: 'child_name', label: '孩子称呼（可空）', optional: true, placeholder: '如：小明' },
      { key: 'level', label: '难度', placeholder: '易 / 中 / 难' },
      { key: 'note', label: '备注（可空）', optional: true, placeholder: '如：今晚只练 10 分钟' },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const [cRes, dRes] = await Promise.all([
        apiFetch<{ items: CourseItem[] }>(`/api/v1/study-coach/courses${q}`, token),
        apiFetch<{ items: DrillItem[] }>(`/api/v1/study-coach/drills${q}`, token),
      ])
      const list = cRes.items || []
      setCourses(list)
      setDrills(dRes.items || [])
      if (list.length) {
        setActiveCourseId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0].id))
        setShowAsk(false)
        setFlow((f) => (f === 'book' ? 'tonight' : f))
      } else {
        setFlow('book')
      }
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const locateBook = async () => {
    if (!token) return
    const query = (queryValues.query || '').trim()
    if (!query) return
    setBusy(true)
    setMsg('')
    try {
      const data = await apiFetch<{ candidates: CatalogInfo[]; query: string }>('/api/v1/study-coach/locate', token, {
        method: 'POST',
        body: JSON.stringify({ query, app_public_id: appId || '' }),
      })
      setLastQuery(data.query || query)
      setCandidates(data.candidates || [])
      setPhase('confirm')
    } catch (e) {
      setMsg(`定位失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const confirmBook = async (c: CatalogInfo) => {
    if (!token) return
    setBusy(true)
    try {
      await apiFetch('/api/v1/study-coach/courses', token, {
        method: 'POST',
        body: JSON.stringify({
          query: lastQuery,
          catalog: c,
          app_public_id: appId || '',
        }),
      })
      setPhase('ask')
      setCandidates([])
      setQueryValues({})
      setResetKey((k) => k + 1)
      await load()
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
      setFlipped({})
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
      const data = await apiFetch<{ tonight: TonightRecord }>(`/api/v1/study-coach/tonight/${tonight.id}/start`, token, {
        method: 'POST',
        body: '{}',
      })
      setTonight(data.tonight)
      setPracticeItems(data.tonight?.payload?.items || practiceItems)
      setFlow('practice')
    } catch (e) {
      setMsg(`开练失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const toggleItem = (id: string, field: 'done' | 'correct', value: boolean | null) => {
    setPracticeItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        if (field === 'done') return { ...it, done: Boolean(value) }
        return { ...it, correct: value, done: true }
      }),
    )
  }

  const finishPractice = async () => {
    if (!token || !tonight) return
    setBusy(true)
    try {
      const data = await apiFetch<{ tonight: TonightRecord }>(`/api/v1/study-coach/tonight/${tonight.id}/complete`, token, {
        method: 'POST',
        body: JSON.stringify({ items: practiceItems, complete_first_step: true }),
      })
      setTonight(data.tonight)
      setFlow('done')
      await load()
      setMsg('已写入真库 · 下次可从错题巩固继续')
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
      await load()
      setMsg('已记下草稿（未开练）')
    } catch (e) {
      setMsg(`记录失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const jumpFlow = (id: FlowPhase) => {
    if (id === 'book') {
      setFlow('book')
      return
    }
    if (!activeCourse) return
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
    }
  }

  const weekDays = useMemo(() => {
    const start = calAnchor
    return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i - new Date(calAnchor).getDay()))
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
  const doneCount = practiceItems.filter((i) => i.done).length
  const practicePct = practiceItems.length ? Math.round((doneCount / practiceItems.length) * 100) : 0
  const pickedMeta = SC_TEMPLATES.find((t) => t.key === pickedTemplate)
  const pickedTone = pickedMeta ? SC.tone[pickedMeta.key as ScTemplateKey] : accent

  return (
    <div className="sc-root" style={scVars(accent)}>
      <style>{SC_CSS}</style>

      {/* 顶区氛围条 */}
      <div
        style={{
          marginBottom: 14,
          borderRadius: 18,
          padding: '16px 16px 14px',
          background: `
            radial-gradient(ellipse 80% 70% at 12% 20%, color-mix(in srgb, ${accent} 28%, transparent), transparent 55%),
            radial-gradient(ellipse 60% 50% at 90% 10%, rgba(14,165,233,.14), transparent 50%),
            linear-gradient(135deg, ${SC.soft} 0%, #f8fafc 48%, #eff6ff 100%)
          `,
          border: `1px solid ${SC.line}`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: `linear-gradient(145deg, ${accent}, var(--sc-brand-mid))`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 10px 24px color-mix(in srgb, ${accent} 35%, transparent)`,
              animation: flow === 'tonight' ? 'scPulse 2.4s ease-in-out infinite' : undefined,
            }}
          >
            <ScIcon name="brandMark" size={32} color="#fff" secondary="rgba(255,255,255,.28)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={scType.overline}>Tonight Practice</div>
            <div style={{ ...scType.display, marginTop: 2 }}>今晚这一练</div>
            <div style={{ ...scType.caption, marginTop: 4, color: SC.body }}>
              选模板 → 过一眼 → 孩子开练
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginTop: 16, overflowX: 'auto', paddingBottom: 2 }}>
          {FLOW.map((f, i) => {
            const on = flow === f.id || (flow === 'done' && f.id === 'practice')
            const reached = i <= flowIndex || (flow === 'done' && i <= 3)
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
                <button
                  type="button"
                  className="sc-flow-dot"
                  onClick={() => jumpFlow(f.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '0 4px',
                    minWidth: 72,
                  }}
                >
                  <span
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      background: on ? accent : reached ? SC.surface : SC.canvas,
                      border: on ? `2px solid ${accent}` : `1.5px solid ${SC.line}`,
                      boxShadow: on ? `0 8px 18px color-mix(in srgb, ${accent} 35%, transparent)` : undefined,
                    }}
                  >
                    <ScIcon
                      name={f.icon}
                      size={22}
                      color={on ? '#fff' : reached ? accent : SC.faint}
                      secondary={on ? 'rgba(255,255,255,.28)' : reached ? `color-mix(in srgb, ${accent} 18%, #fff)` : SC.line}
                    />
                  </span>
                  <span style={{ ...scType.label, color: on ? SC.ink : SC.muted, fontWeight: on ? 800 : 600 }}>{f.label}</span>
                </button>
                {i < FLOW.length - 1 ? (
                  <div
                    style={{
                      width: 28,
                      height: 3,
                      borderRadius: 99,
                      marginBottom: 22,
                      background: i < flowIndex || flow === 'done' ? accent : SC.line,
                      transition: 'background .25s ease',
                    }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {msg && (
        <p
          className="status-msg"
          style={{
            animation: 'scPop .28s ease',
            background: 'color-mix(in srgb, #0ea5e9 10%, #fff)',
            border: '1px solid #bae6fd',
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 13,
          }}
        >
          {msg}
        </p>
      )}
      {loading && <p className="muted">加载中…</p>}

      {/* 课本阶段 */}
      {(flow === 'book' || !activeCourse) && (
        <>
          {(showAsk || courses.length === 0) && phase === 'ask' && (
            <GtgtStepComposer
              title={entrySource === 'im' ? '课本学习协作' : '先定位课本'}
              meta="说出科目与册次"
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
            <div style={{ animation: 'scPop .3s ease', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>确认要学的册次</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {candidates.map((c, i) => (
                  <button
                    key={`${c.full_title}-${i}`}
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmBook(c)}
                    style={{
                      textAlign: 'left',
                      padding: 14,
                      borderRadius: 14,
                      border: i === 0 ? `2px solid ${accent}` : '1px solid #e2e8f0',
                      background: i === 0 ? `color-mix(in srgb, ${accent} 10%, #fff)` : '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: i === 0 ? accent : '#f1f5f9',
                        color: i === 0 ? '#fff' : accent,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <ScIcon name="flowBook" size={18} color={i === 0 ? '#fff' : accent} />
                    </span>
                    <span>
                      <div style={{ fontWeight: 700 }}>{c.full_title}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{catalogLine(c)}</div>
                    </span>
                  </button>
                ))}
              </div>
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
              {courses.map((c) => {
                const on = c.id === activeCourse?.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCourseId(c.id)
                      setFocusUnitOrder(null)
                      setFlow('tonight')
                      setTonight(null)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: on ? `2px solid ${accent}` : '1px solid #e2e8f0',
                      background: on ? accent : '#fff',
                      color: on ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <ScIcon name="flowBook" size={14} color={on ? '#fff' : accent} />
                    {(c.subject || c.catalog?.subject || '课本') + ` · ${c.progress_pct}%`}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* 当前课本卡 */}
      {activeCourse && flow !== 'book' && (
        <div
          style={{
            marginBottom: 14,
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            background: '#fff',
            padding: 14,
            display: 'flex',
            gap: 14,
            alignItems: 'center',
            animation: 'scPop .28s ease',
          }}
        >
          <ScProgressRing pct={activeCourse.progress_pct} brand={accent} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeCourse.textbook_name}
            </div>
            {currentUnit && (
              <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: `color-mix(in srgb, ${accent} 12%, #fff)`,
                    color: accent,
                    fontWeight: 700,
                    fontSize: 11,
                    marginRight: 6,
                  }}
                >
                  {UNIT_LABEL[currentUnit.status] || currentUnit.status}
                </span>
                {currentUnit.unit_code ? `${currentUnit.unit_code} · ` : ''}
                {currentUnit.unit_name}
              </div>
            )}
            {currentUnit?.focus && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#64748b' }}>重点：{currentUnit.focus}</div>
            )}
          </div>
        </div>
      )}

      {/* 模板墙 */}
      {activeCourse && flow === 'tonight' && (
        <div style={{ animation: 'scPop .3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <strong style={scType.title}>今晚练什么？</strong>
            <span style={scType.caption}>点一张卡片 · 图标即含义</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(152px,1fr))', gap: 10 }}>
            {SC_TEMPLATES.map((t) => {
              const on = pickedTemplate === t.key
              const hot = hoverTpl === t.key
              const tone = SC.tone[t.key]
              return (
                <button
                  key={t.key}
                  type="button"
                  className="sc-tpl"
                  onMouseEnter={() => setHoverTpl(t.key)}
                  onMouseLeave={() => setHoverTpl('')}
                  onClick={() => setPickedTemplate(t.key)}
                  style={{
                    textAlign: 'left',
                    padding: 0,
                    borderRadius: 16,
                    border: on ? `2px solid ${tone}` : `1px solid ${SC.line}`,
                    background: SC.surface,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: on || hot ? `0 12px 28px color-mix(in srgb, ${tone} 22%, transparent)` : undefined,
                  }}
                >
                  <div
                    style={{
                      height: 84,
                      background: `
                        radial-gradient(circle at 80% 20%, rgba(255,255,255,.4), transparent 42%),
                        linear-gradient(145deg, ${tone}, color-mix(in srgb, ${tone} 52%, #0f172a))
                      `,
                      display: 'grid',
                      placeItems: 'center',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,.2)',
                        backdropFilter: 'blur(4px)',
                        display: 'grid',
                        placeItems: 'center',
                        transform: hot || on ? 'scale(1.06)' : 'scale(1)',
                        transition: 'transform .18s ease',
                      }}
                    >
                      <ScIcon name={t.key} size={30} color="#fff" secondary="rgba(255,255,255,.32)" />
                    </div>
                    {on && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: SC.surface,
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <ScIcon name="check" size={14} color={tone} />
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    <div style={{ ...scType.label, fontSize: 13 }}>{t.label}</div>
                    <div style={{ ...scType.caption, marginTop: 3 }}>{t.tip}</div>
                    <div style={{ ...scType.caption, marginTop: 4, color: tone, fontWeight: 700, fontSize: 10 }}>{t.meaning}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {pickedTemplate && (
            <div style={{ marginTop: 14, animation: 'scPop .28s ease' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: `color-mix(in srgb, ${pickedTone || accent} 10%, #fff)`,
                  border: `1px solid color-mix(in srgb, ${pickedTone || accent} 25%, #e2e8f0)`,
                }}
              >
                <ScIcon name={pickedMeta?.key || 'flowTonight'} size={22} color={pickedTone} secondary={`color-mix(in srgb, ${pickedTone} 18%, #fff)`} />
                <span style={scType.subtitle}>
                  生成「{pickedMeta?.label}」· {currentUnit?.unit_name || '当前课'}
                  {pickedMeta ? <span style={{ ...scType.caption, display: 'block', marginTop: 2 }}>{pickedMeta.meaning}</span> : null}
                </span>
              </div>
              <GtgtStepComposer
                title="补一点点信息"
                meta="可空字段可跳过"
                accent={pickedTone || accent}
                variant="soft"
                flowHint="称呼 / 难度 / 备注 → 生成练习纸"
                steps={genSteps}
                values={genValues}
                onChange={(k, v) => setGenValues((p) => ({ ...p, [k]: v }))}
                onComplete={() => void generateTonight()}
                busy={busy}
                resetKey={genResetKey}
                submitLabel="生成今晚练习纸"
              />
            </div>
          )}
        </div>
      )}

      {/* 过一眼 · 练习纸 */}
      {tonight && flow === 'preview' && (
        <div style={{ animation: 'scPop .32s ease' }}>
          <ScSheet>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '.06em' }}>家长过一眼</div>
                <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2 }}>{tonight.payload?.title || tonight.template_label}</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: tonight.source === 'deepseek' ? '#ecfeff' : '#fef3c7',
                  color: tonight.source === 'deepseek' ? '#0e7490' : '#b45309',
                  border: '1px solid',
                  borderColor: tonight.source === 'deepseek' ? '#a5f3fc' : '#fde68a',
                }}
              >
                {tonight.source === 'deepseek' ? 'AI 生成' : '规则兜底'}
              </span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: '#334155' }}>{tonight.payload?.instructions}</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#b45309', fontWeight: 600 }}>
              {tonight.payload?.disclaimer || 'AI 可能出错，请家长过一眼再交给孩子。'}
            </p>

            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: tonight.template === 'word_cards' ? 'repeat(auto-fill,minmax(120px,1fr))' : '1fr',
                gap: 8,
              }}
            >
              {(tonight.payload?.items || []).map((it, idx) =>
                tonight.template === 'word_cards' ? (
                  <div
                    key={it.id}
                    style={{
                      minHeight: 88,
                      borderRadius: 12,
                      border: '1.5px dashed #94a3b8',
                      background: 'linear-gradient(160deg,#fff,#f0f9ff)',
                      display: 'grid',
                      placeItems: 'center',
                      padding: 10,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>卡 {idx + 1}</div>
                    <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>{it.prompt}</div>
                  </div>
                ) : tonight.template === 'dictation' ? (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '28px 1fr',
                      gap: 8,
                      alignItems: 'end',
                      padding: '6px 0',
                      borderBottom: '1px dashed #cbd5e1',
                    }}
                  >
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{idx + 1}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{it.prompt}</div>
                      <div
                        style={{
                          marginTop: 6,
                          height: 22,
                          borderBottom: '1.5px solid #94a3b8',
                          background: 'repeating-linear-gradient(90deg, transparent, transparent 6px, rgba(148,163,184,.25) 7px)',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,.75)',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${accent} 14%, #fff)`,
                        color: accent,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{it.prompt}</div>
                  </div>
                ),
              )}
            </div>
          </ScSheet>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void startPractice()}
              style={{
                flex: '1 1 160px',
                padding: '12px 16px',
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 70%, #0ea5e9))`,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: `0 10px 22px color-mix(in srgb, ${accent} 30%, transparent)`,
              }}
            >
              <ScIcon name="flowPractice" size={18} color="#fff" />
              交给孩子开练
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setFlow('tonight'); setGenResetKey((k) => k + 1) }}>
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
        <div style={{ animation: 'scPop .3s ease' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
              padding: 12,
              borderRadius: 14,
              background: '#fff',
              border: '1px solid #e2e8f0',
            }}
          >
            <ScProgressRing pct={practicePct} brand={accent} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>开练中 · {tonight.payload?.title}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                已完成 {doneCount}/{practiceItems.length}
              </div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${practicePct}%`,
                    height: '100%',
                    borderRadius: 99,
                    background: `linear-gradient(90deg, ${accent}, #38bdf8)`,
                    transition: 'width .3s ease',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 10,
              gridTemplateColumns: tonight.template === 'word_cards' ? 'repeat(auto-fill,minmax(140px,1fr))' : '1fr',
            }}
          >
            {practiceItems.map((it, idx) => {
              const isCard = tonight.template === 'word_cards'
              const showBack = flipped[it.id]
              if (isCard) {
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setFlipped((p) => ({ ...p, [it.id]: !p[it.id] }))}
                    style={{
                      minHeight: 120,
                      borderRadius: 16,
                      border: it.done ? '2px solid #22c55e' : '1px solid #e2e8f0',
                      background: showBack
                        ? `linear-gradient(160deg, ${accent}, #0ea5e9)`
                        : 'linear-gradient(160deg,#fff,#f0f9ff)',
                      color: showBack ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      padding: 14,
                      textAlign: 'center',
                      boxShadow: it.done ? '0 8px 18px rgba(34,197,94,.2)' : '0 6px 16px rgba(15,23,42,.05)',
                      transition: 'transform .2s ease, background .25s ease',
                      transform: showBack ? 'rotateY(0deg) scale(1.02)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{showBack ? '参考答案' : `卡 ${idx + 1} · 点按翻面`}</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginTop: 10 }}>{showBack ? it.answer || '—' : it.prompt}</div>
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 6 }}>
                      <span
                        role="presentation"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleItem(it.id, 'correct', true)
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: it.correct === true ? '#22c55e' : 'rgba(0,0,0,.06)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <ScIcon name="check" size={16} color={it.correct === true ? '#fff' : '#64748b'} />
                      </span>
                      <span
                        role="presentation"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleItem(it.id, 'correct', false)
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: it.correct === false ? '#ef4444' : 'rgba(0,0,0,.06)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <ScIcon name="x" size={16} color={it.correct === false ? '#fff' : '#64748b'} />
                      </span>
                    </div>
                  </button>
                )
              }
              return (
                <div
                  key={it.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: it.done ? '2px solid #22c55e' : '1px solid #e2e8f0',
                    background: it.done ? '#f0fdf4' : '#fff',
                    transition: 'background .2s ease, border-color .2s ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <button
                      type="button"
                      onClick={() => toggleItem(it.id, 'done', !it.done)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border: it.done ? 'none' : '2px solid #cbd5e1',
                        background: it.done ? '#22c55e' : '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      aria-label={it.done ? '撤销完成' : '标记完成'}
                    >
                      {it.done ? <ScIcon name="check" size={18} color="#fff" /> : <span style={{ fontSize: 12, color: '#94a3b8' }}>{idx + 1}</span>}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{it.prompt}</div>
                      {it.answer ? (
                        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#64748b' }}>参考：{it.answer}</p>
                      ) : null}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => toggleItem(it.id, 'correct', true)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: 'none',
                            background: it.correct === true ? '#22c55e' : '#f1f5f9',
                            color: it.correct === true ? '#fff' : '#334155',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <ScIcon name="check" size={14} color={it.correct === true ? '#fff' : '#22c55e'} />
                          对了
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleItem(it.id, 'correct', false)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 10px',
                            borderRadius: 999,
                            border: 'none',
                            background: it.correct === false ? '#ef4444' : '#f1f5f9',
                            color: it.correct === false ? '#fff' : '#334155',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <ScIcon name="x" size={14} color={it.correct === false ? '#fff' : '#ef4444'} />
                          错了
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void finishPractice()}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '13px 16px',
              borderRadius: 12,
              border: 'none',
              background: accent,
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            结束并记入真库
          </button>
        </div>
      )}

      {flow === 'done' && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 18,
            padding: 20,
            border: `1px solid color-mix(in srgb, ${accent} 30%, #e2e8f0)`,
            background: `
              radial-gradient(circle at 20% 0%, color-mix(in srgb, ${accent} 20%, transparent), transparent 45%),
              radial-gradient(circle at 90% 30%, rgba(34,197,94,.15), transparent 40%),
              #fff
            `,
            animation: 'scPop .35s ease',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              margin: '0 auto 10px',
              background: accent,
              display: 'grid',
              placeItems: 'center',
              boxShadow: `0 10px 24px color-mix(in srgb, ${accent} 35%, transparent)`,
            }}
          >
            <ScIcon name="check" size={28} color="#fff" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>今晚练完了</div>
          <p style={{ margin: '8px auto 0', fontSize: 13, color: '#475569', maxWidth: 320 }}>
            {tonight?.payload?.completed_score ? `结果：${tonight.payload.completed_score}。` : ''}
            下次可从「错题巩固」继续，或换模板再练一课。
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => {
                setTonight(null)
                setPickedTemplate('wrongbook')
                setFlow('tonight')
                setGenResetKey((k) => k + 1)
              }}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: 'none',
                background: accent,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
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

      {/* 更多 */}
      {activeCourse && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(
              [
                ['none', '收起'],
                ['catalog', '目录'],
                ['calendar', '日历'],
                ['record', '记录'],
              ] as const
            ).map(([id, lab]) => (
              <button
                key={id}
                type="button"
                onClick={() => setExtra(id)}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: extra === id ? `1.5px solid ${accent}` : '1px solid #e2e8f0',
                  background: extra === id ? `color-mix(in srgb, ${accent} 12%, #fff)` : '#fff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {lab}
              </button>
            ))}
          </div>

          {extra === 'catalog' && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {(activeCourse.plan || []).map((u) => (
                <li key={u.order}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusUnitOrder(u.order)
                      setFlow('tonight')
                      setExtra('none')
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    <strong>
                      {u.order}. {u.unit_name}
                    </strong>
                    <span style={{ color: '#64748b' }}> · {UNIT_LABEL[u.status] || u.status}</span>
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
                  <div key={day} style={{ padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
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
                <li key={d.id} style={{ padding: 12, borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff' }}>
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
