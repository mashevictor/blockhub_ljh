"""connector_type + vendor → Adapter。"""

from __future__ import annotations

from typing import Any

from app.services.connectors.adapters.crm_webhook import CrmWebhookAdapter
from app.services.connectors.adapters.im_webhook import ImWebhookAdapter
from app.services.connectors.base import BaseConnectorAdapter


def resolve_adapter(connector_type: str, config: dict[str, Any] | None = None) -> BaseConnectorAdapter:
    cfg = dict(config or {})
    vendor = str(cfg.get("vendor") or connector_type or "webhook").lower()
    ctype = (connector_type or "webhook").lower()

    if ctype in ("wecom", "dingtalk", "feishu") or vendor in ("wecom", "dingtalk", "feishu"):
        return ImWebhookAdapter({**cfg, "vendor": vendor if vendor in ("wecom", "dingtalk", "feishu") else ctype})

    if ctype in ("webhook", "crm", "api") or vendor in ("crm", "generic_crm", "webhook"):
        return CrmWebhookAdapter({**cfg, "vendor": cfg.get("vendor") or "generic_crm"})

    # database / file 等尚未厂商实现：仍走 CRM 通用（配置 queues）以保证 sync 非纯假数
    return CrmWebhookAdapter({**cfg, "vendor": vendor or "generic"})
