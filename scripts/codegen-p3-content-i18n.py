#!/usr/bin/env python3
"""Emit shared/i18n/messages/{zh-CN,en-US}/content.json (content.* namespace)."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "shared" / "i18n" / "messages"

# ── helpers ──────────────────────────────────────────────────────────────────

def P(key: str, zh: str, en: str) -> tuple[str, str, str]:
    return (key, zh, en)


def extend_pairs(pairs: list[tuple[str, str, str]], items: list[tuple[str, str, str]]) -> None:
    pairs.extend(items)


# ── 1) Showcase ─────────────────────────────────────────────────────────────

SHOWCASE: list[tuple[str, str, str]] = [
    P("showcase.cap.creation.name", "智能创建", "Smart create"),
    P("showcase.cap.creation.desc", "选场景、评估方案、一键发布", "Pick scenarios, review plan, publish in one click"),
    P("showcase.cap.chat_qa.name", "智能问答", "Q&A"),
    P("showcase.cap.chat_qa.desc", "结合知识库回答制度与业务问题", "Answer policy and business questions with your knowledge base"),
    P("showcase.cap.kb.name", "知识库", "Knowledge base"),
    P("showcase.cap.kb.desc", "上传文档，智能整理与检索", "Upload docs, organize and search intelligently"),
    P("showcase.cap.approval.name", "审批流程", "Approvals"),
    P("showcase.cap.approval.desc", "请假、报销等在线提交与审批", "Leave, expense, and more — submit and approve online"),
    P("showcase.cap.report.name", "数据报表", "Reports"),
    P("showcase.cap.report.desc", "看板、图表与自然语言查数", "Dashboards, charts, and natural-language queries"),
    P("showcase.cap.notify.name", "消息通知", "Notifications"),
    P("showcase.cap.notify.desc", "审批提醒、公告与多渠道推送", "Approval alerts, announcements, multi-channel push"),
    P("showcase.cap.integration.name", "系统对接", "Integrations"),
    P("showcase.cap.integration.desc", "ERP、OA、企微等系统打通", "Connect ERP, OA, WeCom, and more"),
    P("showcase.cap.workflow.name", "流程编排", "Workflow"),
    P("showcase.cap.workflow.desc", "可视化配置表单与工作流", "Visual forms and workflow configuration"),
    P("showcase.cap.security.name", "安全合规", "Security & compliance"),
    P("showcase.cap.security.desc", "权限、脱敏与操作审计", "RBAC, masking, and audit trails"),
    P("showcase.cap.portal.name", "多端门户", "Multi-platform portal"),
    P("showcase.cap.portal.desc", "一次发布，各端同步可用", "Publish once — available on every platform"),
    P("showcase.plat.web.name", "网页版", "Web"),
    P("showcase.plat.web.sub", "Chrome · Safari · Edge", "Chrome · Safari · Edge"),
    P("showcase.plat.ios.name", "iOS", "iOS"),
    P("showcase.plat.ios.sub", "iPhone · iPad 原生", "Native iPhone · iPad"),
    P("showcase.plat.android.name", "Android", "Android"),
    P("showcase.plat.android.sub", "手机 · 平板 APK", "Phone · tablet APK"),
    P("showcase.plat.windows.name", "Windows", "Windows"),
    P("showcase.plat.windows.sub", "桌面客户端 · 托盘", "Desktop client · system tray"),
    P("showcase.plat.mac.name", "macOS", "macOS"),
    P("showcase.plat.mac.sub", "Mac 桌面 · 菜单栏", "Mac desktop · menu bar"),
    P("showcase.plat.ready", "已支持", "Supported"),
    P("showcase.footer.caps_title", "{{caps}} 项能力 · {{agents}} 个助手", "{{caps}} capabilities · {{agents}} agents"),
    P("showcase.footer.caps_lead", "从想法到可用，常用能力一站配齐", "From idea to live — core capabilities in one place"),
    P("showcase.footer.scenes_title", "{{n}} 业务场景", "{{n}} business scenarios"),
    P("showcase.footer.scenes_lead", "办公与行业场景，点选就能用", "Office and industry scenarios — pick and go"),
    P("showcase.footer.plat_title", "{{n}} 端全覆盖", "{{n}} platforms covered"),
    P("showcase.footer.plat_lead", "一次发布，网页和手机同步可用", "Publish once — web and mobile stay in sync"),
    P("showcase.footer.bar_office", "通用办公", "General office"),
    P("showcase.footer.bar_industry", "行业场景", "Industry scenes"),
    P(
        "showcase.footer.scene_foot",
        "通用办公 {{office}} 项 · 办公 {{groups}} 大分类 · {{packs}} 个行业包",
        "General office {{office}} · {{groups}} office groups · {{packs}} industry packs",
    ),
    P("showcase.footer.aria", "平台能力总览", "Platform overview"),
]

# ── 2) Cases ─────────────────────────────────────────────────────────────────

CASE_STUDIES: list[dict] = [
    {
        "slug": "mfg-leads",
        "name": ("800 人制造企业 · 销售线索快速响应", "800-person manufacturer · faster lead response"),
        "industry": ("制造", "Manufacturing"),
        "tag": ("试点实录", "Pilot story"),
        "summary": (
            "第一次全自动外呼试点被否 → 改人工确认版 → 平均首响由约 3.2 小时缩短至 28 分钟",
            "Full-auto outbound rejected → human-confirm version → avg first response ~3.2h to 28 min",
        ),
        "pilot": (
            "诚实记录试点调整过程，比吹嘘「全自动」更能赢得内部评审同事信任。建议对外转发时一并说明人工确认路径。",
            "Documenting pilot pivots honestly beats overselling “full automation.” Share the human-confirm path when forwarding externally.",
        ),
        "metrics": [
            ("一线采纳率", "Frontline adoption"),
            ("平均首响", "Avg first response"),
            ("首年合同", "Year-one contract"),
        ],
        "story": [
            (
                "某 800 人规模精密零部件制造企业，日均新增 CRM 线索约 40 条。销售团队反馈：高价值线索经常在 2–3 小时后才首次联系，竞品已抢先触达。",
                "An 800-person precision parts maker adds ~40 CRM leads daily. Sales said high-value leads were first touched 2–3 hours later — after competitors.",
            ),
            (
                "**第一次试点**：团队选择「全自动外呼」作为首个场景。上线 4 周后遭遇销售抵制——话术不可控、客户体验差、业绩归属不清。信息部门也提出外呼合规顾虑，试点叫停。",
                "**First pilot**: “Full-auto outbound” as the first scenario. After 4 weeks, sales pushed back — uncontrolled scripts, poor CX, unclear attribution. IT raised compliance concerns; pilot stopped.",
            ),
            (
                "**方案调整**：改为「智能体草拟话术 + 人工确认后发送」。新线索进入 CRM 后 30 分钟内，智能体根据客户画像生成跟进建议，销售审阅确认后一键发送。",
                "**Pivot**: “Agent drafts + human confirms before send.” Within 30 minutes of a new CRM lead, the agent drafts follow-up from the profile; sales reviews and sends in one click.",
            ),
            (
                "**验收验证**：使用 200 条脱敏真实线索验证，平均首响 P50 从 3.2 小时降至 28 分钟，一线采纳率 72%。销售主管与信息部门书面确认达标，项目进入商务立项。",
                "**Acceptance**: 200 anonymized real leads — P50 first response 3.2h → 28 min, 72% adoption. Sales lead and IT signed off; project moved to commercial approval.",
            ),
            (
                "**可转发材料**：案例详情与 [一页纸摘要](/downloads/one-pager-mfg.pdf) 可在 [落地案例](/cases) 下载；同行业客户可参考 [制造行业方案](/industry/mfg) 场景清单。",
                "**Shareable pack**: Case detail and [one-pager](/downloads/one-pager-mfg.pdf) on [Cases](/cases); peers can browse [Manufacturing solutions](/industry/mfg).",
            ),
            (
                "**经验总结**：首个场景务必保留 [人工确认路径](/trust/security-faq)；指标需双方书面确认，诚实记录调整过程比强调「全自动」更能通过内部评审。",
                "**Lesson**: Keep a [human-confirm path](/trust/security-faq) for the first scenario; agree metrics in writing — honest pivots pass internal review better than “full auto” hype.",
            ),
        ],
    },
    {
        "slug": "retail-office",
        "name": ("连锁零售 · 智慧办公", "Retail chain · smart office"),
        "industry": ("零售", "Retail"),
        "tag": None,
        "summary": (
            "请假审批、制度问答、门店报表与通知一体化",
            "Leave approvals, policy Q&A, store reports, and notifications in one stack",
        ),
        "pilot": (
            "标准 PaaS 部署，2 周完成制度文档整理与首批场景上线。",
            "Standard PaaS rollout — policy docs organized and first scenarios live in 2 weeks.",
        ),
        "metrics": [
            ("首场景上线", "First scenario live"),
            ("门店覆盖", "Stores covered"),
            ("办公场景", "Office scenarios"),
        ],
        "story": [
            (
                "区域连锁零售企业覆盖总部与 120 余家门店，员工频繁咨询 HR 制度与排班问题。",
                "A regional chain with HQ and 120+ stores — staff constantly asked HR about policies and schedules.",
            ),
            (
                "上线请假审批、制度问答、门店报表等场景，一次发布五端可用。知识库联动后，员工自然语言提问即可获准确答复。",
                "Leave, policy Q&A, store reports — published once to five platforms. With the knowledge base, staff get accurate answers in natural language.",
            ),
            (
                "**部署方式**：采用 [PaaS 标准](/pricing) 按坐席订阅，2 周完成制度文档整理与知识库导入。",
                "**Deployment**: [Standard PaaS](/pricing) per-seat subscription; policy docs and KB imported in 2 weeks.",
            ),
            (
                "**推广节奏**：总部 HR 先试点 2 周，再向 120 家门店分批开放；详见 [一页纸摘要](/downloads/one-pager-retail.pdf)。",
                "**Rollout**: HQ HR pilot 2 weeks, then phased store rollout — see [one-pager](/downloads/one-pager-retail.pdf).",
            ),
        ],
    },
    {
        "slug": "logistics-tracking",
        "name": ("物流货代 · 运单跟踪", "Freight forwarder · shipment tracking"),
        "industry": ("物流", "Logistics"),
        "tag": None,
        "summary": (
            "运单跟踪、客服问答、报价审批全流程值守",
            "Shipment tracking, support Q&A, quote approvals — end-to-end coverage",
        ),
        "pilot": (
            "试点周期 14 天，用 500 条历史运单脱敏数据验证准确率。",
            "14-day pilot with 500 anonymized historical shipments to verify accuracy.",
        ),
        "metrics": [
            ("工单下降", "Ticket reduction"),
            ("自助查询", "Self-service queries"),
            ("满意度提升", "Satisfaction lift"),
        ],
        "story": [
            (
                "中型物流货代企业客户与业务员需频繁查询运单状态、预计到达时间与异常原因。",
                "Mid-size forwarder — customers and reps constantly check status, ETA, and exception reasons.",
            ),
            (
                "智能体对接 TMS 系统返回实时数据，异常运单自动通知相关业务员。上线 30 天后人工客服工单量下降约 35%。",
                "Agent pulls live TMS data; exceptions notify owners. After 30 days, human support tickets fell ~35%.",
            ),
            (
                "**试点设计**：14 天、500 条脱敏运单验证查询准确率；异常推送规则由业务主管配置。",
                "**Pilot design**: 14 days, 500 anonymized shipments; exception rules configured by ops leads.",
            ),
            (
                "更多物流场景见 [物流行业方案](/industry/logistics) 与 [一页纸摘要](/downloads/one-pager-logistics.pdf)。",
                "More logistics scenarios: [Logistics pack](/industry/logistics) and [one-pager](/downloads/one-pager-logistics.pdf).",
            ),
        ],
    },
]

CASE_CHROME: list[tuple[str, str, str]] = [
    P("case.list.sublabel", "客户案例", "Customer story"),
    P("case.list.read", "查看完整案例", "Read full case"),
    P("case.list.cta", "预约演示 · 获取同行业材料包", "Book a demo · get industry pack"),
]

# ── 3) News ──────────────────────────────────────────────────────────────────

NEWS_CATS: list[tuple[str, str, str]] = [
    P("news.cat.enterprise", "企业新闻", "Company news"),
    P("news.cat.brand", "品牌活动", "Brand & events"),
    P("news.cat.product", "产品动态", "Product updates"),
]

NEWS_ARTICLES: list[dict] = [
    {
        "slug": "waic-2026-blockhub-forum",
        "title": (
            "定档7月20日！积木仓将亮相 WAIC 2026 企业智能体应用专场",
            "July 20 confirmed — BlockHub at WAIC 2026 enterprise agent forum",
        ),
        "summary": (
            "三大看点前瞻 · 20 行业方案现场演示 · 预约闭门交流",
            "Three highlights · 20 industry demos live · book a private session",
        ),
        "body": [
            (
                "2026 世界人工智能大会（WAIC）即将开幕。积木仓 BlockHub 已确认参与企业智能体应用专场，与生态伙伴共话「五分钟搭好、打开就能用」的落地路径。",
                "WAIC 2026 opens soon. BlockHub joins the enterprise agent forum to discuss a “five-minute build, ready to use” delivery path with partners.",
            ),
            (
                "**专场看点一：20 行业方案站集中展示**。制造、零售、物流、医疗、教育等独立方案页将现场演示，观众可扫码进入对应行业场景清单。",
                "**Highlight 1: 20 industry solution sites**. Manufacturing, retail, logistics, healthcare, education — scan to browse each scenario list.",
            ),
            (
                "**看点二：意图识别创建全流程**。从自然语言描述到模板推荐、模块搭配、五端发布，完整走通 5 分钟配置体验。",
                "**Highlight 2: Intent-driven create end-to-end**. Natural language → template picks → modules → five-platform publish in ~5 minutes.",
            ),
            (
                "**看点三：信任合规资料一站领取**。信息部门关心的数据流图、部署对比与安全问卷预填版，现场扫码即可下载。",
                "**Highlight 3: Trust pack on-site**. Data-flow diagrams, deployment comparison, pre-filled security questionnaire — scan to download.",
            ),
            (
                "欢迎通过官网预约演示，或在 WAIC 现场到访积木仓展台交流试点方案。",
                "Book a demo on the site or visit the BlockHub booth at WAIC to discuss pilots.",
            ),
        ],
    },
    {
        "slug": "blockhub-1-2",
        "title": (
            "积木仓 1.2：意图识别 + 20 个行业方案站",
            "BlockHub 1.2: intent recognition + 20 industry sites",
        ),
        "summary": (
            "能力目录升级 · 行业方案丰富 · 全站智能体助手",
            "Capability catalog upgrade · richer industry packs · site-wide agent assistant",
        ),
        "body": [
            (
                "积木仓 1.2 正式发布。本次升级围绕「更快选对场景、更快出可转发材料」两个目标展开。",
                "BlockHub 1.2 is live — focused on picking the right scenarios faster and producing shareable materials sooner.",
            ),
            (
                "**能力目录升级**：原子能力模块增至 43 项，场景模板覆盖 115+ 业务场景。创建流程支持意图识别，用户用自然语言描述需求后，系统可推荐匹配的模板与行业方案包。",
                "**Catalog upgrade**: 43 atomic capabilities, 115+ scenario templates. Create flow uses intent recognition to recommend templates and industry packs from natural language.",
            ),
            (
                "**20 个行业方案站**：每个行业独立落地页，包含典型场景、前置条件、不适用边界与相关案例链接。制造、零售、物流、医疗等高频行业已上线完整方案包。",
                "**20 industry sites**: Each with scenarios, prerequisites, boundaries, and case links. Manufacturing, retail, logistics, healthcare packs are complete.",
            ),
            (
                "**全站智能体助手**：顶栏与各子页接入统一助手，可解答安全合规问题、生成试点清单、推荐下载资料。预约演示过程本身即为智能体协作体验。",
                "**Site-wide agent**: One assistant in the header and subpages — security Q&A, pilot checklists, download recommendations. Booking a demo is itself an agent experience.",
            ),
            (
                "后续版本将补充定价计算器、角色入口页与更多客户案例详情。欢迎通过官网预约演示体验 1.2 新能力。",
                "Next releases add pricing calculator, role landing pages, and more case detail. Book a demo to try 1.2.",
            ),
        ],
    },
    {
        "slug": "deepseek-integration-2026",
        "title": (
            "适配 DeepSeek · 积木仓意图识别与行业 enrich 全面接入大模型",
            "DeepSeek integration · intent and industry enrich on LLM",
        ),
        "summary": (
            "创建推荐 · 行业文案丰富 · 模块补全 · 失败自动回退",
            "Create recommendations · industry copy enrich · module completion · auto fallback",
        ),
        "body": [
            (
                "积木仓 1.2 版本完成 DeepSeek 大模型深度集成，覆盖创建流程意图识别、20 行业方案站文案 enrich、能力模块智能补全等核心链路。",
                "BlockHub 1.2 deeply integrates DeepSeek across create intent, 20 industry site enrich, and smart module completion.",
            ),
            (
                "用户在首页输入业务需求后，系统可结合能力目录与行业包，给出可解释的推荐结果与置信度；低置信度场景会引导补充信息而非强行匹配。",
                "Homepage business input yields explainable recommendations with confidence; low confidence prompts for more info instead of forcing a match.",
            ),
            (
                "行业独立站支持「大模型重新丰富」：方案总述、场景提示与推荐模块可按行业语境自动改写，并标注文案来源。",
                "Industry sites support LLM re-enrich — overview, scenario hints, and module picks rewritten in industry context with source labels.",
            ),
            (
                "所有大模型调用均保留静态 fallback，API 不可用时不阻断页面与创建流程，保障演示与试点环境稳定。",
                "Every LLM call has static fallback — pages and create flow keep working if the API is down.",
            ),
        ],
    },
    {
        "slug": "wenbo-2026-blockhub",
        "title": (
            "积木仓亮相 2026 文博会 · AI 赋能 20 行业数字化方案",
            "BlockHub at 2026 CICIF · AI for 20 industries",
        ),
        "summary": (
            "现场体验意图识别创建 · 行业方案一站浏览",
            "Live intent create · browse industry solutions",
        ),
        "body": [
            (
                "第 22 届中国（深圳）国际文化产业博览交易会期间，积木仓 BlockHub 携 20 个行业深度包与 115+ 场景模板参展。",
                "At the 22nd Shenzhen CICIF, BlockHub showcased 20 industry packs and 115+ scenario templates.",
            ),
            (
                "展台设置「行业方案墙」与「5 分钟创建」体验区：观众可选择制造、零售、政务、教育等行业，现场生成可转发材料包。",
                "Booth featured an industry wall and 5-minute create zone — pick manufacturing, retail, gov, education and get a shareable pack on site.",
            ),
            (
                "多家文化科技企业与积木仓达成试点意向，重点场景包括活动报名、内容审核辅助、知识库问答与多端员工应用。",
                "Several culture-tech firms signed pilot intent — event signup, content review assist, KB Q&A, multi-platform employee apps.",
            ),
            (
                "积木仓坚持「人工确认版优先」的落地策略，尤其在对外沟通场景保留审批节点，受到政企客户欢迎。",
                "BlockHub’s “human-confirm first” approach — keeping approval nodes for external comms — resonated with gov and enterprise buyers.",
            ),
        ],
    },
    {
        "slug": "huawei-cloud-ecosystem-2026",
        "title": (
            "积木仓加入华为云初创生态 · 共建企业智能体交付方案",
            "BlockHub joins Huawei Cloud startup ecosystem",
        ),
        "summary": (
            "混合部署 · 行业模板 · 联合 Go-To-Market",
            "Hybrid deploy · industry templates · joint GTM",
        ),
        "body": [
            (
                "积木仓与华为云达成生态合作意向，面向制造、能源、政务等行业输出可复制的智能体应用交付方案。",
                "BlockHub and Huawei Cloud partner to deliver repeatable agent apps for manufacturing, energy, government, and more.",
            ),
            (
                "合作涵盖混合部署参考架构、对象存储与模型 API 对接、以及面向渠道伙伴的行业方案包共建。",
                "Cooperation covers hybrid reference architecture, object storage and model API integration, and channel industry packs.",
            ),
            (
                "双方将在 Q3 联合举办两场线上工作坊，主题覆盖「信息部门 30 分钟过审」与「销售场景 7 天试点」。",
                "Two Q3 workshops: “IT approval in 30 minutes” and “7-day sales pilot.”",
            ),
        ],
    },
    {
        "slug": "edu-industry-pack-launch",
        "title": (
            "教育培训行业方案站焕新 · 统一学院风模板上线",
            "Education industry site refresh · unified academic template",
        ),
        "summary": (
            "20 行业视觉统一 · 独立 Hero · 场景清单 enrich",
            "Unified visuals across 20 industries · dedicated hero · enriched scenario lists",
        ),
        "body": [
            (
                "积木仓 20 个行业独立站完成视觉升级，统一采用学院风浅色模板，差异仅保留各行业主题色。",
                "All 20 industry sites refreshed with a unified light academic template — theme color per industry only.",
            ),
            (
                "每个行业站包含方案总述、场景清单、页面模板示意与底部「五分钟搭好应用」CTA，支持 Web / iOS / Android / Windows / macOS 五端说明。",
                "Each site includes overview, scenario list, page template preview, and “build in five minutes” CTA with five-platform coverage.",
            ),
            (
                "教育培训、通用办公、制造、零售等高频行业已补充大模型 enrich 文案与场景提示，缩短销售材料准备时间。",
                "Education, office, manufacturing, retail packs now have LLM-enriched copy and scenario hints to speed sales materials.",
            ),
        ],
    },
    {
        "slug": "iso27001-alignment-update",
        "title": (
            "积木仓发布信息安全对齐说明更新 · 信任中心资料包 v1.2",
            "Security alignment update · Trust Center pack v1.2",
        ),
        "summary": (
            "子处理器清单 · 日志样例 · 50 题问卷 42 题预填",
            "Sub-processor list · log samples · 42/50 questionnaire pre-fill",
        ),
        "body": [
            (
                "信任与合规中心资料包更新至 v1.2，新增子处理器列表、操作日志字段样例与删数流程示意图。",
                "Trust Center pack v1.2 adds sub-processor list, audit log field samples, and deletion flow diagram.",
            ),
            (
                "针对常见 50 题安全问卷，预填版本覆盖 42 题并标注来源页码，帮助 IT 团队缩短评估周期。",
                "Pre-filled 42 of 50 common security questions with source page refs to shorten IT assessments.",
            ),
            (
                "官网各子页接入统一智能体助手，可直接提问数据存储、模型训练与部署边界等问题。",
                "Site-wide agent answers data storage, model training, and deployment boundary questions.",
            ),
        ],
    },
    {
        "slug": "mfg-pilot-acceptance",
        "title": (
            "制造企业：线索首响试点验收通过",
            "Manufacturer: lead response pilot accepted",
        ),
        "summary": (
            "200 条真实线索 · 平均首响 28 分钟 · 人工确认版",
            "200 real leads · 28 min avg first response · human-confirm version",
        ),
        "body": [
            (
                "某 800 人规模制造企业完成销售线索快速响应场景的试点验收，项目进入商务立项阶段。",
                "An 800-person manufacturer completed acceptance for fast lead response; project enters commercial approval.",
            ),
            (
                "**背景**：该企业日均新增 CRM 线索约 40 条，一线销售平均首响时长约 3.2 小时，部分高价值线索因响应滞后流失。",
                "**Background**: ~40 new CRM leads daily; avg first response ~3.2 hours — high-value leads lost to delay.",
            ),
            (
                "**试点方案**：采用「智能体草拟话术 + 人工确认发送」模式。新线索进入 CRM 后 30 分钟内，智能体根据客户画像与历史成交记录生成跟进建议，销售确认后一键发送。",
                "**Pilot**: Agent drafts + human confirms. Within 30 minutes, follow-up from profile and history; sales sends in one click.",
            ),
            (
                "**验收指标**：使用 200 条脱敏真实线索验证，平均首响从 3.2 小时缩短至 28 分钟，一线采纳率 72%，销售主管签字确认达标。",
                "**Metrics**: 200 anonymized leads — first response 3.2h → 28 min, 72% adoption, sales lead sign-off.",
            ),
            (
                "该案例详情与对内转发材料包已在官网案例中心开放，欢迎同行业客户参考。",
                "Case detail and internal share pack are live in the case center for peer reference.",
            ),
        ],
    },
    {
        "slug": "force-conference-2026",
        "title": (
            "积木仓亮相火山引擎 FORCE 大会 · 共探 Agent 工业化交付",
            "BlockHub at Volcano Engine FORCE · industrial agent delivery",
        ),
        "summary": (
            "模块积木 · 行业方案 · 语音智能体演示",
            "Modular blocks · industry packs · voice agent demo",
        ),
        "body": [
            (
                "在 FORCE 原力大会现场，积木仓展示从意图识别到五端发布的完整 Agent 应用交付链路。",
                "At FORCE, BlockHub demoed intent recognition through five-platform agent app delivery.",
            ),
            (
                "演示重点包括上海话语音智能体、销售线索首响与设备报修等行业场景，强调真实试点指标与调整过程透明。",
                "Demos included Shanghai dialect voice, lead response, device repair — real pilot metrics and transparent pivots.",
            ),
            (
                "现场与多家 ISV 交流生态对接，能力目录已开放 custom 扩展与 Flutter 真设备 API 说明。",
                "Met ISVs on ecosystem integration; catalog supports custom extensions and Flutter device API docs.",
            ),
        ],
    },
    {
        "slug": "campus-recruiting-2026",
        "title": (
            "积木仓 2026 全球校园招聘启动 · 产品工程双轨并行",
            "BlockHub 2026 campus hiring · product & engineering tracks",
        ),
        "summary": (
            "长沙 · 深圳 · 远程协作 · AI 原生产品团队",
            "Changsha · Shenzhen · remote · AI-native product team",
        ),
        "body": [
            (
                "积木仓 BlockHub 2026 届全球校园招聘正式启动，开放产品、前端、后端、Flutter 与 AI 应用工程等岗位。",
                "BlockHub 2026 campus hiring opens roles in product, frontend, backend, Flutter, and AI application engineering.",
            ),
            (
                "团队采用 AI 原生研发流程，新人将参与行业方案包、意图识别与运行时五端发布等核心产品线。",
                "AI-native R&D — new hires work on industry packs, intent recognition, and runtime five-platform publish.",
            ),
            (
                "欢迎通过官网「预约演示」通道提交简历备注，或关注公众号获取内推信息。",
                "Submit résumé notes via “Book a demo” on the site or follow our WeChat for referrals.",
            ),
        ],
    },
    {
        "slug": "agent-selection-checklist",
        "title": (
            "2026 企业智能体选型清单（制造版）发布",
            "2026 enterprise agent selection checklist (manufacturing)",
        ),
        "summary": (
            "先定约束 · 试点 7–14 天 · 保留人工确认路径",
            "Set constraints first · 7–14 day pilot · keep human confirm",
        ),
        "body": [
            (
                "制造企业在评估 AI 智能体平台时，常见问题不是「功能够不够」，而是「能不能过信息部门、销售愿不愿用」。",
                "For manufacturers, the question isn’t “enough features?” but “will IT approve and sales actually use it?”",
            ),
            (
                "**第一步：先定约束，再比功能**。在选型初期明确三项硬约束：数据是否出境、是否需要对接现有 ERP/CRM、是否要求人工确认节点。",
                "**Step 1: constraints before features**. Data residency, ERP/CRM integration, human-confirm nodes.",
            ),
            (
                "**第二步：场景不超过 3 个**。建议首批试点聚焦 1–2 个可量化场景，例如线索首响、设备报修、SOP 问答。",
                "**Step 2: ≤3 scenarios**. First pilot: 1–2 measurable cases — lead response, repair, SOP Q&A.",
            ),
            (
                "**第三步：试点周期 7–14 天**。用真实脱敏数据验证，指标需双方书面确认。",
                "**Step 3: 7–14 day pilot**. Real anonymized data; metrics agreed in writing.",
            ),
            (
                "**第四步：保留人工确认路径**。智能体辅助 + 人工确认是更稳妥的落地路径。",
                "**Step 4: human-confirm path**. Agent assist + human approval is the safer rollout.",
            ),
        ],
    },
    {
        "slug": "trust-center-launch",
        "title": (
            "信任与合规中心上线：信息部门一站式过审",
            "Trust Center live: one-stop IT approval",
        ),
        "summary": (
            "数据流图 · 部署对比 · 安全问卷预填 · 资料可下载",
            "Data-flow diagrams · deployment compare · pre-filled questionnaire · downloads",
        ),
        "body": [
            (
                "积木仓官网正式上线「信任与合规中心」独立页面，面向企业信息部门与安全团队。",
                "BlockHub launches a dedicated Trust & Compliance Center for IT and security teams.",
            ),
            (
                "中心收录数据流与存储说明、SaaS/混合/私有化部署对比、已支持系统集成清单、数据处理协议摘要等资料，均可直接下载。",
                "Hosts data-flow and storage docs, SaaS/hybrid/private deployment comparison, integration list, DPA summary — all downloadable.",
            ),
            (
                "针对常见 50 题安全问卷，我们提供 42 题预填版本并标注来源页码，帮助 IT 团队缩短文档往来周期。",
                "42/50 security questionnaire pre-filled with source pages to shorten IT back-and-forth.",
            ),
            (
                "各子页面接入智能体助手，可直接提问「客户数据会不会用于模型训练」等问题，获得有据可查的解答。",
                "Subpages include an agent for questions like “Is customer data used for model training?” with cited answers.",
            ),
        ],
    },
    {
        "slug": "retail-office-go-live",
        "title": (
            "连锁零售客户智慧办公场景全量上线",
            "Retail chain: smart office scenarios fully live",
        ),
        "summary": (
            "请假审批 · 制度问答 · 五端同步 · 5 分钟配置首场景",
            "Leave · policy Q&A · five platforms · first scenario in 5 minutes",
        ),
        "body": [
            (
                "某区域连锁零售企业完成积木仓智慧办公场景的全量上线，覆盖总部与 120 余家门店。",
                "A regional retail chain completed full BlockHub smart office rollout across HQ and 120+ stores.",
            ),
            (
                "**上线场景**：员工请假审批、报销指引、制度与福利问答、门店排班查询。",
                "**Live scenarios**: leave approval, expense guidance, policy/benefits Q&A, store schedule lookup.",
            ),
            (
                "**多端覆盖**：一次发布，网页版、iOS、Android、Windows 与 macOS 五端同步可用。",
                "**Multi-platform**: one publish — Web, iOS, Android, Windows, macOS.",
            ),
            (
                "客户反馈：「以前找 HR 问制度要翻微信群，现在手机上 10 秒就有答案。」",
                "Customer quote: “Used to dig through WeChat for HR policies — now 10 seconds on my phone.”",
            ),
        ],
    },
    {
        "slug": "why-not-auto-outbound",
        "title": (
            "积木仓发布销售 AI 落地白皮书：为何不建议冷启动全自动外呼",
            "Sales AI whitepaper: why not cold-start full-auto outbound",
        ),
        "summary": (
            "销售抵制 · 合规顾虑 · 人工确认版更稳妥",
            "Sales pushback · compliance concerns · human-confirm is safer",
        ),
        "body": [
            (
                "我们在多个制造企业试点中观察到：「全自动外呼」作为首个场景，往往遭遇销售团队抵制与合规部门担忧。",
                "Across manufacturing pilots, “full-auto outbound” as the first scenario often faces sales resistance and compliance concerns.",
            ),
            (
                "**更稳妥的路径**：智能体草拟个性化话术，销售审阅确认后发送。",
                "**Safer path**: Agent drafts personalized scripts; sales reviews and sends.",
            ),
            (
                "某制造客户从全自动外呼调整为人工确认版后，采纳率从不足 20% 提升至 72%。",
                "One manufacturer pivoted to human-confirm — adoption rose from under 20% to 72%.",
            ),
        ],
    },
    {
        "slug": "logistics-tracking-live",
        "title": (
            "物流货代企业运单跟踪智能问答上线",
            "Freight forwarder shipment tracking Q&A live",
        ),
        "summary": (
            "运单查询 · 状态推送 · 7×24 值守 · 客服工单下降 35%",
            "Shipment lookup · status push · 24/7 · support tickets −35%",
        ),
        "body": [
            (
                "某中型物流货代企业上线运单跟踪与客服问答智能体，实现 7×24 自助查询。",
                "A mid-size forwarder launched shipment tracking and support Q&A agents for 24/7 self-service.",
            ),
            (
                "客户与业务员可通过自然语言查询运单状态、预计到达时间、异常原因与签收凭证。",
                "Customers and reps query status, ETA, exceptions, and proof of delivery in natural language.",
            ),
            (
                "上线 30 天后，人工客服工单量下降约 35%，客户满意度评分提升 0.6 分（5 分制）。",
                "After 30 days, human tickets fell ~35%; satisfaction up 0.6 on a 5-point scale.",
            ),
        ],
    },
]

# ── 4) Roles ─────────────────────────────────────────────────────────────────

ROLE_PAGES: list[dict] = [
    {
        "key": "sales-ops",
        "title": ("销售与运营同事", "Sales & operations"),
        "subtitle": ("快速响应、内部转发、试点验收材料", "Fast response, internal sharing, pilot acceptance materials"),
        "cta": ("预约演示 · 获取可转发材料包", "Book a demo · get shareable pack"),
        "questions": [
            ("一线销售为什么愿意用？", "Why will frontline sales actually use it?"),
            ("平均首响能缩短多少？", "How much can first response improve?"),
            ("有没有同行业制造案例？", "Any manufacturing peer cases?"),
            ("试点要多长时间？", "How long does a pilot take?"),
            ("如何向老板汇报 ROI？", "How do I report ROI to leadership?"),
        ],
        "downloads": [
            ("制造行业客户案例", "Manufacturing customer case"),
            ("行业方案一页纸 · 智能制造", "Industry one-pager · smart manufacturing"),
            ("价格与套餐说明", "Pricing & plans"),
        ],
    },
    {
        "key": "it",
        "title": ("信息部门同事", "IT & security"),
        "subtitle": ("安全预审、集成对接、部署方式", "Security review, integrations, deployment"),
        "cta": ("进入信任与合规中心", "Go to Trust Center"),
        "questions": [
            ("数据存在哪里？会不会出境？", "Where is data stored? Does it leave the country?"),
            ("如何对接现有 CRM/ERP？", "How do we connect existing CRM/ERP?"),
            ("PaaS 和私有化怎么选？", "PaaS vs on-prem — how to choose?"),
            ("安全问卷有没有预填版？", "Is there a pre-filled security questionnaire?"),
            ("操作日志能否导出审计？", "Can audit logs be exported?"),
        ],
        "downloads": [
            ("安全白皮书", "Security whitepaper"),
            ("系统集成清单", "Integration checklist"),
            ("信任与合规中心", "Trust & Compliance Center"),
        ],
    },
    {
        "key": "finance",
        "title": ("财务同事", "Finance"),
        "subtitle": ("预算框架、付款方式、TCO 说明", "Budget framework, payment terms, TCO"),
        "cta": ("查看定价说明", "View pricing"),
        "questions": [
            ("首年大概多少预算？", "Rough year-one budget?"),
            ("按坐席还是按项目？", "Per seat or per project?"),
            ("付款里程碑怎么安排？", "How are payment milestones structured?"),
            ("续费涨幅如何约定？", "How is renewal pricing agreed?"),
            ("有没有总拥有成本说明？", "Is there a TCO overview?"),
        ],
        "downloads": [
            ("定价框架说明", "Pricing framework"),
            ("行业方案一页纸 · 智能制造", "Industry one-pager · smart manufacturing"),
        ],
    },
    {
        "key": "procurement",
        "title": ("采购同事", "Procurement"),
        "subtitle": ("招标资质、SLA、合同条款", "Bid qualifications, SLA, contract terms"),
        "cta": ("预约演示 · 获取资质包", "Book a demo · get qualification pack"),
        "questions": [
            ("是否支持招标所需资质材料？", "Do you provide bid qualification materials?"),
            ("SLA 如何承诺？", "What SLA do you commit to?"),
            ("数据处理协议是否标准？", "Is the DPA standard?"),
            ("能否提供参考合同样本？", "Can you share a reference contract?"),
            ("供应商准入需要哪些文件？", "What files are needed for vendor onboarding?"),
        ],
        "downloads": [
            ("DPA 摘要", "DPA summary"),
            ("部署模式对比", "Deployment modes comparison"),
            ("定价与 SLA 说明", "Pricing & SLA"),
        ],
    },
]

# ── 5) Pricing ───────────────────────────────────────────────────────────────

SMART_PAGE_ZH = "智能出页"
SMART_PAGE_EN = "Smart page generation"
COMPOSE_EDIT_ZH = "对话改页"
COMPOSE_EDIT_EN = "Compose edit"

PRICING_STATIC: list[tuple[str, str, str]] = [
    P("pricing.smart_page", SMART_PAGE_ZH, SMART_PAGE_EN),
    P(
        "pricing.smart_hint",
        "用一句话让 AI 生成整页可运行界面（小游戏、工具页等），也可对已生成页做二次修订；点选现成正式能力不占此次数",
        "Describe in one sentence to generate a full interactive page (mini-games, tools, etc.) or revise an existing page; picking catalog capabilities does not count",
    ),
    P("pricing.compose_edit", COMPOSE_EDIT_ZH, COMPOSE_EDIT_EN),
    P(
        "pricing.compose_hint",
        "在 Runtime 用自然语言改菜单、表单字段与控件（例如「请假开始日期改成日期选择」）；每次成功改动计 1 次，澄清问答不计次",
        "In Runtime, change menus, form fields, and widgets in natural language (e.g. “change leave start to date picker”); each successful change counts once; clarifications do not",
    ),
    P(
        "pricing.tip",
        "Plus 版仅限 ≤3 人微型团队使用，企业规模化商用请选购 Business 及以上版本",
        "Plus is for micro teams of ≤3 people only; choose Business or above for scaled commercial use",
    ),
]

PRICING_TIERS: dict[str, dict] = {
    "c_free": {
        "range": ("¥0/永久", "¥0 forever"),
        "desc": ("个人试用、原型验证", "Personal trial and prototyping"),
        "features": [
            ("应用上限 10 个", "Up to 10 apps"),
            ("对话改页 10 次/天", "10 compose edits/day"),
            ("智能出页 1 次/天", "1 smart page generation/day"),
            ("代码下载 1 次", "1 code download"),
        ],
        "limits": [
            ("无审批流与行业包", "No approval flows or industry packs"),
            ("不可商用", "Not for commercial use"),
        ],
    },
    "c_plus": {
        "range": ("¥39/开发者/月", "¥39/developer/month"),
        "desc": ("独立开发者 / 3 人内小团队", "Indie devs / teams of ≤3"),
        "features": [
            ("应用数量不限", "Unlimited apps"),
            ("对话改页不限", "Unlimited compose edits"),
            ("智能出页不限", "Unlimited smart page generation"),
            ("代码下载不限", "Unlimited code downloads"),
        ],
        "limits": [
            ("无企业组织管理", "No enterprise org management"),
            ("禁止规模化商用", "No scaled commercial use"),
        ],
    },
    "b_business": {
        "range": ("¥148/开发者/月", "¥148/developer/month"),
        "desc": ("企业团队 / 正式业务系统", "Enterprise teams / production systems"),
        "features": [
            ("应用上限 50 个", "Up to 50 apps"),
            ("AI 出页 2000 次/月共享", "2,000 AI page generations/month shared"),
            ("企业组织与权限管理", "Org & permission management"),
            ("审批流与行业模板包", "Approval flows & industry template packs"),
            ("操作日志与基础支持", "Audit logs & basic support"),
            ("完整商用授权", "Full commercial license"),
        ],
        "limits": [],
    },
    "b_enterprise": {
        "range": ("定制", "Custom"),
        "desc": ("私有化部署 / 定制集成", "Private deploy / custom integration"),
        "features": [
            ("私有化 / 混合部署", "Private / hybrid deployment"),
            ("资源额度无上限", "Unlimited resource quotas"),
            ("SSO 单点登录", "SSO"),
            ("专属客户成功经理", "Dedicated customer success manager"),
            ("等保合规支持", "Classified protection compliance support"),
            ("深度系统集成", "Deep system integration"),
        ],
        "limits": [],
    },
}

PRICING_FAQ: list[tuple[str, str, str, str]] = [
    (
        "四档套餐怎么选？",
        "How to choose among the four tiers?",
        "试用选 Free；个人/≤3 人小团队开发选 Plus；正式业务与商用选 Business；私有化与等保选 Enterprise。",
        "Trial: Free; solo/micro team (≤3): Plus; production commercial: Business; private deploy/compliance: Enterprise.",
    ),
    (
        "Plus 能商用吗？",
        "Can Plus be used commercially?",
        "Plus 禁止规模化商用，仅限独立开发者或 ≤3 人微型团队自用/原型。企业对外业务请选 Business 及以上。",
        "Plus forbids scaled commercial use — indie devs or ≤3-person micro teams for self-use/prototypes only. External business: Business+.",
    ),
    (
        f"什么是「{COMPOSE_EDIT_ZH}」？",
        f"What is “{COMPOSE_EDIT_EN}”?",
        "在 Runtime 用自然语言改菜单、表单字段与控件（例如「请假开始日期改成日期选择」）；每次成功改动计 1 次，澄清问答不计次。从能力目录点选正式模块并发布，不占用对话改页次数。",
        "In Runtime, change menus, form fields, and widgets in natural language (e.g. “change leave start to date picker”); each successful change counts once; clarifications do not. Picking catalog modules to publish does not use compose-edit quota.",
    ),
    (
        f"什么是「{SMART_PAGE_ZH}」？",
        f"What is “{SMART_PAGE_EN}”?",
        f"{PRICING_STATIC[1][1]}。与「对话改页」不同：后者改现有菜单/表单，前者是 AI 从零做整页。",
        f"{PRICING_STATIC[1][2]}. Unlike compose edit (change existing menus/forms), smart page generation builds a whole page from scratch.",
    ),
    (
        "Free「对话改页 10 次/天」够用吗？",
        "Is Free’s 10 compose edits/day enough?",
        "够完成试用与微调。每天成功改动满 10 次后需等次日或升 Plus（不限）。",
        "Enough for trial and tweaks. After 10 successful changes/day, wait until tomorrow or upgrade to Plus (unlimited).",
    ),
    (
        f"Free「{SMART_PAGE_ZH} 1 次/天」是什么意思？",
        f"What does Free’s “1 {SMART_PAGE_EN}/day” mean?",
        "每天可用 AI 生成（或整页修订）1 个可交互页面。选型现成正式能力、用对话改页调表单，都不占这 1 次。",
        "One AI-generated (or fully revised) interactive page per day. Catalog capabilities and compose-edit form tweaks don’t use this quota.",
    ),
    (
        "Business 的「AI 出页 2000 次/月」如何计？",
        "How is Business’s 2,000 AI pages/month counted?",
        "按组织共享按月累计；对话改页在 Business 不限。点选正式能力不占 AI 出页次数。",
        "Shared per org, monthly. Compose edits unlimited on Business. Catalog picks don’t count toward AI page quota.",
    ),
    (
        "如何获取专属报价？",
        "How to get a custom quote?",
        "Business 可在线咨询或预约演示；Enterprise 私有化/等保请申请方案，顾问按场景出书面报价。",
        "Business: chat online or book a demo. Enterprise private/compliance: request a proposal for a written quote.",
    ),
]

# ── 6) Trust docs ────────────────────────────────────────────────────────────

TRUST_DOCS: list[dict] = [
    {
        "id": "security-whitepaper",
        "title": ("积木仓 BlockHub 信息安全白皮书", "BlockHub Information Security Whitepaper"),
        "subtitle": ("企业评估版 · 数据驻留 · 加密与访问控制 · 删除承诺", "Enterprise assessment · data residency · encryption & access · deletion"),
        "sections": [
            ("文档说明", "Document overview", [
                (
                    "本白皮书面向企业信息部门与安全团队，概述积木仓 BlockHub 在数据存储、传输加密、访问控制与删除承诺方面的实践。",
                    "For enterprise IT and security teams — BlockHub practices for storage, transport encryption, access control, and deletion.",
                ),
                (
                    "内容可与 [信任与合规中心](/trust) 在线资料对照；如需完整 DPA 与等保对齐说明，请 [预约演示](/#contact-demo) 获取资质包。",
                    "Cross-check with the [Trust Center](/trust); for full DPA and compliance alignment, [book a demo](/#contact-demo) for the qualification pack.",
                ),
            ]),
            ("数据存储与出境", "Data storage & cross-border", [
                (
                    "客户业务数据（应用配置、知识库文档、业务表单等）默认存储于**中国大陆境内**数据中心。",
                    "Customer business data (app config, KB docs, forms, etc.) is stored by default in **mainland China** data centers.",
                ),
                (
                    "未经客户书面授权，客户数据**不会用于**大模型训练、也不会向第三方营销共享。",
                    "Without written customer authorization, data is **not used** for model training or shared with third parties for marketing.",
                ),
                (
                    "跨境访问需客户明确开通并签署补充条款；默认关闭境外管理员登录。",
                    "Cross-border access requires explicit enablement and supplemental terms; overseas admin login is off by default.",
                ),
            ]),
            ("传输与加密", "Transport & encryption", [
                (
                    "管理端与员工端全链路 **HTTPS/TLS 1.2+**；API 调用支持 mTLS（混合/私有化可选）。",
                    "Admin and employee endpoints use **HTTPS/TLS 1.2+** end-to-end; APIs support mTLS (hybrid/private optional).",
                ),
                (
                    "静态数据采用 **AES-256** 加密存储；密钥由云 KMS 或客户 HSM 托管（私有化可选）。",
                    "Data at rest uses **AES-256**; keys in cloud KMS or customer HSM (private deploy optional).",
                ),
                (
                    "敏感字段（手机号、身份证等）支持列级脱敏展示与导出控制。",
                    "Sensitive fields (phone, ID, etc.) support column-level masking and export controls.",
                ),
            ]),
            ("访问控制与审计", "Access control & audit", [
                (
                    "基于角色的权限管理（RBAC），支持组织/部门/门店多级隔离。",
                    "Role-based access (RBAC) with org/dept/store isolation.",
                ),
                (
                    "关键操作（登录、权限变更、数据导出、智能体发布）**全量操作日志**留存，默认 180 天，可延长至 1 年。",
                    "Critical actions (login, permission changes, export, agent publish) are **fully logged** — default 180 days, extendable to 1 year.",
                ),
                (
                    "支持 CSV/JSON 导出，字段说明见 [操作日志样例](/trust/audit-log)。",
                    "CSV/JSON export supported; field reference in [audit log sample](/trust/audit-log).",
                ),
            ]),
            ("删除与退出", "Deletion & exit", [
                (
                    "合同终止或客户书面请求后 **30 个自然日内**完成数据删除，并提供删除确认函。",
                    "Within **30 calendar days** of contract end or written request, data is deleted with confirmation letter.",
                ),
                (
                    "备份卷按滚动策略清除；子处理器同步删除确认可一并提供。",
                    "Backups cleared per rolling policy; sub-processor deletion confirmation available.",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
    {
        "id": "integration",
        "title": ("积木仓企业系统集成清单", "BlockHub Enterprise Integration Checklist"),
        "subtitle": ("ERP / CRM / IM / SSO · 对接方式 · 实施周期", "ERP / CRM / IM / SSO · integration patterns · timeline"),
        "sections": [
            ("集成原则", "Integration principles", [
                (
                    "积木仓采用「标准 API + 可选 Webhook」与现有 ERP/CRM/OA 对接，避免替换核心系统。",
                    "Standard APIs + optional Webhooks to ERP/CRM/OA — no core system replacement.",
                ),
                (
                    "常见模式：只读同步主数据、线索/工单双向同步、单点登录（SSO）、消息通知回写。",
                    "Common patterns: read-only master data, bidirectional leads/tickets, SSO, notification write-back.",
                ),
            ]),
            ("已验证系统", "Verified systems", [
                (
                    "**ERP/财务**：用友 U8/YonBIP、金蝶云星空（REST/中间表；Adapter 按签约）。",
                    "**ERP/Finance**: Yonyou U8/YonBIP, Kingdee Cloud (REST/staging tables; adapters per contract).",
                ),
                (
                    "**CRM**：自建 CRM Webhook + HMAC（已落地）；纷享销客、销售易（字段模板扩展）。",
                    "**CRM**: Custom CRM Webhook + HMAC (live); Facishare, Xiaoshouyi (field template extensions).",
                ),
                (
                    "**协同**：钉钉、企业微信、飞书群机器人消息推送（已落地）；通讯录全量可扩展。",
                    "**Collab**: DingTalk, WeCom, Feishu bot push (live); full directory sync extensible.",
                ),
                (
                    "**身份**：企业微信 OAuth 扫码骨架；Azure AD、LDAP（私有化）。",
                    "**Identity**: WeCom OAuth scan skeleton; Azure AD, LDAP (private deploy).",
                ),
            ]),
            ("工程接口", "Engineering APIs", [
                (
                    "入站：`POST /api/v1/integrations/ingress/webhook`（HMAC）。",
                    "Inbound: `POST /api/v1/integrations/ingress/webhook` (HMAC).",
                ),
                (
                    "IM 探测：`POST /api/v1/integrations/{id}/test-message`。",
                    "IM probe: `POST /api/v1/integrations/{id}/test-message`.",
                ),
                (
                    "企微 SSO：`GET /api/v1/auth/oauth/wecom/start`。可下载 [系统集成清单](/downloads/integration-checklist.pdf)。",
                    "WeCom SSO: `GET /api/v1/auth/oauth/wecom/start`. Download [integration checklist](/downloads/integration-checklist.pdf).",
                ),
            ]),
            ("典型对接场景", "Typical scenarios", [
                (
                    "制造：CRM 新线索 → 积木仓智能体草拟话术 → 销售确认后回写跟进记录。",
                    "Manufacturing: new CRM lead → BlockHub agent drafts → sales confirms → follow-up written back.",
                ),
                (
                    "零售：HR 制度 PDF → 知识库 → 门店员工自然语言问答。",
                    "Retail: HR policy PDFs → knowledge base → store staff natural-language Q&A.",
                ),
                (
                    "物流：TMS 运单状态 API → 智能体 7×24 查询与异常推送。",
                    "Logistics: TMS shipment API → 24/7 agent queries and exception alerts.",
                ),
            ]),
            ("实施周期", "Implementation timeline", [
                (
                    "标准 REST 对接：**5–10 个工作日**（含联调与 UAT）。",
                    "Standard REST integration: **5–10 business days** (incl. joint test & UAT).",
                ),
                (
                    "复杂 ERP 中间表：**2–4 周**；需客户方 DBA/集成商配合。",
                    "Complex ERP staging tables: **2–4 weeks**; needs customer DBA/integrator.",
                ),
                (
                    "详细接口清单与字段映射模板可在 [预约演示](/#contact-demo) 后获取。",
                    "Detailed API list and field mapping templates available after [booking a demo](/#contact-demo).",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
    {
        "id": "dpa",
        "title": ("数据处理协议（DPA）核心条款摘要", "Data Processing Agreement (DPA) — key terms"),
        "subtitle": ("处理目的 · 子处理器 · 境内存储 · 安全义务", "Purpose · sub-processors · domestic storage · security duties"),
        "sections": [
            ("协议范围", "Scope", [
                (
                    "本摘要为积木仓标准数据处理协议（DPA）的核心条款概览，适用于 SaaS/PaaS/混合/私有化各部署模式。",
                    "Summary of BlockHub standard DPA core terms for SaaS/PaaS/hybrid/private deployment.",
                ),
                (
                    "正式签约以双方盖章版为准；采购与法务可在 [信任与合规中心](/trust) 索取完整模板。",
                    "Executed stamped version governs; procurement/legal can request full template at [Trust Center](/trust).",
                ),
            ]),
            ("处理目的与类别", "Purpose & categories", [
                (
                    "处理目的：提供智能体应用托管、知识库检索、多端发布与运维支持。",
                    "Purpose: agent app hosting, knowledge retrieval, multi-platform publish, and ops support.",
                ),
                (
                    "数据类别：企业提供的业务文本、表单、日志及必要的员工账号信息。",
                    "Categories: business text, forms, logs, and necessary employee account info provided by the customer.",
                ),
                (
                    "处理者角色：积木仓为**受托处理者**；客户为控制者。",
                    "Roles: BlockHub is **processor**; customer is controller.",
                ),
            ]),
            ("子处理器", "Sub-processors", [
                (
                    "基础设施：境内云厂商（计算/存储/网络）。",
                    "Infrastructure: domestic cloud providers (compute/storage/network).",
                ),
                (
                    "可选：短信/邮件网关、客户指定的 LLM API（如 DeepSeek）——仅在客户开启相关能力时调用。",
                    "Optional: SMS/email gateways, customer-specified LLM APIs (e.g. DeepSeek) — only when enabled.",
                ),
                (
                    "子处理器清单与变更通知机制见完整 DPA 附录。",
                    "Sub-processor list and change notification in full DPA appendix.",
                ),
            ]),
            ("境内存储与安全措施", "Domestic storage & security", [
                (
                    "默认境内存储；加密、访问控制与审计要求见 [安全白皮书](/trust/security-whitepaper)。",
                    "Domestic storage by default; encryption, access, audit per [Security whitepaper](/trust/security-whitepaper).",
                ),
                (
                    "客户可要求年度安全评估摘要或渗透测试报告（NDA 前提下）。",
                    "Annual security assessment summary or pen-test report available under NDA.",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
    {
        "id": "deployment",
        "title": ("积木仓部署模式对照说明", "BlockHub deployment modes comparison"),
        "subtitle": ("PaaS · 混合 · 私有化 · 网络边界与运维责任", "PaaS · hybrid · private · network boundary & ops ownership"),
        "sections": [
            ("选型概览", "Overview", [
                (
                    "积木仓提供 **PaaS 标准 / 混合部署 / 私有化** 三档，匹配不同数据敏感度与 IT 能力。",
                    "BlockHub offers **standard PaaS / hybrid / private** tiers for different data sensitivity and IT capacity.",
                ),
                (
                    "建议路径：PaaS 试点验证场景 → 混合部署固化集成 → 私有化满足等保/行业监管（如需要）。",
                    "Suggested path: PaaS pilot → hybrid for integrations → private for classified protection/regulatory needs.",
                ),
            ]),
            ("PaaS 标准", "Standard PaaS", [
                (
                    "应用与元数据托管在积木仓境内集群；**最快 5 分钟**完成首场景配置。",
                    "Apps and metadata on BlockHub domestic cluster; **first scenario in as little as 5 minutes**.",
                ),
                (
                    "适合 50 人以下试点、PoC 或对 IT 依赖较小的团队。",
                    "Suited for ≤50-person pilots, PoC, or teams with limited IT dependency.",
                ),
                (
                    "按坐席订阅；标准集成与基础技术支持包含在报价内。",
                    "Per-seat subscription; standard integration and basic support included.",
                ),
            ]),
            ("混合部署", "Hybrid deployment", [
                (
                    "应用控制面在积木仓，**业务数据与客户知识库**存客户 VPC 或本地数据库。",
                    "Control plane on BlockHub; **business data and customer KB** in customer VPC or on-prem DB.",
                ),
                (
                    "适合中型企业、数据不出境要求、需对接内网 ERP/CRM 的客户。",
                    "For mid-size firms, data residency requirements, and on-prem ERP/CRM integration.",
                ),
                (
                    "首年参考区间见 [定价说明](/pricing)。",
                    "Year-one reference range in [Pricing](/pricing).",
                ),
            ]),
            ("私有化", "Private deployment", [
                (
                    "全栈部署于客户机房或专属云；支持等保二级对齐与专属 SLA。",
                    "Full stack in customer datacenter or dedicated cloud; Classified Protection Level 2 alignment and dedicated SLA.",
                ),
                (
                    "适合金融、政务、大型制造等监管要求高或需本地运维的场景。",
                    "For finance, government, large manufacturing — high regulatory or local ops requirements.",
                ),
                (
                    "定制报价；含实施、培训与可选驻场。",
                    "Custom quote; includes implementation, training, optional on-site.",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
    {
        "id": "security-faq",
        "title": ("企业安全问卷答复手册（预填版）", "Enterprise security questionnaire — pre-filled handbook"),
        "subtitle": ("常见问卷框架 · 预填样例 · 适用边界说明", "Common frameworks · pre-fill samples · scope notes"),
        "sections": [
            ("使用说明", "How to use", [
                (
                    "以下为常见 50 题安全问卷中的 **42 题预填样例**（节选展示）。正式版含来源页码，可在演示后索取 Word/PDF。",
                    "**42 of 50** common security questions pre-filled below (excerpt). Full Word/PDF with source pages after demo.",
                ),
                (
                    "在线提问：各子站智能体助手支持引用本资料作答。",
                    "Ask online: site agents can cite this material in answers.",
                ),
            ]),
            ("数据与模型", "Data & models", [
                (
                    "**Q：客户数据是否用于模型训练？** A：否。默认不用于训练；可选 LLM 调用仅处理当次请求。",
                    "**Q: Is customer data used for model training?** A: No. Not used for training by default; optional LLM calls process only the current request.",
                ),
                (
                    "**Q：是否支持私有化大模型？** A：支持对接客户内网或指定 API（混合/私有化）。",
                    "**Q: Private LLM supported?** A: Yes — customer intranet or specified API (hybrid/private).",
                ),
                (
                    "**Q：删数据流程？** A：书面申请 → 30 天内删除 → 提供删除确认函。",
                    "**Q: Data deletion process?** A: Written request → delete within 30 days → confirmation letter.",
                ),
            ]),
            ("部署与合规", "Deployment & compliance", [
                (
                    "**Q：是否支持等保二级？** A：混合/私有化可参考等保二级控制项对齐；提供差距分析与整改建议。",
                    "**Q: Classified Protection Level 2?** A: Hybrid/private can align to Level 2 controls; gap analysis and remediation guidance provided.",
                ),
                (
                    "**Q：日志留存多久？** A：默认 180 天，可配置至 1 年；见 [操作日志样例](/trust/audit-log)。",
                    "**Q: Log retention?** A: Default 180 days, configurable to 1 year; see [audit log sample](/trust/audit-log).",
                ),
                (
                    "**Q：是否提供渗透测试报告？** A：年度摘要可向签约客户提供（NDA）。",
                    "**Q: Penetration test report?** A: Annual summary for contracted customers under NDA.",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
    {
        "id": "audit-log",
        "title": ("操作审计日志样例与留存策略", "Audit log samples & retention policy"),
        "subtitle": ("字段规范 · 留存周期 · 导出与 SIEM 说明", "Field spec · retention · export & SIEM"),
        "sections": [
            ("审计范围", "Audit scope", [
                (
                    "操作日志覆盖管理后台与关键 API：登录/登出、权限变更、应用发布、数据导出、智能体配置变更等。",
                    "Logs cover admin console and key APIs: login/logout, permission changes, app publish, export, agent config changes.",
                ),
                (
                    "日志用于安全审计、问题追溯与合规检查，**不可被普通管理员篡改**。",
                    "For security audit, troubleshooting, compliance — **not tamperable by regular admins**.",
                ),
            ]),
            ("字段说明（样例）", "Field reference (sample)", [
                (
                    "`timestamp` 操作时间（UTC+8）；`actor` 操作人账号；`action` 动作类型；`resource` 对象 ID；`ip` 来源 IP；`result` 成功/失败；`detail` JSON 扩展。",
                    "`timestamp` (UTC+8); `actor` account; `action` type; `resource` object ID; `ip` source; `result` success/fail; `detail` JSON extension.",
                ),
                (
                    "示例：`2026-07-08 14:32:01 | zhangsan | app.publish | app_8f3a | 10.0.1.22 | success | version=1.2.0`",
                    "Example: `2026-07-08 14:32:01 | zhangsan | app.publish | app_8f3a | 10.0.1.22 | success | version=1.2.0`",
                ),
            ]),
            ("留存与导出", "Retention & export", [
                (
                    "默认留存 **180 天**；金融/政务客户可延长至 365 天（混合/私有化）。",
                    "Default retention **180 days**; finance/gov customers up to 365 days (hybrid/private).",
                ),
                (
                    "支持按时间范围、操作人、动作类型筛选导出 CSV/JSON。",
                    "Filter by time, actor, action type; export CSV/JSON.",
                ),
                (
                    "SIEM 对接：Syslog/Webhook（私有化可选）。",
                    "SIEM: Syslog/Webhook (private deploy optional).",
                ),
            ]),
        ],
        "links": [
            ("返回信任与合规中心", "Back to Trust Center"),
            ("信任与合规中心", "Trust & Compliance Center"),
            ("落地案例", "Customer cases"),
            ("定价说明", "Pricing"),
            ("预约演示", "Book a demo"),
        ],
    },
]

# ── 7) Industry solutions (zh from TS, en below) ───────────────────────────

INDUSTRY_KEYS = [
    "office", "mfg", "sales", "med", "game", "retail", "edu", "bank", "securities",
    "insurance", "fund", "fintech", "logistics", "realestate", "hotel", "energy",
    "gov", "legal", "hr", "marketing", "construction", "agriculture", "media", "auto",
]

SOLUTIONS_EN: dict[str, list[str]] = {
    "office": ['Policy Q&A', 'Leave request', 'Overtime request', 'Travel request', 'Expense approval', 'Onboarding', 'Offboarding handover', 'Seal request', 'Meeting room booking', 'Attendance lookup', 'Benefits policy Q&A', 'Employee handbook Q&A', 'Expense reimbursement', 'Loan request', 'Contract approval', 'E-contract signing', 'Invoice verification', 'Budget lookup', 'Payment request', 'Legal Q&A', 'Compliance policy library', 'Audit document search', 'Policy document library', 'SOP work instructions', 'Training library', 'Project document sharing', 'Meeting minutes search', 'New hire onboarding', 'Internal FAQ', 'Best practices library', 'General approval', 'Multi-level countersign', 'Inbox', 'Completed items lookup', 'Delegated approval', 'Overdue reminders', 'Approval analytics', 'Conditional branching', 'Department dashboard', 'Attendance stats', 'Approval efficiency', 'Expense summary', 'Custom reports', 'Scheduled push', 'Excel export', 'Natural-language query', 'Approval alerts', 'Announcement push', 'Inbox @mentions', 'Email / SMS', 'WeCom / DingTalk', 'Subscription messages', 'Expiry reminders', 'IT ticket', 'Account permission request', 'Software install request', 'Asset checkout', 'Asset inventory', 'Network / VPN request', 'IT knowledge base', 'SAP / Yonyou integration', 'OA integration', 'CRM integration', 'HR system integration', 'SSO', 'Bidirectional data sync'],
    "mfg": ['Equipment repair', 'SOP / process Q&A', 'Production daily / OEE', 'QC approval', 'Material requisition', 'EHS hazard report', 'Scheduling / attendance', 'Maintenance plan reminders', 'Drawing / BOM search', 'Mfg · process SOP & work instruction library', 'Mfg · QC & EHS knowledge library', 'MES / ERP integration', 'Energy / carbon stats', 'Skills training records'],
    "sales": ['Lead entry', 'Lead assignment', 'Lead cleansing', 'Open pool pickup', 'Lead scoring', 'Channel source analysis', 'Competitor lead monitoring', 'Referral leads', 'Visit notes', 'Call follow-up', 'Opportunity stage', 'Lost deal reasons', 'Won deal review', 'Customer profile', 'Decision chain', 'Follow-up tasks', 'New opportunity', 'Standard quote', 'Special discount', 'Proposal quote', 'Bid quote', 'Quote versions', 'Pipeline forecast', 'Cross-sell', 'Sales contract approval', 'Contract change request', 'Payment plan registration', 'Sales invoicing request', 'Customer statement', 'AR collection reminders', 'Fulfillment milestone tracking', 'Payment confirmation', 'Product talk track library', 'Competitive comparison library', 'Success story library', 'Solution library', 'Sales FAQ', 'Sales training', 'Product demo booking', 'Sample / gift request', 'Sales funnel analysis', 'Performance ranking dashboard', 'Commission calculation lookup', 'Regional sales comparison', 'Product line sales analysis', 'Sales forecast entry', 'Sales NL query bot', 'Quota attainment dashboard', 'Field check-in', 'Visit routes', 'Joint visit registration', 'Store visits', 'Event sales', 'Opportunity expiry alerts', 'Client entertainment request', 'Joint customer visit', 'Salesforce lead sync', 'Facishare opportunity write-back', 'Xiaoshouyi lead auto-import', 'WeCom sales alerts', 'DingTalk sales alerts', 'Feishu sales alerts', 'CRM lead status sync', 'CRM opportunity stage write-back'],
    "med": ['Internal policy / compliance Q&A', 'Schedule / shift change request', 'Consumables / equipment requisition', 'Patient education materials', 'Adverse event report', 'Smart triage (external)', 'Consultation / referral request'],
    "game": ['Player FAQ', 'Support tickets', 'Event rules search', 'License compliance search', 'Game · player FAQ & event rules library', 'Game · license compliance & content review library', 'Event launch notifications', 'Outsource acceptance approval', 'License compliance review', 'Retention ops dashboard', 'Channel spend analysis', 'Game backend integration', '2048 mini-game', 'Guild report handling'],
    "retail": ['Inventory alerts', 'Member marketing', 'Promotion approval', 'Order tracking', 'Store inspection', 'Returns & exchanges', 'Supplier reconciliation', 'Member points', 'Price changes', 'Display audit'],
    "edu": ['Course scheduling', 'Question bank practice', 'School-home notices', 'Grade analysis', 'Leave approval', 'Textbook management', 'Online Q&A', 'Attendance stats', 'Tuition collection'],
    "bank": ['Corporate account KYC', 'Retail account KYC', 'Credit approval', 'AML monitoring', 'Compliance review', 'Bank compliance library', 'Credit product library', 'Risk ops dashboard'],
    "securities": ['Account suitability', 'Research due diligence', 'Compliance review', 'Product sales', 'AML monitoring', 'Securities compliance library', 'Research product library', 'Operations dashboard'],
    "insurance": ['Underwriting', 'Claims', 'Agent compliance', 'Product disclosure', 'Insurance compliance library', 'Policy terms library', 'Operations dashboard'],
    "fund": ['Product disclosure', 'Post-investment management', 'Regulatory reporting', 'Compliance review', 'Asset management compliance library', 'Product disclosure library', 'Operations dashboard'],
    "fintech": ['Risk alerts', 'Post-loan management', 'Regulatory reporting', 'Account KYC', 'Consumer finance compliance library', 'Post-loan product library', 'Operations dashboard'],
    "logistics": ['Shipment tracking', 'Inbound receiving', 'Outbound picking', 'Warehouse inventory', 'Vehicle dispatch', 'Delivery confirmation', 'Exception report', 'Route task dispatch', 'Freight settlement', 'Cold chain alerts', 'Loading queue', 'In-transit visibility dashboard', 'Last-mile delivery orders', 'Return inbound'],
    "realestate": ['Property viewing booking', 'Contract & subscription', 'Property maintenance', 'Rent collection', 'Customer follow-up', 'Listing publish', 'Renovation acceptance', 'Owner complaints', 'Lease renewal', 'Property fee collection', 'Viewing follow-up', 'Agent commission settlement', 'Handover inspection', 'Project ops dashboard'],
    "hotel": ['Room booking', 'Shift scheduling', 'Guest complaint handling', 'Inspection check-in', 'Ingredient requisition', 'Member points', 'Hygiene inspection', 'Revenue daily report'],
    "energy": ['Equipment inspection', 'Work order dispatch', 'Energy monitoring', 'Safety alerts', 'Defect report', 'Two-ticket management', 'Spare parts checkout', 'Operation logs', 'Emergency drill', 'Carbon emissions stats'],
    "gov": ['Service guide', 'Complaint intake', 'Online approval', 'Policy Q&A', 'Information disclosure', 'Supervision & tracking', 'Public services', 'Hotline routing', 'License application', 'Data statistics', 'Grid governance'],
    "legal": ['Case management', 'Contract review', 'Regulation search', 'Attorney scheduling', 'Case filing', 'Evidence archiving', 'Hearing reminders', 'Legal counsel'],
    "hr": ['Recruiting & interviews', 'Performance review', 'Training plan', 'Payroll calculation', 'Onboarding', 'Offboarding handover', 'Attendance stats', 'Talent review', 'Headcount request', 'Employee self-service', 'Org change', 'Benefits disbursement'],
    "marketing": ['Campaign planning', 'Lead assignment', 'Content review', 'Ad spend analysis', 'Competitor monitoring', 'Asset library', 'Channel attribution', 'Budget approval', 'Performance review'],
    "construction": ['Progress reporting', 'Safety inspection', 'Material requisition', 'Acceptance sign-off', 'Drawing change', 'Labor attendance', 'Quality remediation', 'Subcontract settlement', 'Hazard report', 'Completion archiving'],
    "agriculture": ['Production traceability', 'Field inspection', 'Subsidy application', 'Ag input procurement', 'Weather alerts', 'Pest & disease report', 'Cooperative management'],
    "media": ['Topic planning', 'Content review', 'Copyright management', 'Distribution scheduling', 'Public opinion monitoring', 'Asset library', 'Royalty settlement', 'Readership analytics', 'Ad scheduling'],
    "auto": ['Test drive booking', 'After-sales tickets', 'Parts requisition', 'Maintenance reminders', 'Customer callback', 'Accident reporting', 'Used car appraisal', 'Store foot traffic', 'Test drive feedback', 'Extended warranty sales'],
}

# ── 8) Enrichment chrome ─────────────────────────────────────────────────────

ENRICH_CHROME: list[tuple[str, str, str]] = [
    P("enrich.case_customer", "客户案例", "Customer story"),
    P("enrich.news_more", "查看更多动态", "View more news"),
]

# ── build & write ────────────────────────────────────────────────────────────

def _parse_ts_record_arrays(path: Path, const_name: str) -> dict[str, list[str]]:
    text = path.read_text(encoding="utf-8")
    marker = f"const {const_name}"
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f"Cannot find {const_name} in {path}")
    brace = text.find("{", start)
    depth = 0
    end = brace
    for i, ch in enumerate(text[brace:], brace):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    block = text[brace:end]
    out: dict[str, list[str]] = {}
    for m in re.finditer(r"(\w+)\s*:\s*\[(.*?)\]", block, re.S):
        key = m.group(1)
        inner = m.group(2)
        items = re.findall(r"'([^']*)'", inner)
        out[key] = items
    return out


def _load_solution_zh() -> dict[str, list[str]]:
    scenes = _parse_ts_record_arrays(ROOT / "home" / "src" / "data" / "constants.ts", "SCENES")
    extended = _parse_ts_record_arrays(
        ROOT / "home" / "src" / "data" / "productShowcase.ts", "EXTENDED_SOLUTIONS"
    )
    zh: dict[str, list[str]] = {}
    for key in INDUSTRY_KEYS:
        if key in scenes and scenes[key]:
            zh[key] = scenes[key]
        else:
            zh[key] = extended.get(key, [])
    return zh


def build_pairs() -> list[tuple[str, str, str]]:
    pairs: list[tuple[str, str, str]] = []
    pairs.extend(SHOWCASE)
    pairs.extend(CASE_CHROME)
    pairs.extend(NEWS_CATS)
    pairs.extend(PRICING_STATIC)
    pairs.extend(ENRICH_CHROME)

    for case in CASE_STUDIES:
        slug = case["slug"]
        pairs.append(P(f"case.{slug}.name", case["name"][0], case["name"][1]))
        pairs.append(P(f"case.{slug}.industry", case["industry"][0], case["industry"][1]))
        if case.get("tag"):
            pairs.append(P(f"case.{slug}.tag", case["tag"][0], case["tag"][1]))
        pairs.append(P(f"case.{slug}.summary", case["summary"][0], case["summary"][1]))
        pairs.append(P(f"case.{slug}.pilot", case["pilot"][0], case["pilot"][1]))
        for i, (ml, me) in enumerate(case["metrics"]):
            pairs.append(P(f"case.{slug}.metric.{i}.label", ml, me))
        for i, (sl, se) in enumerate(case["story"]):
            pairs.append(P(f"case.{slug}.story.{i}", sl, se))

    for art in NEWS_ARTICLES:
        slug = art["slug"]
        pairs.append(P(f"news.{slug}.title", art["title"][0], art["title"][1]))
        pairs.append(P(f"news.{slug}.summary", art["summary"][0], art["summary"][1]))
        for i, (bl, be) in enumerate(art["body"]):
            pairs.append(P(f"news.{slug}.body.{i}", bl, be))

    for role in ROLE_PAGES:
        key = role["key"]
        pairs.append(P(f"role.{key}.title", role["title"][0], role["title"][1]))
        pairs.append(P(f"role.{key}.subtitle", role["subtitle"][0], role["subtitle"][1]))
        pairs.append(P(f"role.{key}.cta", role["cta"][0], role["cta"][1]))
        for i, (ql, qe) in enumerate(role["questions"]):
            pairs.append(P(f"role.{key}.q.{i}", ql, qe))
        for i, (dl, de) in enumerate(role["downloads"]):
            pairs.append(P(f"role.{key}.dl.{i}", dl, de))

    for tid, tier in PRICING_TIERS.items():
        pairs.append(P(f"pricing.{tid}.range", tier["range"][0], tier["range"][1]))
        pairs.append(P(f"pricing.{tid}.desc", tier["desc"][0], tier["desc"][1]))
        for i, (fl, fe) in enumerate(tier["features"]):
            pairs.append(P(f"pricing.{tid}.f{i}", fl, fe))
        for i, (ll, le) in enumerate(tier["limits"]):
            pairs.append(P(f"pricing.{tid}.l{i}", ll, le))

    for i, (qz, qe, az, ae) in enumerate(PRICING_FAQ):
        pairs.append(P(f"pricing.faq.{i}.q", qz, qe))
        pairs.append(P(f"pricing.faq.{i}.a", az, ae))

    for doc in TRUST_DOCS:
        did = doc["id"]
        pairs.append(P(f"trust.{did}.title", doc["title"][0], doc["title"][1]))
        pairs.append(P(f"trust.{did}.subtitle", doc["subtitle"][0], doc["subtitle"][1]))
        for j, (hzh, hen, paras) in enumerate(doc["sections"]):
            pairs.append(P(f"trust.{did}.sec.{j}.h", hzh, hen))
            for k, (pzh, pen) in enumerate(paras):
                pairs.append(P(f"trust.{did}.sec.{j}.p.{k}", pzh, pen))
        for m, (lzh, len_) in enumerate(doc["links"]):
            pairs.append(P(f"trust.{did}.link.{m}", lzh, len_))

    solution_zh = _load_solution_zh()
    for pack, items in solution_zh.items():
        en_items = SOLUTIONS_EN.get(pack, [])
        if len(en_items) != len(items):
            raise SystemExit(f"SOLUTIONS_EN[{pack!r}] length {len(en_items)} != zh {len(items)}")
        for i, (zh, en) in enumerate(zip(items, en_items)):
            pairs.append(P(f"solution.{pack}.{i}", zh, en))

    return pairs


def write_content(pairs: list[tuple[str, str, str]]) -> None:
    for loc, idx in (("zh-CN", 1), ("en-US", 2)):
        path = OUT / loc / "content.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {k: (zh if loc == "zh-CN" else en) for k, zh, en in pairs}
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"OK  {path.relative_to(ROOT)} ({len(data)} keys)")


def main() -> None:
    pairs = build_pairs()
    write_content(pairs)


if __name__ == "__main__":
    main()
