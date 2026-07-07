"""Demo data and in-memory stores for 6 Agent modules."""

from datetime import datetime, timedelta
from uuid import uuid4

# ── 智能创建 ──────────────────────────────────────────

INDUSTRY_PACK_OPTIONS = [
    {
        "key": "office",
        "name": "通用办公",
        "icon": "🏢",
        "color": "#4338ca",
        "scene_count": 65,
        "description": "65 项标准办公场景",
        "preview": "通用办公包含 8 大类 65 项标准办公场景",
    },
    {
        "key": "mfg",
        "name": "传统制造业",
        "icon": "🏭",
        "color": "#254b9c",
        "scene_count": 12,
        "description": "12 项制造业专属场景",
        "preview": "设备报修、SOP问答、质检审批、物料领用等 12 项",
    },
    {
        "key": "sales",
        "name": "销售行业",
        "icon": "📈",
        "color": "#dc2626",
        "scene_count": 12,
        "description": "12 项销售专属场景",
        "preview": "产品话术、报价审批、销售漏斗、合同审批等 12 项",
    },
    {
        "key": "med",
        "name": "医疗行业",
        "icon": "🏥",
        "color": "#059669",
        "scene_count": 12,
        "description": "12 项医疗专属场景",
        "preview": "诊疗指南、排班申请、耗材申购、不良事件上报等 12 项",
    },
    {
        "key": "game",
        "name": "游戏行业",
        "icon": "🎮",
        "color": "#7c3aed",
        "scene_count": 13,
        "description": "13 项游戏专属场景",
        "preview": "玩家FAQ、客服工单、版号审查、留存看板等 13 项",
    },
]

CREATION_WIZARD_STEPS = [
    {"step": 1, "title": "选择行业", "key": "industry"},
    {"step": 2, "title": "选择场景", "key": "scenarios"},
    {"step": 3, "title": "研判确认", "key": "feasibility"},
    {"step": 4, "title": "创建完成", "key": "complete"},
]

# ── 智能问答 ──────────────────────────────────────────

CHAT_SUGGESTIONS = [
    "TrackChat 支持哪些办公场景？",
    "如何创建一个新的审批流程？",
    "知识库支持哪些文档格式？",
    "如何对接企业微信？",
    "数据报表支持一句话查数据吗？",
]

CHAT_MODELS = ["doubao-seed-2-0-mini", "gpt-4o-mini", "qwen-max"]

_sessions: dict[str, list[dict]] = {
    "default": [
        {
            "id": "msg-1",
            "role": "assistant",
            "content": "您好！我是 TrackChat 智能助手。您可以问我公司制度、操作流程等问题；若已上传文档到知识库，我会尽量引用原文回答。",
            "created_at": (datetime.now() - timedelta(minutes=5)).isoformat(),
        }
    ]
}

RAG_RESPONSES = {
    "办公场景": "TrackChat 内置 **145 个常见业务场景**，涵盖人事行政、财务法务、知识协同、审批、报表、通知等。您可在「业务场景」中浏览完整列表，创建应用时直接勾选即可。",
    "审批": "创建审批类应用：进入「创建应用」→ 选择行业 → 勾选「请假申请」「通用审批」等 → 确认方案 → 发布。团队即可在线提交，主管在待办中处理。",
    "知识库": "知识库支持 **PDF、Word、Excel、Markdown、TXT** 等格式。上传后系统会自动整理内容，供智能问答检索引用。",
    "企业微信": "对接企业微信：在「系统对接」中配置消息推送，并在企业设置里填写企微参数，测试通过后即可发送审批提醒与公告。",
    "自然语言": "在「数据报表」中可以用一句话提问，例如「上个月审批通过率是多少？」系统会返回统计结果与图表。",
    "default": "我已收到您的问题。TrackChat 提供创建应用、智能问答、知识库、审批、报表、通知与系统对接等能力，您可以在左侧菜单进入对应功能。如需更精准回答，建议先把相关文档上传到知识库。",
}


def get_chat_messages(session_id: str = "default") -> list[dict]:
    return _sessions.setdefault(session_id, [])


def add_chat_message(
    session_id: str,
    role: str,
    content: str,
    *,
    citations: list[dict] | None = None,
    source: str | None = None,
) -> dict:
    msg: dict = {
        "id": f"msg-{uuid4().hex[:6]}",
        "role": role,
        "content": content,
        "created_at": datetime.now().isoformat(),
    }
    if citations:
        msg["citations"] = citations
    if source:
        msg["source"] = source
    _sessions.setdefault(session_id, []).append(msg)
    return msg


def generate_rag_reply(question: str) -> str:
    for key, answer in RAG_RESPONSES.items():
        if key != "default" and key in question:
            return answer
    return RAG_RESPONSES["default"]


# ── 知识库 ──────────────────────────────────────────

KB_PIPELINE = ["上传文档", "解析内容", "分段整理", "建立索引", "智能搜索"]

KNOWLEDGE_BASES = [
    {
        "id": "kb-001",
        "name": "产品手册",
        "description": "TrackChat 产品功能与操作指南",
        "doc_count": 2,
        "chunk_count": 48,
        "status": "indexed",
        "updated_at": "2026-06-28",
    },
    {
        "id": "kb-002",
        "name": "制度政策库",
        "description": "公司规章制度与合规文档",
        "doc_count": 1,
        "chunk_count": 25,
        "status": "indexed",
        "updated_at": "2026-06-25",
    },
]

DOCUMENTS = [
    {"id": "doc-001", "kb_id": "kb-001", "name": "TrackChat用户手册v1.0.pdf", "size": "2.4 MB", "chunks": 32, "status": "indexed"},
    {"id": "doc-002", "kb_id": "kb-001", "name": "API接口文档.md", "size": "156 KB", "chunks": 16, "status": "indexed"},
    {"id": "doc-003", "kb_id": "kb-002", "name": "员工手册2026.pdf", "size": "1.8 MB", "chunks": 25, "status": "indexed"},
]

_kb_store = list(KNOWLEDGE_BASES)
_doc_store = list(DOCUMENTS)


def kb_stats() -> dict:
    indexed = sum(1 for d in _doc_store if d["status"] == "indexed")
    return {
        "knowledge_bases": len(_kb_store),
        "documents": len(_doc_store),
        "chunks": sum(d["chunks"] for d in _doc_store),
        "indexed": indexed,
    }


def search_kb(query: str) -> list[dict]:
    results = []
    for doc in _doc_store:
        if query.lower() in doc["name"].lower() or len(query) <= 2:
            results.append({
                "doc_id": doc["id"],
                "doc_name": doc["name"],
                "snippet": f"…与「{query}」相关的文档片段，来自 {doc['name']} 第 3 节…",
                "score": round(0.95 - len(results) * 0.08, 2),
            })
    return results[:5]


# ── 审批流程 ──────────────────────────────────────────

APPROVALS = [
    {"id": "appr-001", "title": "请假申请", "applicant": "张三", "department": "研发部", "status": "pending", "type": "leave", "submitted_at": "2026-07-01 09:30", "summary": "年假 3 天（7/5-7/7）"},
    {"id": "appr-002", "title": "费用报销", "applicant": "李四", "department": "市场部", "status": "pending", "type": "expense", "submitted_at": "2026-07-01 08:15", "summary": "差旅费 ¥2,680"},
    {"id": "appr-003", "title": "用印申请", "applicant": "王五", "department": "法务部", "status": "approved", "type": "seal", "submitted_at": "2026-06-30 16:00", "summary": "合同盖章（客户A）"},
    {"id": "appr-004", "title": "采购申请", "applicant": "赵六", "department": "行政部", "status": "approved", "type": "purchase", "submitted_at": "2026-06-30 14:20", "summary": "办公用品 ¥1,200"},
    {"id": "appr-005", "title": "加班申请", "applicant": "钱七", "department": "研发部", "status": "rejected", "type": "overtime", "submitted_at": "2026-06-29 18:00", "summary": "项目上线加班"},
    {"id": "appr-006", "title": "出差申请", "applicant": "孙八", "department": "销售部", "status": "pending", "type": "travel", "submitted_at": "2026-06-29 10:00", "summary": "上海客户拜访 2 天"},
]

_approval_store = list(APPROVALS)


def approval_stats() -> dict:
    return {
        "pending": sum(1 for a in _approval_store if a["status"] == "pending"),
        "approved": sum(1 for a in _approval_store if a["status"] == "approved"),
        "rejected": sum(1 for a in _approval_store if a["status"] == "rejected"),
        "total": len(_approval_store),
    }


# ── 数据报表 ──────────────────────────────────────────

REPORT_KPIS = [
    {"key": "approval_rate", "label": "审批效率", "value": "92%", "change": "+5%", "positive": True},
    {"key": "avg_time", "label": "平均处理时长", "value": "2.3h", "change": "-18%", "positive": True},
    {"key": "active_users", "label": "活跃用户", "value": "1,247", "change": "+12%", "positive": True},
    {"key": "doc_processed", "label": "文档处理量", "value": "8,562", "change": "+23%", "positive": True},
]

REPORT_NL_SUGGESTIONS = [
    "上个月审批通过率是多少？",
    "哪个功能使用最多？",
    "本周新增了多少文档？",
]

APPROVAL_TREND = {"label": "审批趋势", "growth": "+18%", "months": ["1月", "2月", "3月", "4月", "5月", "6月"], "values": [120, 150, 180, 165, 210, 245]}
CHAT_TREND = {"label": "问答趋势", "growth": "+23%", "months": ["1月", "2月", "3月", "4月", "5月", "6月"], "values": [450, 520, 610, 580, 720, 850]}

AGENT_USAGE = [
    {"agent": "智能问答", "calls": 2850, "percent": 35},
    {"agent": "审批流程", "calls": 1240, "percent": 15},
    {"agent": "知识库", "calls": 1680, "percent": 20},
    {"agent": "数据报表", "calls": 980, "percent": 12},
    {"agent": "消息通知", "calls": 760, "percent": 9},
    {"agent": "智能创建", "calls": 520, "percent": 6},
    {"agent": "系统对接", "calls": 240, "percent": 3},
]

NL_QUERY_RESPONSES = {
    "通过率": {"answer": "上个月审批通过率为 **92%**，共处理 245 单，通过 225 单，拒绝 12 单，撤回 8 单。", "chart_type": "pie"},
    "使用": {"answer": "本月使用最多的是 **智能问答**（2,850 次，占 35%），其次是知识库（1,680 次）和审批流程（1,240 次）。", "chart_type": "bar"},
  "功能": {"answer": "本月使用最多的是 **智能问答**（2,850 次，占 35%），其次是知识库（1,680 次）和审批流程（1,240 次）。", "chart_type": "bar"},
    "文档": {"answer": "本周新增文档 **23 篇**，已整理 **156 段**内容，知识库已更新。", "chart_type": "line"},
    "default": {"answer": "已收到您的查询。本月系统共处理 **8,270 次**业务请求，可用率 **99.8%**，平均响应 **45ms**。", "chart_type": "stat"},
}


def nl_query(question: str) -> dict:
    for key, resp in NL_QUERY_RESPONSES.items():
        if key != "default" and key in question:
            return {"question": question, **resp}
    return {"question": question, **NL_QUERY_RESPONSES["default"]}


# ── 消息通知 ──────────────────────────────────────────

NOTIFICATIONS = [
    {"id": "n-001", "title": "请假申请待审批", "content": "张三提交了请假申请，请及时处理", "type": "approval", "read": False, "time": "5 分钟前", "created_at": datetime.now().isoformat()},
    {"id": "n-002", "title": "知识库更新完成", "content": "「产品手册」新增 3 篇文档，索引已更新", "type": "kb", "read": False, "time": "1 小时前", "created_at": (datetime.now() - timedelta(hours=1)).isoformat()},
    {"id": "n-003", "title": "审批提醒", "content": "李四的费用报销等待您审批", "type": "approval", "read": False, "time": "2 小时前", "created_at": (datetime.now() - timedelta(hours=2)).isoformat()},
    {"id": "n-004", "title": "系统公告", "content": "TrackChat 企业智能办公平台已上线，欢迎体验", "type": "announce", "read": True, "time": "昨天", "created_at": (datetime.now() - timedelta(days=1)).isoformat()},
    {"id": "n-005", "title": "报表推送", "content": "6 月审批效率周报已生成，点击查看", "type": "report", "read": True, "time": "昨天", "created_at": (datetime.now() - timedelta(days=1)).isoformat()},
    {"id": "n-006", "title": "应用创建成功", "content": "「销售管理助手」已发布，访问链接已生成", "type": "creation", "read": True, "time": "2 天前", "created_at": (datetime.now() - timedelta(days=2)).isoformat()},
]

_notify_store = list(NOTIFICATIONS)
