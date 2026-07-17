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
  /** 跟进表单：先选 kind，勿预填 unit/notes（避免跳步、把大纲提示误当结果） */
  const [drillValues, setDrillValues] = useState<Record<string, string>>({})
  const [activeCourseId, setActiveCourseId] = useState('')
  const [msg, setMsg] = useState('')
  const [phase, setPhase] = useState<'ask' | 'confirm'>('ask')
  const [lastQuery, setLastQuery] = useState('')
  const [candidates, setCandidates] = useState<CatalogInfo[]>([])
  const [showAsk, setShowAsk] = useState(entrySource !== 'im')

  const accent = primaryColor || '#6366f1'
  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0]
  const drillKind = drillValues.kind || ''

  const askSteps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '课本怎么叫？',
        placeholder: '例：沪教版英语二年级下 / 人教语文三上 / 牛津英语 6A',
        hint: '随便说书名、出版社、年级、上下册都行。我们会帮你对齐正式册次，再生成 Module / Unit 大纲。',
      },
    ],
    [],
  )

  const selectedUnit = useMemo(() => {
    const name = (drillValues.unit_name || '').trim()
    return (activeCourse?.plan || []).find((u) => u.unit_name === name)
  }, [activeCourse?.plan, drillValues.unit_name])

  const drillSteps: GtgtStep[] = useMemo(() => {
    const unitChoices = (activeCourse?.plan || []).map((u) => u.unit_name)
    const kind = drillKind
    const unitHintBlock = selectedUnit
      ? [
          selectedUnit.focus ? `本单元重点：${selectedUnit.focus}` : '',
          selectedUnit.dictation_hint ? `大纲家默范围（仅供参考，勿当结果）：${selectedUnit.dictation_hint}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : ''

    const kindStep: GtgtStep = {
      key: 'kind',
      label: '① 先选任务类型',
      hint: '必须先选类型，再逐步填写。家默=听写默写 · 复习=巩固薄弱 · 考试=测验成绩。',
      render: ({ value, setValue, accent: a }) => (
        <div style={{ display: 'grid', gap: 10 }}>
          {(
            [
              ['dictation', '家默 / 听写', '默写范围 → 对了几个 → 错词清单（家长可代记）'],
              ['review', '复习巩固', '复习了哪一块 → 还卡在哪 → 下次怎么盯'],
              ['exam', '考试成绩', '哪次测验 → 得分/等第 → 错题与丢分点'],
            ] as const
          ).map(([k, lab, desc]) => {
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
      placeholder: unitChoices[0] || '第一单元 / Module 1',
      hint: unitChoices.length
        ? '点选大纲单元。下一步会按任务类型逐项填写；大纲里的「家默提示」只作参考，不会自动当成结果。'
        : '还没有大纲单元时，可手填如「Unit 2 · My family」。',
      render: unitChoices.length
        ? ({ value, setValue, accent: a }) => (
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {unitChoices.map((name) => {
                const u = (activeCourse?.plan || []).find((x) => x.unit_name === name)
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
                    title={[u?.focus, u?.dictation_hint].filter(Boolean).join(' | ')}
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
          placeholder: '例：Unit1 单词 listen/hear/dog… + 句子 Listen! I can hear a dog.',
          hint: unitHintBlock || '写清：听写了哪些词/句。可对照大纲家默范围，但请用自己的话记下「这一次」实际默的内容。',
          inputType: 'textarea',
        },
        {
          key: 'dictation_score',
          label: '④ 对了几个 / 一共几个',
          placeholder: '例：对 17 / 共 20；或 85 分',
          hint: '数字即可，方便以后对比进步。',
        },
        {
          key: 'dictation_wrong',
          label: '⑤ 错词 / 错句（可空）',
          placeholder: '例：friend→freind；because 漏写 e',
          hint: '按「正确→错误」列更好复习；全对可跳过。',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑥ 补充说明（可空）',
          placeholder: '例：家长代记；今晚再默一遍错词',
          hint: '谁代记、下次计划等。',
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
          placeholder: '例：Unit3 过去式不规则动词 + 课文跟读两遍',
          hint: unitHintBlock || '写具体块：词汇 / 语法 / 课文 / 练习页码。',
          inputType: 'textarea',
        },
        {
          key: 'review_weak',
          label: '④ 还卡在哪（可空）',
          placeholder: '例：went/gone 仍混；朗读断句不稳',
          hint: '写出薄弱点，下次跟进可对着盯。',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑤ 下次怎么盯（可空）',
          placeholder: '例：明天只默不规则动词表',
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
          placeholder: '例：Unit4 单元测 / 期中口试 / 校内周测',
          hint: unitHintBlock || '写清测验名称与范围，避免和上次混在一起。',
        },
        {
          key: 'exam_score',
          label: '④ 得分或等第',
          placeholder: '例：92 分 / A / 口试 B+',
          hint: '分数、等级、及格与否都可以。',
        },
        {
          key: 'exam_wrong',
          label: '⑤ 错题与丢分点（可空）',
          placeholder: '例：阅读理解丢 2 题；拼写 friend；听力最后一题',
          hint: '记下题型或知识点，方便订正。',
          optional: true,
          inputType: 'textarea',
        },
        {
          key: 'notes',
          label: '⑥ 补充说明（可空）',
          placeholder: '例：需订正后家长签字',
          optional: true,
          inputType: 'textarea',
        },
      ]
    }

    // 尚未选类型：只展示第一步，迫使先选
    return [kindStep]
  }, [activeCourse?.plan, drillKind, selectedUnit])

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
    const kind = drillValues.kind || ''
    if (!['review', 'dictation', 'exam'].includes(kind)) {
      setMsg('请先选择任务类型：家默 / 复习 / 考试')
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
      setMsg(`${KIND_LABEL[kind] || '跟进'}已记录 · ${unit}`)
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

  const courseDrills = drills.filter((d) => d.course_id === (activeCourse?.id || ''))

  return (
    <div>
      {phase === 'ask' && (showAsk || courses.length === 0) && (
        <GtgtStepComposer
          title={entrySource === 'im' ? '课本学习协作' : '课本学习'}
          meta={entrySource === 'im' ? '群消息入口 · Soft 步进' : '学生入口 · Soft 步进'}
          accent={accent}
          variant="soft"
          flowHint="说书名 → 确认册次 → 生成大纲 → 再记家默 / 复习 / 考试"
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
            根据你说的「{lastQuery}」找到这些册次。点选正确的一本后，会生成 Module / Unit 学习大纲，
            之后就能按单元记家默、复习和考试。
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
        <p className="muted">
          先说课本名（出版社 + 科目 + 年级 + 上下册更准）。确认册次后会生成真实学习大纲，再用来记家默、复习与考试。
        </p>
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
            title="记一次学习跟进"
            meta={
              drillKind
                ? `${activeCourse.textbook_name} · ${KIND_LABEL[drillKind] || drillKind}`
                : `${activeCourse.textbook_name} · 请先选任务类型`
            }
            accent={accent}
            variant="soft"
            flowHint={
              drillKind === 'dictation'
                ? '①类型 → ②单元 → ③默写范围 → ④对错数量 → ⑤错词 → ⑥备注 → 写入真库'
                : drillKind === 'review'
                  ? '①类型 → ②单元 → ③复习内容 → ④薄弱点 → ⑤下次计划 → 写入真库'
                  : drillKind === 'exam'
                    ? '①类型 → ②单元 → ③测验名 → ④得分 → ⑤错题 → ⑥备注 → 写入真库'
                    : '①先选任务类型（家默 / 复习 / 考试），再按步骤填写'
            }
            steps={drillSteps}
            values={drillValues}
            onChange={onDrillChange}
            onComplete={submitDrill}
            busy={busy}
            resetKey={drillResetKey}
            submitLabel={
              drillKind === 'dictation'
                ? '提交家默记录'
                : drillKind === 'review'
                  ? '提交复习记录'
                  : drillKind === 'exam'
                    ? '提交考试记录'
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
                    {KIND_LABEL[d.kind] || d.kind} · {d.unit_name}
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
    </div>
  )
}
