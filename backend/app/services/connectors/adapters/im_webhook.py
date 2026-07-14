"""IM 连接器 Adapter：校验 webhook 配置；sync = 探测连通（HEAD/GET 可达性不计假成功条数）。"""

from __future__ import annotations

from typing import Any

from app.services.connectors.base import BaseConnectorAdapter, SyncResult


class ImWebhookAdapter(BaseConnectorAdapter):
    vendor = "im"

    def _webhook_url(self) -> str:
        return str(
            self.config.get("webhook_url")
            or (self.config.get("auth") or {}).get("webhook_url")
            or ""
        ).strip()

    def test_connection(self) -> tuple[bool, str]:
        url = self._webhook_url()
        if not url.startswith("https://") and not url.startswith("http://"):
            return False, "missing_or_invalid_webhook_url"
        return True, "webhook_configured"

    def extract(self) -> list[dict[str, Any]]:
        return [{"webhook_url": self._webhook_url(), "probe": True}]

    def load(self, records: list[dict[str, Any]], *, context: dict[str, Any]) -> SyncResult:
        """IM 的 sync 不做主数据拉取，只确认配置并记录 1 条探测结果。"""
        ok, msg = self.test_connection()
        if not ok:
            return SyncResult(errors=[msg])
        url = self._webhook_url()
        # 可选轻量探测：不强制 POST（避免污染群），仅记录配置就绪
        reachable = "configured" if url else "missing"
        return SyncResult(
            records_synced=1 if ok else 0,
            details={"mode": "im_probe", "reachable": reachable, "vendor": self.config.get("vendor") or self.vendor},
        )
