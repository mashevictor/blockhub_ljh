"""通用 CRM Webhook Adapter：HMAC 验签入站 + 事件落库。"""

from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from app.db.models import IntegrationEvent
from app.services.connectors.base import BaseConnectorAdapter, SyncResult


def verify_hmac_signature(
    *,
    secret: str,
    body: bytes,
    signature_header: str | None,
    prefix: str = "sha256=",
) -> bool:
    if not secret:
        return True  # 未配置密钥时允许（开发联调）；生产应配置
    if not signature_header:
        return False
    sig = signature_header.strip()
    if sig.startswith(prefix):
        sig = sig[len(prefix) :]
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, sig)


class CrmWebhookAdapter(BaseConnectorAdapter):
    vendor = "generic_crm"

    def test_connection(self) -> tuple[bool, str]:
        # CRM Webhook 入站型：配置完整即视为可同步（统计未处理事件）
        return True, "crm_webhook_ready"

    def extract(self) -> list[dict[str, Any]]:
        """手动 sync：从 config.pending_records 或 watermark 队列取样本（联调/重放）。"""
        pending = self.config.get("pending_records")
        if isinstance(pending, list) and pending:
            return [r for r in pending if isinstance(r, dict)]
        # 无待处理则返回空（真实条数由 load 时查库补齐；此处让 sync 读库）
        return []

    def load(self, records: list[dict[str, Any]], *, context: dict[str, Any]) -> SyncResult:
        db = context["db"]
        tenant_id = context["tenant_id"]
        connector_id = context["connector_id"]
        errors: list[str] = []
        synced = 0

        # 若 extract 为空：把本连接器最近未处理 ingress 事件标记为已处理（replay/ack）
        if not records:
            pending_rows = (
                db.query(IntegrationEvent)
                .filter(
                    IntegrationEvent.tenant_id == tenant_id,
                    IntegrationEvent.connector_id == connector_id,
                    IntegrationEvent.status == "pending",
                )
                .order_by(IntegrationEvent.created_at.asc())
                .limit(100)
                .all()
            )
            for ev in pending_rows:
                ev.status = "processed"
                db.add(ev)
                synced += 1
            if synced:
                db.commit()
            return SyncResult(
                records_synced=synced,
                details={"mode": "ack_pending_events", "acked": synced},
            )

        for row in records:
            try:
                external_id = str(row.get("id") or row.get("external_id") or "")[:64]
                # 幂等：同 connector + external_id 已存在则跳过
                if external_id:
                    exists = (
                        db.query(IntegrationEvent)
                        .filter(
                            IntegrationEvent.connector_id == connector_id,
                            IntegrationEvent.external_id == external_id,
                        )
                        .first()
                    )
                    if exists:
                        continue
                ev = IntegrationEvent(
                    tenant_id=tenant_id,
                    connector_id=connector_id,
                    event_type=str(row.get("type") or row.get("event_type") or "crm.upsert")[:64],
                    external_id=external_id,
                    payload_json=row,
                    status="pending",
                )
                db.add(ev)
                synced += 1
            except Exception as exc:  # noqa: BLE001
                errors.append(str(exc))
        db.commit()
        # 清空已消费 pending_records
        if self.config.get("pending_records") and synced and not errors:
            self.config["pending_records"] = []
            conn = context.get("connector")
            if conn is not None:
                cfg = dict(conn.config_json or {})
                cfg["pending_records"] = []
                conn.config_json = cfg
                db.add(conn)
                db.commit()
        return SyncResult(records_synced=synced, errors=errors, details={"mode": "load_records"})

    def ingest_raw(
        self,
        *,
        body: bytes,
        signature: str | None,
        context: dict[str, Any],
    ) -> SyncResult:
        secret = str((self.config.get("auth") or {}).get("webhook_secret") or self.config.get("webhook_secret") or "")
        if not verify_hmac_signature(secret=secret, body=body, signature_header=signature):
            return SyncResult(errors=["invalid_hmac_signature"])
        try:
            payload = json.loads(body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return SyncResult(errors=["invalid_json"])
        if isinstance(payload, list):
            records = [r for r in payload if isinstance(r, dict)]
        elif isinstance(payload, dict):
            if isinstance(payload.get("items"), list):
                records = [r for r in payload["items"] if isinstance(r, dict)]
            else:
                records = [payload]
        else:
            return SyncResult(errors=["unsupported_payload"])
        mapped = self.map(records)
        return self.load(mapped, context=context)
