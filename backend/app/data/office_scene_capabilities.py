"""通用办公 66 场景 → 正式 capability 映射（SSOT）。

与 Catalog seed.OFFICE_GROUPS 场景名对齐；供行业包装配、Runtime 预览、compose 使用。
策略：复用已有 Path-A 真 API，按场景配置差异化表单字段；禁止假 seed。
"""

from __future__ import annotations

from typing import Any

# name → capability_key + UI 提示（fields 供审批类 FormWidget / 预览 page_mock）
_OFFICE_SCENE_ROWS: list[dict[str, Any]] = [
    # —— 人事行政（12）——
    {
        "name": "制度政策问答",
        "category": "人事行政",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "制度政策福利智能问答",
        "page_kind": "chat_kb",
    },
    {
        "name": "请假申请",
        "category": "人事行政",
        "capability_key": "leave_request",
        "pages": "approval",
        "problem": "员工请假在线申请与主管审批",
        "page_kind": "form_list",
        "default_category": "annual",
        "form_headline": "请假申请",
        "fields": [
            {"key": "title", "label": "请假类型/时段", "placeholder": "如：年假 3 天（4/1–4/3）"},
            {"key": "department", "label": "所属部门", "placeholder": "如：行政部", "optional": True},
            {"key": "summary", "label": "事由", "placeholder": "事由、代理人…", "optional": True},
        ],
    },
    {
        "name": "加班申请",
        "category": "人事行政",
        "capability_key": "leave_request",
        "pages": "approval",
        "problem": "加班时段申请与审批",
        "page_kind": "form_list",
        "default_category": "overtime",
        "form_headline": "加班申请",
        "fields": [
            {"key": "title", "label": "加班日期与时段", "placeholder": "如：4/1 18:00–21:00"},
            {"key": "department", "label": "所属部门", "placeholder": "如：研发部", "optional": True},
            {"key": "summary", "label": "加班事由", "placeholder": "项目/紧急事项…", "optional": True},
        ],
    },
    {
        "name": "出差申请",
        "category": "人事行政",
        "capability_key": "leave_request",
        "pages": "approval",
        "problem": "出差行程申请与审批",
        "page_kind": "form_list",
        "default_category": "trip",
        "form_headline": "出差申请",
        "fields": [
            {"key": "title", "label": "目的地与日期", "placeholder": "如：上海 · 4/1–4/3"},
            {"key": "department", "label": "所属部门", "placeholder": "如：销售部", "optional": True},
            {"key": "summary", "label": "出差事由", "placeholder": "客户拜访/展会…", "optional": True},
        ],
    },
    {
        "name": "报销审批",
        "category": "人事行政",
        "capability_key": "expense_claim",
        "pages": "approval+form",
        "problem": "费用报销与发票归档",
        "page_kind": "form_list",
        "form_headline": "报销审批",
        "fields": [
            {"key": "title", "label": "费用摘要", "placeholder": "如：差旅报销 ¥1280"},
            {"key": "department", "label": "费用归属", "placeholder": "部门/项目", "optional": True},
            {"key": "summary", "label": "明细说明", "placeholder": "发票张数、是否已垫付…", "optional": True},
        ],
    },
    {
        "name": "入职办理",
        "category": "人事行政",
        "capability_key": "hire_onboard",
        "pages": "approval+kb",
        "problem": "招聘与入职指引",
        "page_kind": "form_list",
        "form_headline": "入职办理",
    },
    {
        "name": "离职交接",
        "category": "人事行政",
        "capability_key": "hire_onboard",
        "pages": "approval+form",
        "problem": "离职资产与工作交接",
        "page_kind": "form_list",
        "form_headline": "离职交接",
        "approval_type": "offboard",
        "fields": [
            {"key": "title", "label": "离职人/岗位", "placeholder": "姓名 · 岗位"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "交接事项", "placeholder": "资产、权限、文档…", "optional": True},
        ],
    },
    {
        "name": "用印申请",
        "category": "人事行政",
        "capability_key": "seal_request",
        "pages": "approval",
        "problem": "印章类型与文件用途审批",
        "page_kind": "form_list",
        "approval_type": "seal",
        "form_headline": "用印申请",
        "fields": [
            {"key": "title", "label": "印章与文件", "placeholder": "如：合同章 · 《采购协议》"},
            {"key": "department", "label": "申请部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "用途说明", "placeholder": "份数、是否外带…", "optional": True},
        ],
    },
    {
        "name": "会议室预约",
        "category": "人事行政",
        "capability_key": "meeting_booking",
        "pages": "form+list",
        "problem": "会议室时段预约",
        "page_kind": "form_list",
        "form_headline": "会议室预约",
    },
    {
        "name": "考勤查询",
        "category": "人事行政",
        "capability_key": "shift_attendance",
        "pages": "list+approval",
        "problem": "班次考勤查询申诉",
        "page_kind": "roster",
    },
    {
        "name": "福利政策咨询",
        "category": "人事行政",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "福利补贴政策问答",
        "page_kind": "chat_kb",
    },
    {
        "name": "员工手册问答",
        "category": "人事行政",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "员工手册条款问答",
        "page_kind": "chat_kb",
    },
    # —— 财务法务（10）——
    {
        "name": "费用报销",
        "category": "财务法务",
        "capability_key": "expense_claim",
        "pages": "approval+form",
        "problem": "费用报销与发票",
        "page_kind": "form_list",
        "form_headline": "费用报销",
    },
    {
        "name": "借款申请",
        "category": "财务法务",
        "capability_key": "expense_claim",
        "pages": "approval",
        "problem": "员工借款审批",
        "page_kind": "form_list",
        "default_category": "loan",
        "form_headline": "借款申请",
        "fields": [
            {"key": "title", "label": "借款金额与用途", "placeholder": "如：借款 ¥5000 · 差旅备用"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "归还计划", "placeholder": "预计归还日…", "optional": True},
        ],
    },
    {
        "name": "合同审批",
        "category": "财务法务",
        "capability_key": "legal_case",
        "pages": "approval",
        "problem": "合同条款审批会签",
        "page_kind": "form_list",
        "form_headline": "合同审批",
        "approval_type": "contract",
    },
    {
        "name": "合同电子签章",
        "category": "财务法务",
        "capability_key": "legal_case",
        "pages": "approval+form",
        "problem": "合同电子签章与归档",
        "page_kind": "form_list",
        "form_headline": "合同电子签章",
        "approval_type": "esign",
    },
    {
        "name": "发票核验",
        "category": "财务法务",
        "capability_key": "expense_claim",
        "pages": "form+list",
        "problem": "发票真伪与合规核验",
        "page_kind": "form_list",
        "default_category": "invoice",
        "form_headline": "发票核验",
        "fields": [
            {"key": "title", "label": "发票号码/金额", "placeholder": "发票号 · 金额"},
            {"key": "department", "label": "费用归属", "placeholder": "部门/项目", "optional": True},
            {"key": "summary", "label": "核验说明", "placeholder": "销方、税号…", "optional": True},
        ],
    },
    {
        "name": "预算查询",
        "category": "财务法务",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "部门预算执行查询",
        "page_kind": "chart",
    },
    {
        "name": "付款申请",
        "category": "财务法务",
        "capability_key": "expense_claim",
        "pages": "approval",
        "problem": "对外付款审批",
        "page_kind": "form_list",
        "default_category": "payment",
        "form_headline": "付款申请",
        "fields": [
            {"key": "title", "label": "收款方与金额", "placeholder": "收款方 · 金额"},
            {"key": "department", "label": "申请部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "合同/单据号", "placeholder": "合同号、发票…", "optional": True},
        ],
    },
    {
        "name": "法务咨询问答",
        "category": "财务法务",
        "capability_key": "policy_qa",
        "pages": "chat+kb",
        "problem": "法务合规条款问答",
        "page_kind": "chat_kb",
    },
    {
        "name": "合规制度库",
        "category": "财务法务",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "合规制度文档检索",
        "page_kind": "files",
    },
    {
        "name": "审计资料检索",
        "category": "财务法务",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "审计资料语义检索",
        "page_kind": "files",
    },
    # —— 知识协同（8）——
    {
        "name": "制度文档库",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "制度文档语义检索",
        "page_kind": "files",
    },
    {
        "name": "SOP作业指导",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "SOP 作业指导检索",
        "page_kind": "files",
    },
    {
        "name": "培训资料库",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "培训资料归档检索",
        "page_kind": "files",
    },
    {
        "name": "项目文档共享",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "项目文档共享检索",
        "page_kind": "files",
    },
    {
        "name": "会议纪要检索",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "会议纪要检索",
        "page_kind": "files",
    },
    {
        "name": "新人onboarding",
        "category": "知识协同",
        "capability_key": "hire_onboard",
        "pages": "kb+form",
        "problem": "新人入职指引与清单",
        "page_kind": "form_list",
        "form_headline": "新人 onboarding",
    },
    {
        "name": "内部FAQ",
        "category": "知识协同",
        "capability_key": "chat_qa",
        "pages": "chat+kb",
        "problem": "内部常见问题问答",
        "page_kind": "chat_kb",
    },
    {
        "name": "最佳实践库",
        "category": "知识协同",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "最佳实践文档库",
        "page_kind": "files",
    },
    # —— 流程审批（8）——
    {
        "name": "通用审批",
        "category": "流程审批",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "自定义事项审批",
        "page_kind": "form_list",
        "approval_type": "general",
        "form_headline": "通用审批",
        "fields": [
            {"key": "title", "label": "事项标题", "placeholder": "简要说明要办的事"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "说明", "placeholder": "补充原因…", "optional": True},
        ],
    },
    {
        "name": "多级会签",
        "category": "流程审批",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "多级会签审批",
        "page_kind": "form_list",
        "approval_type": "countersign",
        "form_headline": "多级会签",
        "fields": [
            {"key": "title", "label": "会签事项", "placeholder": "事项标题"},
            {"key": "department", "label": "发起部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "会签说明", "placeholder": "需会签人/节点…", "optional": True},
        ],
    },
    {
        "name": "待办中心",
        "category": "流程审批",
        "capability_key": "approval_inbox",
        "pages": "list",
        "problem": "跨流程待办统一处理",
        "page_kind": "approval",
    },
    {
        "name": "已办查询",
        "category": "流程审批",
        "capability_key": "approval_inbox",
        "pages": "list",
        "problem": "已办事项查询",
        "page_kind": "approval",
        "form_hint": "查看已处理审批",
    },
    {
        "name": "代理审批",
        "category": "流程审批",
        "capability_key": "approval_inbox",
        "pages": "list+approval",
        "problem": "代理他人审批",
        "page_kind": "approval",
        "approval_type": "proxy",
        "form_headline": "代理审批设置",
        "fields": [
            {"key": "title", "label": "被代理人", "placeholder": "姓名/工号"},
            {"key": "department", "label": "代理范围", "placeholder": "全部/指定类型", "optional": True},
            {"key": "summary", "label": "代理时段", "placeholder": "起止日期", "optional": True},
        ],
    },
    {
        "name": "超时催办",
        "category": "流程审批",
        "capability_key": "approval_inbox",
        "pages": "list+notify",
        "problem": "超时审批催办",
        "page_kind": "approval",
    },
    {
        "name": "审批统计",
        "category": "流程审批",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "审批时效与量统计",
        "page_kind": "chart",
    },
    {
        "name": "条件分支",
        "category": "流程审批",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "条件分支审批流",
        "page_kind": "form_list",
        "approval_type": "conditional",
        "form_headline": "条件分支审批",
        "fields": [
            {"key": "title", "label": "事项标题", "placeholder": "事项"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "分支条件说明", "placeholder": "金额阈值/类型…", "optional": True},
        ],
    },
    # —— 数据报表（8）——
    {
        "name": "部门看板",
        "category": "数据报表",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "部门经营与效率看板",
        "page_kind": "chart",
    },
    {
        "name": "考勤统计",
        "category": "数据报表",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "考勤汇总统计",
        "page_kind": "chart",
    },
    {
        "name": "审批效率",
        "category": "数据报表",
        "capability_key": "ops_kpi",
        "pages": "chart",
        "problem": "审批效率看板",
        "page_kind": "chart",
    },
    {
        "name": "费用汇总",
        "category": "数据报表",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "费用汇总看板",
        "page_kind": "chart",
    },
    {
        "name": "自定义报表",
        "category": "数据报表",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "自定义报表配置",
        "page_kind": "chart",
    },
    {
        "name": "定时推送",
        "category": "数据报表",
        "capability_key": "chart_dashboard",
        "pages": "chart+notify",
        "problem": "报表定时推送",
        "page_kind": "chart",
    },
    {
        "name": "数据导出Excel",
        "category": "数据报表",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "数据导出 Excel",
        "page_kind": "chart",
    },
    {
        "name": "自然语言查数",
        "category": "数据报表",
        "capability_key": "data_nl_query",
        "pages": "chat+chart",
        "problem": "自然语言查数",
        "page_kind": "chat_kb",
    },
    # —— 消息通知（7）——
    {
        "name": "审批提醒",
        "category": "消息通知",
        "capability_key": "notify_inapp",
        "pages": "notify",
        "problem": "审批待办提醒",
        "page_kind": "notify",
    },
    {
        "name": "公告推送",
        "category": "消息通知",
        "capability_key": "notify_inapp",
        "pages": "notify",
        "problem": "全员公告推送",
        "page_kind": "notify",
    },
    {
        "name": "待办@提醒",
        "category": "消息通知",
        "capability_key": "notify_inapp",
        "pages": "notify",
        "problem": "待办 @ 提醒",
        "page_kind": "notify",
    },
    {
        "name": "邮件/短信",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "integration",
        "problem": "邮件短信通道",
        "page_kind": "notify",
    },
    {
        "name": "企微/钉钉",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "integration",
        "problem": "企微钉钉飞书通道",
        "page_kind": "notify",
    },
    {
        "name": "订阅消息",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "订阅消息推送",
        "page_kind": "notify",
    },
    {
        "name": "到期提醒",
        "category": "消息通知",
        "capability_key": "notify_inapp",
        "pages": "notify",
        "problem": "证件/合同到期提醒",
        "page_kind": "notify",
    },
    # —— IT与资产（7）——
    {
        "name": "IT报障",
        "category": "IT与资产",
        "capability_key": "it_ticket",
        "pages": "form+list",
        "problem": "电脑网络账号等 IT 工单",
        "page_kind": "form_list",
        "form_headline": "IT报障",
    },
    {
        "name": "账号权限申请",
        "category": "IT与资产",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "系统账号与权限申请",
        "page_kind": "form_list",
        "approval_type": "account_access",
        "form_headline": "账号权限申请",
        "fields": [
            {"key": "title", "label": "系统与账号", "placeholder": "如：OA 账号开通"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "权限范围", "placeholder": "角色/模块…", "optional": True},
        ],
    },
    {
        "name": "软件安装申请",
        "category": "IT与资产",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "软件安装审批",
        "page_kind": "form_list",
        "approval_type": "software_install",
        "form_headline": "软件安装申请",
        "fields": [
            {"key": "title", "label": "软件名称", "placeholder": "软件名 · 版本"},
            {"key": "department", "label": "使用人/部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "用途说明", "placeholder": "业务用途…", "optional": True},
        ],
    },
    {
        "name": "资产领用",
        "category": "IT与资产",
        "capability_key": "asset_manage",
        "pages": "form+list",
        "problem": "固定资产领用归还",
        "page_kind": "form_list",
        "form_headline": "资产领用",
    },
    {
        "name": "资产盘点",
        "category": "IT与资产",
        "capability_key": "asset_manage",
        "pages": "form+list",
        "problem": "固定资产盘点",
        "page_kind": "form_list",
        "default_category": "inventory",
        "form_headline": "资产盘点",
    },
    {
        "name": "网络/VPN申请",
        "category": "IT与资产",
        "capability_key": "approval_flow",
        "pages": "approval",
        "problem": "网络与 VPN 开通申请",
        "page_kind": "form_list",
        "approval_type": "vpn",
        "form_headline": "网络/VPN申请",
        "fields": [
            {"key": "title", "label": "申请类型", "placeholder": "VPN / 专线 / 端口"},
            {"key": "department", "label": "所属部门", "placeholder": "部门", "optional": True},
            {"key": "summary", "label": "用途与期限", "placeholder": "用途、到期日…", "optional": True},
        ],
    },
    {
        "name": "IT知识库",
        "category": "IT与资产",
        "capability_key": "kb_document",
        "pages": "kb",
        "problem": "IT 运维知识库",
        "page_kind": "files",
    },
    # —— 外部对接（6）——
    {
        "name": "对接SAP/用友",
        "category": "外部对接",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "对接 SAP/用友",
        "page_kind": "notify",
    },
    {
        "name": "对接OA",
        "category": "外部对接",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "对接 OA 系统",
        "page_kind": "notify",
    },
    {
        "name": "对接CRM",
        "category": "外部对接",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "对接 CRM",
        "page_kind": "notify",
    },
    {
        "name": "对接HR系统",
        "category": "外部对接",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "对接 HR 系统",
        "page_kind": "notify",
    },
    {
        "name": "单点登录SSO",
        "category": "外部对接",
        "capability_key": "rbac_page",
        "pages": "integration",
        "problem": "单点登录 SSO",
        "page_kind": "notify",
    },
    {
        "name": "数据双向同步",
        "category": "外部对接",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "外部系统数据双向同步",
        "page_kind": "notify",
    },
]

OFFICE_SCENE_COUNT = len(_OFFICE_SCENE_ROWS)
assert OFFICE_SCENE_COUNT == 66, f"expected 66 office scenes, got {OFFICE_SCENE_COUNT}"

OFFICE_SCENES_BY_NAME: dict[str, dict[str, Any]] = {r["name"]: r for r in _OFFICE_SCENE_ROWS}


def office_scene_names() -> list[str]:
    return [r["name"] for r in _OFFICE_SCENE_ROWS]


def office_pack_scenes() -> list[dict[str, str]]:
    """供 industry_packs_all._OFFICE_META 使用的 scene 字典列表。"""
    out: list[dict[str, str]] = []
    for r in _OFFICE_SCENE_ROWS:
        out.append(
            {
                "name": r["name"],
                "category": r["category"],
                "problem": str(r.get("problem") or r["name"]),
                "pages": str(r.get("pages") or "approval+form"),
                "standard": "✓",
                "agent": str(r["capability_key"]),
            }
        )
    return out


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str) -> dict[str, Any]:
    """用映射表补齐 menu_plan 的表单/类型字段。"""
    row = OFFICE_SCENES_BY_NAME.get(scene_name)
    if not row:
        return plan_item
    plan_item["capability_key"] = row["capability_key"]
    if row.get("approval_type"):
        plan_item["approval_type"] = row["approval_type"]
    if row.get("default_category"):
        plan_item["default_category"] = row["default_category"]
    if row.get("form_headline"):
        plan_item["form_headline"] = row["form_headline"]
    if row.get("form_hint"):
        plan_item["form_hint"] = row["form_hint"]
    if row.get("fields"):
        plan_item["form_fields"] = row["fields"]
    if row.get("page_kind"):
        plan_item["page_kind"] = row["page_kind"]
    return plan_item


def page_mock_for_scene(name: str) -> dict[str, Any] | None:
    """预览页差异化 mock（空库示意，非假业务数据）。"""
    row = OFFICE_SCENES_BY_NAME.get(name)
    if not row:
        return None
    kind = str(row.get("page_kind") or "form_list")
    if kind in {"chat_kb", "files"}:
        return {
            "chat_title": f"{name}助手",
            "chat": [{"role": "bot", "text": f"可就「{name}」提问；空库无文档时仅作引导。"}],
            "files_title": "相关资料",
            "files": [f"{name}.md"],
            "primary_action": "发送",
        }
    if kind == "chart":
        return {
            "kpis": [
                {"label": "本周", "value": "—", "hint": "接真数据后刷新"},
                {"label": "待办", "value": "—", "hint": "—"},
                {"label": name[:6], "value": "—", "hint": "—"},
            ],
            "list_title": f"{name}趋势",
            "primary_action": "刷新数据",
        }
    if kind in {"roster", "approval", "notify"} and not row.get("fields"):
        return {
            "list_title": name,
            "list": [{"id": "01", "title": f"{name}（空库无业务数据）", "status": "待办"}],
            "primary_action": "刷新",
        }
    fields = row.get("fields") or [
        {"key": "title", "label": "标题", "placeholder": name},
        {"key": "department", "label": "负责人", "placeholder": "", "optional": True},
        {"key": "summary", "label": "说明", "placeholder": "", "optional": True},
    ]
    return {
        "form_title": str(row.get("form_headline") or f"新建 · {name}"),
        "fields": [{"label": f["label"], "value": ""} for f in fields],
        "list_title": f"{name}记录",
        "list": [{"id": "01", "title": f"{name}（空库无业务数据）", "status": "待办"}],
        "primary_action": "提交",
    }
