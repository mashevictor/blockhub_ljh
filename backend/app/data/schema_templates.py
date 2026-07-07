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
        "capability_keys": ["approval_flow", "chat_qa", "notify_inapp"],
    },
    {
        "id": "tpl-mfg-sop",
        "name": "SOP工艺问答",
        "industry": "mfg",
        "match": ["SOP", "工艺", "作业指导", "BOM"],
        "capability_keys": ["kb_document", "chat_qa"],
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
        "capability_keys": ["approval_flow", "chart_dashboard"],
    },
]

OFFICE_DEFAULT_KEYS = ["chat_qa", "approval_flow", "kb_document", "chart_dashboard"]
MFG_DEFAULT_KEYS = ["chat_qa", "approval_flow", "kb_document", "chart_dashboard"]


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
        add(MFG_DEFAULT_KEYS if industry_key == "mfg" else OFFICE_DEFAULT_KEYS)

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
