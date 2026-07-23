"""CapShip · 金融行业新闻 Agent 存储与同步。"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import FinanceNewsItem, FinanceNewsSourceConfig, User
from app.services.finance_news_adapters import (
    DemoAdapter,
    NewsDraft,
    PROVIDERS,
    SCOPES,
    VERTICALS,
    resolve_adapter,
)
from app.services.llm_gateway import chat_complete, llm_configured


def _parse_symbols(raw: str) -> list[dict[str, Any]]:
    try:
        data = json.loads(raw or "[]")
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def to_dict(row: FinanceNewsItem) -> dict[str, Any]:
    return {
        "id": row.id,
        "app_public_id": row.app_public_id,
        "vertical": row.vertical,
        "scope": row.scope,
        "title": row.title,
        "summary": row.summary,
        "body": row.body,
        "symbols": _parse_symbols(row.symbols),
        "source": row.source,
        "external_id": row.external_id,
        "heat": row.heat,
        "is_demo": row.source == "demo",
        "published_at": row.published_at.isoformat() if row.published_at else "",
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_items(
    db: Session,
    tenant_id: str,
    *,
    vertical: str | None = None,
    scope: str | None = None,
    app_public_id: str | None = None,
    source: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    q = db.query(FinanceNewsItem).filter(FinanceNewsItem.tenant_id == tenant_id)
    if vertical and vertical in VERTICALS:
        q = q.filter(FinanceNewsItem.vertical == vertical)
    if scope and scope in SCOPES:
        q = q.filter(FinanceNewsItem.scope == scope)
    if app_public_id:
        q = q.filter(FinanceNewsItem.app_public_id == app_public_id)
    if source:
        q = q.filter(FinanceNewsItem.source == source)
    rows = (
        q.order_by(FinanceNewsItem.heat.desc(), FinanceNewsItem.published_at.desc().nullslast())
        .limit(min(limit, 200))
        .all()
    )
    return [to_dict(r) for r in rows]


def _upsert_drafts(
    db: Session,
    tenant_id: str,
    drafts: list[NewsDraft],
    *,
    app_public_id: str = "",
) -> int:
    n = 0
    for d in drafts:
        if d.scope not in SCOPES:
            continue
        existing = (
            db.query(FinanceNewsItem)
            .filter(
                FinanceNewsItem.tenant_id == tenant_id,
                FinanceNewsItem.source == d.source,
                FinanceNewsItem.external_id == d.external_id,
            )
            .first()
        )
        payload = {
            "app_public_id": app_public_id or "",
            "vertical": d.vertical if d.vertical in VERTICALS else "bank",
            "scope": d.scope,
            "title": (d.title or "")[:300],
            "summary": d.summary or "",
            "body": d.body or "",
            "symbols": json.dumps(d.symbols or [], ensure_ascii=False),
            "heat": int(d.heat or 0),
            "published_at": d.published_at or datetime.now(timezone.utc),
        }
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
        else:
            db.add(
                FinanceNewsItem(
                    tenant_id=tenant_id,
                    source=d.source,
                    external_id=d.external_id,
                    **payload,
                )
            )
        n += 1
    db.commit()
    return n


def demo_seed(
    db: Session,
    user: User,
    *,
    vertical: str,
    app_public_id: str = "",
    refresh: bool = False,
) -> dict[str, Any]:
    v = vertical if vertical in VERTICALS else "bank"
    if user.role not in ("admin", "tenant_owner"):
        raise PermissionError("仅管理员或租户所有者可写入演示样本")

    existing = (
        db.query(FinanceNewsItem)
        .filter(
            FinanceNewsItem.tenant_id == user.tenant_id,
            FinanceNewsItem.vertical == v,
            FinanceNewsItem.source == "demo",
        )
        .count()
    )
    if existing and not refresh:
        return {
            "success": True,
            "skipped": True,
            "inserted": 0,
            "message": f"该垂直已有 {existing} 条演示样本，未重复写入。可传 refresh=true 刷新。",
        }

    if refresh and existing:
        (
            db.query(FinanceNewsItem)
            .filter(
                FinanceNewsItem.tenant_id == user.tenant_id,
                FinanceNewsItem.vertical == v,
                FinanceNewsItem.source == "demo",
            )
            .delete(synchronize_session=False)
        )
        db.commit()

    drafts = DemoAdapter().fetch(vertical=v)
    n = _upsert_drafts(db, user.tenant_id, drafts, app_public_id=app_public_id)
    return {"success": True, "skipped": False, "inserted": n, "message": f"已写入 {n} 条演示样本（source=demo）"}


def get_source_config(db: Session, tenant_id: str, provider: str) -> dict[str, Any] | None:
    row = (
        db.query(FinanceNewsSourceConfig)
        .filter(
            FinanceNewsSourceConfig.tenant_id == tenant_id,
            FinanceNewsSourceConfig.provider == provider,
        )
        .first()
    )
    if not row:
        return None
    return {
        "provider": row.provider,
        "enabled": row.enabled,
        "has_token": bool(row.token_enc),
        "last_sync_at": row.last_sync_at.isoformat() if row.last_sync_at else "",
        "last_error": row.last_error or "",
    }


def upsert_source_config(
    db: Session,
    user: User,
    *,
    provider: str,
    token: str = "",
    enabled: bool = True,
) -> dict[str, Any]:
    if user.role not in ("admin", "tenant_owner"):
        raise PermissionError("仅管理员或租户所有者可配置新闻源")
    p = (provider or "").strip().lower()
    if p not in PROVIDERS:
        raise ValueError(f"不支持的源类型: {provider}")
    row = (
        db.query(FinanceNewsSourceConfig)
        .filter(
            FinanceNewsSourceConfig.tenant_id == user.tenant_id,
            FinanceNewsSourceConfig.provider == p,
        )
        .first()
    )
    tok = (token or "").strip()
    if row is None:
        row = FinanceNewsSourceConfig(
            tenant_id=user.tenant_id,
            provider=p,
            token_enc=tok if p == "tushare" else "",
            enabled=enabled,
        )
        db.add(row)
    else:
        row.enabled = enabled
        if tok and p == "tushare":
            row.token_enc = tok
        row.last_error = ""
    db.commit()
    return get_source_config(db, user.tenant_id, p) or {}


def _resolve_token(db: Session, tenant_id: str, provider: str) -> str:
    if provider != "tushare":
        return ""
    row = (
        db.query(FinanceNewsSourceConfig)
        .filter(
            FinanceNewsSourceConfig.tenant_id == tenant_id,
            FinanceNewsSourceConfig.provider == "tushare",
        )
        .first()
    )
    if row and row.token_enc:
        return row.token_enc
    return (settings.tushare_token or "").strip()


def sync_news(
    db: Session,
    user: User,
    *,
    provider: str,
    vertical: str,
    app_public_id: str = "",
    limit: int = 30,
) -> dict[str, Any]:
    if user.role not in ("admin", "tenant_owner"):
        raise PermissionError("仅管理员或租户所有者可同步真源")
    p = (provider or "").strip().lower()
    if p not in PROVIDERS:
        raise ValueError(f"不支持的源类型: {provider}")
    v = vertical if vertical in VERTICALS else "bank"
    token = _resolve_token(db, user.tenant_id, p)
    adapter = resolve_adapter(p, token)

    cfg = (
        db.query(FinanceNewsSourceConfig)
        .filter(
            FinanceNewsSourceConfig.tenant_id == user.tenant_id,
            FinanceNewsSourceConfig.provider == p,
        )
        .first()
    )
    if cfg is None:
        cfg = FinanceNewsSourceConfig(tenant_id=user.tenant_id, provider=p, token_enc=token if p == "tushare" else "")
        db.add(cfg)
        db.flush()

    try:
        drafts = adapter.fetch(vertical=v, limit=limit)
        n = _upsert_drafts(db, user.tenant_id, drafts, app_public_id=app_public_id)
        cfg.last_sync_at = datetime.now(timezone.utc)
        cfg.last_error = ""
        db.commit()
        return {
            "success": True,
            "provider": p,
            "inserted": n,
            "message": f"已从 {p} 同步 {n} 条（非 demo）。公开源声明：非官方授权行情。",
        }
    except Exception as exc:  # noqa: BLE001 — 表面给前端可读错误
        cfg.last_error = str(exc)[:2000]
        db.commit()
        raise RuntimeError(str(exc)) from exc


def generate_brief(
    db: Session,
    tenant_id: str,
    *,
    vertical: str,
    kind: str = "industry",
    scope: str | None = None,
) -> dict[str, Any]:
    v = vertical if vertical in VERTICALS else "bank"
    items = list_items(db, tenant_id, vertical=v, scope=scope, limit=40)
    if not items:
        raise ValueError("当前垂直暂无已入库新闻，无法生成一页纸。请先「写入演示样本」或「接入真源」同步。")

    kind_label = {
        "industry": "行业一页纸",
        "company": "公司一页纸",
        "macro": "宏观速览",
    }.get(kind, "行业一页纸")

    bullets = []
    for it in items[:25]:
        sym = ""
        if it.get("symbols"):
            names = [str(s.get("name") or s.get("code") or "") for s in it["symbols"][:3]]
            sym = " · " + "/".join(n for n in names if n)
        bullets.append(f"- [{it['scope']}|{it['source']}] {it['title']}{sym}\n  {it['summary'][:160]}")

    corpus = "\n".join(bullets)
    prompt = (
        f"你是金融投研助手。仅根据以下**已入库**新闻条目，写一份中文「{kind_label}」（垂直={v}）。"
        "要求：分点、客观、不编造库外事实；若信息不足请明确说明缺口。"
        f"\n\n条目：\n{corpus}"
    )

    text = None
    if llm_configured():
        text = chat_complete(
            [
                {"role": "system", "content": "你是严谨的金融研究助手，只基于给定材料总结。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )

    if not text:
        # 无 LLM 时退化为结构化摘录（仍不编造）
        lines = [f"【{kind_label} · {v}】（本地摘录，未调用大模型）", ""]
        for it in items[:12]:
            badge = "演示" if it.get("is_demo") else it.get("source")
            lines.append(f"· ({badge}/{it['scope']}) {it['title']}")
            lines.append(f"  {it['summary'][:200]}")
        text = "\n".join(lines)

    return {
        "success": True,
        "kind": kind,
        "vertical": v,
        "based_on": len(items),
        "brief": text,
    }
