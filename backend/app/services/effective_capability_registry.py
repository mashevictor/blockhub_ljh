"""Effective capability registry — seed/catalog/custom 与 ALL_CAPABILITIES 对齐。"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.data import seed
from app.data.capability_registry import ALL_CAPABILITIES, CapabilityDef
from app.db.models import CatalogCapability, CustomCapability


def _def_from_seed_item(item: dict) -> CapabilityDef:
    key = str(item["key"])
    widget = str(item.get("widget") or "ListWidget")
    # 与 CORE 能力共享 web 包时走约定路由
    web_pkg = ""
    route = ""
    menu_icon = "module"
    if key in ("chat_qa", "chat_voice", "chat_summary"):
        web_pkg = "@blockhub/web-capability-chat"
        route = "/chat" if key != "chat_summary" else "/summary"
        menu_icon = "chat"
    elif key == "multi_agent":
        web_pkg = "@blockhub/web-capability-multi-agent"
        route = "/multi-agent"
        menu_icon = "chat"
    elif key == "data_nl_query":
        web_pkg = "@blockhub/web-capability-data-nl-query"
        route = "/nl-query"
        menu_icon = "chart"
    elif key.startswith("shanghai_voice"):
        web_pkg = "@blockhub/web-capability-voice"
        route = "/voice"
        menu_icon = "mic"
    elif key.startswith("approval") or key.startswith("contract"):
        web_pkg = "@blockhub/web-capability-approval"
        route = "/approval" if "inbox" not in key else "/inbox"
        menu_icon = "approval" if "flow" in key else "inbox"
    elif key.startswith("kb_"):
        web_pkg = "@blockhub/web-capability-kb"
        route = "/kb"
        menu_icon = "book"
    elif key.startswith("chart_") or key in ("report_scheduled", "data_export"):
        web_pkg = "@blockhub/web-capability-dashboard"
        route = "/dashboard"
        menu_icon = "chart"
    elif key.startswith("notify") or key == "schedule_alarm" or key == "announce_board":
        web_pkg = "@blockhub/web-capability-dashboard"
        route = "/notifications"
        menu_icon = "bell"
    elif key in (
        "erp_connector",
        "meeting_booking",
        "it_helpdesk",
        "asset_manage",
        "notify_im",
        "rbac_page",
    ) or key.startswith("custom_"):
        web_pkg = "@blockhub/web-capability-integration"
        route = f"/{key.replace('_', '-')}"
        menu_icon = "integration"
    return CapabilityDef(
        key=key,
        name=str(item.get("name") or key),
        category=str(item.get("category") or "扩展能力"),
        widget=widget,
        agent_id=str(item.get("agent_id") or "creation"),
        keywords=tuple(),
        web_pkg=web_pkg,
        menu_icon=menu_icon,
        route=route,
    )


def bootstrap_registry_from_seed() -> int:
    """将 seed.CAPABILITIES 中缺失项补入 ALL_CAPABILITIES（进程内一次）。"""
    added = 0
    for item in seed.CAPABILITIES:
        key = str(item["key"])
        if key in ALL_CAPABILITIES:
            continue
        ALL_CAPABILITIES[key] = _def_from_seed_item(item)
        added += 1
    return added


def _def_from_custom(row: CustomCapability) -> CapabilityDef:
    key = str(row.key)
    if not key.startswith("custom_"):
        key = f"custom_{key}"
    kws = tuple((row.keywords or [])[:12])
    return CapabilityDef(
        key=key,
        name=row.name,
        category=row.category or "自定义",
        widget="CustomWidget",
        agent_id="creation",
        keywords=kws,
        menu_icon="module",
        route=f"/{key.replace('_', '-')}",
    )


def register_custom_capability(db: Session, row: CustomCapability) -> str:
    """审核通过后写入 Catalog + 运行时 registry。"""
    cap_def = _def_from_custom(row)
    key = cap_def.key

    existing = db.query(CatalogCapability).filter(CatalogCapability.key == key).first()
    if not existing:
        db.add(
            CatalogCapability(
                key=key,
                name=row.name,
                category=row.category or "自定义",
                widget="CustomWidget",
                agent_id="creation",
            )
        )
    else:
        existing.name = row.name
        existing.category = row.category or "自定义"
        existing.widget = "CustomWidget"

    ALL_CAPABILITIES[key] = cap_def
    db.flush()
    return key


def hydrate_approved_custom_capabilities(db: Session, tenant_id: str) -> None:
    """将租户已审核自定义能力载入进程内 registry（不写库）。"""
    rows = (
        db.query(CustomCapability)
        .filter(CustomCapability.tenant_id == tenant_id, CustomCapability.status == "approved")
        .all()
    )
    for row in rows:
        cap_def = _def_from_custom(row)
        ALL_CAPABILITIES[cap_def.key] = cap_def


def is_registry_key(key: str) -> bool:
    return bool(key and key in ALL_CAPABILITIES)


@dataclass
class CapabilityAssemblyMeta:
    requested_keys: list[str]
    resolved_keys: list[str]
    dropped_keys: list[str]
    scenario_added_keys: list[str]

    def to_dict(self) -> dict:
        from app.data.capability_registry import ALL_CAPABILITIES

        dropped_details = [
            {
                "key": k,
                "name": ALL_CAPABILITIES[k].name if k in ALL_CAPABILITIES else k,
            }
            for k in self.dropped_keys
        ]
        return {
            "requested_keys": self.requested_keys,
            "resolved_keys": self.resolved_keys,
            "dropped_keys": self.dropped_keys,
            "dropped_details": dropped_details,
            "scenario_added_keys": self.scenario_added_keys,
        }


# 模块 import 时补齐 seed 能力，避免 catalog 有而 registry 无
bootstrap_registry_from_seed()
