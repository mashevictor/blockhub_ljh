"""按 capability_keys 聚合：库表字段、REST 接口、可下载代码路径。"""

from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass
from typing import Any

from sqlalchemy import inspect as sa_inspect

from app.data.capability_registry import ALL_CAPABILITIES
from app.db import models as db_models
from app.services.build_manifest import build_manifest

# capability_key → SQLAlchemy 模型 + REST + 源码路径
_BINDING: dict[str, dict[str, Any]] = {
    "device_repair": {
        "model": db_models.DeviceRepairTicket,
        "table_label": "设备报修工单",
        "apis": [
            {"method": "GET", "path": "/api/v1/device-repair/tickets", "desc": "工单列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/device-repair/tickets", "desc": "创建工单", "auth": "JWT"},
            {
                "method": "POST",
                "path": "/api/v1/device-repair/tickets/{id}/action",
                "desc": "派工/完工等状态流转",
                "auth": "JWT",
            },
        ],
        "code": [
            "backend/app/api/v1/device_repair.py",
            "backend/app/services/device_repair_store.py",
            "packages/web-capability-device-repair/",
        ],
    },
    "quality_inspect": {
        "model": db_models.QualityInspectRecord,
        "table_label": "质检 / SOP 记录",
        "apis": [
            {"method": "GET", "path": "/api/v1/quality-inspect/records", "desc": "质检列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/quality-inspect/records", "desc": "新建质检", "auth": "JWT"},
            {
                "method": "POST",
                "path": "/api/v1/quality-inspect/records/{id}/close",
                "desc": "关闭记录",
                "auth": "JWT",
            },
        ],
        "code": [
            "backend/app/api/v1/quality_inspect.py",
            "packages/web-capability-quality-inspect/",
        ],
    },
    "site_patrol": {
        "model": db_models.SitePatrolRecord,
        "table_label": "巡检 / 隐患上报",
        "apis": [
            {"method": "GET", "path": "/api/v1/site-patrol/records", "desc": "巡检列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/site-patrol/records", "desc": "新建巡检", "auth": "JWT"},
            {
                "method": "POST",
                "path": "/api/v1/site-patrol/records/{id}/close",
                "desc": "关闭",
                "auth": "JWT",
            },
        ],
        "code": ["backend/app/api/v1/site_patrol.py", "packages/web-capability-site-patrol/"],
    },
    "inventory_count": {
        "model": db_models.InventoryCountRecord,
        "table_label": "库存盘点",
        "apis": [
            {"method": "GET", "path": "/api/v1/inventory-count/records", "desc": "盘点列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/inventory-count/records", "desc": "新建盘点", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/inventory_count.py", "packages/web-capability-inventory-count/"],
    },
    "kb_document": {
        "model": db_models.KbDocument,
        "table_label": "知识库文档",
        "apis": [
            {"method": "GET", "path": "/api/v1/kb/bases", "desc": "知识库列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/kb/documents/upload", "desc": "上传文档", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/kb/search", "desc": "语义检索", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/kb.py", "packages/web-capability-kb/"],
    },
    "chat_qa": {
        "model": db_models.ChatMessage,
        "table_label": "对话消息",
        "apis": [
            {"method": "POST", "path": "/api/v1/chat/completions", "desc": "问答补全", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/chat/completions/stream", "desc": "SSE 流式问答", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/chat.py", "packages/web-capability-chat/"],
    },
    "approval_flow": {
        "model": db_models.ApprovalRecord,
        "table_label": "审批单",
        "apis": [
            {"method": "GET", "path": "/api/v1/approvals", "desc": "审批列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/approvals", "desc": "发起审批", "auth": "JWT"},
            {
                "method": "POST",
                "path": "/api/v1/approvals/{id}/action",
                "desc": "通过/驳回",
                "auth": "JWT",
            },
        ],
        "code": ["backend/app/api/v1/approvals.py", "packages/web-capability-approval/"],
    },
    "leave_request": {
        "model": db_models.LeaveRequestRecord,
        "table_label": "请假审批",
        "apis": [
            {"method": "GET", "path": "/api/v1/leave-request/records", "desc": "请假列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/leave-request/records", "desc": "提交请假", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/leave_request.py", "packages/web-capability-leave-request/"],
    },
    "expense_claim": {
        "model": db_models.ExpenseClaimRecord,
        "table_label": "报销记账",
        "apis": [
            {"method": "GET", "path": "/api/v1/expense-claim/records", "desc": "报销列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/expense-claim/records", "desc": "提交报销", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/expense_claim.py", "packages/web-capability-expense-claim/"],
    },
    "seal_request": {
        "model": db_models.ApprovalRecord,
        "table_label": "用印/审批单",
        "apis": [
            {"method": "GET", "path": "/api/v1/approvals", "desc": "审批列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/approvals", "desc": "发起用印审批", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/approvals.py", "packages/web-capability-approval/"],
    },
    "it_ticket": {
        "model": db_models.ItTicketRecord,
        "table_label": "IT报障工单",
        "apis": [
            {"method": "GET", "path": "/api/v1/it-ticket/tickets", "desc": "IT工单列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/it-ticket/tickets", "desc": "提交报障", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/it_ticket.py", "packages/web-capability-it-ticket/"],
    },
    "meeting_booking": {
        "model": db_models.MeetingBookingRecord,
        "table_label": "会议室预约",
        "apis": [
            {"method": "GET", "path": "/api/v1/meeting-booking/records", "desc": "预约列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/meeting-booking/records", "desc": "提交预约", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/meeting_booking.py", "packages/web-capability-meeting-booking/"],
    },
    "asset_manage": {
        "model": db_models.AssetManageRecord,
        "table_label": "资产管理",
        "apis": [
            {"method": "GET", "path": "/api/v1/asset-manage/records", "desc": "资产单据列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/asset-manage/records", "desc": "提交领用/盘点", "auth": "JWT"},
        ],
        "code": ["backend/app/api/v1/asset_manage.py", "packages/web-capability-asset-manage/"],
    },
    "erp_connector": {
        "model": db_models.IntegrationConnector,
        "table_label": "系统集成连接器",
        "apis": [
            {"method": "GET", "path": "/api/v1/integration", "desc": "连接器列表", "auth": "JWT"},
            {"method": "POST", "path": "/api/v1/integration", "desc": "创建连接器", "auth": "JWT"},
            {
                "method": "POST",
                "path": "/api/v1/integration/{id}/sync",
                "desc": "触发同步",
                "auth": "JWT",
            },
        ],
        "code": ["backend/app/api/v1/integration.py"],
    },
}

_MFG_KIND_LABEL = {
    "mfg_oee": "生产日报 / OEE",
    "material_issue": "物料领用",
    "maintenance_plan": "保养计划",
    "shift_attendance": "排班考勤",
    "energy_carbon": "能耗碳排",
    "training_record": "技能培训",
}

for _kind, _label in _MFG_KIND_LABEL.items():
    _BINDING[_kind] = {
        "model": db_models.MfgOpsRecord,
        "table_label": _label,
        "kind_filter": _kind,
        "apis": [
            {
                "method": "GET",
                "path": f"/api/v1/mfg-ops/{_kind}/records",
                "desc": f"{_label}列表",
                "auth": "JWT",
            },
            {
                "method": "POST",
                "path": f"/api/v1/mfg-ops/{_kind}/records",
                "desc": f"新建{_label}",
                "auth": "JWT",
            },
            {
                "method": "POST",
                "path": f"/api/v1/mfg-ops/{_kind}/records/{{id}}/{{action}}",
                "desc": "状态流转（done/approved/rejected）",
                "auth": "JWT",
            },
        ],
        "code": [
            "backend/app/api/v1/mfg_ops.py",
            "backend/app/services/mfg_ops_store.py",
        ],
    }

PREVIEW_PACK_KEYS: dict[str, list[str]] = {
    "mfg": [
        "device_repair",
        "chat_qa",
        "kb_document",
        "mfg_oee",
        "quality_inspect",
        "material_issue",
        "site_patrol",
        "shift_attendance",
        "maintenance_plan",
        "erp_connector",
        "energy_carbon",
        "training_record",
    ],
    "office": [
        "policy_qa",
        "leave_request",
        "expense_claim",
        "hire_onboard",
        "seal_request",
        "meeting_booking",
        "approval_flow",
        "approval_inbox",
        "ops_kpi",
        "shift_attendance",
        "kb_document",
        "it_ticket",
        "asset_manage",
        "notify_im",
    ],
}


def _columns_of(model: type) -> list[dict[str, str]]:
    try:
        mapper = sa_inspect(model)
    except Exception:
        return []
    out: list[dict[str, str]] = []
    for col in mapper.columns:
        out.append(
            {
                "name": col.name,
                "type": str(col.type),
                "nullable": "YES" if col.nullable else "NO",
                "primary_key": "YES" if col.primary_key else "",
            }
        )
    return out


def _snippet_for(key: str, apis: list[dict[str, str]]) -> str:
    first = next((a for a in apis if a.get("method") == "GET"), apis[0] if apis else None)
    if not first:
        return f"# {key}: 暂无 REST 样例\n"
    path = first["path"]
    return (
        f"// {key} · {first.get('desc', '')}\n"
        f"const res = await fetch('{path}', {{\n"
        f"  headers: {{ Authorization: `Bearer ${{token}}` }},\n"
        f"}});\n"
        f"const data = await res.json();\n"
    )


@dataclass
class BlueprintBuild:
    capability_keys: list[str]
    modules: list[dict[str, Any]]
    build_manifest: dict[str, Any]
    page_schema: dict[str, Any] | None = None
    app: dict[str, Any] | None = None
    pack: str | None = None
    scope: str = "app"  # app | preview_pack


def resolve_app_scoped_keys(
    *,
    capability_keys: list[str] | None = None,
    page_schema: dict[str, Any] | None = None,
) -> list[str]:
    """仅本应用实际页面用到的能力：优先 menu / children，避免装配全量 keys 污染契约面板。"""
    schema = page_schema if isinstance(page_schema, dict) else {}
    ordered: list[str] = []
    seen: set[str] = set()

    def _add(raw: object) -> None:
        key = str(raw or "").strip()
        if not key or key in seen:
            return
        seen.add(key)
        ordered.append(key)

    menu = schema.get("menu") if isinstance(schema.get("menu"), list) else []
    for item in menu:
        if isinstance(item, dict):
            _add(item.get("capability_key"))

    root = schema.get("root") if isinstance(schema.get("root"), dict) else {}
    children = root.get("children") if isinstance(root.get("children"), list) else []
    for node in children:
        if isinstance(node, dict):
            props = node.get("props") if isinstance(node.get("props"), dict) else {}
            _add(props.get("capability_key"))

    if ordered:
        return ordered

    for key in capability_keys or []:
        _add(key)
    for key in schema.get("capability_keys") or []:
        _add(key)
    return ordered or ["chat_qa"]


def build_developer_blueprint(spec: BlueprintBuild) -> dict[str, Any]:
    keys = resolve_app_scoped_keys(
        capability_keys=spec.capability_keys,
        page_schema=spec.page_schema,
    )
    # preview_pack 显式传入完整清单时保留（制造 12 场景预览）
    if spec.scope == "preview_pack" and spec.capability_keys:
        keys = []
        seen_p: set[str] = set()
        for k in spec.capability_keys:
            kk = str(k).strip()
            if kk and kk not in seen_p:
                seen_p.add(kk)
                keys.append(kk)
    modules: list[dict[str, Any]] = []
    seen: set[str] = set()
    for key in keys:
        if key in seen:
            continue
        seen.add(key)
        cap = ALL_CAPABILITIES.get(key)
        bind = _BINDING.get(key)
        if not bind:
            # 未绑定业务表的能力：仍给出 registry + 约定路径
            slug = key.replace("_", "-")
            modules.append(
                {
                    "capability_key": key,
                    "name": cap.name if cap else key,
                    "category": cap.category if cap else "",
                    "table": None,
                    "columns": [],
                    "apis": [
                        {
                            "method": "GET",
                            "path": f"/api/v1/runtime/{{appId}}/modules/{slug}/list",
                            "desc": "Runtime mock 模块接口（演示）",
                            "auth": "可选",
                        }
                    ],
                    "code_paths": [
                        f"packages/web-capability-{slug}/",
                        "backend/app/data/capability_registry.py",
                    ],
                    "client_snippet": _snippet_for(
                        key,
                        [{"method": "GET", "path": f"/api/v1/runtime/{{appId}}/modules/{slug}/list"}],
                    ),
                }
            )
            continue
        model = bind["model"]
        table_name = getattr(model, "__tablename__", "")
        modules.append(
            {
                "capability_key": key,
                "name": cap.name if cap else bind.get("table_label") or key,
                "category": cap.category if cap else "",
                "table": {
                    "name": table_name,
                    "label": bind.get("table_label") or table_name,
                    "kind_filter": bind.get("kind_filter"),
                },
                "columns": _columns_of(model),
                "apis": list(bind.get("apis") or []),
                "code_paths": list(bind.get("code") or []),
                "client_snippet": _snippet_for(key, list(bind.get("apis") or [])),
            }
        )

    # 契约包只带本应用精简 manifest，绝不回传平台全量 web_pkgs
    slim_manifest = build_manifest(keys, deliver="web")
    slim_schema: dict[str, Any] | None = None
    if isinstance(spec.page_schema, dict):
        slim_schema = {
            "version": spec.page_schema.get("version"),
            "appId": spec.page_schema.get("appId"),
            "title": spec.page_schema.get("title"),
            "capability_keys": keys,
            "menu": [
                m
                for m in (spec.page_schema.get("menu") or [])
                if isinstance(m, dict)
                and (not m.get("capability_key") or str(m.get("capability_key")) in set(keys))
            ],
        }
    return {
        "success": True,
        "scope": spec.scope,
        "app": spec.app,
        "pack": spec.pack,
        "capability_keys": keys,
        "build_manifest": slim_manifest,
        "page_schema": slim_schema,
        "modules": modules,
        "download": {
            "requires_role": "admin",
            "hint": "下载源码包仅含本应用能力；需管理员账号（admin@trackchat.local / admin123）",
        },
        "openapi_url": "/docs",
        "note": "仅本应用菜单/能力，不含平台其它能力包",
    }


def build_code_zip(blueprint: dict[str, Any]) -> bytes:
    """生成可下载的契约 + 接口样例 + 路径清单（非完整 monorepo）。"""
    buf = io.BytesIO()
    app_meta = blueprint.get("app") or {}
    pack = blueprint.get("pack") or "app"
    app_id = (app_meta.get("public_id") if isinstance(app_meta, dict) else None) or pack
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "README.md",
            (
                f"# BlockHub 应用开发者包 · {app_id}\n\n"
                "本包含：能力清单、库表字段、REST 接口、前端调用样例、源码路径索引。\n"
                "完整仓库请在有权限的环境中对照 `code_paths` 拉取。\n"
                "业务 API 均需 `Authorization: Bearer <JWT>`。\n"
            ),
        )
        zf.writestr("blueprint.json", json.dumps(blueprint, ensure_ascii=False, indent=2))
        if blueprint.get("page_schema"):
            zf.writestr("page_schema.json", json.dumps(blueprint["page_schema"], ensure_ascii=False, indent=2))
        if blueprint.get("build_manifest"):
            zf.writestr(
                "build_manifest.json",
                json.dumps(blueprint["build_manifest"], ensure_ascii=False, indent=2),
            )
        snippets: list[str] = []
        ddl: list[str] = []
        paths: list[str] = []
        for mod in blueprint.get("modules") or []:
            key = mod.get("capability_key") or "cap"
            snippets.append(f"// ===== {key} =====\n{mod.get('client_snippet') or ''}\n")
            table = mod.get("table") or {}
            if table.get("name"):
                cols = mod.get("columns") or []
                lines = [f"-- {table.get('label') or table['name']}", f"-- table: {table['name']}"]
                if table.get("kind_filter"):
                    lines.append(f"-- kind filter: {table['kind_filter']}")
                for c in cols:
                    lines.append(
                        f"--   {c['name']:24} {c['type']:20} null={c['nullable']} pk={c.get('primary_key') or '-'}"
                    )
                ddl.append("\n".join(lines) + "\n")
            for p in mod.get("code_paths") or []:
                paths.append(f"- [{key}] {p}")
        zf.writestr("client_snippets.ts", "\n".join(snippets) or "// empty\n")
        zf.writestr("schema_fields.sql.txt", "\n".join(ddl) or "-- no tables\n")
        zf.writestr("CODE_PATHS.md", "# 源码路径\n\n" + "\n".join(paths) + "\n")
    return buf.getvalue()
