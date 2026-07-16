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

function scenesToSchema(packName: string, scenes: IndustryRuntimeScene[]): ComposerPageSchema {
  return {
    version: '1',
    appId: 'preview-mfg',
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
    meta: { preview: true },
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
  const out: IndustryRuntimeScene[] = []
  for (const item of schema.menu || []) {
    // 只按 id / 名称对齐样板；禁止按 capability 误套到无关场景（如 chat_qa → SOP）
    const hit = byId.get(item.key) || byName.get(item.label)
    const mock = asPageMock(item.page_mock)
    if (hit && !mock) {
      out.push({ ...hit, name: item.label || hit.name, id: item.key || hit.id })
      continue
    }
    const cap = item.capability_key || 'chat_qa'
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
    })
  }
  return out.length ? out : catalog
}

function UnderstoodBody({ scene }: { scene: IndustryRuntimeScene }) {
  const mock = scene.pageMock
  const action = mock?.primary_action || '提交'

  if (mock?.kpis?.length) {
    return (
      <div className="irp-stack">
        <div className="irp-kpi-row">
          {mock.kpis.map((k) => (
            <div key={k.label} className="irp-kpi">
              <span>{k.label}</span>
              <strong>{k.value}</strong>
              <em>{k.hint || '—'}</em>
            </div>
          ))}
        </div>
        {mock.list_title ? (
          <section className="irp-panel">
            <h3>{mock.list_title}</h3>
            {(mock.list || []).map((row) => (
              <div key={row.id} className="irp-row">
                <strong>{row.id}</strong>
                <span>{row.title}</span>
                <em>{row.status}</em>
              </div>
            ))}
          </section>
        ) : null}
      </div>
    )
  }

  if (mock?.chat?.length) {
    return (
      <div className="irp-grid-2">
        <section className="irp-panel irp-chat">
          <h3>{mock.chat_title || `${scene.name}助手`}</h3>
          {mock.chat.map((m, i) => (
            <div key={`${m.role}-${i}`} className={`irp-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
              {m.text}
            </div>
          ))}
          <div className="irp-chat-input">
            <input placeholder={`向「${scene.name}」提问…`} />
            <button type="button" className="irp-btn">{action}</button>
          </div>
        </section>
        <section className="irp-panel">
          <h3>{mock.files_title || '相关资料'}</h3>
          {(mock.files || [`${scene.name}说明.pdf`]).map((f) => (
            <div key={f} className="irp-file">{f}</div>
          ))}
        </section>
      </div>
    )
  }

  const fields = mock?.fields?.length
    ? mock.fields
    : [
        { label: '标题', value: scene.name },
        { label: '说明', value: scene.summary },
      ]
  const list = mock?.list?.length
    ? mock.list
    : [
        { id: '01', title: `${scene.name}示例`, status: '处理中' },
      ]

  return (
    <div className="irp-grid-2">
      <section className="irp-panel">
        <h3>{mock?.form_title || `新建${scene.name}`}</h3>
        {fields.map((f) => (
          <label key={f.label}>
            {f.label}
            {f.label.includes('说明') || f.label.includes('事由') || f.label.includes('现象') ? (
              <textarea defaultValue={f.value || ''} rows={3} />
            ) : (
              <input defaultValue={f.value || ''} />
            )}
          </label>
        ))}
        <button type="button" className="irp-btn">{action}</button>
      </section>
      <section className="irp-panel">
        <h3>{mock?.list_title || `${scene.name}记录`}</h3>
        {list.map((row) => (
          <div key={row.id} className="irp-row">
            <strong>{row.id}</strong>
            <span>{row.title}</span>
            <em>{row.status}</em>
          </div>
        ))}
      </section>
    </div>
  )
}

function SceneWorkspace({ scene }: { scene: IndustryRuntimeScene }) {
  return (
    <div className="irp-workspace" data-kind={scene.kind}>
      <header className="irp-workspace-head">
        <p className="irp-kicker">{scene.category}</p>
        <h1 className="irp-scene-title">{scene.name}</h1>
        <p className="irp-summary">{scene.summary}</p>
      </header>
      <SceneBody kind={scene.kind} scene={scene} />
    </div>
  )
}

function SceneBody({ kind, scene }: { kind: ScenePageKind; scene: IndustryRuntimeScene }) {
  if (kind === 'understood' || scene.pageMock) {
    return <UnderstoodBody scene={scene} />
  }
  switch (kind) {
    case 'repair':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel">
            <h3>新建报修单</h3>
            <label>产线 / 工位<input defaultValue="A3 冲压线 · 工位 07" /></label>
            <label>故障现象<textarea defaultValue="液压站异响，压力波动，需尽快派工。" rows={3} /></label>
            <label>紧急程度
              <select defaultValue="高">
                <option>高</option><option>中</option><option>低</option>
              </select>
            </label>
            <button type="button" className="irp-btn">提交并派工</button>
          </section>
          <section className="irp-panel">
            <h3>在办工单</h3>
            {[
              ['WO-24016', '注塑机 #2 温控异常', '维修中'],
              ['WO-24015', '传送带偏移', '待接单'],
              ['WO-24012', '空压机漏油', '待验收'],
            ].map(([id, title, st]) => (
              <div key={id} className="irp-row">
                <strong>{id}</strong>
                <span>{title}</span>
                <em>{st}</em>
              </div>
            ))}
          </section>
        </div>
      )
    case 'chat_kb':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel irp-chat">
            <h3>工艺问答</h3>
            <div className="irp-bubble bot">已命中 SOP-冲压-08：换模步骤 1–6，注意油温 ≥40℃。</div>
            <div className="irp-bubble user">换模时压力参数怎么设？</div>
            <div className="irp-bubble bot">推荐合模压力 12.5 MPa，保压 3s。相关图纸已附在右侧知识库。</div>
            <div className="irp-chat-input">
              <input placeholder={`向「${scene.name}」提问…`} />
              <button type="button" className="irp-btn">发送</button>
            </div>
          </section>
          <section className="irp-panel">
            <h3>作业指导书</h3>
            {['SOP-冲压换模-08.pdf', '工艺卡-A3线.pdf', '安全操作要点.docx'].map((f) => (
              <div key={f} className="irp-file">{f}</div>
            ))}
          </section>
        </div>
      )
    case 'oee':
      return (
        <div className="irp-stack">
          <div className="irp-kpi-row">
            {[
              ['OEE', '78.4%', '+2.1%'],
              ['产量', '12,480', '件/班'],
              ['停机', '46 min', '计划外'],
              ['良品率', '98.2%', '—'],
            ].map(([k, v, s]) => (
              <div key={k} className="irp-kpi">
                <span>{k}</span>
                <strong>{v}</strong>
                <em>{s}</em>
              </div>
            ))}
          </div>
          <section className="irp-panel">
            <h3>本班稼动趋势</h3>
            <div className="irp-bars" aria-hidden>
              {[42, 68, 55, 80, 74, 90, 66, 78, 84, 71, 76, 82].map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </section>
        </div>
      )
    case 'quality':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel">
            <h3>待质检批次</h3>
            {[
              ['IQC-091', '轴承座来料', '待检'],
              ['FQC-224', '成品抽检 A3', '复检中'],
              ['OQC-088', '出货抽检', '待审批'],
            ].map(([id, t, st]) => (
              <div key={id} className="irp-row">
                <strong>{id}</strong><span>{t}</span><em>{st}</em>
              </div>
            ))}
          </section>
          <section className="irp-panel">
            <h3>检验项 · SOP</h3>
            {['外观无磕碰', '尺寸公差 ±0.05', '硬度 HRC 58–62', '标识完整'].map((x) => (
              <label key={x} className="irp-check"><input type="checkbox" defaultChecked={x !== '标识完整'} />{x}</label>
            ))}
            <div className="irp-actions">
              <button type="button" className="irp-btn">通过</button>
              <button type="button" className="irp-btn ghost">驳回</button>
            </div>
          </section>
        </div>
      )
    case 'material':
      return (
        <section className="irp-panel">
          <h3>生产领退料</h3>
          <div className="irp-table">
            <div className="irp-tr head"><span>物料</span><span>需求</span><span>库存</span><span>状态</span></div>
            {[
              ['轴承 6205', '40', '128', '可领'],
              ['液压油 ISO46', '2 桶', '1 桶', '待补货'],
              ['密封圈 Φ32', '20', '56', '可领'],
            ].map((row) => (
              <div key={row[0]} className="irp-tr">{row.map((c) => <span key={c}>{c}</span>)}</div>
            ))}
          </div>
          <button type="button" className="irp-btn">提交领料审批</button>
        </section>
      )
    case 'safety':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel">
            <h3>隐患上报</h3>
            <div className="irp-photo">现场拍照占位 · 可标注区域</div>
            <label>隐患描述<textarea rows={3} defaultValue="通道堆放纸箱，遮挡消防栓。" /></label>
            <button type="button" className="irp-btn">上报并流转审批</button>
          </section>
          <section className="irp-panel">
            <h3>本周隐患</h3>
            {['消防通道占用', '防护罩缺失', '油污地面'].map((t, i) => (
              <div key={t} className="irp-row"><strong>H-{120 + i}</strong><span>{t}</span><em>处理中</em></div>
            ))}
          </section>
        </div>
      )
    case 'roster':
      return (
        <section className="irp-panel">
          <h3>本周排班</h3>
          <div className="irp-roster">
            {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
              <div key={d} className="irp-roster-cell">
                <span>周{d}</span>
                <strong>{i === 5 || i === 6 ? '休' : i % 2 ? '夜班' : '白班'}</strong>
              </div>
            ))}
          </div>
          <button type="button" className="irp-btn ghost">班次申诉</button>
        </section>
      )
    case 'maintain':
      return (
        <section className="irp-panel">
          <h3>保养到期提醒</h3>
          {[
            ['注塑机 #2', '明日到期', '高'],
            ['空压机站', '3 天后', '中'],
            ['行车 01', '已超期 1 天', '高'],
          ].map(([name, when, lv]) => (
            <div key={name} className="irp-notify">
              <strong>{name}</strong>
              <span>{when}</span>
              <em data-lv={lv}>{lv}</em>
            </div>
          ))}
        </section>
      )
    case 'bom':
      return (
        <div className="irp-grid-2">
          <section className="irp-panel">
            <h3>图纸 / BOM 检索</h3>
            <input className="irp-search" placeholder="零件号 / 图号 / 工艺名…" defaultValue="A3-支架-BOM" />
            {['A3-支架-装配图.dwg', 'BOM-REV.C.xlsx', '公差说明.pdf'].map((f) => (
              <div key={f} className="irp-file">{f}</div>
            ))}
          </section>
          <section className="irp-panel">
            <h3>语义问答</h3>
            <div className="irp-bubble bot">BOM REV.C 中密封件已由 NBR 切换为 FKM，注意库存替代关系。</div>
          </section>
        </div>
      )
    case 'integration':
      return (
        <section className="irp-panel irp-integration">
          <h3>MES / ERP 对接</h3>
          <p>连接制造执行与企业资源系统，同步工单、物料与报工回写。</p>
          <div className="irp-int-grid">
            {[
              ['MES 工单同步', '待配置'],
              ['ERP 物料主数据', '沙箱连通'],
              ['报工回写', '未开通'],
            ].map(([n, st]) => (
              <div key={n}><strong>{n}</strong><em>{st}</em></div>
            ))}
          </div>
        </section>
      )
    case 'energy':
      return (
        <div className="irp-stack">
          <div className="irp-kpi-row">
            {[
              ['电耗', '18.2 MWh', '本周'],
              ['碳排', '9.4 tCO₂e', '估算'],
              ['峰谷比', '1.32', '—'],
            ].map(([k, v, s]) => (
              <div key={k} className="irp-kpi green">
                <span>{k}</span><strong>{v}</strong><em>{s}</em>
              </div>
            ))}
          </div>
          <section className="irp-panel">
            <h3>能耗曲线</h3>
            <div className="irp-bars green" aria-hidden>
              {[30, 45, 52, 40, 68, 72, 55, 60, 48, 70, 65, 58].map((h, i) => (
                <i key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </section>
        </div>
      )
    case 'training':
      return (
        <section className="irp-panel">
          <h3>上岗证 / 培训档案</h3>
          {[
            ['李强', '冲压上岗证', '有效至 2027-03'],
            ['王敏', '叉车证', '有效至 2026-11'],
            ['赵磊', '安规复训', '待考试'],
          ].map(([name, cert, exp]) => (
            <div key={name} className="irp-row">
              <strong>{name}</strong><span>{cert}</span><em>{exp}</em>
            </div>
          ))}
          <div className="irp-file">培训课件库 · 12 份文档</div>
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
    setSchema(scenesToSchema(preview.name, preview.scenes))
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
          <span className="irp-pill">{scenes.length} 场景 · 契约仅本预览包</span>
          <a className="irp-link" href={ROUTES.industrySiteHtml(preview.key)}>
            {preview.key === 'office' ? '办公独立站' : preview.key === 'mfg' ? '制造独立站' : '行业独立站'}
          </a>
          <Link className="irp-link" to={ROUTES.industryDetail(preview.key)}>方案站</Link>
          <Link className="irp-link" to={ROUTES.home}>首页</Link>
        </div>
      </header>

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
          {active ? <SceneWorkspace scene={active} /> : <p className="irp-summary">请从左侧选择场景</p>}
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
            setSchema(scenesToSchema(preview.name, next))
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
