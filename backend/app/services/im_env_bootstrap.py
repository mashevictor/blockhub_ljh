"""IM Webhook 解耦自动化：从环境变量写入 IntegrationConnector，不依赖 Runtime UI。

配置示例（backend/.env）：
  IM_WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…
  IM_AUTO_TENANT_SLUGS=demo

启动与 deliver 前会 upsert；UI 手填的通道保留（source!=env 不覆盖）。
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import IntegrationConnector, Tenant

logger = logging.getLogger(__name__)

ENV_SOURCE = "env"
_VENDOR_ENV = (
    ("wecom", "im_wecom_webhook_url", "环境·企业微信机器人"),
    ("dingtalk", "im_dingtalk_webhook_url", "环境·钉钉机器人"),
    ("feishu", "im_feishu_webhook_url", "环境·飞书机器人"),
)


def env_im_channel_specs() -> list[tuple[str, str, str]]:
    """[(vendor, webhook_url, display_name), ...] 仅含已配置 URL。"""
    out: list[tuple[str, str, str]] = []
    for vendor, attr, name in _VENDOR_ENV:
        url = (getattr(settings, attr, None) or "").strip()
        if url.startswith("http://") or url.startswith("https://"):
            out.append((vendor, url, name))
    return out


def _tenant_ids_for_auto(db: Session) -> list[str]:
    raw = (settings.im_auto_tenant_slugs or "demo").strip()
    if raw == "*":
        return [t.id for t in db.query(Tenant).all()]
    slugs = [s.strip() for s in raw.split(",") if s.strip()]
    if not slugs:
        slugs = ["demo"]
    rows = db.query(Tenant).filter(Tenant.slug.in_(slugs)).all()
    return [t.id for t in rows]


def _is_env_row(c: IntegrationConnector, vendor: str) -> bool:
    cfg = c.config_json if isinstance(c.config_json, dict) else {}
    if str(cfg.get("source") or "").lower() != ENV_SOURCE:
        return False
    v = str(cfg.get("vendor") or c.connector_type or "").lower()
    return v == vendor


def ensure_env_im_connectors(db: Session, tenant_id: str | None = None) -> int:
    """按环境变量 upsert IM connector。返回新建或更新条数。"""
    specs = env_im_channel_specs()
    if not specs:
        return 0

    if tenant_id:
        tenant_ids = [tenant_id]
    else:
        tenant_ids = _tenant_ids_for_auto(db)
    if not tenant_ids:
        return 0

    changed = 0
    for tid in tenant_ids:
        existing = (
            db.query(IntegrationConnector)
            .filter(IntegrationConnector.tenant_id == tid)
            .all()
        )
        for vendor, url, name in specs:
            row = next((c for c in existing if _is_env_row(c, vendor)), None)
            cfg: dict[str, Any] = {
                "source": ENV_SOURCE,
                "vendor": vendor,
                "channel": vendor,
                "webhook_url": url,
                "managed": True,
            }
            if row is None:
                row = IntegrationConnector(
                    tenant_id=tid,
                    name=name,
                    connector_type=vendor,
                    config_json=cfg,
                    status="active",
                )
                db.add(row)
                existing.append(row)
                changed += 1
                logger.info("IM env connector created tenant=%s vendor=%s", tid, vendor)
            else:
                prev = row.config_json if isinstance(row.config_json, dict) else {}
                if (
                    prev.get("webhook_url") != url
                    or row.status != "active"
                    or row.connector_type != vendor
                    or row.name != name
                ):
                    row.config_json = cfg
                    row.connector_type = vendor
                    row.name = name
                    row.status = "active"
                    changed += 1
                    logger.info("IM env connector updated tenant=%s vendor=%s", tid, vendor)
    if changed:
        db.commit()
    return changed
