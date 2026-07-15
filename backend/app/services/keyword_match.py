"""关键词匹配引擎：行业/能力/办公场景 + 行业默认模块联动。"""

from __future__ import annotations

import re

from app.data.capability_registry import ALL_CAPABILITIES, INDUSTRY_HINTS
from app.data.industry_packs_all import ALL_INDUSTRY_PACKS
from app.services.hero_preset_match import match_hero_presets

_ALARM_HINTS = ("闹钟", "alarm", "定时", "cron", "准时", "每天", "重复提醒", "番茄钟", "计时器", "倒计时")

# 行业包 scene.agent → 能力 module key
_AGENT_TO_MODULE: dict[str, str] = {
    "chat_qa": "chat_qa",
    "approval": "approval_flow",
    "device_repair": "device_repair",
    "quality_inspect": "quality_inspect",
    "inventory_count": "inventory_count",
    "member_loyalty": "member_loyalty",
    "med_triage": "med_triage",
    "nurse_shift": "nurse_shift",
    "game_support": "game_support",
    "kb": "kb_document",
    "report": "chart_dashboard",
    "notify": "notify_inapp",
    "integration": "erp_connector",
    "creation": "form_widget",
    "shanghai_voice": "shanghai_voice",
    "notify_inapp": "notify_inapp",
}

# 兜底（行业包未覆盖时）
INDUSTRY_DEFAULT_MODULES: dict[str, list[tuple[str, str, str]]] = {
    "game": [
        ("game_support", "玩家FAQ", "FAQ/攻略/客服工单"),
        ("chat_qa", "智能问答", "玩家 FAQ/攻略/NPC 对话"),
        ("approval_flow", "审批流", "客服工单/公会/验收"),
        ("kb_document", "知识库", "版本/活动规则库"),
        ("chart_dashboard", "数据看板", "留存/渠道分析"),
        ("notify_inapp", "站内信", "活动/开服通知"),
        ("flutter_push", "移动推送", "活动 Push"),
    ],
    "mfg": [
        ("device_repair", "设备报修", "设备报修/扫码派工"),
        ("quality_inspect", "质检SOP", "质检/SOP 录入与闭环"),
        ("chat_qa", "智能问答", "工艺/SOP 问答"),
        ("notify_im", "企微钉钉飞书", "工单状态推送到群"),
    ],
    "sales": [
        ("chart_funnel", "销售漏斗", "商机与漏斗看板"),
        ("approval_flow", "审批流", "报价/合同审批"),
    ],
    "med": [
        ("med_triage", "医疗导诊", "科室导诊/就诊指引"),
        ("nurse_shift", "护士排班", "调班申请/批复"),
        ("chat_qa", "智能问答", "导诊/制度问答"),
        ("notify_im", "企微钉钉飞书", "就诊提醒推送"),
    ],
    "retail": [
        ("inventory_count", "库存盘点", "货位/SKU 盘点确认"),
        ("member_loyalty", "会员营销", "积分/活动/触达"),
        ("notify_im", "企微钉钉飞书", "促销/盘点通知"),
        ("chart_dashboard", "数据看板", "会员/库存看板"),
    ],
    "edu": [
        ("chat_qa", "智能问答", "课程/培训答疑"),
        ("notify_inapp", "站内信", "家校/学员通知"),
    ],
    "logistics": [
        ("flutter_map", "地图导航", "运单/派单地图"),
        ("flutter_scan_qr", "扫码识别", "仓储扫码"),
    ],
    "office": [
        ("approval_flow", "审批流", "通用流程审批"),
        ("notify_inapp", "站内信", "全员通知"),
    ],
    "agriculture": [
        ("approval_flow", "审批流", "补贴/农资申请审批"),
    ],
    "media": [
        ("approval_flow", "审批流", "内容审核流程"),
        ("kb_document", "知识库", "内容/制度文档"),
    ],
    "construction": [
        ("approval_flow", "审批流", "巡检/隐患审批"),
        ("flutter_camera", "拍照上传", "现场拍照留痕"),
    ],
    "legal": [
        ("approval_inbox", "待办中心", "案件进度跟踪"),
        ("kb_document", "知识库", "案件/制度文档"),
    ],
}

_BRAND_HINTS = ("积木仓", "blockhub")

# 办公场景关键词
OFFICE_HINTS: list[tuple[tuple[str, ...], str]] = [
    (("人事", "行政", "请假", "入职", "考勤", "排班"), "人事行政"),
    (("财务", "报销", "法务", "合同", "预算"), "财务法务"),
    (("知识", "文档", "制度", "协同", "wiki"), "知识协同"),
    (("审批", "流程", "待办", "报销", "请假"), "流程审批"),
    (("报表", "看板", "统计", "数据", "漏斗"), "数据报表"),
    (("通知", "消息", "推送", "提醒"), "消息通知"),
    (("it", "资产", "设备", "报障"), "IT与资产"),
    (("对接", "集成", "api", "erp", "企微", "钉钉"), "外部对接"),
]


def industry_pack_modules(ind_key: str) -> list[tuple[str, str, str]]:
    """从行业包 scenes 推导应推荐的能力模块（去重）。"""
    pack = next((p for p in ALL_INDUSTRY_PACKS if p["key"] == ind_key), None)
    if not pack:
        return INDUSTRY_DEFAULT_MODULES.get(ind_key, [])

    seen: set[str] = set()
    out: list[tuple[str, str, str]] = []
    for scene in pack.get("scenes") or []:
        agent = str(scene.get("agent", "")).strip()
        mod_key = _AGENT_TO_MODULE.get(agent, "")
        if not mod_key or mod_key in seen:
            continue
        cap = ALL_CAPABILITIES.get(mod_key)
        seen.add(mod_key)
        out.append((
            mod_key,
            cap.name if cap else mod_key,
            f"行业场景「{scene.get('name', '')}」",
        ))

    for mod_key, mod_name, reason in INDUSTRY_DEFAULT_MODULES.get(ind_key, []):
        if mod_key not in seen:
            seen.add(mod_key)
            out.append((mod_key, mod_name, reason))
    return out


def industry_pack_scenes(ind_key: str) -> list[tuple[str, str, str]]:
    """从行业包 scenes 推导业务场景推荐（key, 场景名, 分类）。"""
    pack = next((p for p in ALL_INDUSTRY_PACKS if p["key"] == ind_key), None)
    if not pack:
        return []
    out: list[tuple[str, str, str]] = []
    for scene in pack.get("scenes") or []:
        name = str(scene.get("name", "")).strip()
        if not name:
            continue
        slug = re.sub(r"[^a-z0-9_\u4e00-\u9fff]+", "_", name.lower())[:28]
        out.append((f"{ind_key}:{slug}", name, str(scene.get("category", ""))))
    return out


def _needs_alarm(text: str) -> bool:
    q = text.strip().lower()
    return any(h in q or h in text for h in _ALARM_HINTS)


def filter_spurious_modules(text: str, items: list[dict]) -> list[dict]:
    """去掉与输入无关的误推模块（如仅输入「游戏」时不应推定时闹钟）。"""
    if _needs_alarm(text):
        return items
    return [x for x in items if x.get("key") != "schedule_alarm"]


def _contextual_game_modules(text: str) -> list[tuple[str, str, str, float]]:
    """对战/角色/C 端玩法类描述，补充游戏向模块。"""
    hints: list[tuple[str, str, str, float]] = []
    combat = any(w in text for w in ("剑", "打", "对战", "战斗", "四个", "五个", "角色", "npc", "副本", "关卡"))
    if combat:
        hints.append(("chat_qa", "智能问答", "NPC/角色对话", 7.5))
        hints.append(("form_widget", "表单组件", "战斗/关卡配置", 6.5))
        hints.append(("chart_dashboard", "数据看板", "关卡/留存数据", 6.0))
    social = any(w in text for w in ("公会", "社区", "玩家", "客服", "工单"))
    if social:
        hints.append(("approval_flow", "审批流", "客服工单/社区管理", 7.0))
    ops = any(w in text for w in ("活动", "开服", "版本", "推送", "通知"))
    if ops:
        hints.append(("notify_inapp", "站内信", "活动/版本通知", 6.5))
        hints.append(("flutter_push", "移动推送", "活动 Push", 6.0))
    return hints


def _keyword_weight(word: str) -> float:
    """中文两字词与英文三字词同等权重。"""
    if len(word) >= 3:
        return 3.0
    if len(word) >= 2 and any("\u4e00" <= c <= "\u9fff" for c in word):
        return 3.0
    return 1.5


def score_keywords(text: str, keywords: tuple[str, ...]) -> float:
    q_raw = text.strip()
    q_lower = q_raw.lower()
    score = 0.0
    for w in keywords:
        wl = w.lower()
        if w in q_raw or wl in q_lower:
            score += _keyword_weight(w)
    return score


def _merge_item_lists(primary: list[dict], secondary: list[dict], *, limit: int = 12) -> list[dict]:
    """合并时同 key 保留更高分（保证弹幕/关键词不被 LLM 低分项冲掉）。"""
    by_key: dict[str, dict] = {}
    for item in primary + secondary:
        k = str(item.get("key") or "")
        if not k:
            continue
        prev = by_key.get(k)
        if prev is None or float(item.get("score") or 0) > float(prev.get("score") or 0):
            by_key[k] = item
    merged = list(by_key.values())
    merged.sort(key=lambda x: x["score"], reverse=True)
    return merged[:limit]


def match_modules_keyword(user_text: str) -> list[dict]:
    text = user_text.strip()
    q_lower = text.lower()
    if len(text) < 2:
        return []

    seen: set[str] = set()
    out: list[dict] = []
    matched_industries: list[tuple[str, str, float]] = []

    def push(
        key: str,
        score: float,
        reason: str,
        *,
        pick_type: str = "module",
        label: str = "",
    ) -> None:
        if key in seen or score <= 0:
            return
        seen.add(key)
        cap = ALL_CAPABILITIES.get(key)
        out.append({
            "key": key,
            "label": label or (cap.name if cap else key),
            "type": pick_type,
            "score": score,
            "reason": reason,
            "source": "keyword",
            "flutter_pkg": cap.flutter_pkg if cap else "",
        })

    if any(h in text or h in q_lower for h in _BRAND_HINTS):
        push("office", 9.0, "识别为积木仓平台本体", pick_type="industry", label="通用办公")
        push("chat_qa", 8.5, "平台高频 AI 模块")
        push("approval_flow", 8.0, "平台高频审批模块")
        push("kb_document", 7.5, "知识库 · 制度与文档")
        push("知识协同", 7.0, "积木仓核心办公分类", pick_type="office", label="知识协同")
        matched_industries.append(("office", "通用办公", 9.0))

    # 弹幕英雄场景优先（CapShip 真能力），得分可压过泛行业兜底
    for item in match_hero_presets(text):
        push(
            item["key"],
            float(item["score"]),
            str(item.get("reason") or "弹幕场景匹配"),
            pick_type=str(item.get("type") or "module"),
            label=str(item.get("label") or ""),
        )
        if item.get("type") == "industry":
            matched_industries.append((item["key"], item.get("label") or item["key"], float(item["score"])))

    for cap in ALL_CAPABILITIES.values():
        s = score_keywords(text, cap.keywords)
        if s > 0:
            push(cap.key, s, f"匹配能力「{cap.name}」")

    for cap in ALL_CAPABILITIES.values():
        if cap.name in text:
            push(cap.key, max(5.0, score_keywords(text, (cap.name,))), f"描述含「{cap.name}」")

    for words, key, label in INDUSTRY_HINTS:
        s = score_keywords(text, words)
        if s > 0:
            industry_score = s + 2.0
            push(key, industry_score, f"匹配行业「{label}」", pick_type="industry", label=label)
            matched_industries.append((key, label, industry_score))

    for words, label in OFFICE_HINTS:
        s = score_keywords(text, words)
        if s > 0:
            push(label, s + 1.5, f"匹配办公场景「{label}」", pick_type="office", label=label)

    # 行业包模块：命中行业时附带该行业 scenes 映射的能力
    for ind_key, ind_label, ind_score in matched_industries:
        for mod_key, mod_name, mod_reason in industry_pack_modules(ind_key):
            push(
                mod_key,
                ind_score - 0.5,
                f"{mod_reason}（{ind_label}）",
            )
        if ind_key == "game":
            for mod_key, mod_name, mod_reason, bonus in _contextual_game_modules(text):
                push(mod_key, bonus, f"{mod_reason}（{ind_label}）")

    if any(w in q_lower for w in ("闹钟", "alarm", "cron")) and "notify_im" in seen:
        out = [x for x in out if x["key"] != "notify_im"]
    if ("不要" in text or "仅" in text) and any(w in text for w in ("钉钉", "企微", "飞书")):
        out = [x for x in out if x["key"] != "notify_im"]

    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:16]


def top_industry_hit(user_text: str) -> dict | None:
    items = match_modules_keyword(user_text)
    for item in items:
        if item.get("type") == "industry":
            return item
    return None


def merge_keyword_with_llm(keyword_items: list[dict], llm_items: list[dict], *, limit: int = 12) -> list[dict]:
    """LLM 结果优先，关键词补齐遗漏项。"""
    return _merge_item_lists(llm_items, keyword_items, limit=limit)
