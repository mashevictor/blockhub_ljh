"""用户可选交付模板：网页壳 × App UI 壳（选型即交付）。"""

from __future__ import annotations

from typing import Any

WEB_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "tabs_portal",
        "label": "Tabs 门户",
        "desc": "底部/顶部多页签，适合多项能力并列",
        "layout": "tabs",
    },
    {
        "id": "sidebar_admin",
        "label": "侧栏后台",
        "desc": "左侧导航 + 内容区，适合管理后台",
        "layout": "sidebar",
    },
    {
        "id": "landing_single",
        "label": "单页落地",
        "desc": "英雄区 + 能力区块，适合少模块推广页",
        "layout": "landing",
    },
]

APP_UI_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "bottom_tabs",
        "label": "底部 Tab",
        "desc": "经典底部导航多能力壳",
        "voice_demo": False,
    },
    {
        "id": "drawer_nav",
        "label": "侧栏抽屉",
        "desc": "抽屉导航 + 内容页",
        "voice_demo": False,
    },
    {
        "id": "immersive_chat",
        "label": "沉浸对话",
        "desc": "全屏对话/语音体验（上海话等语音能力推荐）",
        "voice_demo": True,
    },
]

WEB_IDS = {t["id"] for t in WEB_TEMPLATES}
APP_UI_IDS = {t["id"] for t in APP_UI_TEMPLATES}
DEFAULT_WEB_TEMPLATE = "tabs_portal"
DEFAULT_APP_UI = "bottom_tabs"


def normalize_web_template_id(value: str | None) -> str:
    v = (value or "").strip()
    return v if v in WEB_IDS else DEFAULT_WEB_TEMPLATE


def normalize_app_ui_id(value: str | None) -> str:
    v = (value or "").strip()
    return v if v in APP_UI_IDS else DEFAULT_APP_UI


def list_delivery_templates() -> dict[str, Any]:
    return {
        "web_templates": WEB_TEMPLATES,
        "app_ui_templates": APP_UI_TEMPLATES,
        "defaults": {
            "web_template_id": DEFAULT_WEB_TEMPLATE,
            "app_ui_id": DEFAULT_APP_UI,
        },
    }


def recommend_app_ui_for_keys(capability_keys: list[str]) -> str:
    keys = set(capability_keys or [])
    if "shanghai_voice" in keys or "shanghai_voice_stream" in keys or "chat_voice" in keys:
        return "immersive_chat"
    return DEFAULT_APP_UI
