"""意图理解 Agent — DeepSeek 验证用户需求并推荐行业/能力。"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES, capability_catalog_for_llm
from app.services.keyword_match import top_industry_hit
from app.data.industry_packs_all import ALL_INDUSTRY_PACKS, ALL_INDUSTRY_KEYS
from app.services.deepseek_client import deepseek_json_chat

AGENT_ID = "intent_agent"

# 无 LLM 时的基础拦截（色情、辱骂、纯符号等）
_BLOCK_PATTERNS = (
    r"做爱|色情|裸体|约炮|淫秽",
    r"^[^\u4e00-\u9fff\w]{2,}$",
)
_BLOCK_RE = re.compile("|".join(_BLOCK_PATTERNS), re.I)
_CHAT_INVALID_RE = re.compile(r"天气怎么样|今天天气|讲个笑话|讲笑话|随便聊聊|闲聊一下", re.I)
_CHAT_UNCLEAR_RE = re.compile(r"^(你好|嗨|在吗|哈喽|hi|hello)$", re.I)


def industry_catalog_for_llm() -> str:
    lines: list[str] = []
    for pack in ALL_INDUSTRY_PACKS:
        key = pack["key"]
        if key == "office":
            lines.append(f"- office: 通用办公 — {pack.get('tagline', '')}（66 项办公场景）")
        else:
            n = len(pack.get("scenes") or [])
            lines.append(f"- {key}: {pack['name']} — {pack.get('tagline', '')}（{n} 项场景）")
    return "\n".join(lines)


def _basic_validate(text: str) -> dict[str, Any] | None:
    t = text.strip()
    if len(t) < 2:
        return {
            "status": "unclear",
            "confidence": 0.0,
            "intent_summary": "",
            "rejection_reason": "",
            "guidance": "请至少输入 2 个字，描述您要搭建的企业应用或业务场景。",
            "industries": [],
            "offices": [],
            "items": [],
            "new_industries": [],
            "new_capabilities": [],
            "new_scenes": [],
        }
    if _CHAT_UNCLEAR_RE.match(t):
        return {
            "status": "unclear",
            "confidence": 0.25,
            "intent_summary": "",
            "rejection_reason": "",
            "guidance": "请补充行业与业务场景，例如：制造报修、游戏 FAQ、销售 CRM。",
            "industries": [],
            "offices": [],
            "items": [],
            "new_industries": [],
            "new_capabilities": [],
            "new_scenes": [],
        }
    if _CHAT_INVALID_RE.search(t):
        return {
            "status": "invalid",
            "confidence": 0.05,
            "intent_summary": "",
            "rejection_reason": "输入内容与搭建企业智能应用无关，无法生成方案。",
            "guidance": "请描述真实的业务场景，例如：制造设备报修、销售 CRM、游戏玩家 FAQ。",
            "industries": [],
            "offices": [],
            "items": [],
            "new_industries": [],
            "new_capabilities": [],
            "new_scenes": [],
        }
    if _BLOCK_RE.search(t):
        return {
            "status": "invalid",
            "confidence": 0.05,
            "intent_summary": "",
            "rejection_reason": "输入内容与搭建企业智能应用无关，无法生成方案。",
            "guidance": "请描述真实的业务场景，例如：制造设备报修、销售 CRM、医院排班、零售会员营销等。",
            "industries": [],
            "offices": [],
            "items": [],
            "new_industries": [],
            "new_capabilities": [],
            "new_scenes": [],
        }
    return None


def _keyword_industry_rescue(text: str) -> dict[str, Any] | None:
    """LLM 误判 invalid 时，用行业关键词拉回 valid。"""
    hit = top_industry_hit(text)
    if not hit or hit["score"] < 3.0:
        return None

    best_key = hit["key"]
    best_label = hit["label"]
    best_score = hit["score"]

    return {
        "status": "valid",
        "confidence": min(0.85, best_score / 10),
        "intent_summary": f"识别为{best_label}相关应用需求",
        "rejection_reason": "",
        "guidance": f"已匹配「{best_label}」及相关模块，可继续补充具体场景。",
        "industries": [{
            "key": best_key,
            "label": best_label,
            "reason": hit.get("reason", f"关键词匹配「{best_label}」"),
            "score": min(10, int(best_score)),
        }],
        "offices": [],
        "items": [],
        "new_industries": [],
        "new_capabilities": [],
        "new_scenes": [],
    }


def _build_system_prompt(extra_industries: str = "", extra_caps: str = "") -> str:
    from app.services.hero_preset_match import hero_scene_catalog_for_llm

    return (
        "你是积木仓 BlockHub 的「意图理解 Agent」，专门把用户的自然语言需求转化为可落地的企业智能应用方案。\n"
        "你的职责：\n"
        "1. 验证输入是否属于合法的企业/行业数字化需求；拒绝色情、违法、人身攻击、无意义乱码。\n"
        "   「纯娱乐闲聊」仅指与搭建应用无关的闲聊（讲笑话、问候、角色扮演聊天等），不包括游戏/小游戏/互动娱乐应用的搭建需求。\n"
        "   若用户描述游戏、休闲对战、宠物互动、动画演示等并要生成应用，一律视为 valid，industries 选 game。\n"
        "2. 理解用户真实业务意图，从已有行业包与能力模块中做合理匹配。\n"
        "3. 若现有 catalog 无法覆盖，在 new_industries / new_capabilities / new_scenes 中提出可注册的扩展项（key 用英文蛇形）。\n"
        "4. 输出必须可执行：每项推荐都要说明 reason。\n\n"
        "状态规则：\n"
        "- valid：能明确判断业务场景，confidence>=0.5，给出 industries/items。\n"
        "- unclear：信息过少或含糊（如单字、代词），confidence<0.5，items 可为空，必须给 guidance 引导补充。\n"
        "- invalid：与建应用无关、违规或无法理解，confidence<=0.2，items 必须为空，必须给 rejection_reason。\n\n"
        "匹配规则（高匹配优先）：\n"
        "- 若用户描述接近首页弹幕场景，必须优先选用「弹幕场景映射」中的 module key（如设备报修→device_repair，质检→quality_inspect，盘点→inventory_count，会员→member_loyalty，导诊→med_triage，护士排班→nurse_shift，玩家FAQ→game_support，家校通知→school_notice，作业答疑→homework_qa），不要用旧的 approval_flow 顶替。\n"
        "- 行业 key 必须从已有列表选择；不要编造不存在的 key 放进 industries。\n"
        "- 能力 module key 优先从 catalog 选取；确实没有时用 new_capabilities（key 以 custom_ 开头）。\n"
        "- 娱乐/游戏类（含休闲对战、宠物、小游戏、玩家 FAQ、客服工单、活动通知）优先 game 行业，不要硬塞办公审批，也不要判 invalid。\n"
        "- 健身、婚庆、直播、物联网等垂直场景：先找最接近行业，不足时用 new_industries + new_scenes。\n\n"
        "只返回 JSON：\n"
        '{"status":"valid|unclear|invalid","confidence":0-1,"intent_summary":"一句话理解",'
        '"rejection_reason":"","guidance":"给用户的补充引导",'
        '"industries":[{"key":"mfg","label":"传统制造","reason":"...","score":8}],'
        '"offices":[{"key":"流程审批","label":"流程审批","reason":"...","score":7}],'
        '"items":[{"key":"device_repair","name":"设备报修","reason":"...","score":9}],'
        '"new_industries":[{"key":"wellness","name":"健身运动","tagline":"课程预约会员管理","reason":"..."}],'
        '"new_capabilities":[{"key":"custom_live_commerce","name":"直播带货","category":"扩展能力","reason":"..."}],'
        '"new_scenes":[{"pack_key":"wellness","name":"课程预约","category":"会员服务","problem":"..."}]}'
        f"\n\n已有行业包：\n{industry_catalog_for_llm()}"
        f"{extra_industries}"
        f"\n\n弹幕场景 → 能力映射（高优先）：\n{hero_scene_catalog_for_llm()}"
        f"\n\n已有能力 catalog：\n{capability_catalog_for_llm()}"
        f"{extra_caps}"
    )


def analyze_intent(
    user_text: str,
    *,
    db: Session | None = None,
) -> dict[str, Any] | None:
    """DeepSeek 意图分析；无 Key 时返回基础校验结果。"""
    text = user_text.strip()
    basic = _basic_validate(text)
    if basic and (not settings.deepseek_api_key or basic["status"] == "invalid"):
        return basic

    extra_ind = ""
    extra_cap = ""
    if db:
        try:
            from app.db.models import CatalogCapability, CatalogIndustryPack

            db_inds = db.query(CatalogIndustryPack).filter(
                ~CatalogIndustryPack.key.in_(list(ALL_INDUSTRY_KEYS)),
            ).all()
            if db_inds:
                extra_ind = "\n\n动态注册行业：\n" + "\n".join(
                    f"- {r.key}: {r.name}" for r in db_inds
                )
            db_caps = db.query(CatalogCapability).filter(
                CatalogCapability.key.like("custom_%"),
            ).all()
            if db_caps:
                extra_cap = "\n\n动态注册能力：\n" + "\n".join(
                    f"- {r.key}: {r.name} ({r.category})" for r in db_caps
                )
        except Exception:
            pass

    if not settings.deepseek_api_key:
        rescued = _keyword_industry_rescue(text)
        if rescued:
            return rescued
        return basic

    parsed = deepseek_json_chat(
        _build_system_prompt(extra_ind, extra_cap),
        f"用户需求：{text}",
        temperature=0.2,
    )
    if not parsed:
        return basic

    status = str(parsed.get("status", "unclear")).strip().lower()
    if status not in ("valid", "unclear", "invalid"):
        status = "unclear"

    if status == "invalid":
        rescued = _keyword_industry_rescue(text)
        if rescued:
            return rescued

    conf = float(parsed.get("confidence", 0.5))
    if status == "invalid":
        conf = min(conf, 0.2)
    elif status == "valid":
        conf = max(conf, 0.5)

    # 过滤非法行业 key
    valid_inds = []
    for ind in parsed.get("industries") or []:
        key = str(ind.get("key", "")).strip()
        if key in ALL_INDUSTRY_KEYS:
            valid_inds.append(ind)

    _alarm_hints = ("闹钟", "alarm", "定时", "cron", "准时", "每天", "重复提醒", "番茄钟", "计时器", "倒计时")
    needs_alarm = any(h in text.lower() or h in text for h in _alarm_hints)

    valid_items = []
    for it in parsed.get("items") or []:
        key = str(it.get("key", "")).strip()
        if not key:
            continue
        if key == "schedule_alarm" and not needs_alarm:
            continue
        if key in ALL_CAPABILITIES or key.startswith("custom_"):
            valid_items.append(it)

    return {
        "status": status,
        "confidence": conf,
        "intent_summary": str(parsed.get("intent_summary", "")).strip(),
        "rejection_reason": str(parsed.get("rejection_reason", "")).strip(),
        "guidance": str(parsed.get("guidance", "")).strip(),
        "industries": valid_inds,
        "offices": parsed.get("offices") or [],
        "items": valid_items,
        "new_industries": parsed.get("new_industries") or [],
        "new_capabilities": parsed.get("new_capabilities") or [],
        "new_scenes": parsed.get("new_scenes") or [],
    }
