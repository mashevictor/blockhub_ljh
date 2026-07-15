# -*- coding: utf-8 -*-
"""Generate CapShip batch: delivery_order / house_viewing / campaign_ops / fitness_checkin / travel_plan."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CAPS = [
    {
        "key": "wedding_plan",
        "slug": "wedding-plan",
        "name": "婚礼筹备",
        "cat": "生活服务",
        "widget": "WeddingPlanWidget",
        "prefix": "WP",
        "aliases": ("婚礼筹备", "宾客名单", "供应商协同", "婚礼预算", "婚庆"),
        "fields": [
            ("category", "环节", 32, "guest"),
            ("title", "事项标题", 200, ""),
            ("vendor", "供应商/嘉宾", 120, ""),
            ("budget", "预算/费用", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "confirmed", "done"),
        "advance": (("confirmed", "已确认"), ("done", "完成")),
        "choices": {"category": [("guest", "宾客"), ("vendor", "供应商"), ("budget", "预算")]},
        "color": "#e879f9",
        "scene": "s25",
        "role": "新人",
        "hint": "生活 · 庆典",
        "prompt": "宾客名单、供应商协同与预算跟踪。",
        "flow": [
            ">> 婚礼筹备 · 宾客供应商登记",
            ">> 预算确认 · 进度闭环",
            ">> 企微钉钉飞书 · 协同提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "💒",
        "req": ("title",),
        "title_field": "title",
    },
    {
        "key": "deco_material",
        "slug": "deco-material",
        "name": "装修选材",
        "cat": "建筑工程",
        "widget": "DecoMaterialWidget",
        "prefix": "DM",
        "aliases": ("装修选材", "材料选型", "进度验收", "家装预算", "装修"),
        "fields": [
            ("category", "环节", 32, "material"),
            ("material_name", "材料/部位", 200, ""),
            ("location", "施工位置", 120, ""),
            ("budget", "预算", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "accepted", "done"),
        "advance": (("accepted", "已验收"), ("done", "完成")),
        "choices": {"category": [("material", "选材"), ("progress", "进度"), ("budget", "预算")]},
        "color": "#ca8a04",
        "scene": "s26",
        "role": "业主",
        "hint": "生活 · 家装",
        "prompt": "材料选型、进度验收与预算审批。",
        "flow": [
            ">> 装修选材 · 材料部位登记",
            ">> 进度验收 · 闭环完成",
            ">> 企微钉钉飞书 · 验收提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🛠️",
        "req": ("material_name",),
        "title_field": "material_name",
    },
    {
        "key": "pet_clinic",
        "slug": "pet-clinic",
        "name": "宠物问诊",
        "cat": "医疗健康",
        "widget": "PetClinicWidget",
        "prefix": "PC",
        "aliases": ("宠物问诊", "宠物健康", "预约就诊", "疫苗提醒", "宠物"),
        "fields": [
            ("category", "类型", 32, "consult"),
            ("pet_name", "宠物名", 120, ""),
            ("symptom", "症状/事项", 200, ""),
            ("schedule_at", "预约时间", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "scheduled", "done"),
        "advance": (("scheduled", "已预约"), ("done", "完成")),
        "choices": {"category": [("consult", "问诊"), ("visit", "就诊"), ("vaccine", "疫苗")]},
        "color": "#f472b6",
        "scene": "s27",
        "role": "宠主",
        "hint": "生活 · 宠物",
        "prompt": "宠物健康问答、预约就诊与疫苗提醒。",
        "flow": [
            ">> 宠物问诊 · 症状登记",
            ">> 就诊/疫苗 · 预约闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🐾",
        "req": ("pet_name", "symptom"),
        "title_field": "symptom",
    },
    {
        "key": "gov_service",
        "slug": "gov-service",
        "name": "政务办事",
        "cat": "政务公用",
        "widget": "GovServiceWidget",
        "prefix": "GS",
        "aliases": ("政务办事", "办事指南", "诉求提交", "进度查询", "政务"),
        "fields": [
            ("category", "类型", 32, "guide"),
            ("title", "事项标题", 200, ""),
            ("dept", "部门/窗口", 120, ""),
            ("ticket_no", "受理号", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "processing", "done"),
        "advance": (("processing", "办理中"), ("done", "办结")),
        "choices": {"category": [("guide", "指南"), ("appeal", "诉求"), ("progress", "进度")]},
        "color": "#475569",
        "scene": "s29",
        "role": "市民",
        "hint": "政务 · 便民",
        "prompt": "办事指南、诉求提交与进度查询。",
        "flow": [
            ">> 政务办事 · 事项诉求登记",
            ">> 办理进度 · 办结闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🏛️",
        "req": ("title",),
        "title_field": "title",
    },
    {
        "key": "legal_case",
        "slug": "legal-case",
        "name": "法务合同",
        "cat": "法律服务",
        "widget": "LegalCaseWidget",
        "prefix": "LC",
        "aliases": ("法务合同", "合同审查", "法规检索", "案件跟踪", "法务"),
        "fields": [
            ("category", "类型", 32, "contract"),
            ("title", "标题", 200, ""),
            ("party", "对方/当事人", 120, ""),
            ("deadline", "节点日期", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "reviewing", "done"),
        "advance": (("reviewing", "审查中"), ("done", "完成")),
        "choices": {"category": [("contract", "合同"), ("law", "法规"), ("case", "案件")]},
        "color": "#334155",
        "scene": "s30",
        "role": "法务",
        "hint": "法务 · 合规",
        "prompt": "合同审查、法规检索与案件跟踪。",
        "flow": [
            ">> 法务合同 · 审查案件登记",
            ">> 节点跟进 · 闭环完成",
            ">> 企微钉钉飞书 · 节点提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "⚖️",
        "req": ("title",),
        "title_field": "title",
    },
]


def pascal(key: str) -> str:
    return "".join(p.title() for p in key.split("_"))


def write_migration() -> None:
    parts = [
        '"""batch CapShip: wedding/deco/pet/gov/legal (s25/s26/s27/s29/s30).',
        "",
        "Revision ID: 031",
        "Revises: 030",
        '"""',
        "",
        "from typing import Sequence, Union",
        "",
        "import sqlalchemy as sa",
        "from alembic import op",
        "from ops_utils import create_index_if_missing, create_table_if_missing",
        "",
        'revision: str = "031"',
        'down_revision: Union[str, None] = "030"',
        "branch_labels: Union[str, Sequence[str], None] = None",
        "depends_on: Union[str, Sequence[str], None] = None",
        "",
        "",
        "def _capship_indexes(table: str) -> None:",
        "    for name, cols in (",
        '        (f"ix_{table}_tenant_id", ["tenant_id"]),',
        '        (f"ix_{table}_app_public_id", ["app_public_id"]),',
        '        (f"ix_{table}_reporter_id", ["reporter_id"]),',
        '        (f"ix_{table}_record_no", ["record_no"]),',
        '        (f"ix_{table}_status", ["status"]),',
        "    ):",
        "        create_index_if_missing(name, table, cols)",
        "",
        "",
        "def upgrade() -> None:",
    ]
    for c in CAPS:
        t = f"{c['key']}_records"
        parts.append(f'    create_table_if_missing(')
        parts.append(f'        "{t}",')
        parts.append('        sa.Column("id", sa.String(36), primary_key=True),')
        parts.append('        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),')
        parts.append('        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),')
        parts.append('        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),')
        parts.append('        sa.Column("record_no", sa.String(32), nullable=False),')
        for fname, _, size, _ in c["fields"]:
            if size == "text":
                parts.append(f'        sa.Column("{fname}", sa.Text(), nullable=False, server_default=""),')
            else:
                parts.append(f'        sa.Column("{fname}", sa.String({size}), nullable=False, server_default=""),')
        parts.append('        sa.Column("status", sa.String(32), nullable=False, server_default="open"),')
        parts.append(
            '        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),'
        )
        parts.append(
            '        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),'
        )
        parts.append("    )")
        parts.append(f'    _capship_indexes("{t}")')
        parts.append("")
    parts.append("")
    parts.append("def downgrade() -> None:")
    for c in reversed(CAPS):
        parts.append(f'    op.drop_table("{c["key"]}_records")')
    parts.append("")
    path = ROOT / "backend/alembic/versions/031_capship_batch_life_gov.py"
    path.write_text("\n".join(parts), encoding="utf-8")
    print("wrote", path)


def write_model(c: dict) -> str:
    cls = pascal(c["key"]) + "Record"
    lines = [
        f"class {cls}(Base):",
        f'    """CapShip · {c["key"]} {c["name"]}。"""',
        "",
        f'    __tablename__ = "{c["key"]}_records"',
        "",
        '    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)',
        '    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)',
        '    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)',
        '    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)',
        "    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)",
    ]
    for fname, _, size, _ in c["fields"]:
        if size == "text":
            lines.append(f'    {fname}: Mapped[str] = mapped_column(Text, nullable=False, default="")')
        else:
            lines.append(f'    {fname}: Mapped[str] = mapped_column(String({size}), nullable=False, default="")')
    lines.append(
        '    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)'
    )
    lines.append("    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())")
    lines.append(
        "    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())"
    )
    lines.append("")
    lines.append("    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])")
    lines.append("")
    return "\n".join(lines)


def write_store(c: dict) -> None:
    key = c["key"]
    cls = pascal(key) + "Record"
    route = f"/{c['slug']}"
    statuses = c["statuses"]
    field_names = [f[0] for f in c["fields"]]
    valid_cat = [x[0] for x in c["choices"]["category"]]
    default_cat = c["fields"][0][3]

    create_kwargs = ",\n    ".join(f"{fn}: str = \"\"" for fn in field_names)
    assign_rows = []
    for fname, _, _, default in c["fields"]:
        if fname == "category":
            assign_rows.append(
                f'        category=cat,'
            )
        elif fname == "note":
            assign_rows.append(f'        note=(note or "").strip(),')
        else:
            assign_rows.append(f'        {fname}=({fname} or "").strip(),')

    dict_fields = "\n".join(f'        "{fn}": row.{fn},' for fn in field_names)

    advance_fns = []
    for st, label in c["advance"]:
        advance_fns.append(
            f'''
def mark_{st}(db: Session, tenant_id: str, record_id: str) -> dict[str, Any] | None:
    row = (
        db.query({cls})
        .options(joinedload({cls}.reporter))
        .filter({cls}.tenant_id == tenant_id, {cls}.id == record_id)
        .first()
    )
    if not row:
        return None
    if row.status == "{st}":
        return to_dict(row)
    row.status = "{st}"
    db.commit()
    db.refresh(row)
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db, tenant_id=tenant_id, title="{c['name']} · {label}",
            content=f"{{row.record_no}} · 状态已更新为 {label}",
            app_public_id=row.app_public_id, path="{route}", link_label="打开{c['name']}",
        )
    except Exception:
        pass
    return to_dict(row)
'''
        )

    body = f'''"""CapShip · {key} {c['name']}。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import {cls}, User

VALID_STATUS = frozenset({statuses!r})
VALID_CATEGORY = frozenset({tuple(valid_cat)!r})


def _no() -> str:
    now = datetime.now(timezone.utc)
    return f"{c['prefix']}-{{now.strftime('%Y%m%d')}}-{{now.strftime('%H%M%S')}}{{now.microsecond // 1000:03d}}"


def to_dict(row: {cls}) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {{
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
{dict_fields}
        "status": row.status,
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }}


def list_records(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query({cls})
        .options(joinedload({cls}.reporter))
        .filter({cls}.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter({cls}.app_public_id == app_public_id)
    if status and status in VALID_STATUS:
        q = q.filter({cls}.status == status)
    return [to_dict(r) for r in q.order_by({cls}.created_at.desc()).limit(200).all()]


def create_record(
    db: Session,
    user: User,
    *,
    {create_kwargs},
    app_public_id: str = "",
) -> dict[str, Any]:
    cat = (category or "{default_cat}").strip().lower()
    if cat not in VALID_CATEGORY:
        cat = "{default_cat}"
    row = {cls}(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no(),
{chr(10).join(assign_rows)}
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event
        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="{c['name']} · 新记录",
            content=f"{{row.record_no}} · {{getattr(row, '{c['title_field']}', '')}}",
            app_public_id=row.app_public_id,
            path="{route}",
            link_label="打开{c['name']}",
        )
    except Exception:
        pass
    return to_dict(row)

{''.join(advance_fns)}
'''
    path = ROOT / f"backend/app/services/{key}_store.py"
    path.write_text(body, encoding="utf-8")
    print("wrote", path)


def write_api(c: dict) -> None:
    key = c["key"]
    slug = c["slug"]
    field_names = [f[0] for f in c["fields"]]
    req = set(c["req"])
    body_fields = []
    for fname, _, size, default in c["fields"]:
        if fname in req:
            body_fields.append(f'    {fname}: str = Field(min_length=1, max_length={200 if size == "text" else size})')
        else:
            body_fields.append(f'    {fname}: str = ""')
    create_args = ",\n        ".join(f"{fn}=body.{fn}" for fn in field_names)
    advance_routes = []
    for st, _label in c["advance"]:
        advance_routes.append(
            f'''

@router.post("/records/{{record_id}}/{st}")
def {st}_api(record_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    item = store.mark_{st}(db, user.tenant_id, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="记录不存在")
    return {{"success": True, "record": item}}
'''
        )
    check = " or ".join(f"not body.{r}.strip()" for r in c["req"])
    body = f'''"""CapShip · {key} API。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services import {key}_store as store

router = APIRouter(prefix="/{slug}", tags=["{slug}"])


class CreateBody(BaseModel):
{chr(10).join(body_fields)}
    app_public_id: str = Field(default="", max_length=64)


@router.get("/records")
def list_api(
    app_id: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    items = store.list_records(db, user.tenant_id, app_public_id=app_id or None, status=status)
    return {{"total": len(items), "items": items}}


@router.post("/records")
def create_api(body: CreateBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> dict:
    if {check}:
        raise HTTPException(status_code=400, detail="必填项不能为空")
    item = store.create_record(
        db,
        user,
        {create_args},
        app_public_id=body.app_public_id,
    )
    return {{"success": True, "record": item}}
{''.join(advance_routes)}
'''
    path = ROOT / f"backend/app/api/v1/{key}.py"
    path.write_text(body, encoding="utf-8")
    print("wrote", path)


def write_web(c: dict) -> None:
    key = c["key"]
    slug = c["slug"]
    widget = c["widget"]
    field_names = [f[0] for f in c["fields"]]
    iface = "\n".join(f"  {fn}: string" for fn in field_names)
    default_cat = c["fields"][0][3]
    choice_btns = []
    for val, lab in c["choices"]["category"]:
        choice_btns.append(
            (
                '            <button type="button" className={(value || \'%s\') === \'%s\' ? \'btn\' : \'btn btn-ghost\'} '
                'style={(value || \'%s\') === \'%s\' ? { background: a } : undefined} '
                'onClick={() => setValue(\'%s\')}>%s</button>'
            )
            % (default_cat, val, default_cat, val, val, lab)
        )
    step_lines = [
        "      {",
        "        key: 'category',",
        f"        label: '{c['fields'][0][1]}',",
        "        render: ({ value, setValue, accent: a }) => (",
        '          <div className="row-actions">',
        *choice_btns,
        "          </div>",
        "        ),",
        "      },",
    ]
    for fname, label, size, _ in c["fields"][1:]:
        opt = ", optional: true" if fname not in c["req"] else ""
        step_lines.append(f"      {{ key: '{fname}', label: '{label}', placeholder: '{label}'{opt} }},")

    status_entries = []
    labels = {
        "open": "待处理",
        "delivering": "配送中",
        "done": "已完成",
        "exception": "异常",
        "following": "跟进中",
        "cancelled": "已取消",
        "running": "进行中",
        "closed": "已关闭",
        "confirmed": "已确认",
    }
    for st in c["statuses"]:
        status_entries.append(f"  {st}: '{labels.get(st, st)}',")

    advance_btns = []
    for st, lab in c["advance"]:
        advance_btns.append(
            (
                "            {t.status !== '%s' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (\n"
                "              <button type=\"button\" className=\"btn btn-ghost\" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} "
                "onClick={() => void advance(t.id, '%s')}>%s</button>\n"
                "            )}"
            )
            % (st, st, lab)
        )

    req_check = " || ".join(f"!values.{r}?.trim()" for r in c["req"])
    body_json = ",\n          ".join(
        "category," if fn == "category" else f"{fn}: (values.{fn} || '').trim()" for fn in field_names
    )
    name = c["name"]
    title_field = c["title_field"]
    color = c["color"]

    tsx = """import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
__IFACE__
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
__STATUS__
}

export function __WIDGET__(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: '__DEFAULT_CAT__' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '__COLOR__'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
__STEPS__
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/__SLUG__/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || __REQ__) return
    setBusy(true)
    setMsg('')
    const category = values.category || '__DEFAULT_CAT__'
    try {
      await apiFetch('/api/v1/__SLUG__/records', token, {
        method: 'POST',
        body: JSON.stringify({
          __BODY__,
          app_public_id: appId || '',
        }),
      })
      setValues({ category: '__DEFAULT_CAT__' })
      setResetKey((k) => k + 1)
      setMsg('已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/__SLUG__/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建__NAME__</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '__NAME__协作' : '__NAME__'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`登记 → 状态跟进闭环${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待处理 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>__NAME__列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {(t as any).__TITLE__ || t.category}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.category}{t.note ? ` · ${t.note}` : ''}</p>
__ADVANCE__
          </li>
        ))}
      </ul>
    </div>
  )
}
"""
    tsx = (
        tsx.replace("__IFACE__", iface)
        .replace("__STATUS__", "\n".join(status_entries))
        .replace("__WIDGET__", widget)
        .replace("__DEFAULT_CAT__", default_cat)
        .replace("__COLOR__", color)
        .replace("__STEPS__", "\n".join(step_lines))
        .replace("__SLUG__", slug)
        .replace("__REQ__", req_check)
        .replace("__BODY__", body_json)
        .replace("__NAME__", name)
        .replace("__TITLE__", title_field)
        .replace("__ADVANCE__", "\n".join(advance_btns))
    )
    pkg = ROOT / f"packages/web-capability-{c['slug']}/src"
    pkg.mkdir(parents=True, exist_ok=True)
    (pkg / f"{widget}.tsx").write_text(tsx, encoding="utf-8")
    (pkg / "index.ts").write_text(
        f"import {{ registerWidget }} from '@blockhub/web-core'\n"
        f"import {{ {widget} }} from './{widget}'\n\n"
        f"registerWidget('{widget}', {widget} as Parameters<typeof registerWidget>[1])\n"
        f"export {{ {widget} }}\n",
        encoding="utf-8",
    )
    print("wrote web", c["slug"])


def write_flutter(c: dict) -> None:
    key = c["key"]
    slug = c["slug"]
    mod = pascal(key) + "Module"
    page = pascal(key) + "Page"
    default_cat = c["fields"][0][3]
    choices = ",\n                ".join(
        f"(value: '{v}', label: '{l}')" for v, l in c["choices"]["category"]
    )
    steps = [
        f'''            GtgtStep(
              key: 'category',
              label: '{c["fields"][0][1]}',
              choices: [
                {choices},
              ],
            ),'''
    ]
    for fname, label, size, _ in c["fields"][1:]:
        opt = ", optional: true" if fname not in c["req"] else ""
        multi = ", multiline: true" if size == "text" else ""
        steps.append(
            f"            GtgtStep(key: '{fname}', label: '{label}', placeholder: '{label}'{opt}{multi}),"
        )
    req_check = " || ".join(f"(_values['{r}'] ?? '').trim().isEmpty" for r in c["req"])
    post_fields = ",\n        ".join(f"'{fn}': (_values['{fn}'] ?? '').trim()" for fn in [f[0] for f in c["fields"]])

    advance_trailing = []
    for st, lab in c["advance"]:
        advance_trailing.append(
            (
                "                    if (t['status'] != '%s' && t['status'] != 'done' && t['status'] != 'closed' && t['status'] != 'cancelled')\n"
                "                      TextButton(onPressed: () => _advance(id, '%s'), child: const Text('%s')),"
            )
            % (st, st, lab)
        )

    dart_page = f'''import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class {page} extends StatefulWidget {{
  const {page}({{super.key, required this.branding}});
  final AppBranding branding;
  @override
  State<{page}> createState() => _{page}State();
}}

class _{page}State extends State<{page}> {{
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {{'category': '{default_cat}'}};

  String get _base => '${{widget.branding.apiBaseUrl}}/{slug}';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {{
    super.initState();
    _load();
  }}

  Future<void> _load() async {{
    setState(() => _loading = true);
    try {{
      final dio = getRuntimeAuthedDio();
      final q = _appId.isNotEmpty ? '?app_id=${{Uri.encodeQueryComponent(_appId)}}' : '';
      final resp = await dio.get<Map<String, dynamic>>('$_base/records$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    }} catch (_) {{
      _items = [];
    }} finally {{
      if (mounted) setState(() => _loading = false);
    }}
  }}

  Future<void> _submit() async {{
    if ({req_check}) return;
    setState(() => _busy = true);
    try {{
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {{
        {post_fields},
        'app_public_id': _appId,
      }});
      _values
        ..clear()
        ..['category'] = '{default_cat}';
      _resetKey++;
      await _load();
    }} finally {{
      if (mounted) setState(() => _busy = false);
    }}
  }}

  Future<void> _advance(String id, String action) async {{
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action');
    await _load();
  }}

  @override
  Widget build(BuildContext context) {{
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '{c["name"]}',
          flowHint: '登记 → 状态闭环',
          accent: color,
          steps: const [
{chr(10).join(steps)}
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {{
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${{t['id']}}';
            return Card(
              child: ListTile(
                title: Text('${{t['record_no']}} · ${{t['{c["title_field"]}'] ?? t['category']}}'),
                subtitle: Text('${{t['category']}} · ${{t['status']}}'),
                trailing: Wrap(
                  children: [
{chr(10).join(advance_trailing)}
                  ],
                ),
              ),
            );
          }}),
      ],
    );
  }}
}}
'''
    pkg = ROOT / f"packages/capability_{key}"
    (pkg / "lib").mkdir(parents=True, exist_ok=True)
    (pkg / "pubspec.yaml").write_text(
        f"""name: capability_{key}
description: CapShip {key} — {c['name']}
version: 0.1.0
publish_to: none
environment:
  sdk: ">=3.3.0 <4.0.0"
dependencies:
  flutter:
    sdk: flutter
  blockhub_flutter_core:
    path: ../blockhub_flutter_core
""",
        encoding="utf-8",
    )
    (pkg / f"lib/capability_{key}.dart").write_text(
        f"library capability_{key};\nexport '{key}_module.dart';\nexport '{key}_page.dart';\n",
        encoding="utf-8",
    )
    (pkg / f"lib/{key}_module.dart").write_text(
        f"""import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import '{key}_page.dart';

class {mod} implements CapabilityModule {{
  const {mod}();
  @override
  String get capabilityKey => '{key}';
  @override
  Widget buildPage(AppBranding branding) => {page}(branding: branding);
}}
""",
        encoding="utf-8",
    )
    (pkg / f"lib/{key}_page.dart").write_text(dart_page, encoding="utf-8")
    print("wrote flutter", key)


def main() -> None:
    write_migration()
    models_path = ROOT / "backend/app/db/models.py"
    text = models_path.read_text(encoding="utf-8")
    if "class WeddingPlanRecord" not in text:
        block = "\n\n" + "\n\n".join(write_model(c) for c in CAPS) + "\n"
        models_path.write_text(text.rstrip() + block, encoding="utf-8")
        print("appended models")
    for c in CAPS:
        write_store(c)
        write_api(c)
        write_web(c)
        write_flutter(c)
    meta = ROOT / "scripts/_caps_batch1.json"
    meta.write_text(json.dumps(CAPS, ensure_ascii=False, indent=2), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
