#!/usr/bin/env python3
"""同步 hero_presets → rolePresets.ts，并生成 vertical_ops 全栈骨架。"""
from __future__ import annotations

import json
import re
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.data.hero_presets import HERO_PRESETS, PRESET_ROLES, preset_role  # noqa: E402
from app.data.vertical_ops_catalog import VERTICAL_OPS, all_kind_keys, kind_industry  # noqa: E402

TS_PATH = ROOT / "home" / "src" / "data" / "rolePresets.ts"
CACHE_PATH = ROOT / "home" / "src" / "lib" / "heroPresetsCache.ts"


def esc(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace("'", "\\'")


def sync_role_presets() -> int:
    scenes: list[str] = []
    for p in HERO_PRESETS:
        picks = ",\n      ".join(
            "{ "
            f"type: '{esc(x['type'])}', key: '{esc(x['key'])}', label: '{esc(x['label'])}' "
            "}"
            for x in (p.get("picks") or [])
        )
        flows = ", ".join(f"'{esc(x)}'" for x in (p.get("flow_lines") or []))
        role = p.get("role") or PRESET_ROLES.get(p["id"]) or preset_role(p)
        weight = int(p.get("weight") or 3)
        if weight != 3 and role:
            tail = f", {weight}, '{esc(role)}'"
        elif role:
            tail = f", '{esc(role)}'"
        elif weight != 3:
            tail = f", {weight}"
        else:
            tail = ""
        scenes.append(
            f"  scene('{esc(p['id'])}', '{esc(p['label'])}', '{esc(p.get('hint') or '')}', '{esc(p.get('color') or '#6366f1')}',\n"
            f"    '{esc(p.get('prompt') or '')}',\n"
            f"    [\n      {picks}\n    ],\n"
            f"    [{flows}]{tail}),"
        )
    block = (
        f"/** 英雄区弹幕词云 — 与 backend/app/data/hero_presets.py 同步（{len(HERO_PRESETS)} 条） */\n"
        "export const ROLE_PRESETS: RolePreset[] = [\n"
        + "\n\n".join(scenes)
        + "\n]"
    )
    text = TS_PATH.read_text(encoding="utf-8")
    new, n = re.subn(
        r"(?:/\*\*[^*]*英雄区弹幕[\s\S]*?\*/\s*)?export const ROLE_PRESETS: RolePreset\[\] = \[[\s\S]*?\n\]",
        block,
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit(f"ROLE_PRESETS replace failed n={n}")
    # refresh PRESET_ROLES map
    roles = ", ".join(
        f"s{i:02d}: '{esc((HERO_PRESETS[i].get('role') or PRESET_ROLES.get(HERO_PRESETS[i]['id']) or ''))}'"
        for i in range(len(HERO_PRESETS))
        if (HERO_PRESETS[i].get("role") or PRESET_ROLES.get(HERO_PRESETS[i]["id"]))
    )
    # simpler rebuild of PRESET_ROLES
    role_entries = []
    for p in HERO_PRESETS:
        r = p.get("role") or PRESET_ROLES.get(p["id"])
        if r:
            role_entries.append(f"  {p['id']}: '{esc(r)}',")
    roles_block = (
        "const PRESET_ROLES: Record<string, string> = {\n"
        + "\n".join(role_entries)
        + "\n}"
    )
    new2, n2 = re.subn(
        r"const PRESET_ROLES: Record<string, string> = \{[\s\S]*?\n\}",
        roles_block,
        new,
        count=1,
    )
    if n2 != 1:
        raise SystemExit("PRESET_ROLES replace failed")
    TS_PATH.write_text(new2, encoding="utf-8")

    # bump cache key
    cache = CACHE_PATH.read_text(encoding="utf-8")
    cache2, nc = re.subn(
        r"blockhub_hero_presets_v\d+",
        "blockhub_hero_presets_v20",
        cache,
        count=1,
    )
    if nc:
        CACHE_PATH.write_text(cache2, encoding="utf-8")
    # hero docstring
    hero_py = ROOT / "backend" / "app" / "data" / "hero_presets.py"
    hp = hero_py.read_text(encoding="utf-8")
    hp2 = re.sub(
        r'"""英雄区.*?同步。"""',
        f'"""英雄区 {len(HERO_PRESETS)} 场景 + 快捷示例 chip — 与 home/src/data/rolePresets.ts 同步。"""',
        hp,
        count=1,
        flags=re.S,
    )
    hero_py.write_text(hp2, encoding="utf-8")
    return len(HERO_PRESETS)


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip("\n") if content.startswith("\n") else content, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


def gen_store() -> None:
    write(
        ROOT / "backend" / "app" / "services" / "vertical_ops_store.py",
        '''"""CapShip · 多行业 vertical_ops 共享记录。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.data.vertical_ops_catalog import VERTICAL_OPS, all_kind_keys, kind_industry, kind_meta
from app.db.models import User, VerticalOpsRecord

KINDS = frozenset(all_kind_keys())
VALID_STATUS = frozenset({"open", "done", "approved", "rejected", "closed"})


def _no(kind: str) -> str:
    meta = kind_meta(kind) or {}
    p = str(meta.get("prefix") or "VO")
    now = datetime.now(timezone.utc)
    return f"{p}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def to_dict(row: VerticalOpsRecord) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "industry_key": row.industry_key,
        "kind": row.kind,
        "app_public_id": row.app_public_id,
        "title": row.title,
        "field_a": row.field_a,
        "field_b": row.field_b,
        "field_c": row.field_c,
        "field_d": row.field_d,
        "note": row.note,
        "status": row.status,
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_records(
    db: Session,
    tenant_id: str,
    *,
    kind: str,
    industry_key: str | None = None,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    if kind not in KINDS:
        return []
    ind = industry_key or kind_industry(kind)
    q = (
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.tenant_id == tenant_id, VerticalOpsRecord.kind == kind)
    )
    if ind:
        q = q.filter(VerticalOpsRecord.industry_key == ind)
    if app_public_id:
        q = q.filter(VerticalOpsRecord.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter(VerticalOpsRecord.status == status)
    return [to_dict(r) for r in q.order_by(VerticalOpsRecord.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    kind: str,
    title: str,
    field_a: str = "",
    field_b: str = "",
    field_c: str = "",
    field_d: str = "",
    note: str = "",
    app_public_id: str = "",
    industry_key: str = "",
) -> dict[str, Any]:
    if kind not in KINDS:
        raise ValueError(f"unsupported kind: {kind}")
    ind = (industry_key or kind_industry(kind) or "").strip()
    if not ind or ind not in VERTICAL_OPS:
        raise ValueError(f"unsupported industry for kind: {kind}")
    row = VerticalOpsRecord(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(kind),
        industry_key=ind,
        kind=kind,
        title=(title or "").strip() or "未命名",
        field_a=(field_a or "").strip(),
        field_b=(field_b or "").strip(),
        field_c=(field_c or "").strip(),
        field_d=(field_d or "").strip(),
        note=(note or "").strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row = (
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.id == row.id)
        .first()
    )
    try:
        from app.services.im_delivery_service import notify_business_event

        meta = kind_meta(kind) or {}
        label = str(meta.get("name") or kind)
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"{label} · 新提交",
            content=f"{row.record_no} · {row.title}\\n{(row.note or row.field_a or '')[:160]}",
            app_public_id=row.app_public_id,
            path=f"/{kind.replace('_', '-')}",
            link_label=f"打开{label}",
        )
    except Exception:
        pass
    return to_dict(row)  # type: ignore[arg-type]


def set_status(db: Session, tenant_id: str, record_id: str, status: str) -> dict[str, Any] | None:
    if status not in VALID_STATUS:
        return None
    row = (
        db.query(VerticalOpsRecord)
        .options(joinedload(VerticalOpsRecord.reporter))
        .filter(VerticalOpsRecord.id == record_id, VerticalOpsRecord.tenant_id == tenant_id)
        .first()
    )
    if not row:
        return None
    row.status = status
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_dict(row)


def stats(db: Session, tenant_id: str, *, app_public_id: str | None = None) -> dict[str, Any]:
    q = db.query(VerticalOpsRecord.kind, func.count()).filter(VerticalOpsRecord.tenant_id == tenant_id)
    if app_public_id:
        q = q.filter(VerticalOpsRecord.app_public_id == app_public_id)
    by_kind = {k: c for k, c in q.group_by(VerticalOpsRecord.kind).all()}
    return {"by_kind": by_kind, "total": sum(by_kind.values())}
''',
    )


def gen_api() -> None:
    write(
        ROOT / "backend" / "app" / "api" / "v1" / "vertical_ops.py",
        '''"""CapShip · 多行业 vertical_ops API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.data.vertical_ops_catalog import kind_industry
from app.db.models import User
from app.db.session import get_db
from app.services import vertical_ops_store as store

router = APIRouter(prefix="/vertical-ops", tags=["vertical-ops"])


class CreateBody(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    field_a: str = ""
    field_b: str = ""
    field_c: str = ""
    field_d: str = ""
    note: str = ""
    app_public_id: str = Field(default="", max_length=64)
    industry_key: str = Field(default="", max_length=64)


@router.get("/stats")
def stats_api(
    app_id: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    return store.stats(db, user.tenant_id, app_public_id=app_id or None)


@router.get("/{kind}/records")
def list_api(
    kind: str,
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    industry: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知行业能力")
    items = store.list_records(
        db,
        user.tenant_id,
        kind=kind,
        industry_key=industry or kind_industry(kind),
        app_public_id=app_id or None,
        status=status,
    )
    return {"total": len(items), "items": items}


@router.post("/{kind}/records")
def create_api(
    kind: str,
    body: CreateBody,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知行业能力")
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="标题不能为空")
    try:
        item = store.create_record(
            db,
            user,
            kind=kind,
            title=body.title,
            field_a=body.field_a,
            field_b=body.field_b,
            field_c=body.field_c,
            field_d=body.field_d,
            note=body.note,
            app_public_id=body.app_public_id,
            industry_key=body.industry_key or (kind_industry(kind) or ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"success": True, "record": item}


@router.post("/{kind}/records/{record_id}/{action}")
def action_api(
    kind: str,
    record_id: str,
    action: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if kind not in store.KINDS:
        raise HTTPException(status_code=404, detail="未知行业能力")
    status_map = {
        "done": "done",
        "close": "closed",
        "approve": "approved",
        "reject": "rejected",
        "reopen": "open",
    }
    status = status_map.get(action)
    if not status:
        raise HTTPException(status_code=400, detail="不支持的动作")
    item = store.set_status(db, user.tenant_id, record_id, status)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {"success": True, "record": item}
''',
    )


def gen_migration() -> None:
    write(
        ROOT / "backend" / "alembic" / "versions" / "050_vertical_ops_records.py",
        '''"""vertical_ops_records: 剩余行业共享工单表

Revision ID: 050
Revises: 049
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from ops_utils import create_index_if_missing, create_table_if_missing

revision: str = "050"
down_revision: Union[str, None] = "049"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    create_table_if_missing(
        "vertical_ops_records",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),
        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),
        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("record_no", sa.String(32), nullable=False),
        sa.Column("industry_key", sa.String(40), nullable=False, server_default=""),
        sa.Column("kind", sa.String(40), nullable=False, server_default=""),
        sa.Column("title", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_a", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_b", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_c", sa.String(200), nullable=False, server_default=""),
        sa.Column("field_d", sa.String(200), nullable=False, server_default=""),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    for name, cols in (
        ("ix_vertical_ops_records_tenant_id", ["tenant_id"]),
        ("ix_vertical_ops_records_app_public_id", ["app_public_id"]),
        ("ix_vertical_ops_records_reporter_id", ["reporter_id"]),
        ("ix_vertical_ops_records_record_no", ["record_no"]),
        ("ix_vertical_ops_records_industry_key", ["industry_key"]),
        ("ix_vertical_ops_records_kind", ["kind"]),
        ("ix_vertical_ops_records_status", ["status"]),
    ):
        create_index_if_missing(name, "vertical_ops_records", cols)


def downgrade() -> None:
    op.drop_table("vertical_ops_records")
''',
    )


def ensure_model() -> None:
    models = ROOT / "backend" / "app" / "db" / "models.py"
    text = models.read_text(encoding="utf-8")
    if "class VerticalOpsRecord" in text:
        print("model VerticalOpsRecord already present")
        return
    blob = '''

class VerticalOpsRecord(Base):
    """CapShip · 多行业 vertical_ops 共享记录（edu/energy/gov/legal/hr 等）。"""

    __tablename__ = "vertical_ops_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    industry_key: Mapped[str] = mapped_column(String(40), nullable=False, default="", index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="", index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_a: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_b: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_c: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_d: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])
'''
    models.write_text(text.rstrip() + blob + "\n", encoding="utf-8")
    print("appended VerticalOpsRecord model")


def gen_scene_files() -> None:
    for ind_key, ind in VERTICAL_OPS.items():
        scenes: list[dict] = []
        for kind, meta in ind["kinds"].items():
            for sn, problem in meta["scenes"]:
                scenes.append(
                    {
                        "name": sn,
                        "category": meta["category"],
                        "capability_key": kind,
                        "pages": "form+list",
                        "problem": problem,
                        "page_kind": "form_list",
                        "form_headline": meta["name"],
                    }
                )
        for ex in ind.get("existing_scenes") or []:
            scenes.append(
                {
                    "name": ex["name"],
                    "category": ex["category"],
                    "capability_key": ex["capability_key"],
                    "pages": ex.get("pages") or "form+list",
                    "problem": ex.get("problem") or "",
                    "page_kind": "form_list",
                }
            )
        # dedupe by name keep first
        seen: set[str] = set()
        uniq = []
        for s in scenes:
            if s["name"] in seen:
                continue
            seen.add(s["name"])
            uniq.append(s)
        body = (
            f'"""{ind["name"]} 场景 → 真能力 SSOT。"""\n\n'
            "from __future__ import annotations\n\n"
            f"SCENES: list[dict] = {json.dumps(uniq, ensure_ascii=False, indent=4)}\n\n"
            "SCENES_BY_NAME = {s['name']: s for s in SCENES}\n\n"
            f"def {ind_key}_pack_scenes() -> list[dict[str, str]]:\n"
            "    out: list[dict[str, str]] = []\n"
            "    for s in SCENES:\n"
            "        out.append({\n"
            "            'name': s['name'],\n"
            "            'category': s.get('category') or '',\n"
            "            'problem': s.get('problem') or '',\n"
            "            'pages': s.get('pages') or 'form+list',\n"
            "            'agent': s.get('capability_key') or 'chat_qa',\n"
            "            'standard': '✓',\n"
            "        })\n"
            "    return out\n\n"
            f"def enrich_{ind_key}_menu_plan_item(item: dict, name: str) -> dict:\n"
            "    row = SCENES_BY_NAME.get(name)\n"
            "    if not row:\n"
            "        return item\n"
            "    ck = str(row.get('capability_key') or '').strip()\n"
            "    if ck:\n"
            "        item['capability_key'] = ck\n"
            "    return item\n"
        )
        write(ROOT / "backend" / "app" / "data" / f"{ind_key}_scene_capabilities.py", body)


def gen_registry_snippet() -> str:
    lines = ["\n# --- vertical_ops (edu/energy/gov/legal/hr/...) ---"]
    for ind_key, ind in VERTICAL_OPS.items():
        for kind, meta in ind["kinds"].items():
            widget = "".join(p.title() for p in kind.split("_")) + "Widget"
            route = "/" + kind.replace("_", "-")
            kw = meta["name"]
            lines.append(
                f'    CapabilityDef("{kind}", "{meta["name"]}", "{ind["name"]}", "{widget}", "{kind}",\n'
                f'                    "capability_vertical", ("{kw}",),\n'
                f'                    web_pkg="@blockhub/web-capability-vertical-ops",\n'
                f'                    menu_icon="module", menu_label="{meta["name"]}", route="{route}"),'
            )
    return "\n".join(lines) + "\n"


def patch_registry() -> None:
    path = ROOT / "backend" / "app" / "data" / "capability_registry.py"
    text = path.read_text(encoding="utf-8")
    if "edu_grade_alert" in text:
        print("registry already has vertical ops")
        return
    # insert before INDUSTRY_HINTS or at end of CAPABILITIES list
    marker = "\nINDUSTRY_HINTS"
    if marker not in text:
        raise SystemExit("INDUSTRY_HINTS not found")
    # find last CapabilityDef before INDUSTRY_HINTS — insert before the closing of list
    # CAPABILITIES is typically ended before INDUSTRY_HINTS
    idx = text.find(marker)
    # walk back to find `]`
    close = text.rfind("]", 0, idx)
    snippet = gen_registry_snippet()
    text = text[:close] + snippet + text[close:]
    path.write_text(text, encoding="utf-8")
    print("patched capability_registry")


def gen_web_package() -> None:
    # Build CONFIGS object
    configs = {}
    widgets = []
    for ind_key, ind in VERTICAL_OPS.items():
        for kind, meta in ind["kinds"].items():
            fields = []
            for item in meta["fields"]:
                key, label = item[0], item[1]
                optional = len(item) > 2 and item[2]
                f = {"key": key, "label": label}
                if optional:
                    f["optional"] = True
                if key == "note":
                    f["inputType"] = "textarea"
                    f["optional"] = True
                fields.append(f)
            # ensure title exists
            if not any(f["key"] == "title" for f in fields):
                fields.insert(0, {"key": "title", "label": "标题"})
            configs[kind] = {
                "kind": kind,
                "heading": meta["name"],
                "accent": ind["color"],
                "industry": ind_key,
                "fields": fields,
                "doneLabel": meta["done_label"],
                "doneAction": meta["done_action"],
            }
            wname = "".join(p.title() for p in kind.split("_")) + "Widget"
            widgets.append((kind, wname))

    configs_json = json.dumps(configs, ensure_ascii=False, indent=2)
    # TS needs unquoted keys mildly — use as const JSON parse
    widget_exports = "\n".join(
        f"export const {w} = (props: {{ node: SchemaNode }}) => <VerticalOpsPanel kind={{'{k}' as OpsKind}} node={{props.node}} />"
        for k, w in widgets
    )
    register_lines = "\n".join(
        f"registerWidget('{w}', {w} as Parameters<typeof registerWidget>[1])" for _, w in widgets
    )
    write(
        ROOT / "packages" / "web-capability-vertical-ops" / "package.json",
        '{\n  "name": "@blockhub/web-capability-vertical-ops",\n  "version": "0.1.0",\n  "private": true,\n  "type": "module",\n  "main": "./src/index.ts",\n  "peerDependencies": {\n    "react": "^18.0.0 || ^19.0.0"\n  }\n}\n',
    )
    write(
        ROOT / "packages" / "web-capability-vertical-ops" / "src" / "VerticalOpsWidgets.tsx",
        f'''import {{ useCallback, useEffect, useMemo, useState }} from 'react'
import type {{ SchemaNode }} from '@blockhub/web-core'
import {{ apiFetch, GtgtStepComposer, useRuntime, type GtgtStep }} from '@blockhub/web-core'

export type OpsKind = {json.dumps([k for k, _ in widgets])}[number]

interface RecordItem {{
  id: string
  record_no: string
  title: string
  field_a: string
  field_b: string
  field_c: string
  field_d: string
  note: string
  status: string
}}

interface FieldDef {{
  key: 'title' | 'field_a' | 'field_b' | 'field_c' | 'field_d' | 'note'
  label: string
  placeholder?: string
  optional?: boolean
  inputType?: string
  choices?: Array<{{ value: string; label: string }}>
}}

interface KindConfig {{
  kind: OpsKind
  heading: string
  accent: string
  industry: string
  fields: FieldDef[]
  doneLabel: string
  doneAction: 'done' | 'approve' | 'close'
}}

const CONFIGS = {configs_json} as Record<OpsKind, KindConfig>

function VerticalOpsPanel({{ kind, node }}: {{ kind: OpsKind; node: SchemaNode }}) {{
  const cfg = CONFIGS[kind]
  const {{ token, appId }} = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {{
    if (!token) return
    try {{
      const q = new URLSearchParams()
      if (appId) q.set('app_id', appId)
      const data = await apiFetch<{{ total: number; items: RecordItem[] }}>(`/api/v1/vertical-ops/${{kind}}/records?${{q}}`, {{ token }})
      setItems(data.items || [])
      setErr('')
    }} catch (e) {{
      setErr(e instanceof Error ? e.message : '加载失败')
    }}
  }}, [token, appId, kind])

  useEffect(() => {{ void load() }}, [load])

  const steps: GtgtStep[] = useMemo(
    () =>
      cfg.fields.map((f) => ({{
        key: f.key,
        label: f.label,
        optional: f.optional,
        inputType: f.inputType,
        choices: f.choices,
        placeholder: f.placeholder,
      }})),
    [cfg],
  )

  const onSubmit = async (values: Record<string, string>) => {{
    if (!token) return
    setBusy(true)
    try {{
      await apiFetch(`/api/v1/vertical-ops/${{kind}}/records`, {{
        method: 'POST',
        token,
        body: {{
          title: values.title || values.field_a || cfg.heading,
          field_a: values.field_a || '',
          field_b: values.field_b || '',
          field_c: values.field_c || '',
          field_d: values.field_d || '',
          note: values.note || '',
          app_public_id: appId || '',
          industry_key: cfg.industry,
        }},
      }})
      setResetKey((k) => k + 1)
      await load()
    }} catch (e) {{
      setErr(e instanceof Error ? e.message : '提交失败')
    }} finally {{
      setBusy(false)
    }}
  }}

  const act = async (id: string, action: string) => {{
    if (!token) return
    await apiFetch(`/api/v1/vertical-ops/${{kind}}/records/${{id}}/${{action}}`, {{ method: 'POST', token }})
    await load()
  }}

  return (
    <div className="bh-flow-body" style={{{{ ['--bh-accent' as string]: cfg.accent }}}}>
      <h2 style={{{{ margin: '0 0 8px', color: cfg.accent }}}}>{{cfg.heading}}</h2>
      <p style={{{{ opacity: 0.7, marginTop: 0 }}}}>空库空列表 · >> 单字段步进 · 真 API</p>
      {{err ? <p style={{{{ color: '#b91c1c' }}}}>{{err}}</p> : null}}
      <GtgtStepComposer key={{resetKey}} steps={{steps}} onComplete={{onSubmit}} disabled={{busy || !token}} />
      <ul style={{{{ listStyle: 'none', padding: 0, marginTop: 16 }}}}>
        {{items.map((it) => (
          <li key={{it.id}} style={{{{ borderTop: '1px solid #e5e7eb', padding: '10px 0' }}}}>
            <div><strong>{{it.record_no}}</strong> · {{it.title}} · {{it.status}}</div>
            <div style={{{{ opacity: 0.7, fontSize: 13 }}}}>{{[it.field_a, it.field_b, it.note].filter(Boolean).join(' · ')}}</div>
            {{it.status === 'open' ? (
              <button type="button" onClick={{() => void act(it.id, cfg.doneAction)}} style={{{{ marginTop: 6 }}}}>
                {{cfg.doneLabel}}
              </button>
            ) : null}}
          </li>
        ))}}
      </ul>
      {{!items.length ? <p style={{{{ opacity: 0.55 }}}}>暂无记录</p> : null}}
      <span style={{{{ display: 'none' }}}}>{{String(node?.id || '')}}</span>
    </div>
  )
}}

{widget_exports}
''',
    )
    write(
        ROOT / "packages" / "web-capability-vertical-ops" / "src" / "index.ts",
        "import { registerWidget } from '@blockhub/web-core'\n"
        + "import {\n  "
        + ",\n  ".join(w for _, w in widgets)
        + "\n} from './VerticalOpsWidgets'\n\n"
        + register_lines
        + "\n",
    )


def gen_flutter() -> None:
    kinds = all_kind_keys()
    cases = []
    for ind_key, ind in VERTICAL_OPS.items():
        for kind, meta in ind["kinds"].items():
            steps = []
            for item in meta["fields"]:
                key, label = item[0], item[1]
                optional = len(item) > 2 and item[2]
                opt = ", optional: true" if optional or key == "note" else ""
                multi = ", multiline: true" if key == "note" else ""
                steps.append(f"          GtgtStep(key: '{key}', label: '{label}'{opt}{multi}),")
            if not any(item[0] == "title" for item in meta["fields"]):
                steps.insert(0, "          GtgtStep(key: 'title', label: '标题'),")
            cases.append(
                f"    case '{kind}':\n      return const _KindCfg(\n"
                f"        heading: '{meta['name']}',\n"
                f"        industry: '{ind_key}',\n"
                f"        doneAction: '{meta['done_action']}',\n"
                f"        doneLabel: '{meta['done_label']}',\n"
                f"        steps: [\n" + "\n".join(steps) + "\n        ],\n      );"
            )
    write(
        ROOT / "packages" / "capability_vertical" / "pubspec.yaml",
        "name: capability_vertical\n"
        "description: CapShip vertical ops (edu/energy/gov/...)\n"
        "version: 0.1.0\n"
        "publish_to: none\n"
        "environment:\n  sdk: '>=3.0.0 <4.0.0'\n"
        "dependencies:\n  flutter:\n    sdk: flutter\n  blockhub_flutter_core:\n    path: ../blockhub_flutter_core\n",
    )
    write(
        ROOT / "packages" / "capability_vertical" / "lib" / "vertical_module.dart",
        "import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';\n"
        "import 'package:flutter/material.dart';\n\n"
        "import 'vertical_ops_page.dart';\n\n"
        f"const verticalCapabilityKeys = {{{', '.join(repr(k) for k in kinds)}}};\n\n"
        "bool isVerticalCapabilityKey(String key) => verticalCapabilityKeys.contains(key);\n\n"
        "class VerticalModule implements CapabilityModule {\n"
        "  const VerticalModule({{this.capabilityKey = 'edu_grade_alert'}});\n\n"
        "  @override\n  final String capabilityKey;\n\n"
        "  @override\n  Widget buildPage(AppBranding branding) {\n"
        "    return VerticalOpsPage(branding: branding, kind: capabilityKey);\n"
        "  }\n}\n",
    )
    write(
        ROOT / "packages" / "capability_vertical" / "lib" / "vertical_ops_page.dart",
        '''import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class _KindCfg {
  const _KindCfg({
    required this.heading,
    required this.industry,
    required this.doneAction,
    required this.doneLabel,
    required this.steps,
  });
  final String heading;
  final String industry;
  final String doneAction;
  final String doneLabel;
  final List<GtgtStep> steps;
}

'''
        + "_KindCfg _cfgFor(String kind) {\n  switch (kind) {\n"
        + "\n".join(cases)
        + "\n    default:\n      return const _KindCfg(\n"
        "        heading: '业务登记',\n        industry: 'office',\n"
        "        doneAction: 'done',\n        doneLabel: '完成',\n"
        "        steps: [GtgtStep(key: 'title', label: '标题')],\n      );\n  }\n}\n\n"
        + '''
class VerticalOpsPage extends StatefulWidget {
  const VerticalOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;

  @override
  State<VerticalOpsPage> createState() => _VerticalOpsPageState();
}

class _VerticalOpsPageState extends State<VerticalOpsPage> {
  int _reset = 0;
  List<Map<String, dynamic>> _items = [];

  _KindCfg get cfg => _cfgFor(widget.kind);

  Future<void> _load() async {
    final dio = getRuntimeAuthedDio(widget.branding);
    final appId = widget.branding.appPublicId;
    final res = await dio.get(
      '/api/v1/vertical-ops/${widget.kind}/records',
      queryParameters: {if (appId != null && appId.isNotEmpty) 'app_id': appId},
    );
    final list = (res.data['items'] as List?) ?? [];
    setState(() => _items = list.cast<Map<String, dynamic>>());
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _submit(Map<String, String> values) async {
    final dio = getRuntimeAuthedDio(widget.branding);
    await dio.post('/api/v1/vertical-ops/${widget.kind}/records', data: {
      'title': values['title'] ?? values['field_a'] ?? cfg.heading,
      'field_a': values['field_a'] ?? '',
      'field_b': values['field_b'] ?? '',
      'field_c': values['field_c'] ?? '',
      'field_d': values['field_d'] ?? '',
      'note': values['note'] ?? '',
      'app_public_id': widget.branding.appPublicId ?? '',
      'industry_key': cfg.industry,
    });
    setState(() => _reset++);
    await _load();
  }

  Future<void> _act(String id) async {
    final dio = getRuntimeAuthedDio(widget.branding);
    await dio.post('/api/v1/vertical-ops/${widget.kind}/records/$id/${cfg.doneAction}');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(cfg.heading, style: TextStyle(fontSize: 20, color: widget.branding.primaryColor)),
        const SizedBox(height: 8),
        const Text('空库空列表 · >> 单字段步进 · 真 API'),
        const SizedBox(height: 12),
        GtgtStepComposer(key: ValueKey(_reset), steps: cfg.steps, onComplete: _submit),
        const SizedBox(height: 16),
        ..._items.map((it) {
          final status = '${it['status'] ?? ''}';
          return ListTile(
            title: Text('${it['record_no']} · ${it['title']}'),
            subtitle: Text('$status'),
            trailing: status == 'open'
                ? TextButton(onPressed: () => _act('${it['id']}'), child: Text(cfg.doneLabel))
                : null,
          );
        }),
        if (_items.isEmpty) const Text('暂无记录'),
      ],
    );
  }
}
''',
    )


def patch_industry_packs() -> None:
    path = ROOT / "backend" / "app" / "data" / "industry_packs_all.py"
    text = path.read_text(encoding="utf-8")
    imports = []
    for ind_key in VERTICAL_OPS:
        fn = f"{ind_key}_pack_scenes"
        line = f"from app.data.{ind_key}_scene_capabilities import {fn}"
        if line not in text:
            imports.append(line)
        # replace scenes inline for known packs
        # edu currently inline — replace _EDU scenes
    if imports:
        # after existing imports
        text = text.replace(
            "from app.data.hotel_scene_capabilities import hotel_pack_scenes\n",
            "from app.data.hotel_scene_capabilities import hotel_pack_scenes\n" + "\n".join(imports) + "\n",
        )
    replacements = {
        "edu": (
            '"scenes": [\n        _scene("课程排课"',
            '"scenes": edu_pack_scenes(),\n    # was inline\n    "_drop": [\n        _scene("课程排课"',
        ),
    }
    # cleaner: regex replace entire _EDU scenes list
    for ind_key in VERTICAL_OPS:
        # Find pack dict by key and replace scenes=
        pat = rf'("key": "{ind_key}",[\s\S]*?"scenes": )(\[[\s\S]*?\]|\{ind_key}_pack_scenes\(\)|[a-z_]+_pack_scenes\(\))'
        # simpler manual for known inline packs
        pass

    # Direct replacements for packs that use inline scenes
    for ind_key, fn in [
        ("edu", "edu_pack_scenes()"),
        ("energy", "energy_pack_scenes()"),
        ("gov", "gov_pack_scenes()"),
        ("legal", "legal_pack_scenes()"),
        ("hr", "hr_pack_scenes()"),
        ("construction", "construction_pack_scenes()"),
        ("agriculture", "agriculture_pack_scenes()"),
        ("media", "media_pack_scenes()"),
        ("auto", "auto_pack_scenes()"),
        ("marketing", "marketing_pack_scenes()"),
    ]:
        # replace "scenes": [ ... ], within the pack that has "key": ind_key
        pattern = rf'("key": "{ind_key}",\s*"name": .*?\n\s*"icon": .*?\n\s*"color": .*?\n\s*"tagline": .*?\n\s*"scenes": )(?:\[[\s\S]*?\n    \]|{re.escape(fn)})'
        text2, n = re.subn(pattern, rf"\1{fn}", text, count=1)
        if n == 1:
            text = text2
            print(f"wired pack scenes {ind_key}")
        else:
            print(f"WARN pack scenes not replaced for {ind_key}")

    path.write_text(text, encoding="utf-8")


def patch_main() -> None:
    main = ROOT / "backend" / "app" / "main.py"
    text = main.read_text(encoding="utf-8")
    if "vertical_ops" not in text:
        # add import near other ops
        text = text.replace(
            "from app.api.v1 import hotel_ops",
            "from app.api.v1 import hotel_ops\nfrom app.api.v1 import vertical_ops",
        )
        if "from app.api.v1 import vertical_ops" not in text:
            # try broader
            text = text.replace(
                "app.include_router(hotel_ops.router",
                "from app.api.v1 import vertical_ops  # noqa: E402\napp.include_router(hotel_ops.router",
            )
        if "vertical_ops.router" not in text:
            text = text.replace(
                "app.include_router(hotel_ops.router, prefix=settings.api_prefix, dependencies=_auth)\n",
                "app.include_router(hotel_ops.router, prefix=settings.api_prefix, dependencies=_auth)\n"
                "app.include_router(vertical_ops.router, prefix=settings.api_prefix, dependencies=_auth)\n",
            )
        main.write_text(text, encoding="utf-8")
        print("patched main.py")


def gen_smoke() -> None:
    kinds = all_kind_keys()
    write(
        ROOT / "scripts" / "smoke-vertical-ops.py",
        f'''#!/usr/bin/env python3
"""Smoke vertical_ops kinds against live API."""
from __future__ import annotations
import json, sys, urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001").rstrip("/")
API = f"{{BASE}}/api/v1"
KINDS = {kinds!r}

def req(method, path, token=None, body=None):
    data = None if body is None else json.dumps(body).encode()
    headers = {{"Content-Type": "application/json"}}
    if token:
        headers["Authorization"] = f"Bearer {{token}}"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=30) as resp:
        return json.load(resp)

tok = req("POST", "/auth/login", body={{"email": "admin@trackchat.local", "password": "admin123"}})["access_token"]
fail = 0
for kind in KINDS:
    items = req("GET", f"/vertical-ops/{{kind}}/records", token=tok)
    assert "items" in items
    created = req("POST", f"/vertical-ops/{{kind}}/records", token=tok, body={{
        "title": f"smoke-{{kind}}", "field_a": "a", "note": "smoke"
    }})
    rid = created["record"]["id"]
    req("POST", f"/vertical-ops/{{kind}}/records/{{rid}}/done", token=tok)
    print("OK", kind)
print("PASS", len(KINDS), "kinds")
''',
    )


def main() -> None:
    n = sync_role_presets()
    print("synced role presets", n)
    gen_store()
    gen_api()
    gen_migration()
    ensure_model()
    gen_scene_files()
    patch_registry()
    gen_web_package()
    gen_flutter()
    patch_industry_packs()
    patch_main()
    gen_smoke()
    print(json.dumps({"hero": n, "kinds": len(all_kind_keys()), "industries": list(VERTICAL_OPS)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
