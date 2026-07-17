import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
  type LazyExoticComponent,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import type {
  ComposerPageMock,
  ComposerPageSchema,
  CapShipComposerDockProps,
} from '@capship/composer'
import { DeveloperBlueprintPanel } from '@blockhub/web-core'
import { GtgtStepComposer } from '@blockhub/web-core/gtgt'
import { resolveFormSteps } from '@blockhub/web-core/resolveFormSteps'
import {
  LiveOfficeSceneBody,
  isLiveOfficeScene,
  resolveLiveCap,
} from '../components/LiveOfficeSceneBody'
import { getToken, setToken } from '../auth/storage'
import {
  getIndustryRuntimePreview,
  groupScenesByCategory,
  type IndustryRuntimeScene,
  type ScenePageKind,
  type ScenePageMock,
} from '../data/industryRuntimeScenes'
import { ROUTES } from '../routes/paths'
import { usePageMeta } from '../hooks/usePageMeta'
import '../styles/industry-runtime-preview.css'
import '@capship/composer/styles.css'

const CapShipComposerDock: LazyExoticComponent<ComponentType<CapShipComposerDockProps>> = lazy(() =>
  import('@capship/composer').then((m) => ({ default: m.CapShipComposerDock })),
)

const CAP_TO_KIND: Record<string, ScenePageKind> = {
  device_repair: 'repair',
  chat_qa: 'chat_kb',
  kb_document: 'chat_kb',
  mfg_oee: 'oee',
  quality_inspect: 'quality',
  material_issue: 'material',
  site_patrol: 'safety',
  shift_attendance: 'roster',
  maintenance_plan: 'maintain',
  energy_carbon: 'energy',
  training_record: 'training',
  leave_request: 'understood',
  expense_claim: 'understood',
  hire_onboard: 'understood',
  approval_flow: 'understood',
}

function asPageMock(raw: ComposerPageMock | ScenePageMock | undefined): ScenePageMock | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  return raw as ScenePageMock
}

function scenesToSchema(packName: string, scenes: IndustryRuntimeScene[], packKey = 'mfg'): ComposerPageSchema {
  return {
    version: '1',
    appId: `preview-${packKey}`,
    title: `${packName}工作台`,
    capability_keys: [...new Set(scenes.map((s) => s.capabilityHint.split(/\s*\+\s*/)[0].trim()))],
    menu: scenes.map((s) => ({
      key: s.id,
      label: s.name,
      route: `/s/${s.id}`,
      category: s.category,
      capability_key: s.capabilityHint.split(/\s*\+\s*/)[0].trim(),
      summary: s.summary,
      page_kind: s.kind === 'understood' ? 'form_list' : undefined,
      page_mock: s.pageMock,
    })),
    meta: { preview: true, industry_pack: packKey },
    root: {
      id: 'root',
      type: 'page',
      props: { layout: 'sidebar' },
      children: scenes.map((s) => ({
        id: s.id,
        type: 'section',
        props: {
          route: `/s/${s.id}`,
          capability_key: s.capabilityHint.split(/\s*\+\s*/)[0].trim(),
          scene_label: s.name,
          summary: s.summary,
          page_mock: s.pageMock,
        },
      })),
    },
  }
}

function schemaToScenes(
  schema: ComposerPageSchema,
  catalog: IndustryRuntimeScene[],
): IndustryRuntimeScene[] {
  const byId = new Map(catalog.map((s) => [s.id, s]))
  const byName = new Map(catalog.map((s) => [s.name, s]))
  const childById = new Map((schema.root?.children || []).map((c) => [c.id, c]))
  const out: IndustryRuntimeScene[] = []
  for (const item of schema.menu || []) {
    // 只按 id / 名称对齐样板；禁止按 capability 误套到无关场景（如 chat_qa → SOP）
    const hit = byId.get(item.key) || byName.get(item.label)
    const mock = asPageMock(item.page_mock)
    const child = childById.get(item.key)
    const formFieldsRaw = child?.props?.form_fields
    const formFields = Array.isArray(formFieldsRaw)
      ? formFieldsRaw
          .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
          .map((f) => ({
            key: String(f.key || ''),
            label: String(f.label || ''),
            type: f.type ? String(f.type) : undefined,
            placeholder: f.placeholder ? String(f.placeholder) : undefined,
            optional: Boolean(f.optional),
          }))
          .filter((f) => f.key && f.label)
      : undefined
    if (hit) {
      const hint = item.capability_key || hit.capabilityHint
      const live = resolveLiveCap({
        capabilityHint: hint,
        name: item.label || hit.name,
        summary: item.summary || hit.summary,
      })
      out.push({
        ...hit,
        name: item.label || hit.name,
        id: item.key || hit.id,
        capabilityHint: live || hint,
        pageMock: mock || hit.pageMock,
        formFields: formFields || hit.formFields,
        category: item.category || hit.category,
        summary: item.summary || hit.summary,
      })
      continue
    }
    const rawCap = item.capability_key || 'chat_qa'
    const live = resolveLiveCap({
      capabilityHint: rawCap,
      name: item.label,
      summary: item.summary,
    })
    const cap = live || rawCap
    const kind: ScenePageKind =
      mock || item.page_kind
        ? 'understood'
        : CAP_TO_KIND[cap] || 'understood'
    out.push({
      id: item.key,
      name: item.label,
      category: item.category || '自定义',
      summary: item.summary || `${item.label}业务办理`,
      pages: item.page_kind || 'custom',
      standard: '✓',
      kind,
      capabilityHint: cap,
      pageMock: mock,
      formFields,
    })
  }
  return out.length ? out : catalog
}

function DemoOnlyNote({ scene }: { scene: IndustryRuntimeScene }) {
  return (
    <p className="irp-summary" style={{ marginBottom: 12 }}>
      「{scene.name}」当前为布局示意，按钮不可提交。请用对话加「请假 / 报销 / 团建经费 / 报修」等正式能力，或选已挂真 API 的场景。
    </p>
  )
}

function SoftGtgtFormPreview({ scene }: { scene: IndustryRuntimeScene }) {
  const mock = scene.pageMock
  const [vals, setVals] = useState<Record<string, string>>({})
  const [resetKey, setResetKey] = useState(0)
  const [msg, setMsg] = useState('')
  const steps = useMemo(
    () =>
      resolveFormSteps({
        formFields: scene.formFields,
        pageMockFields: mock?.fields,
      }),
    [scene.formFields, mock?.fields],
  )
  const list = mock?.list || []

  if (!steps.length) {
    return (
      <div className="irp-panel">
        <DemoOnlyNote scene={scene} />
        <p className="irp-summary">暂无表单字段</p>
      </div>
    )
  }

  return (
    <div className="irp-grid-2">
      <section className="irp-panel irp-gtgt-panel">
        <DemoOnlyNote scene={scene} />
        <GtgtStepComposer
          title={mock?.form_title || `新建 · ${scene.name}`}
          meta="Gtgt · Soft"
          accent="#6366f1"
          variant="soft"
          flowHint=">> 单字段推进 · 示意布局（正式能力请选已挂真 API 的场景）"
          steps={steps}
          values={vals}
          onChange={(k, v) => setVals((p) => ({ ...p, [k]: v }))}
          onComplete={() => {
            setMsg('示意页不可提交 — 请选请假/报销/报修/质检/安环等真 API 场景')
            setResetKey((k) => k + 1)
            setVals({})
          }}
          resetKey={resetKey}
          submitLabel={mock?.primary_action || '提交'}
        >
          {msg ? <p className="irp-summary" style={{ marginTop: 10 }}>{msg}</p> : null}
        </GtgtStepComposer>
      </section>
      <section className="irp-panel">
        <h3>{mock?.list_title || `${scene.name}记录`}</h3>
        {list.length === 0 ? (
          <p className="irp-summary">空库无数据 — 接入真 API 后提交会出现在这里</p>
        ) : (
          list.map((row) => (
            <div key={row.id} className="irp-row">
              <strong>{row.id}</strong>
              <span>{row.title}</span>
              <em>{row.status}</em>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

function UnderstoodBody({ scene }: { scene: IndustryRuntimeScene }) {
  const mock = scene.pageMock
  const action = mock?.primary_action || '提交'

  if (mock?.kpis?.length) {
    return (
      <div className="irp-stack">
        <DemoOnlyNote scene={scene} />
        <div className="irp-kpi-row">
          {mock.kpis.map((k) => (
            <div key={k.label} className="irp-kpi">
              <span>{k.label}</span>
              {/* 禁止 pageMock 假数字；登录后走 Live 真统计 */}
              <strong>—</strong>
              <em>接真数据后刷新</em>
            </div>
          ))}
        </div>
        {mock.list_title ? (
          <section className="irp-panel">
            <h3>{mock.list_title}</h3>
            <p className="irp-summary">空库无数据</p>
          </section>
        ) : null}
      </div>
    )
  }

  if (mock?.chat?.length) {
    return (
      <div className="irp-grid-2">
        <section className="irp-panel irp-chat">
          <DemoOnlyNote scene={scene} />
          <h3>{mock.chat_title || `${scene.name}助手`}</h3>
          <div className="irp-bubble bot">
            空库无会话 — 登录后可查看知识库/问答真状态；正式对话在 /r/应用中进行。
          </div>
          <div className="irp-chat-input">
            <input placeholder={`向「${scene.name}」提问…`} disabled />
            <button type="button" className="irp-btn" disabled title="示意页不可提交">
              {action}
            </button>
          </div>
        </section>
        <section className="irp-panel">
          <h3>{mock.files_title || '相关资料'}</h3>
          <p className="irp-summary">空库无文件</p>
        </section>
      </div>
    )
  }

  return <SoftGtgtFormPreview scene={scene} />
}

function SceneWorkspace({
  scene,
  token,
}: {
  scene: IndustryRuntimeScene
  token: string
}) {
  const liveCap = resolveLiveCap(scene)
  const liveScene: IndustryRuntimeScene = liveCap
    ? { ...scene, capabilityHint: liveCap }
    : scene
  return (
    <div className="irp-workspace" data-kind={scene.kind}>
      <header className="irp-workspace-head">
        <p className="irp-kicker">{scene.category}</p>
        <h1 className="irp-scene-title">{scene.name}</h1>
        <p className="irp-summary">{scene.summary}</p>
      </header>
      {token && liveCap ? (
        <LiveOfficeSceneBody scene={liveScene} token={token} />
      ) : (
        <SceneBody kind={scene.kind} scene={scene} />
      )}
      {!token && isLiveOfficeScene(scene) ? (
        <p className="irp-summary" style={{ marginTop: 12 }}>
          登录后可真提交并推进流程（右侧开发者面板登录，或等待自动 demo 登录）。
        </p>
      ) : null}
    </div>
  )
}

function SceneBody({ kind, scene }: { kind: ScenePageKind; scene: IndustryRuntimeScene }) {
  if (kind === 'understood' || scene.pageMock) {
    return <UnderstoodBody scene={scene} />
  }
  return (
    <div className="irp-demo-static">
      <DemoOnlyNote scene={scene} />
      <SceneBodyStatic kind={kind} scene={scene} />
    </div>
  )
}

function SceneBodyStatic({ kind, scene }: { kind: ScenePageKind; scene: IndustryRuntimeScene }) {
  /** 无真 API 时只空态 + 说明，禁止假业务数字/假工单 */
  const empty = (title: string) => (
    <section className="irp-panel">
      <DemoOnlyNote scene={scene} />
      <h3>{title}</h3>
      <p className="irp-summary">空库无数据 — 接入真 API 或选已挂真提交的场景后，记录会出现在这里</p>
    </section>
  )

  switch (kind) {
    case 'repair':
      return empty('设备报修')
    case 'chat_kb':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel irp-chat">
            <DemoOnlyNote scene={scene} />
            <h3>{scene.name}</h3>
            <div className="irp-bubble bot">空库无文档时仅作引导；正式 Runtime 请使用知识库 / 问答能力。</div>
            <div className="irp-chat-input">
              <input placeholder={`向「${scene.name}」提问…`} disabled />
              <button type="button" className="irp-btn" disabled>发送</button>
            </div>
          </section>
          <section className="irp-panel">
            <h3>相关资料</h3>
            <p className="irp-summary">空库无文件</p>
          </section>
        </div>
      )
    case 'oee':
    case 'energy':
      return (
        <div className="irp-stack">
          <DemoOnlyNote scene={scene} />
          <div className="irp-kpi-row">
            {['指标 A', '指标 B', '指标 C'].map((k) => (
              <div key={k} className="irp-kpi">
                <span>{k}</span>
                <strong>—</strong>
                <em>接真数据后刷新</em>
              </div>
            ))}
          </div>
          <section className="irp-panel">
            <h3>{scene.name}</h3>
            <p className="irp-summary">空库无趋势数据</p>
          </section>
        </div>
      )
    case 'quality':
    case 'material':
    case 'safety':
    case 'roster':
    case 'maintain':
    case 'training':
      return empty(scene.name)
    case 'bom':
      return empty('图纸 / BOM')
    case 'integration':
      return (
        <section className="irp-panel irp-integration">
          <DemoOnlyNote scene={scene} />
          <h3>系统对接</h3>
          <p className="irp-summary">对接配置在正式 Runtime 中完成；本预览不展示假连通状态。</p>
        </section>
      )
    default:
      return <UnderstoodBody scene={scene} />
  }
}

export default function IndustryRuntimePreviewPage() {
  const { pack = 'mfg' } = useParams()
  const preview = useMemo(() => getIndustryRuntimePreview(pack), [pack])
  const catalog = preview?.scenes ?? []
  const [scenes, setScenes] = useState<IndustryRuntimeScene[]>(catalog)
  const [activeId, setActiveId] = useState(catalog[0]?.id ?? '')
  const [schema, setSchema] = useState<ComposerPageSchema | null>(null)
  const [homeToken, setHomeToken] = useState(() => getToken() || '')
  const [homeRole, setHomeRole] = useState('')

  usePageMeta({
    title: preview ? `${preview.name} · Runtime 场景预览` : 'Runtime 场景预览',
    description: '行业场景清单一一对应的 Runtime 工作台预览（本地演示）',
  })

  useEffect(() => {
    if (!preview) return
    setScenes(preview.scenes)
    setActiveId(preview.scenes[0]?.id ?? '')
    setSchema(scenesToSchema(preview.name, preview.scenes, preview.key))
  }, [preview])

  useEffect(() => {
    if (!homeToken) return
    void fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${homeToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { role?: string } | null) => {
        if (u?.role) setHomeRole(u.role)
      })
      .catch(() => undefined)
  }, [homeToken])

  // 预览页无 token 时自动 demo 登录，便于真提交验收
  useEffect(() => {
    if (homeToken || !preview) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@trackchat.local', password: 'admin123' }),
        })
        if (!res.ok) return
        const data = (await res.json()) as { access_token?: string; user?: { role?: string } }
        if (cancelled || !data.access_token) return
        setToken(data.access_token)
        setHomeToken(data.access_token)
        if (data.user?.role) setHomeRole(data.user.role)
      } catch {
        /* 后端未起时忽略 */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [homeToken, preview])

  if (!preview) {
    return (
      <div className="irp-root irp-empty">
        <p>暂无「{pack}」预览包，当前可打开制造样板。</p>
        <Link to="/preview/industry-runtime/mfg">查看传统制造 12 场景</Link>
      </div>
    )
  }

  const groups = groupScenesByCategory(scenes)
  const active = scenes.find((s) => s.id === activeId) ?? scenes[0]
  const keys = [...new Set(scenes.map((s) => s.capabilityHint.split(/\s*\+\s*/)[0].trim()))]

  const applySchema = (next: ComposerPageSchema) => {
    setSchema(next)
    const synced = schemaToScenes(next, catalog)
    setScenes(synced)
    const prevIds = new Set(scenes.map((s) => s.id))
    const added = synced.find((s) => !prevIds.has(s.id))
    if (added) {
      setActiveId(added.id)
    } else if (!synced.some((s) => s.id === activeId)) {
      setActiveId(synced[0]?.id ?? '')
    }
  }

  return (
    <div className="irp-root" style={{ '--irp-accent': preview.accent } as CSSProperties}>
      <header className="irp-top">
        <div className="irp-brand">
          <span className="irp-mark" aria-hidden />
          <div>
            <p className="irp-brand-label">行业 Runtime 工作台预览（非独立站）</p>
            <strong className="irp-brand-name">{preview.name}</strong>
          </div>
        </div>
        <div className="irp-top-actions">
          <span className="irp-pill">{scenes.length} 场景 · DeepSeek 可加新页</span>
          <a className="irp-link" href={ROUTES.industrySiteHtml(preview.key)}>
            {preview.key === 'office' ? '办公独立站' : preview.key === 'mfg' ? '制造独立站' : '行业独立站'}
          </a>
          <Link className="irp-link" to={ROUTES.industryDetail(preview.key)}>方案站</Link>
          <Link className="irp-link" to={ROUTES.home}>首页</Link>
        </div>
      </header>

      <p className="irp-compose-hint">
        {preview.key === 'office'
          ? '办公预览：表单类可真提交；ops_kpi / 知识库 / 通知 / 对接 / 问数 / 看板为真 API 只读或可问；其余示意。登录态会尝试 demo 账号。'
          : '制造预览：报修 / 质检 / 安环 / OEE·领料·保养·排班·能耗·培训可真提交；SOP/BOM/MES 等为示意。用右下角编排助手可加新页。'}
      </p>

      <div className="irp-body">
        <aside className="irp-nav" aria-label="场景清单">
          <p className="irp-nav-title">场景</p>
          {groups.map((g) => (
            <div key={g.category} className="irp-nav-group">
              <h4>{g.category}</h4>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={s.id === active?.id ? 'active' : undefined}
                  onClick={() => setActiveId(s.id)}
                >
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>
        <main className="irp-main">
          {active ? (
            <SceneWorkspace scene={active} token={homeToken} />
          ) : (
            <p className="irp-summary">请从左侧选择场景</p>
          )}
        </main>
      </div>

      <DeveloperBlueprintPanel
        mode="preview"
        pack={preview.key}
        token={homeToken}
        role={homeRole}
        accent={preview.accent}
        onAuth={(auth) => {
          setToken(auth.token)
          setHomeToken(auth.token)
          setHomeRole(auth.role)
        }}
      />

      <Suspense fallback={null}>
        <CapShipComposerDock
          storageKey="capship-irp-dock-v3"
          defaultOpen
          defaultMode={"live_edit" as const}
          appId={`preview-${preview.key}`}
          capability_keys={keys}
          page_schema={schema}
          industry_pack={preview.key}
          token={homeToken || undefined}
          onSchemaPatch={applySchema}
          onModulesChange={((nextKeys) => {
            const kept = catalog.filter((s) =>
              nextKeys.includes(s.capabilityHint.split(/\s*\+\s*/)[0].trim()),
            )
            const next = kept.length ? kept : catalog
            setScenes(next)
            setSchema(scenesToSchema(preview.name, next, preview.key))
            if (!next.some((s) => s.id === activeId)) setActiveId(next[0]?.id ?? '')
          }) satisfies NonNullable<CapShipComposerDockProps['onModulesChange']>}
          onSaved={((result) => {
            if (result.page_schema) applySchema(result.page_schema)
          }) satisfies NonNullable<CapShipComposerDockProps['onSaved']>}
        />
      </Suspense>
    </div>
  )
}
