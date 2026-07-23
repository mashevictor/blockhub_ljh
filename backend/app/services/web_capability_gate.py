"""Web Runtime 闸门：禁止挂「有 web_pkg 但未 registerWidget」的假能力。

弹幕 / compose / schema 写回 / Runtime 读 schema 共用。
选型即交付：页面上的 widget 必须能在 packages/web-capability-* 里找到注册。
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.data.capability_registry import ALL_CAPABILITIES
from app.services.build_manifest import _web_pkg

REPO_ROOT = Path(__file__).resolve().parents[3]

# seed 里声明了 widget、但对应 web 包从未 registerWidget 的 key → 正式 Path-A
FAKE_WEB_KEY_REMAP: dict[str, str] = {
    "contract_editor": "legal_case",
    "contract_sign": "legal_case",
    "contract_seal": "legal_case",
    "contract_pdf": "legal_case",
    "contract_esign": "legal_case",
    "esign": "legal_case",
    "approval_countersign": "approval_flow",
    "approval_conditional": "approval_flow",
    "approval_esign": "approval_flow",
    "approval_remind": "approval_inbox",
    "announce_board": "notify_inapp",
    "chart_basic": "chart_dashboard",
    "chart_kpi_card": "chart_dashboard",
    "report_scheduled": "chart_dashboard",
    "data_export": "chart_dashboard",
    "kb_search": "kb_document",
    "integration": "erp_connector",
}

# 历史 schema 里可能残留的未注册 widget 名 → 已注册 widget
FAKE_WIDGET_REMAP: dict[str, str] = {
    "ContractEditorWidget": "LegalCaseWidget",
    "SignWidget": "LegalCaseWidget",
    "SealWidget": "LegalCaseWidget",
    "PdfWidget": "LegalCaseWidget",
    "EsignWidget": "FormWidget",
    "WorkflowWidget": "FormWidget",
    "NotifyWidget": "ApprovalInboxWidget",
    "BannerWidget": "InboxWidget",
    "ChartWidget": "DashboardWidget",
    "KpiCardWidget": "DashboardWidget",
    "ReportWidget": "DashboardWidget",
    "ExportWidget": "DashboardWidget",
    "KBSearchWidget": "KBUploadWidget",
    "ConnectorWidget": "ERPWidget",
    "AlarmWidget": "InboxWidget",
    "OAWidget": "ERPWidget",
    "MaskWidget": "RBACWidget",
    "AuditWidget": "RBACWidget",
    "SSOWidget": "RBACWidget",
    "CreationWizard": "FormWidget",
}

# widget → 正式 capability（sanitize 时补 capability_key / keys）
_WIDGET_TO_CAP: dict[str, str] = {
    "LegalCaseWidget": "legal_case",
    "HireOnboardWidget": "hire_onboard",
    "FormWidget": "approval_flow",
    "ApprovalInboxWidget": "approval_inbox",
    "ListWidget": "approval_inbox",
    "InboxWidget": "notify_inapp",
    "DashboardWidget": "chart_dashboard",
    "KBUploadWidget": "kb_document",
    "ERPWidget": "erp_connector",
    "IMWidget": "notify_im",
}


@lru_cache(maxsize=1)
def registered_web_widgets() -> frozenset[str]:
    """扫描 packages/web-capability-*/ 中 registerWidget 注册名。"""
    found: set[str] = set()
    root = REPO_ROOT / "packages"
    if not root.is_dir():
        return frozenset()
    pat = re.compile(r"registerWidget\(\s*['\"]([^'\"]+)['\"]")
    for pkg in root.glob("web-capability-*"):
        src = pkg / "src"
        if not src.is_dir():
            continue
        for idx in src.rglob("*"):
            if idx.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            try:
                text = idx.read_text(encoding="utf-8")
            except OSError:
                continue
            found.update(pat.findall(text))
    return frozenset(found)


def is_web_widget_registered(widget: str) -> bool:
    w = (widget or "").strip()
    if not w:
        return False
    return w in registered_web_widgets()


def is_web_ready_capability(key: str) -> bool:
    """能力在 Web Runtime 可 boot：registry + 真包 + widget 已 registerWidget。"""
    k = (key or "").strip()
    if not k or k not in ALL_CAPABILITIES:
        return False
    if k in FAKE_WEB_KEY_REMAP:
        return False
    cap = ALL_CAPABILITIES[k]
    if not cap.widget or not is_web_widget_registered(cap.widget):
        return False
    pkg = _web_pkg(k)
    if not pkg:
        return False
    slug = pkg.split("/")[-1]
    return (REPO_ROOT / "packages" / slug).is_dir()


def ensure_web_ready_key(key: str, *, hint: str = "") -> str:
    """把任意 key 落到可 Web 交付的正式能力；不可解析则 chat_qa。"""
    k = (key or "").strip()
    text = hint or ""

    if k in FAKE_WEB_KEY_REMAP:
        # 劳动合同 / 入职语境优先招聘入职
        if k.startswith("contract") and any(
            w in text for w in ("入职", "劳动", "雇佣", "工资", "招聘", "onboard")
        ):
            if "hire_onboard" in ALL_CAPABILITIES and is_web_ready_capability("hire_onboard"):
                return "hire_onboard"
        k = FAKE_WEB_KEY_REMAP[k]

    if k and is_web_ready_capability(k):
        return k

    # 已在 registry 但 widget 未注册：按同名 remap 再试
    if k in ALL_CAPABILITIES:
        w = ALL_CAPABILITIES[k].widget
        rw = FAKE_WIDGET_REMAP.get(w, w)
        for cand_key, cand_def in ALL_CAPABILITIES.items():
            if cand_def.widget == rw and is_web_ready_capability(cand_key):
                return cand_key

    if is_web_ready_capability("chat_qa"):
        return "chat_qa"
    return "chat_qa"


def patch_registry_fake_web_aliases() -> int:
    """进程启动：把假 web 能力的 widget/web_pkg 改成正式 Path-A 别名，避免再写出未注册 widget。"""
    from dataclasses import replace

    n = 0
    for fake, real in FAKE_WEB_KEY_REMAP.items():
        src = ALL_CAPABILITIES.get(fake)
        dst = ALL_CAPABILITIES.get(real)
        if not src or not dst:
            continue
        if src.widget == dst.widget and (src.web_pkg or "") == (dst.web_pkg or _web_pkg(real) or ""):
            continue
        ALL_CAPABILITIES[fake] = replace(
            src,
            widget=dst.widget,
            web_pkg=dst.web_pkg or (_web_pkg(real) or ""),
            route=dst.route or src.route,
            menu_icon=dst.menu_icon or src.menu_icon,
            menu_label=dst.menu_label or src.menu_label or dst.name,
        )
        n += 1
    return n


def _rewrite_node_widgets(node: Any, *, hint: str = "") -> None:
    if isinstance(node, list):
        for child in node:
            _rewrite_node_widgets(child, hint=hint)
        return
    if not isinstance(node, dict):
        return
    # Path-B / 内置生成页：勿改挂到 chat_qa
    ntype = str(node.get("type") or "")
    props = node.get("props") if isinstance(node.get("props"), dict) else None
    if ntype in ("generated_page", "landing_hero"):
        for k, v in list(node.items()):
            if k == "props":
                continue
            if isinstance(v, (dict, list)):
                _rewrite_node_widgets(v, hint=hint)
        return
    if props is not None:
        w0 = str(props.get("widget") or "")
        ck0 = str(props.get("capability_key") or "")
        if w0 == "GeneratedPageWidget" or ck0.startswith("gen_") or props.get("source_html"):
            for k, v in list(node.items()):
                if k == "props":
                    continue
                if isinstance(v, (dict, list)):
                    _rewrite_node_widgets(v, hint=hint)
            return
    local_hint = hint or str(node.get("title") or node.get("label") or node.get("name") or "")
    if props is not None:
        ck = str(props.get("capability_key") or node.get("capability_key") or "")
        w = str(props.get("widget") or "")
        need_fix = (ck in FAKE_WEB_KEY_REMAP) or (w and not is_web_widget_registered(w))
        if need_fix:
            ready = ensure_web_ready_key(ck, hint=local_hint + " " + w)
            cap = ALL_CAPABILITIES.get(ready)
            if cap:
                props["capability_key"] = ready
                props["widget"] = cap.widget
            elif w in FAKE_WIDGET_REMAP:
                nw = FAKE_WIDGET_REMAP[w]
                props["widget"] = nw
                if _WIDGET_TO_CAP.get(nw):
                    props["capability_key"] = _WIDGET_TO_CAP[nw]
    ck = node.get("capability_key")
    if isinstance(ck, str) and (ck in FAKE_WEB_KEY_REMAP or not is_web_ready_capability(ck)):
        if not ck.startswith("gen_"):
            node["capability_key"] = ensure_web_ready_key(ck, hint=local_hint)
    for k, v in list(node.items()):
        if k == "props":
            continue
        if isinstance(v, (dict, list)):
            _rewrite_node_widgets(v, hint=local_hint)


def sanitize_page_schema(schema: dict[str, Any] | None) -> dict[str, Any]:
    """清洗 menu / pages / capability_keys：假能力与未注册 widget 一律改挂正式 Path-A。"""
    if not isinstance(schema, dict):
        return {}
    out = dict(schema)

    keys_in = [str(k) for k in (out.get("capability_keys") or []) if k]

    menu = out.get("menu")
    menu_hint_by_cap: dict[str, str] = {}
    if isinstance(menu, list):
        new_menu: list[dict[str, Any]] = []
        for item in menu:
            if not isinstance(item, dict):
                continue
            row = dict(item)
            label = str(row.get("label") or "")
            ck = str(row.get("capability_key") or row.get("key") or "")
            if ck:
                if ck.startswith("gen_"):
                    # Path-B 生成页菜单：保留 key/route，勿改写成 chat_qa
                    row["key"] = ck
                    menu_hint_by_cap[ck] = label
                else:
                    ready = ensure_web_ready_key(ck, hint=label)
                    row["capability_key"] = ready
                    menu_hint_by_cap[ck] = label
                    menu_hint_by_cap[ready] = label
                    cap = ALL_CAPABILITIES.get(ready)
                    if cap:
                        row["widget"] = cap.widget
            new_menu.append(row)
        out["menu"] = new_menu

    # 用菜单文案当 hint，改写页面树里的假 widget
    blob_hint = " ".join(menu_hint_by_cap.values())
    for tree_key in ("root", "pages", "routes", "children"):
        if tree_key in out:
            _rewrite_node_widgets(out[tree_key], hint=blob_hint)

    pages = out.get("pages")
    if isinstance(pages, dict):
        for pid, node in list(pages.items()):
            _rewrite_node_widgets(node, hint=blob_hint + " " + str(pid))

    # keys：优先菜单落地的正式能力，再合并原 keys（带菜单文案 hint）；保留 gen_*
    keys_out: list[str] = []
    seen: set[str] = set()
    for k in keys_in:
        if str(k).startswith("gen_") and k not in seen:
            seen.add(k)
            keys_out.append(k)
    if isinstance(out.get("menu"), list):
        for item in out["menu"]:
            if not isinstance(item, dict):
                continue
            ck = str(item.get("capability_key") or item.get("key") or "")
            if ck.startswith("gen_") and ck not in seen:
                seen.add(ck)
                keys_out.append(ck)
            elif ck and ck not in seen and is_web_ready_capability(ck):
                seen.add(ck)
                keys_out.append(ck)
    for k in keys_in:
        if str(k).startswith("gen_"):
            continue
        hint = menu_hint_by_cap.get(k, blob_hint)
        ready = ensure_web_ready_key(k, hint=hint)
        if ready not in seen and is_web_ready_capability(ready):
            seen.add(ready)
            keys_out.append(ready)
    out["capability_keys"] = keys_out or ["chat_qa"]

    return out


def filter_web_ready_keys(keys: list[str] | None, *, hint: str = "") -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for k in keys or []:
        raw = str(k)
        if raw.startswith("gen_"):
            if raw not in seen:
                seen.add(raw)
                out.append(raw)
            continue
        ready = ensure_web_ready_key(raw, hint=hint)
        if ready not in seen:
            seen.add(ready)
            out.append(ready)
    return out
