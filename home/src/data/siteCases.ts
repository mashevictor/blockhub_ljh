import type { EnrichBlock, EnrichLinkItem } from './enrichBlocks'
import { ROUTES } from '../routes/paths'

export interface CaseMetric {
  value: string
  label: string
}

export interface CaseStudy {
  slug: string
  name: string
  industry: string
  tag?: string
  summary: string
  metrics: CaseMetric[]
  story: string[]
  pilotNote: string
  onePagerPath: string
}

export const FEATURED_CASE_SLUG = 'mfg-leads'

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'mfg-leads',
    name: '800 人制造企业 · 销售线索快速响应',
    industry: '制造',
    tag: '试点实录',
    summary:
      '第一次全自动外呼试点被否 → 改人工确认版 → 平均首响由约 3.2 小时缩短至 28 分钟',
    metrics: [
      { value: '72%', label: '一线采纳率' },
      { value: '28min', label: '平均首响' },
      { value: '80万', label: '首年合同' },
    ],
    story: [
      '某 800 人规模精密零部件制造企业，日均新增 CRM 线索约 40 条。销售团队反馈：高价值线索经常在 2–3 小时后才首次联系，竞品已抢先触达。',
      '**第一次试点**：团队选择「全自动外呼」作为首个场景。上线 4 周后遭遇销售抵制——话术不可控、客户体验差、业绩归属不清。信息部门也提出外呼合规顾虑，试点叫停。',
      '**方案调整**：改为「智能体草拟话术 + 人工确认后发送」。新线索进入 CRM 后 30 分钟内，智能体根据客户画像生成跟进建议，销售审阅确认后一键发送。',
      '**验收验证**：使用 200 条脱敏真实线索验证，平均首响 P50 从 3.2 小时降至 28 分钟，一线采纳率 72%。销售主管与信息部门书面确认达标，项目进入商务立项。',
      '**可转发材料**：案例详情与 [一页纸摘要](/downloads/one-pager-mfg.pdf) 可在 [落地案例](/cases) 下载；同行业客户可参考 [制造行业方案](/industry/mfg) 场景清单。',
      '**经验总结**：首个场景务必保留 [人工确认路径](/trust/security-faq)；指标需双方书面确认，诚实记录调整过程比强调「全自动」更能通过内部评审。',
    ],
    pilotNote:
      '诚实记录试点调整过程，比吹嘘「全自动」更能赢得内部评审同事信任。建议对外转发时一并说明人工确认路径。',
    onePagerPath: '/downloads/one-pager-mfg.pdf',
  },
  {
    slug: 'retail-office',
    name: '连锁零售 · 智慧办公',
    industry: '零售',
    summary: '请假审批、制度问答、门店报表与通知一体化',
    metrics: [
      { value: '5min', label: '首场景上线' },
      { value: '120+', label: '门店覆盖' },
      { value: '96', label: '办公场景' },
    ],
    story: [
      '区域连锁零售企业覆盖总部与 120 余家门店，员工频繁咨询 HR 制度与排班问题。',
      '上线请假审批、制度问答、门店报表等场景，一次发布五端可用。知识库联动后，员工自然语言提问即可获准确答复。',
      '**部署方式**：采用 [PaaS 标准](/pricing) 按坐席订阅，2 周完成制度文档整理与知识库导入。',
      '**推广节奏**：总部 HR 先试点 2 周，再向 120 家门店分批开放；详见 [一页纸摘要](/downloads/one-pager-retail.pdf)。',
    ],
    pilotNote: '标准 PaaS 部署，2 周完成制度文档整理与首批场景上线。',
    onePagerPath: '/downloads/one-pager-retail.pdf',
  },
  {
    slug: 'logistics-tracking',
    name: '物流货代 · 运单跟踪',
    industry: '物流',
    summary: '运单跟踪、客服问答、报价审批全流程值守',
    metrics: [
      { value: '35%', label: '工单下降' },
      { value: '7×24', label: '自助查询' },
      { value: '0.6', label: '满意度提升' },
    ],
    story: [
      '中型物流货代企业客户与业务员需频繁查询运单状态、预计到达时间与异常原因。',
      '智能体对接 TMS 系统返回实时数据，异常运单自动通知相关业务员。上线 30 天后人工客服工单量下降约 35%。',
      '**试点设计**：14 天、500 条脱敏运单验证查询准确率；异常推送规则由业务主管配置。',
      '更多物流场景见 [物流行业方案](/industry/logistics) 与 [一页纸摘要](/downloads/one-pager-logistics.pdf)。',
    ],
    pilotNote: '试点周期 14 天，用 500 条历史运单脱敏数据验证准确率。',
    onePagerPath: '/downloads/one-pager-logistics.pdf',
  },
]

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug)
}

export function getFeaturedCase(): CaseStudy {
  return CASE_STUDIES.find((c) => c.slug === FEATURED_CASE_SLUG) ?? CASE_STUDIES[0]
}

function caseRelatedLinks(study: CaseStudy): EnrichLinkItem[] {
  return [
    { label: '返回案例列表', href: ROUTES.cases },
    { label: '打开一页纸摘要', href: study.onePagerPath, external: true },
    { label: '信任与合规', href: ROUTES.trust },
    { label: '定价说明', href: ROUTES.pricing },
    { label: '预约演示', href: ROUTES.contactDemo },
  ]
}

/** 案例详情页内容块（与列表页 enrich-card / enrich-panel 同系） */
export function resolveCaseBlocks(study: CaseStudy): EnrichBlock[] {
  return [
    {
      type: 'panel',
      title: '案例故事',
      lead: '试点背景 · 方案调整 · 验收结果',
      paragraphs: study.story,
    },
    {
      type: 'panel',
      title: '试点说明',
      paragraphs: [study.pilotNote],
    },
    { type: 'links', title: '延伸阅读', items: caseRelatedLinks(study) },
  ]
}
