/** 行业 Runtime 场景页预览数据（与行业方案站清单一一对应） */

import { GAME_SCENE_SEEDS } from './gameScenes'
import { MED_SCENE_SEEDS } from './medScenes'
import { OFFICE_SCENE_SEEDS } from './officeScenes66'
import { SALES_SCENE_SEEDS } from './salesScenes66'
import {
  BANK_SCENE_SEEDS,
  FINTECH_SCENE_SEEDS,
  FUND_SCENE_SEEDS,
  INSURANCE_SCENE_SEEDS,
  SECURITIES_SCENE_SEEDS,
} from './financeScenes'

export type ScenePageKind =
  | 'repair'
  | 'chat_kb'
  | 'oee'
  | 'quality'
  | 'material'
  | 'safety'
  | 'roster'
  | 'maintain'
  | 'bom'
  | 'integration'
  | 'energy'
  | 'training'
  | 'understood'

export interface ScenePageMock {
  form_title?: string
  fields?: Array<{
    key?: string
    label: string
    value?: string
    type?: string
    placeholder?: string
    optional?: boolean
  }>
  list_title?: string
  list?: Array<{ id: string; title: string; status: string }>
  chat_title?: string
  chat?: Array<{ role: string; text: string }>
  files_title?: string
  files?: string[]
  kpis?: Array<{ label: string; value: string; hint?: string }>
  primary_action?: string
}

export interface IndustryRuntimeScene {
  id: string
  name: string
  category: string
  summary: string
  pages: string
  standard: '✓' | '部分' | '定制'
  kind: ScenePageKind
  capabilityHint: string
  /** 大模型理解后的页面样例（用户新增场景） */
  pageMock?: ScenePageMock
  /** 对话改页写入的表单字段（含 type） */
  formFields?: Array<{ key: string; label: string; type?: string; placeholder?: string; optional?: boolean }>
}

export interface IndustryRuntimePackPreview {
  key: string
  name: string
  tagline: string
  accent: string
  scenes: IndustryRuntimeScene[]
}

export const MFG_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'mfg',
  name: '传统制造',
  tagline: '报修、双专属知识库、质检、MES · 真库闭环',
  accent: '#2563eb',
  scenes: [
    {
      id: 's1',
      name: '设备报修',
      category: '设备管理',
      summary: '产线故障报修派工',
      pages: 'form+list',
      standard: '✓',
      kind: 'repair',
      capabilityHint: 'device_repair',
      pageMock: {
        form_title: '设备报修',
        fields: [
          { key: 'asset_code', label: '设备 / 产线', placeholder: 'A3 冲压线 · 工位 07' },
          { key: 'location', label: '位置', placeholder: '车间 / 工位', optional: true },
          { key: 'fault', label: '故障现象', type: 'textarea', placeholder: '异响、停机、压力波动…' },
        ],
        list_title: '在办工单',
        list: [],
        primary_action: '提交并派工',
      },
    },
    {
      id: 's2',
      name: 'SOP/工艺问答',
      category: '知识管理',
      summary: '作业指导书 RAG 检索（挂制造·工艺SOP知识库）',
      pages: 'chat+kb',
      standard: '✓',
      kind: 'chat_kb',
      capabilityHint: 'kb_document',
      pageMock: {
        chat_title: '工艺SOP知识库',
        chat: [{ role: 'bot', text: '检索制造·工艺SOP与作业指导库；空库无文档时仅作引导。' }],
        files_title: '作业指导书',
        files: [],
        primary_action: '检索',
      },
    },
    {
      id: 's3',
      name: '生产日报/OEE',
      category: '生产管理',
      summary: '车间产量稼动率',
      pages: 'chart',
      standard: '✓',
      kind: 'oee',
      capabilityHint: 'mfg_oee',
      pageMock: {
        kpis: [
          { label: 'OEE', value: '—', hint: '接真数据后刷新' },
          { label: '产量', value: '—', hint: '件/班' },
          { label: '停机', value: '—', hint: '计划外' },
        ],
        list_title: '稼动趋势',
        primary_action: '刷新数据',
      },
    },
    {
      id: 's4',
      name: '质检审批',
      category: '质量管理',
      summary: '来料成品质检',
      pages: 'approval',
      standard: '✓',
      kind: 'quality',
      capabilityHint: 'quality_inspect',
      pageMock: {
        form_title: '质检登记',
        fields: [
          { key: 'product_code', label: '产品 / 批次号', placeholder: 'LOT-2026-0412' },
          { key: 'process_name', label: '工序 / 检验点', placeholder: '来料 IQC', optional: true },
          { key: 'result', label: '初判结果', placeholder: 'pass / fail / hold' },
          { key: 'note', label: '检验备注', type: 'textarea', placeholder: '尺寸公差、外观…', optional: true },
        ],
        list_title: '质检记录',
        list: [],
        primary_action: '提交质检',
      },
    },
    {
      id: 's5',
      name: '物料领用',
      category: '物料管理',
      summary: '生产领退料',
      pages: 'approval',
      standard: '✓',
      kind: 'material',
      capabilityHint: 'material_issue',
      pageMock: {
        form_title: '生产领料',
        fields: [
          { key: 'material_name', label: '物料名称', placeholder: '轴承 6205' },
          { key: 'qty', label: '领用数量', type: 'number', placeholder: '40' },
          { key: 'work_order', label: '工单号', placeholder: 'WO-8841', optional: true },
          { key: 'note', label: '用途说明', type: 'textarea', placeholder: 'A3 线换模备件…', optional: true },
        ],
        list_title: '领料记录',
        list: [],
        primary_action: '提交领料',
      },
    },
    {
      id: 's6',
      name: '安环隐患上报',
      category: '安全管理',
      summary: '安全隐患拍照上报',
      pages: 'form+approval',
      standard: '✓',
      kind: 'safety',
      capabilityHint: 'site_patrol',
      pageMock: {
        form_title: '隐患上报',
        fields: [
          { key: 'site_name', label: '区域 / 车间', placeholder: 'A3 冲压车间 · 消防通道' },
          { key: 'checkpoint', label: '检查点', placeholder: '消防栓', optional: true },
          { key: 'result', label: '巡检结果', placeholder: 'hazard / ok' },
          { key: 'note', label: '隐患描述', type: 'textarea', placeholder: '通道堆放纸箱，遮挡消防栓…' },
        ],
        list_title: '隐患记录',
        list: [],
        primary_action: '上报并流转',
      },
    },
    {
      id: 's7',
      name: '排班/考勤',
      category: '人事管理',
      summary: '班次查询申诉',
      pages: 'list+approval',
      standard: '✓',
      kind: 'roster',
      capabilityHint: 'shift_attendance',
    },
    {
      id: 's8',
      name: '保养计划提醒',
      category: '设备管理',
      summary: '设备保养到期',
      pages: 'notify',
      standard: '✓',
      kind: 'maintain',
      capabilityHint: 'maintenance_plan',
    },
    {
      id: 's9',
      name: '图纸/BOM检索',
      category: '知识管理',
      summary: '工程图纸与BOM文档问答（挂制造·工艺SOP知识库）',
      pages: 'kb',
      standard: '✓',
      kind: 'bom',
      capabilityHint: 'kb_document',
      pageMock: {
        chat_title: '图纸/BOM 检索',
        chat: [{ role: 'bot', text: '检索制造·工艺SOP知识库中的图纸与BOM；空库空列表。' }],
        files_title: '工程文档',
        files: [],
        primary_action: '检索',
      },
    },
    {
      id: 's9b',
      name: '制造·工艺SOP与作业指导库',
      category: '行业知识库',
      summary: '作业指导书、工艺卡、换型检查表；真知识库 RAG，空库空列表',
      pages: 'kb+chat',
      standard: '✓',
      kind: 'chat_kb',
      capabilityHint: 'kb_document',
      pageMock: {
        chat_title: '制造·工艺SOP与作业指导库',
        chat: [{ role: 'bot', text: '行业专属知识库 · 已含 DeepSeek 示范工艺文档，可检索换型/作业指导；亦可继续上传。' }],
        files_title: '文档',
        files: [],
        primary_action: '检索',
      },
    },
    {
      id: 's9c',
      name: '制造·质检与安环知识库',
      category: '行业知识库',
      summary: '质检标准、不合格处理、安环隐患案例；真知识库 RAG，空库空列表',
      pages: 'kb+chat',
      standard: '✓',
      kind: 'chat_kb',
      capabilityHint: 'kb_document',
      pageMock: {
        chat_title: '制造·质检与安环知识库',
        chat: [{ role: 'bot', text: '行业专属知识库 · 已含 DeepSeek 示范质检/安环文档，可检索不合格/隐患；亦可继续上传。' }],
        files_title: '文档',
        files: [],
        primary_action: '检索',
      },
    },
    {
      id: 's10',
      name: '对接MES/ERP',
      category: '系统集成',
      summary: '制造系统打通',
      pages: 'integration',
      standard: '✓',
      kind: 'integration',
      capabilityHint: 'erp_connector',
    },
    {
      id: 's11',
      name: '能耗/碳排统计',
      category: '绿色制造',
      summary: '绿色制造指标',
      pages: 'chart',
      standard: '✓',
      kind: 'energy',
      capabilityHint: 'energy_carbon',
    },
    {
      id: 's12',
      name: '技能培训记录',
      category: '人事管理',
      summary: '上岗证培训档案',
      pages: 'list+kb',
      standard: '✓',
      kind: 'training',
      capabilityHint: 'training_record',
      pageMock: {
        form_title: '培训登记',
        fields: [
          { key: 'trainee', label: '学员姓名', placeholder: '李强' },
          { key: 'course', label: '课程 / 证件', placeholder: '冲压上岗证' },
          { key: 'expire_at', label: '有效期至', type: 'date', placeholder: '点选日期', optional: true },
          { key: 'note', label: '备注', type: 'textarea', placeholder: '复训/补考…', optional: true },
        ],
        list_title: '培训档案',
        list: [],
        primary_action: '登记',
      },
    },
  ],
}

export const OFFICE_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'office',
  name: '通用办公',
  tagline: '66 场景 · 人事财务审批知识库 · 真 Runtime',
  accent: '#6366f1',
  scenes: OFFICE_SCENE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    summary: s.summary,
    pages: s.pages,
    standard: '✓' as const,
    kind: s.kind as ScenePageKind,
    capabilityHint: s.capabilityHint,
    pageMock: s.pageMock as ScenePageMock | undefined,
  })),
}

export const SALES_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'sales',
  name: '销售行业',
  tagline: '64 场景 · 纯销售/CRM · 不混通用办公',
  accent: '#6366f1',
  scenes: SALES_SCENE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    summary: s.summary,
    pages: s.pages,
    standard: '✓' as const,
    kind: s.kind as ScenePageKind,
    capabilityHint: s.capabilityHint,
    pageMock: s.pageMock as ScenePageMock | undefined,
  })),
}

export const MED_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'med',
  name: '医疗健康',
  tagline: '52 场景 · AI预问诊/指南RAG/排班 · 真库闭环',
  accent: '#10b981',
  scenes: MED_SCENE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    summary: s.summary,
    pages: s.pages,
    standard: '✓' as const,
    kind: s.kind as ScenePageKind,
    capabilityHint: s.capabilityHint,
    pageMock: s.pageMock as ScenePageMock | undefined,
  })),
}

export const GAME_RUNTIME_PREVIEW: IndustryRuntimePackPreview = {
  key: 'game',
  name: '游戏娱乐',
  tagline: 'FAQ工单真库、双知识库、活动通知、2048可玩',
  accent: '#a855f7',
  scenes: GAME_SCENE_SEEDS.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    summary: s.summary,
    pages: s.pages,
    standard: '✓' as const,
    kind: s.kind as ScenePageKind,
    capabilityHint: s.capabilityHint,
    pageMock: s.pageMock as ScenePageMock | undefined,
  })),
}

function financePreview(
  key: string,
  name: string,
  tagline: string,
  accent: string,
  seeds: typeof BANK_SCENE_SEEDS,
): IndustryRuntimePackPreview {
  return {
    key,
    name,
    tagline,
    accent,
    scenes: seeds.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      summary: s.summary,
      pages: s.pages,
      standard: '✓' as const,
      kind: s.kind as ScenePageKind,
      capabilityHint: s.capabilityHint,
    })),
  }
}

export const BANK_RUNTIME_PREVIEW = financePreview(
  'bank',
  '商业银行',
  '对公零售 · KYC · 授信 · 反洗钱',
  '#0369a1',
  BANK_SCENE_SEEDS,
)
export const SECURITIES_RUNTIME_PREVIEW = financePreview(
  'securities',
  '证券券商',
  '适当性 · 投研尽调 · 合规 · 产品销售',
  '#0e7490',
  SECURITIES_SCENE_SEEDS,
)
export const INSURANCE_RUNTIME_PREVIEW = financePreview(
  'insurance',
  '保险',
  '核保 · 理赔 · 代理人 · 产品说明',
  '#0284c7',
  INSURANCE_SCENE_SEEDS,
)
export const FUND_RUNTIME_PREVIEW = financePreview(
  'fund',
  '基金资管',
  '产品披露 · 投后 · 监管报送',
  '#1d4ed8',
  FUND_SCENE_SEEDS,
)
export const FINTECH_RUNTIME_PREVIEW = financePreview(
  'fintech',
  '消金金科',
  '风控预警 · 贷后 · 监管报送',
  '#4338ca',
  FINTECH_SCENE_SEEDS,
)

export function getIndustryRuntimePreview(packKey: string): IndustryRuntimePackPreview | null {
  if (packKey === 'mfg') return MFG_RUNTIME_PREVIEW
  if (packKey === 'office') return OFFICE_RUNTIME_PREVIEW
  if (packKey === 'sales') return SALES_RUNTIME_PREVIEW
  if (packKey === 'med') return MED_RUNTIME_PREVIEW
  if (packKey === 'game') return GAME_RUNTIME_PREVIEW
  if (packKey === 'bank') return BANK_RUNTIME_PREVIEW
  if (packKey === 'securities') return SECURITIES_RUNTIME_PREVIEW
  if (packKey === 'insurance') return INSURANCE_RUNTIME_PREVIEW
  if (packKey === 'fund') return FUND_RUNTIME_PREVIEW
  if (packKey === 'fintech') return FINTECH_RUNTIME_PREVIEW
  return null
}

export function groupScenesByCategory(scenes: IndustryRuntimeScene[]) {
  const map = new Map<string, IndustryRuntimeScene[]>()
  for (const s of scenes) {
    const list = map.get(s.category) ?? []
    list.push(s)
    map.set(s.category, list)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
}
