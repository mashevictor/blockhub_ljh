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
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
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
import { localizeRuntimePackPreview } from '../i18n/industryPackI18n'
import { ROUTES } from '../routes/paths'
import { usePageMeta } from '../hooks/usePageMeta'
import { getMicrositeRuntimeSkin } from '../data/micrositeRuntimeSkin'
import { loadSavedMicrositeId } from '../data/industryMicrositeTemplates'
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

function scenesToSchema(
  packName: string,
  scenes: IndustryRuntimeScene[],
  packKey = 'mfg',
  workbenchTitle?: string,
): ComposerPageSchema {
  return {
    version: '1',
    appId: `preview-${packKey}`,
    title: workbenchTitle || `${packName} workbench`,
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
      category: item.category || 'Custom',
      summary: item.summary || `${item.label} workflow`,
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
  const t = useT()
  return (
    <p className="irp-summary" style={{ marginBottom: 12 }}>
      {t('home.industry.runtime.demo_note', { name: scene.name })}
    </p>
  )
}

function SoftGtgtFormPreview({ scene }: { scene: IndustryRuntimeScene }) {
  const t = useT()
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
        <p className="irp-summary">{t('home.industry.runtime.no_fields')}</p>
      </div>
    )
  }

  return (
    <div className="irp-grid-2">
      <section className="irp-panel irp-gtgt-panel">
        <DemoOnlyNote scene={scene} />
        <GtgtStepComposer
          title={mock?.form_title || t('home.industry.runtime.new_title', { name: scene.name })}
          meta="Gtgt · Soft"
          accent="#6366f1"
          variant="soft"
          flowHint={t('home.industry.runtime.flow_hint')}
          steps={steps}
          values={vals}
          onChange={(k, v) => setVals((p) => ({ ...p, [k]: v }))}
          onComplete={() => {
            setMsg(t('home.industry.runtime.submit_blocked'))
            setResetKey((k) => k + 1)
            setVals({})
          }}
          resetKey={resetKey}
          submitLabel={mock?.primary_action || t('home.industry.runtime.submit')}
        >
          {msg ? <p className="irp-summary" style={{ marginTop: 10 }}>{msg}</p> : null}
        </GtgtStepComposer>
      </section>
      <section className="irp-panel">
        <h3>{mock?.list_title || t('home.industry.runtime.list_title', { name: scene.name })}</h3>
        {list.length === 0 ? (
          <p className="irp-summary">{t('home.industry.runtime.empty_list')}</p>
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
  const t = useT()
  const mock = scene.pageMock
  const action = mock?.primary_action || t('home.industry.runtime.submit')

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
              <em>{t('home.industry.runtime.refresh_live')}</em>
            </div>
          ))}
        </div>
        {mock.list_title ? (
          <section className="irp-panel">
            <h3>{mock.list_title}</h3>
            <p className="irp-summary">{t('home.industry.runtime.empty_short')}</p>
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
          <h3>{mock.chat_title || t('home.industry.runtime.assistant', { name: scene.name })}</h3>
          <div className="irp-bubble bot">
            {t('home.industry.runtime.no_session')}
          </div>
          <div className="irp-chat-input">
            <input placeholder={t('home.industry.runtime.ask_ph', { name: scene.name })} disabled />
            <button type="button" className="irp-btn" disabled title={t('home.industry.runtime.submit_blocked')}>
              {action}
            </button>
          </div>
        </section>
        <section className="irp-panel">
          <h3>{mock.files_title || t('home.industry.runtime.related_files')}</h3>
          <p className="irp-summary">{t('home.industry.runtime.empty_files')}</p>
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
  const t = useT()
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
          {t('home.industry.runtime.login_hint')}
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
  const t = useT()
  /** 无真 API 时只空态 + 说明，禁止假业务数字/假工单 */
  const empty = (title: string) => (
    <section className="irp-panel">
      <DemoOnlyNote scene={scene} />
      <h3>{title}</h3>
      <p className="irp-summary">{t('home.industry.runtime.empty_panel')}</p>
    </section>
  )

  switch (kind) {
    case 'repair':
      return empty(t('home.industry.runtime.repair_title'))
    case 'chat_kb':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel irp-chat">
            <DemoOnlyNote scene={scene} />
            <h3>{scene.name}</h3>
            <div className="irp-bubble bot">{t('home.industry.runtime.kb_guide')}</div>
            <div className="irp-chat-input">
              <input placeholder={t('home.industry.runtime.ask_ph', { name: scene.name })} disabled />
              <button type="button" className="irp-btn" disabled>
                {t('home.industry.runtime.send')}
              </button>
            </div>
          </section>
          <section className="irp-panel">
            <h3>{t('home.industry.runtime.related_files')}</h3>
            <p className="irp-summary">{t('home.industry.runtime.empty_files')}</p>
          </section>
        </div>
      )
    case 'oee':
    case 'energy':
      return (
        <div className="irp-stack">
          <DemoOnlyNote scene={scene} />
          <div className="irp-kpi-row">
            {[
              t('home.industry.runtime.metric_a'),
              t('home.industry.runtime.metric_b'),
              t('home.industry.runtime.metric_c'),
            ].map((k) => (
              <div key={k} className="irp-kpi">
                <span>{k}</span>
                <strong>—</strong>
                <em>{t('home.industry.runtime.refresh_live')}</em>
              </div>
            ))}
          </div>
          <section className="irp-panel">
            <h3>{scene.name}</h3>
            <p className="irp-summary">{t('home.industry.runtime.empty_trend')}</p>
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
      return empty(t('home.industry.runtime.bom_title'))
    case 'integration':
      return (
        <section className="irp-panel irp-integration">
          <DemoOnlyNote scene={scene} />
          <h3>{t('home.industry.runtime.integration_title')}</h3>
          <p className="irp-summary">{t('home.industry.runtime.integration_hint')}</p>
        </section>
      )
    default:
      return <UnderstoodBody scene={scene} />
  }
}

export default function IndustryRuntimePreviewPage() {
  const t = useT()
  const { pack = 'mfg' } = useParams()
  const [search] = useSearchParams()
  const micrositeId = search.get('microsite') || loadSavedMicrositeId(pack)
  const skin = getMicrositeRuntimeSkin(micrositeId)
  const rawPreview = useMemo(() => getIndustryRuntimePreview(pack), [pack])
  const preview = useMemo(
    () => (rawPreview ? localizeRuntimePackPreview(t, rawPreview) : null),
    [rawPreview, t],
  )
  const catalog = preview?.scenes ?? []
  const [scenes, setScenes] = useState<IndustryRuntimeScene[]>(catalog)
  const [activeId, setActiveId] = useState(catalog[0]?.id ?? '')
  const [schema, setSchema] = useState<ComposerPageSchema | null>(null)
  const [homeToken, setHomeToken] = useState(() => getToken() || '')
  const [homeRole, setHomeRole] = useState('')

  usePageMeta({
    title: preview
      ? t('home.industry.runtime.meta', { name: preview.name })
      : t('home.industry.runtime.meta_fallback'),
    description: t('home.industry.runtime.meta_desc'),
  })

  useEffect(() => {
    if (!preview) return
    setScenes(preview.scenes)
    setActiveId(preview.scenes[0]?.id ?? '')
    setSchema(
      scenesToSchema(
        preview.name,
        preview.scenes,
        preview.key,
        t('home.industry.runtime.workbench', { name: preview.name }),
      ),
    )
  }, [preview, t])

  useEffect(() => {
    if (!homeToken) return
    void fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${homeToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((u: { role?: string } | null) => {
        if (u?.role) setHomeRole(u.role)
      })
      .catch(() => undefined)
  }, [homeToken])

  if (!preview) {
    return (
      <div className="irp-root irp-empty">
        <p>{t('home.industry.runtime.missing', { pack })}</p>
        <Link to="/preview/industry-runtime/mfg">{t('home.industry.runtime.missing_cta')}</Link>
      </div>
    )
  }

  const groups = groupScenesByCategory(scenes)
  const active = scenes.find((s) => s.id === activeId) ?? scenes[0]
  const keys = [...new Set(scenes.map((s) => s.capabilityHint.split(/\s*\+\s*/)[0].trim()))]
  const siteLabel =
    preview.key === 'office'
      ? t('home.industry.runtime.site_office')
      : preview.key === 'mfg'
        ? t('home.industry.runtime.site_mfg')
        : t('home.industry.runtime.site_generic')
  const hintSkin = skin
    ? t('home.industry.runtime.hint_skin', { label: skin.styleLabel })
    : ''

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
    <div
      className={`irp-root irp-industry-site${skin ? ` ${skin.shellClass}` : ''}`}
      style={{
        '--irp-accent': skin?.accent || preview.accent,
        ...(skin
          ? {
              '--rt-page-bg': skin.pageBg,
              '--rt-surface': skin.surface,
              '--rt-header-bg': skin.headerBg,
              '--rt-header-fg': skin.headerFg,
              '--rt-radius': skin.radius,
              background: skin.pageBg,
            }
          : {}),
      } as CSSProperties}
    >
      <header
        className="irp-top"
        style={
          skin
            ? { background: skin.headerBg, color: skin.headerFg, borderRadius: `0 0 ${skin.radius} ${skin.radius}` }
            : undefined
        }
      >
        <div className="irp-brand">
          <span className="irp-mark" aria-hidden />
          <div>
            <p className="irp-brand-label">{t('home.industry.runtime.brand')}</p>
            <strong className="irp-brand-name">{preview.name}</strong>
          </div>
        </div>
        <div className="irp-top-actions">
          <span className="irp-pill">
            {t('home.industry.runtime.scenes_pill', { n: scenes.length })}
            {skin ? ` · ${skin.styleLabel}` : ''}
          </span>
          <a className="irp-link" href={ROUTES.industrySiteHtml(preview.key)}>
            {siteLabel}
          </a>
          <Link className="irp-link" to={ROUTES.industryDetail(preview.key)}>
            {t('home.industry.runtime.site_plan')}
          </Link>
          <Link className="irp-link" to={ROUTES.home}>{t('home.industry.runtime.home')}</Link>
        </div>
      </header>

      <p className="irp-compose-hint">
        {t('home.industry.runtime.hint', { skin: hintSkin })}
      </p>

      <div className="irp-body">
        <aside className="irp-nav" aria-label={t('home.industry.runtime.nav_aria')}>
          <p className="irp-nav-title">{t('home.industry.runtime.nav_title')}</p>
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
            <p className="irp-summary">{t('home.industry.runtime.pick_scene')}</p>
          )}
        </main>
      </div>

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
          deliverPanel={
            <DeveloperBlueprintPanel
              variant="embedded"
              mode="preview"
              pack={preview.key}
              token={homeToken}
              role={homeRole}
              accent={preview.accent}
              onAuth={(auth) => {
                setToken(auth.token)
                try {
                  localStorage.setItem(
                    'blockhub_runtime_user',
                    JSON.stringify({
                      email: '',
                      role: auth.role,
                      display_name: auth.display_name || '',
                    }),
                  )
                } catch {
                  /* ignore */
                }
                setHomeToken(auth.token)
                setHomeRole(auth.role)
              }}
            />
          }
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
