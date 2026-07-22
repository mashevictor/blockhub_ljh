# -*- coding: utf-8 -*-
"""游戏娱乐行业场景 → 正式 capability 映射（SSOT）。

真 API：game_support / game_2048 / kb_document / approval_flow / notify_im /
chart_dashboard / erp_connector；双专属知识库；禁止假 seed / 空壳 C 端页冒充。
"""

from __future__ import annotations

from typing import Any

_GAME_SCENE_ROWS: list[dict[str, Any]] = [
    {
        "name": "玩家FAQ",
        "category": "玩家服务",
        "capability_key": "game_support",
        "pages": "form+list",
        "problem": "活动规则、掉落、版本说明高频问答；写入真 FAQ 记录并可检索知识库。",
        "page_kind": "form_list",
        "default_category": "faq",
        "form_headline": "玩家 FAQ",
        "agent": "game_support",
    },
    {
        "name": "客服工单",
        "category": "客服管理",
        "capability_key": "game_support",
        "pages": "form+list",
        "problem": "玩家掉线/充值/封号问题流转；真工单建单、关闭闭环。",
        "page_kind": "form_list",
        "default_category": "ticket",
        "form_headline": "客服工单",
        "agent": "game_support",
    },
    {
        "name": "活动规则检索",
        "category": "知识管理",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "策划文档 / 活动规则 RAG；锁定「游戏·玩家FAQ与活动规则库」。",
        "page_kind": "chat_kb",
        "form_headline": "活动规则检索",
        "kb_slug": "game-faq",
        "agent": "kb_document",
    },
    {
        "name": "版号合规检索",
        "category": "合规管理",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "版号材料、敏感词、外包验收口径 RAG；锁定「游戏·版号合规与内容审核库」。",
        "page_kind": "chat_kb",
        "form_headline": "版号合规检索",
        "kb_slug": "game-compliance",
        "agent": "kb_document",
    },
    {
        "name": "游戏·玩家FAQ与活动规则库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "行业专属知识库 · 活动规则/攻略真文档 RAG，空库空列表。",
        "page_kind": "chat_kb",
        "form_headline": "游戏·玩家FAQ与活动规则库",
        "kb_slug": "game-faq",
        "agent": "kb_document",
    },
    {
        "name": "游戏·版号合规与内容审核库",
        "category": "行业知识库",
        "capability_key": "kb_document",
        "pages": "kb+chat",
        "problem": "行业专属知识库 · 版号/敏感词/验收真文档 RAG，空库空列表。",
        "page_kind": "chat_kb",
        "form_headline": "游戏·版号合规与内容审核库",
        "kb_slug": "game-compliance",
        "agent": "kb_document",
    },
    {
        "name": "活动上线通知",
        "category": "消息通知",
        "capability_key": "notify_im",
        "pages": "notify",
        "problem": "开服/赛季活动 IM 推送；真 Webhook 绑定与测推。",
        "page_kind": "notify",
        "form_headline": "活动上线通知",
        "agent": "notify_im",
    },
    {
        "name": "外包验收审批",
        "category": "审批流程",
        "capability_key": "approval_flow",
        "pages": "approval+form",
        "problem": "美术/音效外包验收多级审批；真审批流。",
        "page_kind": "form_list",
        "form_headline": "外包验收审批",
        "agent": "approval_flow",
    },
    {
        "name": "版号合规审查",
        "category": "合规管理",
        "capability_key": "approval_flow",
        "pages": "approval+form",
        "problem": "内容上线前合规自检与会签；真审批，可联动合规知识库。",
        "page_kind": "form_list",
        "form_headline": "版号合规审查",
        "agent": "approval_flow",
    },
    {
        "name": "留存运营看板",
        "category": "数据分析",
        "capability_key": "chart_dashboard",
        "pages": "chart",
        "problem": "留存/活跃等运营指标看板；真图表组件读租户数据。",
        "page_kind": "chart",
        "form_headline": "留存运营看板",
        "agent": "chart_dashboard",
    },
    {
        "name": "渠道投放分析",
        "category": "数据分析",
        "capability_key": "data_nl_query",
        "pages": "chart",
        "problem": "CAC/ROI 自然语言问数；真 NL 问数接口。",
        "page_kind": "chart",
        "form_headline": "渠道投放分析",
        "agent": "data_nl_query",
    },
    {
        "name": "对接游戏后台",
        "category": "系统集成",
        "capability_key": "erp_connector",
        "pages": "integration",
        "problem": "GM / 数据中台连接器配置；真集成能力。",
        "page_kind": "integration",
        "form_headline": "对接游戏后台",
        "agent": "erp_connector",
    },
    {
        "name": "2048小游戏",
        "category": "运营互动",
        "capability_key": "game_2048",
        "pages": "form",
        "problem": "正式可玩 2048（路径 A），非 codegen 空壳。",
        "page_kind": "game",
        "form_headline": "2048",
        "agent": "game_2048",
    },
    {
        "name": "公会举报处理",
        "category": "社区管理",
        "capability_key": "game_support",
        "pages": "form+list",
        "problem": "公会公告/举报工单；复用 game_support 真工单。",
        "page_kind": "form_list",
        "default_category": "ticket",
        "form_headline": "公会举报处理",
        "agent": "game_support",
    },
]

GAME_SCENE_COUNT = len(_GAME_SCENE_ROWS)
GAME_SCENES_BY_NAME: dict[str, dict[str, Any]] = {r["name"]: r for r in _GAME_SCENE_ROWS}

GAME_OVERVIEW = (
    "游戏娱乐深度包：玩家 FAQ/客服工单真库、双专属知识库 RAG、活动通知、"
    "版号合规审批、运营问数与游戏后台对接、2048 正式可玩；禁止假 seed。"
)
GAME_HIGHLIGHTS = [
    "玩家 FAQ · 客服工单真 API",
    "活动规则 / 版号合规双知识库",
    "活动通知 · IM Webhook",
    "2048 正式能力可玩",
]


def game_scene_names() -> list[str]:
    return [r["name"] for r in _GAME_SCENE_ROWS]


def game_pack_scenes() -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for r in _GAME_SCENE_ROWS:
        out.append(
            {
                "name": r["name"],
                "category": r["category"],
                "problem": r["problem"],
                "pages": r.get("pages") or "form+list",
                "standard": "✓",
                "agent": str(r.get("agent") or r["capability_key"]),
            }
        )
    return out


def enrich_menu_plan_item(plan_item: dict[str, Any], scene_name: str) -> dict[str, Any]:
    row = GAME_SCENES_BY_NAME.get(scene_name)
    if not row:
        return plan_item
    plan_item["capability_key"] = row["capability_key"]
    if row.get("default_category"):
        plan_item["default_category"] = row["default_category"]
    if row.get("form_headline"):
        plan_item["form_headline"] = row["form_headline"]
    if row.get("page_kind"):
        plan_item["page_kind"] = row["page_kind"]
    if row.get("kb_slug"):
        from app.data.industry_knowledge_bases import industry_kb_defs

        for hub in industry_kb_defs("game"):
            if hub["slug"] == row["kb_slug"]:
                plan_item["kb_name"] = hub["name"]
                plan_item["kb_description"] = hub["description"]
                plan_item["kb_slug"] = hub["slug"]
                plan_item["lock_kb"] = True
                break
    return plan_item


def page_mock_for_scene(name: str) -> dict[str, Any] | None:
    row = GAME_SCENES_BY_NAME.get(name)
    if not row:
        return None
    return {
        "form_title": row.get("form_headline") or name,
        "ui_kind": row.get("page_kind") or "form_list",
    }
