"""Minimal CapabilityDef + core keys for contract unit tests (开源示范子集)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CapabilityDef:
    key: str
    name: str
    category: str
    widget: str
    agent_id: str
    flutter_pkg: str = ""
    keywords: tuple[str, ...] = ()
    web_pkg: str = ""
    menu_icon: str = ""
    menu_label: str = ""
    route: str = ""


# 示范核心（不含产品面 shanghai_voice）
CORE_CAPABILITIES: list[CapabilityDef] = [
    CapabilityDef(
        "chat_qa",
        "智能问答",
        "智能交互",
        "ChatWidget",
        "chat_qa",
        web_pkg="",  # 约定推导
        menu_icon="chat",
        route="/chat",
    ),
    CapabilityDef(
        "approval_flow",
        "审批流",
        "流程审批",
        "FormWidget",
        "approval",
        web_pkg="",
        menu_icon="approval",
        route="/approval",
    ),
]


def core_capabilities_by_key() -> dict[str, CapabilityDef]:
    return {c.key: c for c in CORE_CAPABILITIES}
