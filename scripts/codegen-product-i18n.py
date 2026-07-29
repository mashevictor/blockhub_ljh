#!/usr/bin/env python3
"""Emit shared/i18n/messages/{zh-CN,en-US}/product.json for P0 product showcase."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "shared" / "i18n" / "messages"

# zh source + en translation pairs
TPL = [
    (
        "ai-chat-qa",
        "AI 智能问答",
        "AI Q&A",
        "知识协同",
        "Knowledge",
        "结合企业知识库，制度与业务问题即问即答，引用原文可追溯",
        "Answer policy and business questions from your knowledge base, with citeable sources",
        [
            ("RAG 检索增强与引用气泡", "RAG retrieval with citation bubbles"),
            ("多轮对话 SSE 流式输出", "Multi-turn chat with SSE streaming"),
            ("多模型切换与会话历史", "Model switching and chat history"),
        ],
    ),
    (
        "ai-approval",
        "AI 审批流程",
        "AI Approvals",
        "流程审批",
        "Approvals",
        "请假、报销、用印等通用审批在线提交，主管待办一键处理",
        "Submit leave, expense, and seal requests online; managers clear todos in one click",
        [
            ("提交即触发消息通知", "Submit triggers notifications"),
            ("多级会签与状态机", "Multi-level sign-off and state machine"),
            ("审批结果实时回传申请人", "Results pushed back to the requester"),
        ],
    ),
    (
        "ai-kb",
        "AI 知识库",
        "AI Knowledge Base",
        "知识数据",
        "Knowledge data",
        "PDF/Word 上传自动切片，问答与审批场景共享语义检索能力",
        "Upload PDF/Word for auto chunking; shared semantic search across Q&A and approvals",
        [
            ("pgvector 语义检索", "pgvector semantic search"),
            ("文档上传与异步解析", "Document upload and async parsing"),
            ("引用溯源到原文段落", "Citations back to source paragraphs"),
        ],
    ),
    (
        "ai-dashboard",
        "AI 数据看板",
        "AI Dashboard",
        "数据报表",
        "Analytics",
        "KPI 卡片与自然语言问数，审批与问答使用量一屏掌握",
        "KPI cards and natural-language queries for approval and Q&A usage",
        [
            ("fl_chart 图表组件", "Chart components"),
            ("一句话查数 NL Query", "One-line NL query"),
            ("近 7 日趋势真数据", "Last-7-day trends from live data"),
        ],
    ),
    (
        "ai-voice",
        "AI 上海话语音",
        "AI Shanghainese Voice",
        "智能交互",
        "Interaction",
        "电信星辰 ASR/TTS + 大模型，沪语实时语音对话，支持打断",
        "Telecom ASR/TTS + LLM for real-time Shanghainese dialogue with barge-in",
        [
            ("WebSocket 流式语音", "WebSocket streaming audio"),
            ("PCM 播放与断句识别", "PCM playback and sentence segmentation"),
            ("方言场景客服演示", "Dialect customer-service demo"),
        ],
    ),
    (
        "ai-integration",
        "AI 系统集成",
        "AI Integrations",
        "通知集成",
        "Integrations",
        "Webhook 连接器与 ETL 任务，审批联动企微/OA 推送",
        "Webhook connectors and ETL jobs; approvals push to WeCom / OA",
        [
            ("连接器 CRUD + 同步任务", "Connector CRUD + sync jobs"),
            ("审批触发站内信", "Approvals trigger in-app mail"),
            ("REST API 开放对接", "Open REST API integration"),
        ],
    ),
    (
        "ai-notify",
        "AI 消息通知",
        "AI Notifications",
        "消息通知",
        "Notifications",
        "审批提醒、公告广播与企微/钉钉多渠道触达，不漏关键节点",
        "Approval alerts, broadcasts, and WeCom/DingTalk multi-channel delivery",
        [
            ("站内信 + IM 双通道", "In-app + IM dual channel"),
            ("审批状态变更推送", "Push on approval status change"),
            ("活动公告定时发送", "Scheduled campaign announcements"),
        ],
    ),
    (
        "ai-multi-agent",
        "AI 多助手编排",
        "AI Multi-Agent",
        "智能交互",
        "Interaction",
        "问答、审批、报表多 Agent 协同，按场景自动路由到合适助手",
        "Q&A, approval, and report agents collaborate with intent-based routing",
        [
            ("意图识别自动分流", "Intent-based auto routing"),
            ("跨 Agent 上下文共享", "Cross-agent shared context"),
            ("可视化能力编排", "Visual capability orchestration"),
        ],
    ),
    (
        "ai-nl-query",
        "AI 智能问数",
        "AI Data Query",
        "数据报表",
        "Analytics",
        "用自然语言查业务数据，自动生成图表与洞察摘要",
        "Query business data in natural language; auto charts and insight summaries",
        [
            ("NL2SQL 安全沙箱", "NL2SQL in a secure sandbox"),
            ("图表一键导出", "One-click chart export"),
            ("与看板模块联动", "Works with the dashboard module"),
        ],
    ),
]

MOD = [
    ("chat_qa", "智能问答", "Smart Q&A", "智能交互", "Interaction", "结合知识库回答制度与业务问题", "Answer policy and business questions from the knowledge base", "制度政策、产品参数、FAQ", "Policies, product specs, FAQ"),
    ("approval_flow", "审批流", "Approvals", "流程审批", "Approvals", "请假、报销、通用审批在线流转", "Leave, expense, and general approvals online", "人事行政、财务报销", "HR admin, expense claims"),
    ("kb_document", "知识库", "Knowledge base", "知识数据", "Knowledge", "文档上传切片，语义检索问答", "Upload docs, chunk, and semantic Q&A", "员工手册、SOP、合同范本", "Handbooks, SOPs, contract templates"),
    ("approval_inbox", "待办中心", "Todo inbox", "流程审批", "Approvals", "聚合待我审批与已办事项", "Aggregate pending and done approvals", "主管工作台、移动审批", "Manager desk, mobile approvals"),
    ("chart_dashboard", "数据看板", "Dashboard", "可视化", "Visual", "KPI 卡片与趋势图表一屏总览", "KPI cards and trend charts on one screen", "运营日报、部门看板", "Ops daily, team boards"),
    ("notify_inapp", "站内信", "In-app mail", "通知集成", "Notify", "审批提醒与系统公告站内触达", "Approval alerts and system announcements in-app", "流程节点通知、活动广播", "Workflow alerts, campaign broadcasts"),
    ("notify_im", "企微钉钉", "WeCom / DingTalk", "通知集成", "Notify", "对接企业微信/钉钉消息推送", "Push via WeCom / DingTalk", "外勤提醒、审批催办", "Field alerts, approval nudges"),
    ("rbac_page", "角色权限", "RBAC", "权限/外部", "Access", "按角色控制页面与操作权限", "Role-based page and action control", "多部门、多租户隔离", "Multi-dept, multi-tenant isolation"),
    ("chart_funnel", "销售漏斗", "Sales funnel", "可视化", "Visual", "商机阶段转化与漏斗分析", "Stage conversion and funnel analytics", "销售团队 CRM 看板", "Sales CRM boards"),
    ("shanghai_voice", "上海话语音", "Shanghainese voice", "智能交互", "Interaction", "沪语实时语音对话智能体", "Real-time Shanghainese voice agent", "方言客服、本地化演示", "Dialect support, local demos"),
]

ATOM = [
    ("atom-chat", "智能问答", "Smart Q&A", "RAG", "RAG", "知识库检索增强，多轮对话流式输出，引用原文可溯源", "RAG-backed multi-turn streaming chat with citeable sources"),
    ("atom-shanghai", "上海话语音智能体", "Shanghainese voice agent", "方言", "Dialect", "星辰 ASR/TTS + 方言大模型沪语回复，Web/Flutter 双端实时对话", "ASR/TTS + dialect LLM for real-time Web/Flutter dialogue"),
    ("atom-voice", "普通话语音问答", "Mandarin voice Q&A", "语音", "Voice", "语音输入识别与 TTS 播报，适合外勤与无障碍场景", "Speech-to-text and TTS for field and accessibility use"),
    ("atom-multi", "多助手编排", "Multi-agent orchestration", "编排", "Orchestration", "问答、审批、报表多 Agent 按意图自动路由协同", "Route Q&A, approval, and report agents by intent"),
    ("atom-kb", "知识库检索", "Knowledge retrieval", "向量", "Vector", "文档切片 + pgvector 语义搜索，支持 PDF/Word 批量导入", "Chunking + pgvector search; batch PDF/Word import"),
    ("atom-approval", "审批 Agent", "Approval agent", "流程", "Workflow", "表单提交、会签流转、待办聚合与状态机驱动", "Forms, sign-off, todo aggregation, state machine"),
    ("atom-nl", "智能问数", "NL data query", "NL2SQL", "NL2SQL", "自然语言查业务数据，自动生成图表与摘要洞察", "Natural-language business queries with charts and insights"),
    ("atom-notify", "消息推送 Agent", "Notify agent", "通知", "Notify", "站内信、企微、钉钉多渠道触达，审批节点自动提醒", "In-app, WeCom, DingTalk; auto alerts on approval nodes"),
    ("atom-integration", "系统集成 Agent", "Integration agent", "对接", "Integrate", "Webhook/REST 连接器，ERP、OA、MES 数据双向同步", "Webhook/REST connectors; bi-dir sync with ERP/OA/MES"),
    ("atom-security", "安全合规 Agent", "Security agent", "审计", "Audit", "RBAC 权限、操作审计、敏感字段脱敏与合规留痕", "RBAC, audit trails, field masking, compliance logs"),
    ("atom-portal", "多端门户 Agent", "Multi-end portal agent", "交付", "Deliver", "一次 Schema 发布，Web/iOS/Android/Win/Mac 五端同步", "One schema publish to Web/iOS/Android/Win/Mac"),
    ("atom-creation", "智能创建 Agent", "Creation agent", "编排", "Orchestration", "描述需求自动推荐模块，评估方案后一键发布应用", "Describe needs, get module recommendations, publish in one click"),
    ("atom-compose-edit", "对话改页", "Compose edit", "CapShip", "CapShip", "用对话改菜单和页面，先自己预览；保存草稿、提交审批后，全员才看到正式效果", "Edit menus/pages via chat; preview privately; publish after approval"),
]

ORCH = [
    ("compose", "对话改页", "Compose with chat", "用自然语言改菜单与页面布局，左侧马上能看到效果；此时只影响你的预览，不影响其他人", "Change menus and layout in natural language; preview only affects you"),
    ("draft", "个人草稿", "Personal draft", "改满意后保存为自己的草稿，仅本人可见；还可继续改，或取消草稿", "Save a private draft; keep editing or discard anytime"),
    ("approve", "审批发布", "Approve & publish", "提交给管理员审批，通过后才正式生效，全员打开应用都能看到新页面", "Submit for admin approval; everyone sees it only after it passes"),
]

LLM = [
    (
        "llm-intent",
        "意图解析",
        "Intent parsing",
        "推荐大模型",
        "Recommend LLM",
        "用户用自然语言描述需求，大模型自动拆解为行业、场景与模块组合，置信度低时智能补全",
        "Describe needs in natural language; the model maps industry, scenarios, and modules",
        "描述创建 · 模块推荐",
        "Describe & recommend",
        [
            ("100 场景评估 99/100 命中", "99/100 hit rate across 100 scenarios"),
            ("关键词 + 大模型双路推荐", "Keyword + LLM dual-path recommend"),
            ("发布前 intentPublish 预检", "intentPublish pre-check before publish"),
        ],
    ),
    (
        "llm-chat",
        "智能问答",
        "Smart Q&A",
        "对话大模型",
        "Chat LLM",
        "RAG 检索增强 + 大模型 SSE 流式对话，支持多轮上下文与引用气泡展示",
        "RAG + SSE streaming chat with multi-turn context and citation bubbles",
        "制度问答 · 业务咨询",
        "Policy Q&A · business consult",
        [
            ("流式打字效果", "Streaming typewriter effect"),
            ("知识库段落引用", "Knowledge-base paragraph cites"),
            ("错误重试与多模型切换", "Retry and multi-model switch"),
        ],
    ),
    (
        "llm-contract",
        "合同起草",
        "Contract drafting",
        "生成大模型",
        "Generate LLM",
        "结构化表单填写后，由大模型自动生成完整合同正文，支持润色与条款补全",
        "Fill a structured form; the model drafts full contract text with polish and clauses",
        "法务 · 人事合同",
        "Legal · HR contracts",
        [
            ("劳动/采购等模板填空", "Labor/procurement template fill-in"),
            ("大模型生成完整合同", "LLM generates full contracts"),
            ("电子签章联动", "E-sign integration"),
        ],
    ),
    (
        "llm-flow-api",
        "数据流生成",
        "Dataflow generation",
        "编排大模型",
        "Orchestration LLM",
        "大模型为数据流各节点自动生成模拟 REST API，含输入/输出节点与字段映射",
        "Auto-generate mock REST APIs for dataflow nodes with I/O mapping",
        "集成对接 · 流程模拟",
        "Integration · flow simulation",
        [
            ("节点级 API 描述", "Per-node API descriptions"),
            ("规则兜底 + 大模型升级", "Rules fallback + LLM upgrade"),
            ("可视化数据流编排", "Visual dataflow orchestration"),
        ],
    ),
    (
        "llm-shanghai",
        "沪语对话",
        "Shanghainese dialogue",
        "方言大模型",
        "Dialect LLM",
        "上海话 ASR 识别后由方言大模型生成地道沪语回复，再 TTS 流式合成播报",
        "Shanghainese ASR → dialect LLM reply → streaming TTS",
        "上海话语音智能体",
        "Shanghainese voice agent",
        [
            ("方言 system prompt", "Dialect system prompt"),
            ("按句流式返回", "Sentence-level streaming"),
            ("与星辰语音链路串联", "Wired to telecom voice stack"),
        ],
    ),
]


def build(lang: str) -> dict[str, str]:
    zh = lang.startswith("zh")
    out: dict[str, str] = {}

    # actions / chrome
    if zh:
        out.update(
            {
                "action.try_template": "体验模板",
                "action.insert_module": "+ 插入模块",
                "action.try_capability": "体验能力",
                "action.browse_all": "浏览全部模板",
                "more.title": "更多 AI 模板",
                "more.summary": "{{capabilities}} 项能力模块 · {{industries}} 个行业包 · {{scenarios}}+ 场景可自由搭配",
                "llm.prefix": "大模型 · ",
            }
        )
    else:
        out.update(
            {
                "action.try_template": "Try template",
                "action.insert_module": "+ Insert module",
                "action.try_capability": "Try capability",
                "action.browse_all": "Browse all templates",
                "more.title": "More AI templates",
                "more.summary": "{{capabilities}} capability modules · {{industries}} industry packs · {{scenarios}}+ scenarios to mix",
                "llm.prefix": "LLM · ",
            }
        )

    for tid, nz, ne, tz, te, sz, se, feats in TPL:
        out[f"tpl.{tid}.name"] = nz if zh else ne
        out[f"tpl.{tid}.tag"] = tz if zh else te
        out[f"tpl.{tid}.summary"] = sz if zh else se
        for i, (fz, fe) in enumerate(feats):
            out[f"tpl.{tid}.f{i}"] = fz if zh else fe

    for key, nz, ne, cz, ce, dz, de, uz, ue in MOD:
        out[f"mod.{key}.name"] = nz if zh else ne
        out[f"mod.{key}.category"] = cz if zh else ce
        out[f"mod.{key}.desc"] = dz if zh else de
        out[f"mod.{key}.use"] = uz if zh else ue

    for aid, nz, ne, tz, te, sz, se in ATOM:
        out[f"atom.{aid}.name"] = nz if zh else ne
        out[f"atom.{aid}.tag"] = tz if zh else te
        out[f"atom.{aid}.summary"] = sz if zh else se

    for oid, nz, ne, sz, se in ORCH:
        out[f"orch.{oid}.title"] = nz if zh else ne
        out[f"orch.{oid}.summary"] = sz if zh else se

    for lid, nz, ne, mz, me, sz, se, scz, sce, feats in LLM:
        out[f"llm.{lid}.name"] = nz if zh else ne
        out[f"llm.{lid}.model"] = mz if zh else me
        out[f"llm.{lid}.summary"] = sz if zh else se
        out[f"llm.{lid}.scene"] = scz if zh else sce
        for i, (fz, fe) in enumerate(feats):
            out[f"llm.{lid}.f{i}"] = fz if zh else fe

    return out


def main() -> None:
    for loc in ("zh-CN", "en-US"):
        path = OUT / loc / "product.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        data = build(loc)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"OK  {path.relative_to(ROOT)} ({len(data)} keys)")


if __name__ == "__main__":
    main()
