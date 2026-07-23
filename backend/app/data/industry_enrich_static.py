"""行业独立站第一版 enrichment（生产可用静态种子）+ CapShip 推荐模块。"""

from __future__ import annotations

from typing import Any

from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, pack_meta, scene_count_for_pack

# 各行业默认 CapShip / 正式能力 key（对齐弹幕与 >> 选型）
PACK_CAPSHIP_MODULES: dict[str, list[str]] = {
    "office": ["leave_request", "expense_claim", "policy_qa", "hire_onboard", "seal_request", "meeting_booking", "approval_flow", "approval_inbox", "ops_kpi", "shift_attendance", "kb_document", "it_ticket", "asset_manage", "notify_im", "notify_inapp", "chart_dashboard", "data_nl_query", "legal_case", "chat_qa", "erp_connector", "rbac_page"],
    "mfg": ["device_repair", "quality_inspect", "inventory_count", "chat_qa", "notify_im", "kb_document"],
    "sales": ["sales_lead", "deal_evidence", "kill_pipeline", "quote_contract", "ops_kpi", "chat_qa", "chart_funnel", "notify_im", "kb_document", "expense_claim", "site_patrol", "erp_connector", "campaign_ops", "data_nl_query", "chart_dashboard"],
    "med": ["med_triage", "nurse_shift", "kb_document", "chat_qa", "approval_flow", "notify_im"],
    "game": [
        "game_support",
        "game_2048",
        "kb_document",
        "notify_im",
        "approval_flow",
        "chart_dashboard",
        "data_nl_query",
        "erp_connector",
    ],
    "retail": ["inventory_count", "member_loyalty", "chat_qa", "notify_im", "approval_flow", "chart_dashboard"],
    "edu": ["school_notice", "homework_qa", "class_schedule", "chat_qa", "notify_im", "kb_document"],
    "bank": ["finance_kyc", "finance_aml", "credit_approval", "approval_flow", "kb_document", "chat_qa", "chart_dashboard", "notify_im"],
    "securities": ["finance_kyc", "due_diligence", "approval_flow", "kb_document", "chat_qa", "chart_dashboard", "notify_im", "finance_aml"],
    "insurance": ["insurance_case", "approval_flow", "kb_document", "chat_qa", "notify_im", "chart_dashboard"],
    "fund": ["regulatory_report", "due_diligence", "kb_document", "approval_flow", "chat_qa", "chart_dashboard", "notify_im"],
    "fintech": ["finance_aml", "credit_approval", "regulatory_report", "finance_kyc", "kb_document", "chart_dashboard", "notify_im", "chat_qa"],
    "logistics": [
        "waybill_track",
        "warehouse_inbound",
        "warehouse_outbound",
        "inventory_count",
        "fleet_dispatch",
        "pod_signoff",
        "logistics_exception",
        "route_task",
        "freight_settle",
        "cold_chain_alert",
        "dock_queue",
        "delivery_order",
        "notify_im",
        "approval_flow",
        "chart_dashboard",
        "ops_kpi",
        "data_nl_query",
        "kb_document",
        "chat_qa",
    ],
    "realestate": [
        "listing_publish",
        "rent_collection",
        "house_viewing",
        "property_repair",
        "re_contract",
        "owner_complaint",
        "deco_acceptance",
        "notify_im",
        "chart_dashboard",
        "kb_document",
        "approval_flow",
        "ops_kpi",
        "data_nl_query",
        "deco_material",
        "site_patrol",
    ],
    "hotel": ["hotel_booking", "site_patrol", "member_loyalty", "approval_flow", "notify_im", "chart_dashboard"],
    "energy": ["site_patrol", "device_repair", "approval_flow", "chart_dashboard", "notify_im", "kb_document"],
    "gov": ["gov_service", "chat_qa", "kb_document", "approval_flow", "chart_dashboard", "notify_im"],
    "legal": ["legal_case", "kb_document", "chat_qa", "approval_flow", "notify_im"],
    "hr": ["hire_onboard", "leave_request", "policy_qa", "approval_flow", "kb_document", "notify_im"],
    "marketing": ["campaign_ops", "sales_lead", "chart_funnel", "approval_flow", "notify_im", "chat_qa"],
    "construction": ["site_patrol", "deco_material", "approval_flow", "notify_im", "kb_document", "chart_dashboard"],
    "agriculture": ["kb_document", "approval_flow", "notify_im", "chart_dashboard", "chat_qa"],
    "media": ["campaign_ops", "kb_document", "approval_flow", "notify_im", "chat_qa", "chart_dashboard"],
    "auto": ["device_repair", "sales_lead", "chat_qa", "approval_flow", "notify_im", "chart_dashboard"],
}

_STATIC_BASE: dict[str, dict[str, Any]] = {
    "office": {
        "overview": "通用办公深度包覆盖人事行政、财务法务、知识协同、流程审批等办公域，开箱可用请假报销、制度问答与招聘入职等 CapShip 正式能力，适合全员数字化办公一体化落地。",
        "highlights": ["请假报销正式能力开箱", "制度问答 + 待办中心", "招聘入职与绩效链路", "企微/钉钉消息触达"],
    },
    "mfg": {
        "overview": (
            "传统制造深度包以设备报修、质检 SOP、双专属知识库（工艺SOP / 质检安环）为核心，"
            "现场报修与文档 RAG 检索闭环，并可对接 MES/ERP。"
        ),
        "highlights": [
            "制造·工艺SOP与作业指导库",
            "制造·质检与安环知识库",
            "设备报修派工闭环",
            "质检 SOP 现场执行",
        ],
    },
    "sales": {
        "overview": (
            "销售行业深度包只收录销售/CRM 特有场景（线索·跟进·报价·回款·赋能·漏斗·外勤·CRM），"
            "不搬用通用办公人事行政场景；正式能力接真 API，空库空列表。"
        ),
        "highlights": [
            "每行业 2 个专属知识库 · 发布即建真库",
            "纯销售场景 · 不混办公审批人事",
            "成交证据门禁 · 打假漏斗",
            "杀单工作台 · 结构化丢单学习",
        ],
    },
    "med": {
        "overview": (
            "医疗健康深度包：AI 预问诊与分诊（规则+LLM）、指南 RAG、护理排班冲突检测、"
            "不良事件与 MDT 审批、医疗 NL 问数与 HIS 对接；正式能力接真 API，空库空列表；"
            "AI 仅辅助导诊与检索，不替代执业医师诊疗。"
        ),
        "highlights": [
            "每行业 2 个专属知识库 · 发布即建真库",
            "AI 预问诊 · 规则引擎+大模型科室建议",
            "临床指南 RAG · 药品/SOP 可问答",
            "护理排班冲突检测与审批闭环",
        ],
    },
    "game": {
        "overview": (
            "游戏娱乐深度包：玩家 FAQ/客服工单真库、活动规则与版号合规双知识库 RAG、"
            "活动 IM 通知、外包验收审批、运营问数、游戏后台对接与 2048 正式可玩；禁止假 seed。"
        ),
        "highlights": [
            "玩家 FAQ · 客服工单真 API",
            "活动规则 / 版号合规双知识库",
            "活动通知 · IM Webhook",
            "2048 正式能力可玩",
        ],
    },
    "retail": {
        "overview": "零售电商深度包以库存盘点、会员营销为主能力，覆盖补货预警、积分兑换、门店巡检与退换货工单，适合连锁与 O2O。",
        "highlights": ["库存盘点与补货", "会员积分营销", "门店陈列巡检", "退换货工单"],
    },
    "edu": {
        "overview": "教育培训深度包覆盖家校通知、作业答疑与课表查询，减轻教务与班主任重复劳动，提升家校沟通效率。",
        "highlights": ["家校通知精准触达", "作业答疑助手", "课表与考试安排", "成绩趋势看板"],
    },
    "bank": {
        "overview": "商业银行垂直包覆盖对公/零售 KYC、授信审批与反洗钱监测；正式能力接真 API，空库空列表。",
        "highlights": ["对公/零售 KYC 真工单", "授信审批闭环", "AML 可疑交易监测", "双专属知识库"],
    },
    "securities": {
        "overview": "证券券商垂直包覆盖开户适当性、投研尽调、合规会签与产品销售；选型即交付正式 capability。",
        "highlights": ["适当性评估", "投研尽调真库", "合规会签", "产品说明 RAG"],
    },
    "insurance": {
        "overview": "保险垂直包覆盖核保、理赔、代理人合规与产品条款说明；核保理赔工单落真库。",
        "highlights": ["核保/理赔真工单", "代理人合规", "产品条款 RAG", "审批留痕"],
    },
    "fund": {
        "overview": "基金资管垂直包覆盖产品披露、投后管理与监管报送；报送任务与尽调记录真库闭环。",
        "highlights": ["监管报送任务", "投后管理", "产品披露 RAG", "合规审查"],
    },
    "fintech": {
        "overview": "消金金科垂直包覆盖风控预警、贷后管理与监管报送；KYC/授信/AML 共享正式能力。",
        "highlights": ["风控预警真库", "贷后检查", "监管报送", "KYC 联防"],
    },
    "logistics": {
        "overview": "物流仓储深度包覆盖运单跟踪、入出库、盘点、调度签收、冷链与装卸排队；正式能力接真 API，空库空列表。",
        "highlights": ["运单/入出库真工单", "调度签收与异常闭环", "冷链告警", "在途可视真聚合"],
    },
    "realestate": {
        "overview": "房地产深度包覆盖看房签约、租赁收缴、物业投诉与装修验收；正式能力接真 API，空库空列表。",
        "highlights": ["看房/签约真工单", "租金与物业费催缴", "业主投诉闭环", "楼盘经营真聚合"],
    },
    "hotel": {
        "overview": "酒店餐饮深度包聚焦客房预订、品质巡检与会员运营，提升前台接单与客房服务效率。",
        "highlights": ["客房预订排房", "公区品质巡检", "客诉登记回访", "会员积分权益"],
    },
    "energy": {
        "overview": "能源电力深度包覆盖设备巡检、缺陷工单与能耗监测，支撑电力运维数字化与安全生产两票管理。",
        "highlights": ["线路设备巡检", "缺陷工单派工", "能耗异常预警", "两票安全管理"],
    },
    "gov": {
        "overview": "政务公用深度包提供办事指南问答、诉求受理与在线审批，助力数字政务便民服务与基层网格治理落地。",
        "highlights": ["事项材料智能问答", "诉求登记分派", "行政审批在线受理", "政务数据看板"],
    },
    "legal": {
        "overview": "法律服务深度包覆盖案件跟踪、合同审查与法规检索，提升律所与企业法务团队协同效率。",
        "highlights": ["案件进度跟踪", "合同条款审查", "法规判例检索", "庭审节点提醒"],
    },
    "hr": {
        "overview": "人力资源深度包聚焦招聘入职、请假审批与制度问答，打通 HR 全生命周期与员工自助服务。",
        "highlights": ["招聘面试流程", "入离职在线办理", "请假报销一体", "制度福利问答"],
    },
    "marketing": {
        "overview": "市场营销深度包覆盖活动运营、线索培育与投放分析，帮助市场团队快速搭建可复盘的增长应用。",
        "highlights": ["营销活动审批上线", "线索培育分配", "投放 ROI 分析", "内容合规审核"],
    },
    "construction": {
        "overview": "建筑工程深度包覆盖施工安全、材料申购与进度汇报，让工地管理移动化、验收签字可追溯。",
        "highlights": ["安全隐患拍图上报", "质量验收签字", "材料申购审批", "施工进度日报"],
    },
    "agriculture": {
        "overview": "农业深度包聚焦产销溯源、农事记录与补贴申报，助力农业数字化与品牌可信溯源。",
        "highlights": ["农产品溯源查询", "田间巡检记录", "补贴在线申报", "气象灾害预警"],
    },
    "media": {
        "overview": "传媒内容深度包覆盖选题策划、内容审核与分发排期，加速内容团队协同与合规生产。",
        "highlights": ["选题立项协同", "内容多级审核", "版权素材管理", "多平台发布排期"],
    },
    "auto": {
        "overview": "汽车交通深度包覆盖售后工单、试驾预约与客户跟进，连接 4S 店销售与服务全链路。",
        "highlights": ["售后维修工单", "试驾档期预约", "配件申购预警", "客户跟进助手"],
    },
}


def _tip_for_scene(scene: dict[str, Any]) -> str:
    name = scene.get("name") or "业务场景"
    problem = (scene.get("problem") or name).strip()
    pages = (scene.get("pages") or "approval+form").strip()
    agent = (scene.get("agent") or "").strip()
    agent_part = f"，推荐能力 {agent}" if agent and agent not in {"—", "-"} else ""
    return f"{problem}。落地页面建议：{pages}{agent_part}；现场可配拍照、通知与审批闭环，上线后仍可用 >> 悬浮框增减模块。"


def _scene_tips_for(pack_key: str, scenes: list[dict[str, Any]] | None = None) -> list[dict[str, str]]:
    if scenes:
        src = scenes
    else:
        meta = pack_meta(pack_key) or {}
        src = list(meta.get("scenes") or [])
        if pack_key == "office" and not src:
            # office 场景在独立表；给通用首版 tip
            src = [
                {"name": "请假审批", "problem": "员工请假在线申请与主管审批", "pages": "approval", "agent": "leave_request"},
                {"name": "报销记账", "problem": "费用报销与发票归档", "pages": "approval+form", "agent": "expense_claim"},
                {"name": "制度问答", "problem": "制度政策福利智能问答", "pages": "chat+kb", "agent": "policy_qa"},
                {"name": "招聘入职", "problem": "招聘与入职指引", "pages": "approval+kb", "agent": "hire_onboard"},
                {"name": "待办中心", "problem": "跨流程待办统一处理", "pages": "list", "agent": "approval_inbox"},
                {"name": "知识库", "problem": "制度文档语义检索", "pages": "kb", "agent": "kb_document"},
            ]
    tips: list[dict[str, str]] = []
    for s in src[:8]:
        tips.append({"name": s.get("name") or "", "tip": _tip_for_scene(s)})
    return [t for t in tips if t["name"]]


def build_static_enrichment(
    pack_key: str,
    *,
    scenes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """生产默认第一版：overview + highlights + CapShip modules + scene_tips。"""
    meta = pack_meta(pack_key)
    pack_name = meta["name"] if meta else pack_key
    tagline = (meta or {}).get("tagline", "")
    base = _STATIC_BASE.get(pack_key)
    if base:
        overview = base["overview"]
        highlights = list(base["highlights"])
    else:
        overview = (
            f"{pack_name}深度包：{tagline}。"
            f"共 {scene_count_for_pack(pack_key)} 项业务场景，支持 >> 选模块与悬浮框编排，一键生成企业智能应用。"
        )
        highlights = [
            f"覆盖 {scene_count_for_pack(pack_key)} 项行业场景",
            "正式能力 / CapShip 模块优先",
            "支持 Web / App 双端发布",
            "场景与模块可用 >> 随时调整",
        ]
    modules = list(PACK_CAPSHIP_MODULES.get(pack_key) or ["chat_qa", "approval_flow", "kb_document", "notify_im"])
    return {
        "overview": overview,
        "highlights": highlights,
        "recommended_modules": modules,
        "scene_tips": _scene_tips_for(pack_key, scenes),
        "source": "static",
    }


def list_static_enrichments() -> dict[str, dict[str, Any]]:
    return {p["key"]: build_static_enrichment(p["key"]) for p in ALL_INDUSTRY_PACKS}
