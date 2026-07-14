"""Resolve capability_keys from scenarios, modules, and explicit keys."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.data.schema_templates import resolve_capability_keys
from app.services.effective_capability_registry import (
    CapabilityAssemblyMeta,
    hydrate_approved_custom_capabilities,
    is_registry_key,
)

# 展示用/非能力 key：不可进 codegen，也不可当作用户「勾选能力」
_IGNORE_KEY_PREFIXES = ("scene:", "chip-", "office:", "industry:")
_NON_CAPABILITY_KINDS = frozenset({"scenario", "industry", "office", "action"})


def _looks_like_capability_key(key: str) -> bool:
    k = (key or "").strip()
    if not k or any(k.startswith(p) for p in _IGNORE_KEY_PREFIXES):
        return False
    # 行业 slug（mfg/office）等短横/纯小写非能力
    if k in {"mfg", "office", "sales", "med", "game", "retail", "edu", "logistics"}:
        return False
    return True


def _collect_requested(
    *,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    def add(key: str) -> None:
        k = (key or "").strip()
        if not k or k in seen or not _looks_like_capability_key(k):
            return
        seen.add(k)
        ordered.append(k)

    if capability_keys:
        for k in capability_keys:
            add(str(k))
    if modules:
        for m in modules:
            if not isinstance(m, dict) or not m.get("key"):
                continue
            kind = str(m.get("kind") or m.get("type") or "").strip().lower()
            if kind and kind in _NON_CAPABILITY_KINDS:
                continue
            add(str(m["key"]))
    return ordered


def resolve_publish_capability_keys(
    *,
    scenario_names: list[str] | None,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
    industry_key: str = "office",
    db: Session | None = None,
    tenant_id: str | None = None,
) -> list[str]:
    result = resolve_publish_capability_keys_detailed(
        scenario_names=scenario_names,
        capability_keys=capability_keys,
        modules=modules,
        industry_key=industry_key,
        db=db,
        tenant_id=tenant_id,
    )
    return result.resolved_keys


def resolve_publish_capability_keys_detailed(
    *,
    scenario_names: list[str] | None,
    capability_keys: list[str] | None,
    modules: list[dict] | None,
    industry_key: str = "office",
    db: Session | None = None,
    tenant_id: str | None = None,
) -> CapabilityAssemblyMeta:
    if db is not None and tenant_id:
        hydrate_approved_custom_capabilities(db, tenant_id)

    requested = _collect_requested(capability_keys=capability_keys, modules=modules)
    explicit_ok = [k for k in requested if is_registry_key(k)]
    # 未知 key 留给异步 codegen（真正的缺失能力），场景/行业元数据不得混入
    unknown = [k for k in requested if not is_registry_key(k)]

    scenario_from_tpl: list[str] = []
    if scenario_names:
        scenario_from_tpl = [
            k
            for k in resolve_capability_keys(
                scenario_names=scenario_names,
                explicit_keys=None,
                industry_key=industry_key,
            )
            if is_registry_key(k)
        ]

    resolved: list[str] = []
    seen: set[str] = set()

    def push(keys: list[str]) -> None:
        for k in keys:
            if k and k not in seen:
                seen.add(k)
                resolved.append(k)

    # 用户选中的场景模板优先（选型意图），再合并显式勾选
    if scenario_from_tpl:
        push(scenario_from_tpl)
        push(explicit_ok)
        scenario_added = list(scenario_from_tpl)
        # 设备报修场景勿被旧底座「审批流」顶替成 FormWidget
        if "device_repair" in scenario_from_tpl and "approval_flow" not in scenario_from_tpl:
            resolved[:] = [k for k in resolved if k != "approval_flow"]
            seen.discard("approval_flow")
    elif explicit_ok or unknown:
        push(explicit_ok)
        scenario_added = []
    else:
        push(
            [
                k
                for k in resolve_capability_keys(
                    scenario_names=None,
                    explicit_keys=None,
                    industry_key=industry_key,
                )
                if is_registry_key(k)
            ]
        )
        scenario_added = list(resolved)

    return CapabilityAssemblyMeta(
        requested_keys=requested,
        resolved_keys=resolved,
        dropped_keys=unknown,
        scenario_added_keys=scenario_added,
    )
