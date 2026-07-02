"""模块推荐：关键词匹配 + DeepSeek 补全。"""

from __future__ import annotations

import re

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES, INDUSTRY_HINTS
from app.services.deepseek_client import merge_llm_items, suggest_with_deepseek

# 置信度阈值：低于此值或零结果时尝试 DeepSeek
LLM_FALLBACK_MAX_SCORE = 4.0
LLM_FALLBACK_MIN_ITEMS = 1


def _norm(text: str) -> str:
    return text.strip().lower()


def _score_keywords(q: str, keywords: tuple[str, ...]) -> float:
    score = 0.0
    for w in keywords:
        wn = w.lower()
        if wn in q or w in q:
            score += 3.0 if len(wn) >= 3 else 1.5
    return score


def suggest_modules_keyword(user_text: str) -> list[dict]:
    q = _norm(user_text)
    if len(q) < 2:
        return []

    seen: set[str] = set()
    out: list[dict] = []

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

    for cap in ALL_CAPABILITIES.values():
        s = _score_keywords(q, cap.keywords)
        if s > 0:
            push(cap.key, s, f"匹配能力「{cap.name}」")

    # 名称直接命中
    for cap in ALL_CAPABILITIES.values():
        if cap.name in user_text:
            push(cap.key, 5.0, f"描述含「{cap.name}」")

    # 行业
    for words, key, label in INDUSTRY_HINTS:
        s = _score_keywords(q, words)
        if s > 0:
            push(key, s + 2, f"匹配行业「{label}」", pick_type="industry", label=label)

    # 去除误匹配：闹钟场景不应优先企微；用户明确不要钉钉/企微
    if any(w in q for w in ("闹钟", "alarm", "cron")) and "notify_im" in seen:
        out = [x for x in out if x["key"] != "notify_im"]
    if ("不要" in q or "仅" in q) and any(w in q for w in ("钉钉", "企微", "飞书")):
        out = [x for x in out if x["key"] != "notify_im"]

    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:10]


def suggest_modules(user_text: str, *, force_llm: bool = False) -> dict:
    text = user_text.strip()
    keyword_items = suggest_modules_keyword(text)
    top_score = keyword_items[0]["score"] if keyword_items else 0.0
    used_llm = False
    supplemented: list[dict] = []

    module_like = [x for x in keyword_items if x.get("type") in ("module", "supplement")]
    need_llm = force_llm or (
        settings.deepseek_api_key
        and (len(module_like) < 1 or top_score < LLM_FALLBACK_MAX_SCORE)
    )

    if need_llm and len(text) >= 2:
        parsed = suggest_with_deepseek(text)
        if parsed:
            llm_items, supplemented = merge_llm_items(parsed)
            if llm_items:
                used_llm = True
                # LLM 结果优先，关键词结果补位
                seen = {x["key"] for x in llm_items}
                merged = llm_items + [x for x in keyword_items if x["key"] not in seen]
                keyword_items = merged[:10]

    confidence = min(1.0, top_score / 10.0) if keyword_items else 0.0
    if used_llm:
        confidence = max(confidence, 0.72)

    return {
        "items": keyword_items,
        "confidence": round(confidence, 2),
        "used_llm": used_llm,
        "supplemented": supplemented,
        "top_score": top_score,
    }
