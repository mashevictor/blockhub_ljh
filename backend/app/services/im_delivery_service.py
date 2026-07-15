"""企业 IM 出站：企微 / 钉钉 / 飞书群机器人（P4-I2）+ 可点回 Runtime 深链。"""

from __future__ import annotations

import json
import logging
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import IntegrationConnector

logger = logging.getLogger(__name__)

IM_TYPES = frozenset({"wecom", "dingtalk", "feishu"})


def runtime_detail_url(app_public_id: str = "", *, path: str = "/device-repair") -> str:
    """浏览器/飞书/钉钉内可打开的 Runtime 深链。"""
    base = (settings.public_base_url or "").rstrip("/") or "http://127.0.0.1:5173"
    app_id = (app_public_id or "").strip()
    route = path if path.startswith("/") else f"/{path}"
    if not app_id:
        return base
    # 本地开发时 PUBLIC_BASE_URL 常是生产机；仍拼 /r/{id}，演示机与生产一致
    return f"{base}/r/{app_id}{route}"


def _webhook_url(cfg: dict[str, Any]) -> str:
    return str(cfg.get("webhook_url") or (cfg.get("auth") or {}).get("webhook_url") or "").strip()


def _compose_body(content: str, detail_url: str = "", link_label: str = "查看详情") -> str:
    text = (content or "").strip()
    url = (detail_url or "").strip()
    if not url:
        return text
    link_line = f"\n\n[{link_label}]({url})"
    if url in text:
        return text
    return f"{text}{link_line}"


def _build_payload(
    vendor: str,
    title: str,
    content: str,
    *,
    detail_url: str = "",
    link_label: str = "查看详情",
) -> dict[str, Any]:
    body = _compose_body(content, detail_url, link_label)
    v = vendor.lower()
    url = (detail_url or "").strip()

    if v == "dingtalk":
        return {
            "msgtype": "markdown",
            "markdown": {
                "title": title[:64] or "积木仓通知",
                "text": f"### {title}\n\n{body}",
            },
        }

    if v == "feishu":
        elements: list[dict[str, Any]] = [
            {"tag": "div", "text": {"tag": "lark_md", "content": body.replace("\n\n[", "\n[")}},
        ]
        if url:
            elements.append(
                {
                    "tag": "action",
                    "actions": [
                        {
                            "tag": "button",
                            "text": {"tag": "plain_text", "content": link_label},
                            "type": "primary",
                            "url": url,
                        }
                    ],
                }
            )
        return {
            "msg_type": "interactive",
            "card": {
                "header": {"title": {"tag": "plain_text", "content": title[:64] or "积木仓通知"}},
                "elements": elements,
            },
        }

    # 企微群机器人 markdown（支持链接）
    return {"msgtype": "markdown", "markdown": {"content": f"**{title}**\n{body}"}}


def _post_json(url: str, payload: dict[str, Any], timeout: float = 8.0) -> tuple[bool, str]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return True, body[:500]
    except HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")[:300]
        return False, f"http_{exc.code}:{err}"
    except URLError as exc:
        return False, f"network:{exc.reason}"
    except Exception as exc:  # noqa: BLE001
        return False, str(exc)


def list_im_connectors(db: Session, tenant_id: str) -> list[IntegrationConnector]:
    # 解耦：推送前先按环境变量补齐 connector（不挡 UI 手填通道）
    try:
        from app.services.im_env_bootstrap import ensure_env_im_connectors

        ensure_env_im_connectors(db, tenant_id=tenant_id)
    except Exception:  # noqa: BLE001
        logger.exception("IM env bootstrap failed tenant=%s", tenant_id)

    rows = (
        db.query(IntegrationConnector)
        .filter(
            IntegrationConnector.tenant_id == tenant_id,
            IntegrationConnector.status == "active",
        )
        .all()
    )
    out: list[IntegrationConnector] = []
    for c in rows:
        ctype = (c.connector_type or "").lower()
        cfg = c.config_json if isinstance(c.config_json, dict) else {}
        vendor = str(cfg.get("vendor") or ctype).lower()
        if ctype in IM_TYPES or vendor in IM_TYPES:
            if _webhook_url(cfg):
                out.append(c)
    return out


def deliver_im_message(
    db: Session,
    *,
    tenant_id: str,
    title: str,
    content: str,
    connector_id: str | None = None,
    detail_url: str = "",
    link_label: str = "查看详情",
) -> dict[str, Any]:
    """向租户已配置的 IM Webhook 推送。未配置时 status=skipped（不假装成功）。"""
    connectors = list_im_connectors(db, tenant_id)
    if connector_id:
        connectors = [c for c in connectors if c.id == connector_id]
    if not connectors:
        return {"status": "skipped", "reason": "no_im_webhook_configured", "delivered": 0, "results": []}

    results: list[dict[str, Any]] = []
    delivered = 0
    for c in connectors:
        cfg = c.config_json if isinstance(c.config_json, dict) else {}
        vendor = str(cfg.get("vendor") or c.connector_type or "wecom").lower()
        url = _webhook_url(cfg)
        payload = _build_payload(
            vendor,
            title,
            content,
            detail_url=detail_url,
            link_label=link_label,
        )
        ok, detail = _post_json(url, payload)
        results.append(
            {
                "connector_id": c.id,
                "vendor": vendor,
                "ok": ok,
                "detail": detail,
                "detail_url": detail_url or None,
            }
        )
        if ok:
            delivered += 1
        else:
            logger.warning("IM deliver failed connector=%s vendor=%s detail=%s", c.id, vendor, detail)

    status = "success" if delivered == len(connectors) else ("partial" if delivered else "failed")
    return {
        "status": status,
        "delivered": delivered,
        "total": len(connectors),
        "results": results,
        "detail_url": detail_url or None,
    }


def notify_business_event(
    db: Session,
    *,
    tenant_id: str,
    title: str,
    content: str,
    detail_url: str = "",
    app_public_id: str = "",
    path: str = "/device-repair",
    link_label: str = "打开应用查看",
) -> dict[str, Any]:
    """业务钩子入口：吞掉异常，不影响主流程。自动补 Runtime 深链。"""
    try:
        url = (detail_url or "").strip() or runtime_detail_url(app_public_id, path=path)
        return deliver_im_message(
            db,
            tenant_id=tenant_id,
            title=title,
            content=content,
            detail_url=url,
            link_label=link_label,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("IM notify failed: %s", exc)
        return {"status": "error", "reason": str(exc), "delivered": 0}
