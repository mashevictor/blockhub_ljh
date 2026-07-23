"""租户套餐解析与用量计量。"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.data.plan_catalog import DEFAULT_PLAN_ID, SMART_PAGE_LABEL, get_plan
from app.db.models import Tenant, UsageMeter, User


def _period_day() -> str:
    return date.today().isoformat()


def _period_month() -> str:
    return date.today().strftime("%Y-%m")


def _period_lifetime() -> str:
    return "lifetime"


def tenant_plan_id(tenant: Tenant | None) -> str:
    if not tenant:
        return DEFAULT_PLAN_ID
    expires = getattr(tenant, "plan_expires_at", None)
    if expires is not None:
        exp = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            pid = (getattr(tenant, "plan_tier", None) or "").strip()
            if pid and pid != DEFAULT_PLAN_ID:
                return DEFAULT_PLAN_ID
    pid = (getattr(tenant, "plan_tier", None) or "").strip()
    return pid or DEFAULT_PLAN_ID


def resolve_plan_for_user(db: Session, user: User | None) -> dict[str, Any]:
    if not user:
        return get_plan(DEFAULT_PLAN_ID)
    tenant = db.get(Tenant, user.tenant_id)
    # 过期软回落：写回 c_free（幂等）
    if tenant and tenant_plan_id(tenant) == DEFAULT_PLAN_ID:
        expires = getattr(tenant, "plan_expires_at", None)
        raw = (getattr(tenant, "plan_tier", None) or "").strip()
        if expires and raw and raw != DEFAULT_PLAN_ID:
            exp = expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)
            if exp < datetime.now(timezone.utc):
                tenant.plan_tier = DEFAULT_PLAN_ID
                db.add(tenant)
                db.commit()
    return get_plan(tenant_plan_id(tenant))


def _get_or_create_meter(
    db: Session,
    *,
    tenant_id: str,
    user_id: str | None,
    metric: str,
    period_key: str,
) -> UsageMeter:
    q = (
        db.query(UsageMeter)
        .filter(
            UsageMeter.tenant_id == tenant_id,
            UsageMeter.metric == metric,
            UsageMeter.period_key == period_key,
        )
    )
    if user_id:
        q = q.filter(UsageMeter.user_id == user_id)
    else:
        q = q.filter(UsageMeter.user_id.is_(None))
    row = q.first()
    if row:
        return row
    row = UsageMeter(
        tenant_id=tenant_id,
        user_id=user_id,
        metric=metric,
        period_key=period_key,
        count=0,
    )
    db.add(row)
    db.flush()
    return row


def get_usage(
    db: Session,
    *,
    tenant_id: str,
    user_id: str | None,
    metric: str,
    period_key: str,
) -> int:
    q = (
        db.query(UsageMeter)
        .filter(
            UsageMeter.tenant_id == tenant_id,
            UsageMeter.metric == metric,
            UsageMeter.period_key == period_key,
        )
    )
    if user_id:
        q = q.filter(UsageMeter.user_id == user_id)
    else:
        q = q.filter(UsageMeter.user_id.is_(None))
    row = q.first()
    return int(row.count) if row else 0


def increment_usage(
    db: Session,
    *,
    tenant_id: str,
    user_id: str | None,
    metric: str,
    period_key: str,
    delta: int = 1,
) -> int:
    row = _get_or_create_meter(
        db, tenant_id=tenant_id, user_id=user_id, metric=metric, period_key=period_key
    )
    row.count = int(row.count or 0) + delta
    row.updated_at = datetime.now(timezone.utc)
    db.add(row)
    db.commit()
    return int(row.count)


def assert_app_quota(db: Session, user: User | None, *, current_app_count: int) -> None:
    if not user:
        plan = get_plan(DEFAULT_PLAN_ID)
    else:
        # 平台管理员 / 运维冒烟不受 C 端 Free 应用数墙限制
        if user.role == "admin":
            return
        plan = resolve_plan_for_user(db, user)
    lim = plan.get("max_apps")
    if lim is None:
        return
    if current_app_count >= int(lim):
        raise HTTPException(
            status_code=402,
            detail=f"当前套餐「{plan['name']}」最多 {lim} 个应用，请升级 Plus 或 B 端套餐",
        )


def assert_industry_pack_quota(db: Session, user: User, *, industry_key: str) -> None:
    """行业包配额：Free/Plus=0（仅 office/模块）；Team=1；Business=5；Enterprise 不限。"""
    if user.role == "admin":
        return
    key = (industry_key or "").strip().lower()
    if not key or key == "office":
        return
    plan = resolve_plan_for_user(db, user)
    lim = plan.get("industry_packs")
    if lim is None:
        return
    lim_n = int(lim)
    if lim_n <= 0:
        raise HTTPException(
            status_code=402,
            detail=(
                f"当前套餐「{plan['name']}」不含行业包，请升级 Team 及以上，"
                f"或改用办公模块 / 自由搭配创建。"
            ),
        )
    from app.db.models import AppRecord

    used_keys = {
        (r.industry_key or "").strip().lower()
        for r in db.query(AppRecord)
        .filter(AppRecord.tenant_id == user.tenant_id)
        .all()
        if (r.industry_key or "").strip().lower() not in ("", "office")
    }
    if key in used_keys:
        return
    if len(used_keys) >= lim_n:
        raise HTTPException(
            status_code=402,
            detail=(
                f"当前套餐「{plan['name']}」最多 {lim_n} 个行业包"
                f"（已用 {', '.join(sorted(used_keys)) or '无'}），请升级套餐。"
            ),
        )


def assert_and_count_compose_edit(db: Session, user: User | None) -> dict[str, Any]:
    """对话改页计次（按天）。无用户时按放行（预览草稿）。"""
    if not user:
        return {"ok": True, "skipped": True}
    plan = resolve_plan_for_user(db, user)
    lim = plan.get("compose_edit_per_day")
    if lim is None:
        return {"ok": True, "plan": plan["id"], "unlimited": True}
    used = get_usage(
        db,
        tenant_id=user.tenant_id,
        user_id=user.id,
        metric="compose_edit",
        period_key=_period_day(),
    )
    if used >= int(lim):
        raise HTTPException(
            status_code=402,
            detail=f"今日对话改页已达上限（{lim} 次）。Free 为 10 次/天，升级 Plus 可不限制。",
        )
    increment_usage(
        db,
        tenant_id=user.tenant_id,
        user_id=user.id,
        metric="compose_edit",
        period_key=_period_day(),
    )
    return {"ok": True, "used": used + 1, "limit": lim, "plan": plan["id"]}


def assert_and_count_smart_page(
    db: Session,
    user: User | None,
    *,
    page_count: int = 1,
) -> dict[str, Any]:
    """智能出页计次：C 端按天；B 端可按月共享（user_id=None）。"""
    if not user or page_count <= 0:
        return {"ok": True, "skipped": True}
    plan = resolve_plan_for_user(db, user)
    day_lim = plan.get("smart_page_per_day")
    month_lim = plan.get("smart_page_per_month")

    if day_lim is not None:
        used = get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            metric="smart_page",
            period_key=_period_day(),
        )
        if used + page_count > int(day_lim):
            raise HTTPException(
                status_code=402,
                detail=(
                    f"今日{SMART_PAGE_LABEL}已达上限（{day_lim} 次）。"
                    f"升级 Plus 后{SMART_PAGE_LABEL}不限制。"
                ),
            )
        increment_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            metric="smart_page",
            period_key=_period_day(),
            delta=page_count,
        )
        return {"ok": True, "used": used + page_count, "limit": day_lim, "plan": plan["id"]}

    if month_lim is not None:
        used = get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=None,
            metric="smart_page",
            period_key=_period_month(),
        )
        if used + page_count > int(month_lim):
            raise HTTPException(
                status_code=402,
                detail=f"本月组织{SMART_PAGE_LABEL}配额已用尽（{month_lim} 次），请升级套餐或下月再试。",
            )
        increment_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=None,
            metric="smart_page",
            period_key=_period_month(),
            delta=page_count,
        )
        return {"ok": True, "used": used + page_count, "limit": month_lim, "plan": plan["id"]}

    return {"ok": True, "unlimited": True, "plan": plan["id"]}


def assert_and_count_code_download(db: Session, user: User) -> dict[str, Any]:
    plan = resolve_plan_for_user(db, user)
    life = plan.get("code_download_lifetime")
    month = plan.get("code_download_per_month")

    if life is not None:
        used = get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            metric="code_download",
            period_key=_period_lifetime(),
        )
        if used >= int(life):
            raise HTTPException(
                status_code=402,
                detail=f"Free 套餐仅可下载 {life} 个项目代码，请升级 Plus 后不限下载。",
            )
        increment_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            metric="code_download",
            period_key=_period_lifetime(),
        )
        return {"ok": True, "used": used + 1, "limit": life}

    if month is not None:
        used = get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=None,
            metric="code_download",
            period_key=_period_month(),
        )
        if used >= int(month):
            raise HTTPException(
                status_code=402,
                detail=f"本月契约下载已达上限（{month} 次）。",
            )
        increment_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=None,
            metric="code_download",
            period_key=_period_month(),
        )
        return {"ok": True, "used": used + 1, "limit": month}

    return {"ok": True, "unlimited": True}


def usage_summary(db: Session, user: User) -> dict[str, Any]:
    plan = resolve_plan_for_user(db, user)
    tenant = db.get(Tenant, user.tenant_id)
    usage = {
        "compose_edit_today": get_usage(
            db, tenant_id=user.tenant_id, user_id=user.id, metric="compose_edit", period_key=_period_day()
        ),
        "smart_page_today": get_usage(
            db, tenant_id=user.tenant_id, user_id=user.id, metric="smart_page", period_key=_period_day()
        ),
        "smart_page_month": get_usage(
            db, tenant_id=user.tenant_id, user_id=None, metric="smart_page", period_key=_period_month()
        ),
        "code_download_lifetime": get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=user.id,
            metric="code_download",
            period_key=_period_lifetime(),
        ),
        "code_download_month": get_usage(
            db,
            tenant_id=user.tenant_id,
            user_id=None,
            metric="code_download",
            period_key=_period_month(),
        ),
    }

    def _rem(used: int, lim: Any) -> int | None:
        if lim is None:
            return None
        return max(0, int(lim) - int(used))

    remaining = {
        "compose_edit_today": _rem(usage["compose_edit_today"], plan.get("compose_edit_per_day")),
        "smart_page_today": _rem(usage["smart_page_today"], plan.get("smart_page_per_day")),
        "smart_page_month": _rem(usage["smart_page_month"], plan.get("smart_page_per_month")),
        "code_download_lifetime": _rem(usage["code_download_lifetime"], plan.get("code_download_lifetime")),
        "code_download_month": _rem(usage["code_download_month"], plan.get("code_download_per_month")),
    }
    expires = getattr(tenant, "plan_expires_at", None) if tenant else None
    return {
        "plan": plan,
        "plan_tier": tenant_plan_id(tenant),
        "seat_quota": int(getattr(tenant, "seat_quota", None) or 1) if tenant else 1,
        "plan_expires_at": expires.isoformat() if expires else None,
        "smart_page_label": SMART_PAGE_LABEL,
        "usage": usage,
        "remaining": remaining,
    }
