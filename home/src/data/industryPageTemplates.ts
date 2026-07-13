/** 行业独立站 · 10 套页面模板定义与行业化内容生成 */

export type IndustryPageTemplateKind =
  | 'approval'
  | 'chat_kb'
  | 'dashboard'
  | 'form'
  | 'list'
  | 'funnel'
  | 'kb'
  | 'notify'
  | 'integration'
  | 'mobile_field'

export interface IndustryPageTemplate {
  kind: IndustryPageTemplateKind
  title: string
  subtitle: string
  features: string[]
  sceneName: string
  tag: string
}

const KIND_ORDER: IndustryPageTemplateKind[] = [
  'approval',
  'chat_kb',
  'dashboard',
  'form',
  'list',
  'funnel',
  'kb',
  'notify',
  'integration',
  'mobile_field',
]

const KIND_META: Record<IndustryPageTemplateKind, { title: string; tag: string; features: string[] }> = {
  approval: {
    title: '审批工作台',
    tag: '流程引擎',
    features: ['多级会签路由', '移动端一键审批', '超时自动催办'],
  },
  chat_kb: {
    title: '智能问答',
    tag: '大模型',
    features: ['意图识别', '知识库引用溯源', '多轮对话上下文'],
  },
  dashboard: {
    title: '数据看板',
    tag: 'BI 可视化',
    features: ['实时指标刷新', '多维下钻分析', '异常高亮预警'],
  },
  form: {
    title: '业务表单',
    tag: '低代码',
    features: ['字段联动校验', '拍照附件上传', '草稿自动保存'],
  },
  list: {
    title: '列表台账',
    tag: '数据管理',
    features: ['高级筛选排序', '批量操作', '导出与打印'],
  },
  funnel: {
    title: '漏斗分析',
    tag: '增长分析',
    features: ['阶段转化率', '流失节点定位', '团队对比排行'],
  },
  kb: {
    title: '知识文档库',
    tag: 'RAG 检索',
    features: ['全文语义检索', '版本变更追踪', '权限分级阅读'],
  },
  notify: {
    title: '消息触达',
    tag: '全渠道',
    features: ['站内信推送', '企微/钉钉同步', '已读回执统计'],
  },
  integration: {
    title: '系统集成',
    tag: '开放接口',
    features: ['标准 API 对接', 'Webhook 事件', '单点登录 SSO'],
  },
  mobile_field: {
    title: '移动外勤',
    tag: '现场作业',
    features: ['GPS 定位签到', '离线数据采集', '现场拍照取证'],
  },
}

/** pages 字段 → 模板类型映射 */
const PAGES_TO_KIND: Record<string, IndustryPageTemplateKind> = {
  approval: 'approval',
  'approval+form': 'approval',
  'form+approval': 'form',
  form: 'form',
  chat: 'chat_kb',
  'chat+kb': 'chat_kb',
  'kb+chat': 'chat_kb',
  kb: 'kb',
  chart: 'dashboard',
  'chart+approval': 'dashboard',
  'chart+notify': 'dashboard',
  'chart_funnel': 'funnel',
  list: 'list',
  'list+approval': 'list',
  'list+chat': 'list',
  notify: 'notify',
  'notify+chart': 'notify',
  integration: 'integration',
  'form+map': 'mobile_field',
}

function kindFromPages(pages: string | undefined, index: number): IndustryPageTemplateKind {
  if (pages) {
    for (const part of pages.split('+')) {
      const k = PAGES_TO_KIND[part.trim()]
      if (k) return k
    }
  }
  return KIND_ORDER[index % KIND_ORDER.length]
}

export interface SceneInput {
  name: string
  problem?: string
  pages?: string
  category?: string
}

export function buildIndustryPageTemplates(
  packName: string,
  scenes: SceneInput[],
): IndustryPageTemplate[] {
  const used = new Set<IndustryPageTemplateKind>()
  const result: IndustryPageTemplate[] = []

  for (let i = 0; i < scenes.length && result.length < 10; i++) {
    const scene = scenes[i]
    let kind = kindFromPages(scene.pages, i)
    if (used.has(kind)) {
      kind = KIND_ORDER.find((k) => !used.has(k)) ?? kind
    }
    used.add(kind)
    const meta = KIND_META[kind]
    result.push({
      kind,
      title: `${packName} · ${meta.title}`,
      subtitle: scene.problem || scene.name,
      features: [scene.name, ...meta.features.slice(0, 2)],
      sceneName: scene.name,
      tag: meta.tag,
    })
  }

  for (const kind of KIND_ORDER) {
    if (result.length >= 10) break
    if (used.has(kind)) continue
    const meta = KIND_META[kind]
    result.push({
      kind,
      title: `${packName} · ${meta.title}`,
      subtitle: `${packName}典型业务场景的标准页面模板`,
      features: meta.features,
      sceneName: meta.title,
      tag: meta.tag,
    })
  }

  return result.slice(0, 10)
}
