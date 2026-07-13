/** B2B 官网 · 新闻与动态（万兴新闻中心风格 · DeepSeek + 生成封面） */

import type { EnrichBlock } from './enrichBlocks'

export type NewsCategory = 'enterprise' | 'brand' | 'product'

export interface NewsArticle {
  slug: string
  category: NewsCategory
  title: string
  date: string
  summary: string
  body: string[]
  coverImage: string
  featured?: boolean
}

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  enterprise: '企业新闻',
  brand: '品牌活动',
  product: '产品动态',
}

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: 'waic-2026-blockhub-forum',
    category: 'brand',
    title: `定档7月20日！积木仓将亮相 WAIC 2026 企业智能体应用专场`,
    date: '2026-07-12',
    summary: `三大看点前瞻 · 20 行业方案现场演示 · 预约闭门交流`,
    coverImage: '/news/waic-2026-blockhub-forum.jpg',
    body: [
      `2026 世界人工智能大会（WAIC）即将开幕。积木仓 BlockHub 已确认参与企业智能体应用专场，与生态伙伴共话「五分钟搭好、打开就能用」的落地路径。`,
      `**专场看点一：20 行业方案站集中展示**。制造、零售、物流、医疗、教育等独立方案页将现场演示，观众可扫码进入对应行业场景清单。`,
      `**看点二：意图识别创建全流程**。从自然语言描述到模板推荐、模块搭配、五端发布，完整走通 5 分钟配置体验。`,
      `**看点三：信任合规资料一站领取**。信息部门关心的数据流图、部署对比与安全问卷预填版，现场扫码即可下载。`,
      `欢迎通过官网预约演示，或在 WAIC 现场到访积木仓展台交流试点方案。`,
    ],
    featured: true,
  },
  {
    slug: 'blockhub-1-2',
    category: 'product',
    title: `积木仓 1.2：意图识别 + 20 个行业方案站`,
    date: '2026-07-08',
    summary: `能力目录升级 · 行业方案丰富 · 全站智能体助手`,
    coverImage: '/news/blockhub-1-2.jpg',
    body: [
      `积木仓 1.2 正式发布。本次升级围绕「更快选对场景、更快出可转发材料」两个目标展开。`,
      `**能力目录升级**：原子能力模块增至 43 项，场景模板覆盖 115+ 业务场景。创建流程支持意图识别，用户用自然语言描述需求后，系统可推荐匹配的模板与行业方案包。`,
      `**20 个行业方案站**：每个行业独立落地页，包含典型场景、前置条件、不适用边界与相关案例链接。制造、零售、物流、医疗等高频行业已上线完整方案包。`,
      `**全站智能体助手**：顶栏与各子页接入统一助手，可解答安全合规问题、生成试点清单、推荐下载资料。预约演示过程本身即为智能体协作体验。`,
      `后续版本将补充定价计算器、角色入口页与更多客户案例详情。欢迎通过官网预约演示体验 1.2 新能力。`,
    ],
    featured: true,
  },
  {
    slug: 'deepseek-integration-2026',
    category: 'product',
    title: `适配 DeepSeek · 积木仓意图识别与行业 enrich 全面接入大模型`,
    date: '2026-07-08',
    summary: `创建推荐 · 行业文案丰富 · 模块补全 · 失败自动回退`,
    coverImage: '/news/deepseek-integration-2026.jpg',
    body: [
      `积木仓 1.2 版本完成 DeepSeek 大模型深度集成，覆盖创建流程意图识别、20 行业方案站文案 enrich、能力模块智能补全等核心链路。`,
      `用户在首页输入业务需求后，系统可结合能力目录与行业包，给出可解释的推荐结果与置信度；低置信度场景会引导补充信息而非强行匹配。`,
      `行业独立站支持「大模型重新丰富」：方案总述、场景提示与推荐模块可按行业语境自动改写，并标注文案来源。`,
      `所有大模型调用均保留静态 fallback，API 不可用时不阻断页面与创建流程，保障演示与试点环境稳定。`,
    ],
    featured: true,
  },
  {
    slug: 'wenbo-2026-blockhub',
    category: 'brand',
    title: `积木仓亮相 2026 文博会 · AI 赋能 20 行业数字化方案`,
    date: '2026-07-04',
    summary: `现场体验意图识别创建 · 行业方案一站浏览`,
    coverImage: '/news/wenbo-2026-blockhub.jpg',
    body: [
      `第 22 届中国（深圳）国际文化产业博览交易会期间，积木仓 BlockHub 携 20 个行业深度包与 115+ 场景模板参展。`,
      `展台设置「行业方案墙」与「5 分钟创建」体验区：观众可选择制造、零售、政务、教育等行业，现场生成可转发材料包。`,
      `多家文化科技企业与积木仓达成试点意向，重点场景包括活动报名、内容审核辅助、知识库问答与多端员工应用。`,
      `积木仓坚持「人工确认版优先」的落地策略，尤其在对外沟通场景保留审批节点，受到政企客户欢迎。`,
    ],
    featured: true,
  },
  {
    slug: 'huawei-cloud-ecosystem-2026',
    category: 'enterprise',
    title: `积木仓加入华为云初创生态 · 共建企业智能体交付方案`,
    date: '2026-06-30',
    summary: `混合部署 · 行业模板 · 联合 Go-To-Market`,
    coverImage: '/news/huawei-cloud-ecosystem-2026.jpg',
    body: [
      `积木仓与华为云达成生态合作意向，面向制造、能源、政务等行业输出可复制的智能体应用交付方案。`,
      `合作涵盖混合部署参考架构、对象存储与模型 API 对接、以及面向渠道伙伴的行业方案包共建。`,
      `双方将在 Q3 联合举办两场线上工作坊，主题覆盖「信息部门 30 分钟过审」与「销售场景 7 天试点」。`,
    ],
  },
  {
    slug: 'edu-industry-pack-launch',
    category: 'product',
    title: `教育培训行业方案站焕新 · 统一学院风模板上线`,
    date: '2026-06-26',
    summary: `20 行业视觉统一 · 独立 Hero · 场景清单 enrich`,
    coverImage: '/news/edu-industry-pack-launch.jpg',
    body: [
      `积木仓 20 个行业独立站完成视觉升级，统一采用学院风浅色模板，差异仅保留各行业主题色。`,
      `每个行业站包含方案总述、场景清单、页面模板示意与底部「五分钟搭好应用」CTA，支持 Web / iOS / Android / Windows / macOS 五端说明。`,
      `教育培训、通用办公、制造、零售等高频行业已补充大模型 enrich 文案与场景提示，缩短销售材料准备时间。`,
    ],
  },
  {
    slug: 'iso27001-alignment-update',
    category: 'enterprise',
    title: `积木仓发布信息安全对齐说明更新 · 信任中心资料包 v1.2`,
    date: '2026-06-22',
    summary: `子处理器清单 · 日志样例 · 50 题问卷 42 题预填`,
    coverImage: '/news/iso27001-alignment-update.jpg',
    body: [
      `信任与合规中心资料包更新至 v1.2，新增子处理器列表、操作日志字段样例与删数流程示意图。`,
      `针对常见 50 题安全问卷，预填版本覆盖 42 题并标注来源页码，帮助 IT 团队缩短评估周期。`,
      `官网各子页接入统一智能体助手，可直接提问数据存储、模型训练与部署边界等问题。`,
    ],
  },
  {
    slug: 'mfg-pilot-acceptance',
    category: 'enterprise',
    title: `制造企业：线索首响试点验收通过`,
    date: '2026-06-20',
    summary: `200 条真实线索 · 平均首响 28 分钟 · 人工确认版`,
    coverImage: '/news/mfg-pilot-acceptance.jpg',
    body: [
      `某 800 人规模制造企业完成销售线索快速响应场景的试点验收，项目进入商务立项阶段。`,
      `**背景**：该企业日均新增 CRM 线索约 40 条，一线销售平均首响时长约 3.2 小时，部分高价值线索因响应滞后流失。`,
      `**试点方案**：采用「智能体草拟话术 + 人工确认发送」模式。新线索进入 CRM 后 30 分钟内，智能体根据客户画像与历史成交记录生成跟进建议，销售确认后一键发送。`,
      `**验收指标**：使用 200 条脱敏真实线索验证，平均首响从 3.2 小时缩短至 28 分钟，一线采纳率 72%，销售主管签字确认达标。`,
      `该案例详情与对内转发材料包已在官网案例中心开放，欢迎同行业客户参考。`,
    ],
  },
  {
    slug: 'force-conference-2026',
    category: 'brand',
    title: `积木仓亮相火山引擎 FORCE 大会 · 共探 Agent 工业化交付`,
    date: '2026-06-18',
    summary: `模块积木 · 行业方案 · 语音智能体演示`,
    coverImage: '/news/force-conference-2026.jpg',
    body: [
      `在 FORCE 原力大会现场，积木仓展示从意图识别到五端发布的完整 Agent 应用交付链路。`,
      `演示重点包括上海话语音智能体、销售线索首响与设备报修等行业场景，强调真实试点指标与调整过程透明。`,
      `现场与多家 ISV 交流生态对接，能力目录已开放 custom 扩展与 Flutter 真设备 API 说明。`,
    ],
  },
  {
    slug: 'campus-recruiting-2026',
    category: 'enterprise',
    title: `积木仓 2026 全球校园招聘启动 · 产品工程双轨并行`,
    date: '2026-06-14',
    summary: `长沙 · 深圳 · 远程协作 · AI 原生产品团队`,
    coverImage: '/news/campus-recruiting-2026.jpg',
    body: [
      `积木仓 BlockHub 2026 届全球校园招聘正式启动，开放产品、前端、后端、Flutter 与 AI 应用工程等岗位。`,
      `团队采用 AI 原生研发流程，新人将参与行业方案包、意图识别与运行时五端发布等核心产品线。`,
      `欢迎通过官网「预约演示」通道提交简历备注，或关注公众号获取内推信息。`,
    ],
  },
  {
    slug: 'agent-selection-checklist',
    category: 'brand',
    title: `2026 企业智能体选型清单（制造版）发布`,
    date: '2026-06-01',
    summary: `先定约束 · 试点 7–14 天 · 保留人工确认路径`,
    coverImage: '/news/agent-selection-checklist.jpg',
    body: [
      `制造企业在评估 AI 智能体平台时，常见问题不是「功能够不够」，而是「能不能过信息部门、销售愿不愿用」。`,
      `**第一步：先定约束，再比功能**。在选型初期明确三项硬约束：数据是否出境、是否需要对接现有 ERP/CRM、是否要求人工确认节点。`,
      `**第二步：场景不超过 3 个**。建议首批试点聚焦 1–2 个可量化场景，例如线索首响、设备报修、SOP 问答。`,
      `**第三步：试点周期 7–14 天**。用真实脱敏数据验证，指标需双方书面确认。`,
      `**第四步：保留人工确认路径**。智能体辅助 + 人工确认是更稳妥的落地路径。`,
    ],
  },
  {
    slug: 'trust-center-launch',
    category: 'product',
    title: `信任与合规中心上线：信息部门一站式过审`,
    date: '2026-05-18',
    summary: `数据流图 · 部署对比 · 安全问卷预填 · 资料可下载`,
    coverImage: '/news/trust-center-launch.jpg',
    body: [
      `积木仓官网正式上线「信任与合规中心」独立页面，面向企业信息部门与安全团队。`,
      `中心收录数据流与存储说明、SaaS/混合/私有化部署对比、已支持系统集成清单、数据处理协议摘要等资料，均可直接下载。`,
      `针对常见 50 题安全问卷，我们提供 42 题预填版本并标注来源页码，帮助 IT 团队缩短文档往来周期。`,
      `各子页面接入智能体助手，可直接提问「客户数据会不会用于模型训练」等问题，获得有据可查的解答。`,
    ],
  },
  {
    slug: 'retail-office-go-live',
    category: 'enterprise',
    title: `连锁零售客户智慧办公场景全量上线`,
    date: '2026-05-06',
    summary: `请假审批 · 制度问答 · 五端同步 · 5 分钟配置首场景`,
    coverImage: '/news/retail-office-go-live.jpg',
    body: [
      `某区域连锁零售企业完成积木仓智慧办公场景的全量上线，覆盖总部与 120 余家门店。`,
      `**上线场景**：员工请假审批、报销指引、制度与福利问答、门店排班查询。`,
      `**多端覆盖**：一次发布，网页版、iOS、Android、Windows 与 macOS 五端同步可用。`,
      `客户反馈：「以前找 HR 问制度要翻微信群，现在手机上 10 秒就有答案。」`,
    ],
  },
  {
    slug: 'why-not-auto-outbound',
    category: 'brand',
    title: `积木仓发布销售 AI 落地白皮书：为何不建议冷启动全自动外呼`,
    date: '2026-04-22',
    summary: `销售抵制 · 合规顾虑 · 人工确认版更稳妥`,
    coverImage: '/news/why-not-auto-outbound.jpg',
    body: [
      `我们在多个制造企业试点中观察到：「全自动外呼」作为首个场景，往往遭遇销售团队抵制与合规部门担忧。`,
      `**更稳妥的路径**：智能体草拟个性化话术，销售审阅确认后发送。`,
      `某制造客户从全自动外呼调整为人工确认版后，采纳率从不足 20% 提升至 72%。`,
    ],
  },
  {
    slug: 'logistics-tracking-live',
    category: 'enterprise',
    title: `物流货代企业运单跟踪智能问答上线`,
    date: '2026-04-10',
    summary: `运单查询 · 状态推送 · 7×24 值守 · 客服工单下降 35%`,
    coverImage: '/news/logistics-tracking-live.jpg',
    body: [
      `某中型物流货代企业上线运单跟踪与客服问答智能体，实现 7×24 自助查询。`,
      `客户与业务员可通过自然语言查询运单状态、预计到达时间、异常原因与签收凭证。`,
      `上线 30 天后，人工客服工单量下降约 35%，客户满意度评分提升 0.6 分（5 分制）。`,
    ],
  },
]

export function getNewsArticle(slug: string): NewsArticle | undefined {
  return NEWS_ARTICLES.find((a) => a.slug === slug)
}

export function getNewsByCategory(category: NewsCategory | 'all'): NewsArticle[] {
  if (category === 'all') return NEWS_ARTICLES
  return NEWS_ARTICLES.filter((a) => a.category === category)
}

export function getFeaturedNews(limit = 3): NewsArticle[] {
  const featured = NEWS_ARTICLES.filter((a) => a.featured)
  if (featured.length >= limit) return featured.slice(0, limit)
  return NEWS_ARTICLES.slice(0, limit)
}

export function resolveArticleBlocks(article: NewsArticle): EnrichBlock[] {
  const blocks: EnrichBlock[] = [
    { type: 'image', src: article.coverImage, alt: article.title },
  ]
  for (const text of article.body) {
    blocks.push({ type: 'p', text })
  }
  return blocks
}
