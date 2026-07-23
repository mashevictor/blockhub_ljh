"""12 scenario templates — office TOP8 + manufacturing TOP4 → capability_keys."""

from __future__ import annotations

from typing import Any

# Each template: match scenario name (substring), default capability_keys, optional widgets hint
SCENARIO_TEMPLATES: list[dict[str, Any]] = [
    # Office TOP8
    {
        "id": "tpl-office-policy-qa",
        "name": "制度政策问答",
        "industry": "office",
        "match": ["制度政策", "政策问答", "员工手册"],
        "capability_keys": ["chat_qa", "kb_document"],
    },
    {
        "id": "tpl-office-leave",
        "name": "请假申请",
        "industry": "office",
        "match": ["请假", "年假", "调休"],
        "capability_keys": ["approval_flow", "chat_qa"],
    },
    {
        "id": "tpl-office-expense",
        "name": "报销审批",
        "industry": "office",
        "match": ["报销", "费用报销"],
        "capability_keys": ["approval_flow", "kb_document"],
    },
    {
        "id": "tpl-office-onboard",
        "name": "入职办理",
        "industry": "office",
        "match": ["入职", "onboarding", "新人"],
        "capability_keys": ["approval_flow", "kb_document", "notify_inapp"],
    },
    {
        "id": "tpl-office-seal",
        "name": "用印申请",
        "industry": "office",
        "match": ["用印", "盖章"],
        "capability_keys": ["approval_flow"],
    },
    {
        "id": "tpl-office-general-approval",
        "name": "通用审批",
        "industry": "office",
        "match": ["通用审批", "多级会签", "会签"],
        "capability_keys": ["approval_flow", "approval_inbox"],
    },
    {
        "id": "tpl-office-inbox",
        "name": "待办中心",
        "industry": "office",
        "match": ["待办", "已办"],
        "capability_keys": ["approval_inbox", "approval_flow"],
    },
    {
        "id": "tpl-office-dashboard",
        "name": "部门看板",
        "industry": "office",
        "match": ["部门看板", "考勤统计", "数据报表"],
        "capability_keys": ["chart_dashboard", "notify_inapp"],
    },
    # Manufacturing TOP4
    {
        "id": "tpl-mfg-repair",
        "name": "设备报修",
        "industry": "mfg",
        "match": ["设备报修", "报修", "IT报障"],
        "capability_keys": ["device_repair", "notify_im", "chat_qa"],
    },
    {
        "id": "tpl-mfg-sop",
        "name": "SOP工艺问答",
        "industry": "mfg",
        "match": ["SOP", "工艺", "作业指导", "BOM", "质检SOP"],
        "capability_keys": ["quality_inspect", "kb_document", "chat_qa", "notify_im"],
    },
    {
        "id": "tpl-mfg-oee",
        "name": "生产日报/OEE",
        "industry": "mfg",
        "match": ["生产日报", "OEE", "产量"],
        "capability_keys": ["chart_dashboard", "data_nl_query"],
    },
    {
        "id": "tpl-mfg-qc",
        "name": "质检审批",
        "industry": "mfg",
        "match": ["质检", "安环", "隐患"],
        "capability_keys": ["quality_inspect", "notify_im", "chart_dashboard"],
    },
    {
        "id": "tpl-retail-stock",
        "name": "库存盘点",
        "industry": "retail",
        "match": ["库存", "盘点", "SKU", "货位", "补货"],
        "capability_keys": ["inventory_count", "notify_im", "chart_dashboard"],
    },
    {
        "id": "tpl-retail-member",
        "name": "会员营销",
        "industry": "retail",
        "match": ["会员营销", "会员积分", "会员管理", "促销活动", "券码", "积分兑换"],
        "capability_keys": ["member_loyalty", "notify_im", "chart_dashboard"],
    },
    {
        "id": "tpl-med-triage",
        "name": "医疗导诊",
        "industry": "med",
        "match": ["医疗导诊", "智能导诊", "就医指南", "导诊", "预问诊", "科室导航", "症状初筛"],
        "capability_keys": ["med_triage", "notify_im", "chat_qa"],
    },
    {
        "id": "tpl-med-shift",
        "name": "护士排班",
        "industry": "med",
        "match": ["护士排班", "调班申请", "护士调班", "排班/调班", "值班通知"],
        "capability_keys": ["nurse_shift", "notify_im"],
    },
    {
        "id": "tpl-game-faq",
        "name": "玩家FAQ",
        "industry": "game",
        "match": ["玩家FAQ", "玩家攻略", "客服工单", "活动规则", "游戏FAQ"],
        "capability_keys": ["game_support", "notify_im", "kb_document"],
    },
    {
        "id": "tpl-edu-notice",
        "name": "家校通知",
        "industry": "edu",
        "match": ["家校通知", "活动报名", "家长留言", "学校通知"],
        "capability_keys": ["school_notice", "notify_im"],
    },
    {
        "id": "tpl-edu-homework",
        "name": "作业答疑",
        "industry": "edu",
        "match": ["作业答疑", "作业提交", "课程答疑", "错题巩固", "错题"],
        "capability_keys": ["homework_qa", "notify_im", "chat_qa"],
    },
    # Sales TOP4（对齐 66 场景深度包）
    {
        "id": "tpl-sales-lead",
        "name": "销售线索",
        "industry": "sales",
        "match": ["线索录入", "线索分配", "公海领取", "拜访纪要", "新建商机", "销售线索", "跟进任务"],
        "capability_keys": ["sales_lead", "notify_im"],
    },
    {
        "id": "tpl-sales-quote",
        "name": "报价合同",
        "industry": "sales",
        "match": ["标准报价", "特价折扣", "销售合同审批", "合同变更申请", "报价版本", "销售开票"],
        "capability_keys": ["quote_contract", "notify_im"],
    },
    {
        "id": "tpl-sales-funnel",
        "name": "销售漏斗",
        "industry": "sales",
        "match": ["销售漏斗", "业绩排行", "区域销售", "提成核算", "销售问数"],
        "capability_keys": ["chart_funnel", "ops_kpi", "data_nl_query"],
    },
    {
        "id": "tpl-sales-crm",
        "name": "CRM对接",
        "industry": "sales",
        "match": ["Salesforce", "纷享", "销售易", "CRM线索", "CRM商机"],
        "capability_keys": ["erp_connector", "notify_im"],
    },
]

from app.data.blockhub_demo import BLOCKHUB_DEMO_KEYS

# 空能力回退 = 积木仓演示页（办公核心 + 人事财务 + 2048/玩家FAQ）
OFFICE_DEFAULT_KEYS = list(BLOCKHUB_DEMO_KEYS)
MFG_DEFAULT_KEYS = ["chat_qa", "approval_flow", "kb_document", "chart_dashboard"]
SALES_DEFAULT_KEYS = ["sales_lead", "quote_contract", "chart_funnel", "notify_im"]


def match_template(scenario_name: str) -> dict[str, Any] | None:
    name = (scenario_name or "").strip()
    if not name:
        return None
    for tpl in SCENARIO_TEMPLATES:
        for token in tpl["match"]:
            if token in name or name in token:
                return tpl
    return None


def resolve_capability_keys(
    *,
    scenario_names: list[str] | None = None,
    explicit_keys: list[str] | None = None,
    industry_key: str = "office",
) -> list[str]:
    """Merge explicit keys with template-derived keys (deduped, stable order)."""
    ordered: list[str] = []
    seen: set[str] = set()

    def add(keys: list[str]) -> None:
        for k in keys:
            if k and k not in seen:
                seen.add(k)
                ordered.append(k)

    if explicit_keys:
        add(explicit_keys)

    for name in scenario_names or []:
        tpl = match_template(name)
        if tpl:
            add(list(tpl["capability_keys"]))

    if not ordered:
        if industry_key == "mfg":
            add(MFG_DEFAULT_KEYS)
        elif industry_key == "sales":
            add(SALES_DEFAULT_KEYS)
        else:
            add(OFFICE_DEFAULT_KEYS)

    return ordered


def feasibility_for_scenarios(
    *,
    industry_key: str,
    scenario_names: list[str],
    explicit_keys: list[str] | None = None,
) -> dict[str, Any]:
    """Rule-based coverage scoring for publish feasibility."""
    pack_names = {
        "office": "智慧办公",
        "mfg": "智能制造",
        "sales": "销售增长",
        "med": "医疗健康",
        "game": "游戏运营",
    }
    n = len(scenario_names)
    matched: list[str] = []
    caps: list[str] = []
    warnings: list[str] = []

    for name in scenario_names:
        tpl = match_template(name)
        if tpl:
            matched.append(tpl["name"])
            for k in tpl["capability_keys"]:
                if k not in caps:
                    caps.append(k)
        else:
            warnings.append(f"场景「{name}」无专用模板，将使用通用能力编排")

    if explicit_keys:
        for k in explicit_keys:
            if k not in caps:
                caps.append(k)

    if not caps:
        caps = resolve_capability_keys(scenario_names=scenario_names, industry_key=industry_key)

    coverage = (len(matched) / n * 100) if n else 50
    base = 60 + min(30, n * 3) + int(coverage * 0.08)
    if industry_key in pack_names:
        base += 5
    score = min(98, base)

    if n == 0:
        warnings.append("未选择场景，将使用默认问答 + 审批 + 知识库 + 看板")
        score = 72

    return {
        "feasible": score >= 70,
        "score": score,
        "industry": pack_names.get(industry_key, industry_key),
        "scenario_count": n,
        "matched_templates": matched,
        "capabilities": caps[:8],
        "warnings": warnings,
        "summary": (
            f"已匹配 {len(matched)}/{n} 个场景模板，"
            f"将编排 {len(caps)} 项 Capability 并生成 page_schema。"
        ),
    }


def list_templates(industry: str | None = None) -> list[dict[str, Any]]:
    if not industry:
        return list(SCENARIO_TEMPLATES)
    return [t for t in SCENARIO_TEMPLATES if t.get("industry") == industry]
