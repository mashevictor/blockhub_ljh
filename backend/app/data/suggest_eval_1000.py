"""1000 条随机/组合用户输入 + 期望命中（用于意图/关键词批量评估）。"""

from __future__ import annotations

import random

from app.data.capability_registry import ALL_CAPABILITIES, INDUSTRY_HINTS
from app.data.suggest_eval_cases import EVAL_CASES
from app.services.keyword_match import INDUSTRY_DEFAULT_MODULES

random.seed(20260711)

_INDUSTRY_TEMPLATES = (
    "做一个{w}相关的应用",
    "需要{w}管理系统",
    "{w}业务场景搭建",
    "帮我生成{w}方向的应用",
    "{prefix}{w}{suffix}",
    "我们要上{w}数字化",
    "给团队做{w}助手",
    "{w}场景 + 审批流程",
)

_CAP_TEMPLATES = (
    "要有{w}功能",
    "加上{w}模块",
    "集成{w}",
    "支持{w}",
    "做一个带{w}的应用",
)

_PREFIXES = ("", "企业", "门店", "移动", "小程序", "内部")
_SUFFIXES = ("", "平台", "系统", "助手", "工具")

_EDGE_CASES: list[dict] = [
    {"input": "你", "expect_empty": True, "category": "edge"},
    {"input": "  ", "expect_empty": True, "category": "edge"},
    {"input": "你好", "expect_status": "unclear", "category": "edge"},
    {"input": "今天天气怎么样", "expect_status": "invalid", "category": "negative"},
    {"input": "讲个笑话", "expect_status": "invalid", "category": "negative"},
    {"input": "？？？", "expect_status": "invalid", "category": "negative"},
    {"input": "两个狗游戏", "expect_any": ["game", "chat_qa"], "category": "game"},
    {"input": "两只狗打架游戏", "expect_any": ["game", "chat_qa"], "category": "game"},
    {"input": "宠物对战小游戏", "expect_any": ["game", "chat_qa"], "category": "game"},
    {"input": "手游开服活动通知", "expect_any": ["game", "notify_inapp"], "category": "game"},
]


def _default_modules_for(ind_key: str) -> list[str]:
    return [m[0] for m in INDUSTRY_DEFAULT_MODULES.get(ind_key, [])]


def build_eval_cases(total: int = 1000) -> list[dict]:
    cases: list[dict] = []
    seen: set[str] = set()

    def add(case: dict) -> None:
        text = case["input"].strip()
        if not text or text in seen:
            return
        seen.add(text)
        case.setdefault("category", "seed")
        cases.append(case)

    for c in EVAL_CASES:
        add(dict(c))

    for c in _EDGE_CASES:
        add(dict(c))

    # 行业关键词 × 随机模板
    while len(cases) < total - 120:
        words, ind_key, ind_label = random.choice(INDUSTRY_HINTS)
        w = random.choice(words)
        tpl = random.choice(_INDUSTRY_TEMPLATES)
        text = tpl.format(
            w=w,
            prefix=random.choice(_PREFIXES),
            suffix=random.choice(_SUFFIXES),
        ).strip()
        mods = _default_modules_for(ind_key)
        add({
            "input": text,
            "expect_any": [ind_key, *mods[:2]],
            "planted_industry": ind_key,
            "planted_label": ind_label,
            "category": "industry_random",
        })

    # 能力关键词 × 随机模板
    caps = [c for c in ALL_CAPABILITIES.values() if c.keywords]
    while len(cases) < total - 40:
        cap = random.choice(caps)
        w = random.choice(cap.keywords)
        if len(w) < 2:
            continue
        text = random.choice(_CAP_TEMPLATES).format(w=w)
        add({
            "input": text,
            "expect_any": [cap.key],
            "planted_capability": cap.key,
            "category": "capability_random",
        })

    # 行业 + 能力组合
    while len(cases) < total:
        words, ind_key, ind_label = random.choice(INDUSTRY_HINTS)
        cap = random.choice(caps)
        iw = random.choice(words)
        cw = random.choice(cap.keywords)
        text = f"{random.choice(_PREFIXES)}{iw}{random.choice(['', '的'])}{cw}应用"
        mods = _default_modules_for(ind_key)
        expect = list(dict.fromkeys([ind_key, cap.key, *mods[:1]]))
        add({
            "input": text,
            "expect_any": expect,
            "planted_industry": ind_key,
            "planted_capability": cap.key,
            "category": "combo_random",
        })

    return cases[:total]


EVAL_CASES_1000: list[dict] = build_eval_cases(1000)
assert len(EVAL_CASES_1000) == 1000, len(EVAL_CASES_1000)
