# -*- coding: utf-8 -*-
"""Generate CapShip batch: delivery_order / house_viewing / campaign_ops / fitness_checkin / travel_plan."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CAPS = [
    {
        "key": "delivery_order",
        "slug": "delivery-order",
        "name": "外卖配送",
        "cat": "物流仓储",
        "widget": "DeliveryOrderWidget",
        "prefix": "DO",
        "aliases": ("外卖配送", "外卖", "骑手调度", "配送异常", "订单跟踪", "运单跟踪"),
        "fields": [
            ("category", "类型", 32, "dispatch"),
            ("pickup", "取餐点", 200, ""),
            ("dropoff", "送达地址", 200, ""),
            ("rider_name", "骑手", 120, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "delivering", "done", "exception"),
        "advance": (("delivering", "配送中"), ("done", "完成")),
        "choices": {"category": [("dispatch", "派单"), ("tracking", "跟踪"), ("exception", "异常")]},
        "color": "#f43f5e",
        "scene": "s22",
        "role": "骑手",
        "hint": "生活 · 配送",
        "prompt": "订单跟踪、骑手调度与异常处理。",
        "flow": [
            ">> 外卖配送 · 取送信息登记",
            ">> 配送中/完成 · 状态闭环",
            ">> 企微钉钉飞书 · 异常推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🚚",
        "req": ("pickup", "dropoff"),
        "title_field": "dropoff",
    },
    {
        "key": "house_viewing",
        "slug": "house-viewing",
        "name": "看房签约",
        "cat": "房地产",
        "widget": "HouseViewingWidget",
        "prefix": "HV",
        "aliases": ("看房签约", "看房预约", "意向登记", "签约跟进", "带看"),
        "fields": [
            ("category", "环节", 32, "viewing"),
            ("client_name", "客户姓名", 120, ""),
            ("property_addr", "房源地址", 200, ""),
            ("schedule_at", "预约时间", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "following", "done", "cancelled"),
        "advance": (("following", "跟进中"), ("done", "完成")),
        "choices": {"category": [("viewing", "看房"), ("intent", "意向"), ("sign", "签约")]},
        "color": "#b45309",
        "scene": "s20",
        "role": "销售",
        "hint": "房产 · 销售",
        "prompt": "看房预约、意向登记与签约跟进。",
        "flow": [
            ">> 看房签约 · 客户房源登记",
            ">> 意向/签约 · 跟进闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🏡",
        "req": ("client_name", "property_addr"),
        "title_field": "property_addr",
    },
    {
        "key": "campaign_ops",
        "slug": "campaign-ops",
        "name": "活动运营",
        "cat": "营销运营",
        "widget": "CampaignOpsWidget",
        "prefix": "CO",
        "aliases": ("活动运营", "活动策划", "报名统计", "转化复盘", "活动管理"),
        "fields": [
            ("category", "环节", 32, "plan"),
            ("title", "活动名称", 200, ""),
            ("channel", "渠道", 120, ""),
            ("metric", "指标/人数", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "running", "closed"),
        "advance": (("running", "进行中"), ("closed", "关闭")),
        "choices": {"category": [("plan", "策划"), ("signup", "报名"), ("review", "复盘")]},
        "color": "#06b6d4",
        "scene": "s18",
        "role": "运营",
        "hint": "市场 · 活动",
        "prompt": "活动策划、报名统计与转化复盘。",
        "flow": [
            ">> 活动运营 · 排期素材登记",
            ">> 报名复盘 · 指标闭环",
            ">> 企微钉钉飞书 · 触达推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📣",
        "req": ("title",),
        "title_field": "title",
    },
    {
        "key": "fitness_checkin",
        "slug": "fitness-checkin",
        "name": "健身打卡",
        "cat": "生活服务",
        "widget": "FitnessCheckinWidget",
        "prefix": "FC",
        "aliases": ("健身打卡", "课程预约", "训练打卡", "教练答疑", "健身"),
        "fields": [
            ("category", "类型", 32, "checkin"),
            ("member_name", "会员姓名", 120, ""),
            ("class_name", "课程/动作", 200, ""),
            ("schedule_at", "预约/打卡时间", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "done"),
        "advance": (("done", "完成"),),
        "choices": {"category": [("book", "预约"), ("checkin", "打卡"), ("coach", "教练答疑")]},
        "color": "#14b8a6",
        "scene": "s23",
        "role": "会员",
        "hint": "生活 · 健康",
        "prompt": "课程预约、训练打卡与教练答疑。",
        "flow": [
            ">> 健身打卡 · 课程预约登记",
            ">> 训练打卡 · 完成闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "💪",
        "req": ("class_name",),
        "title_field": "class_name",
    },
    {
        "key": "travel_plan",
        "slug": "travel-plan",
        "name": "旅行攻略",
        "cat": "生活服务",
        "widget": "TravelPlanWidget",
        "prefix": "TP",
        "aliases": ("旅行攻略", "行程规划", "景点问答", "预订提醒", "旅行"),
        "fields": [
            ("category", "类型", 32, "plan"),
            ("destination", "目的地", 200, ""),
            ("days", "天数/日期", 64, ""),
            ("title", "标题", 200, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "confirmed", "done"),
        "advance": (("confirmed", "已确认"), ("done", "完成")),
        "choices": {"category": [("plan", "行程"), ("spot", "景点"), ("booking", "预订")]},
        "color": "#0d9488",
        "scene": "s24",
        "role": "旅行",
        "hint": "生活 · 出行",
        "prompt": "行程规划、景点问答与预订提醒。",
        "flow": [
            ">> 旅行攻略 · 目的地行程登记",
            ">> 景点/预订 · 确认闭环",
            ">> 企微钉钉飞书 · 提醒推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧳",
        "req": ("destination",),
        "title_field": "destination",
    },
]


def pascal(key: str) -> str:
    return "".join(p.title() for p in key.split("_"))


def write_migration() -> None:
    parts = [
        '"""batch CapShip: delivery/house/campaign/fitness/travel (s22/s20/s18/s23/s24).',
        "",
        "Revision ID: 030",
        "Revises: 029",
        '"""',
        "",
        "from typing import Sequence, Union",
        "",
        "import sqlalchemy as sa",
        "from alembic import op",
        "from ops_utils import create_index_if_missing, create_table_if_missing",
        "",
        'revision: str = "030"',
        'down_revision: Union[str, None] = "029"',
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
    path = ROOT / "backend/alembic/versions/030_capship_batch_lifestyle.py"
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
    if "class DeliveryOrderRecord" not in text:
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
