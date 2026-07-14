"""BaseConnectorAdapter — extract → map → load（P4-I1）。"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SyncResult:
    records_synced: int = 0
    errors: list[str] = field(default_factory=list)
    details: dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return len(self.errors) == 0


class BaseConnectorAdapter(ABC):
    """厂商 Adapter 基类。config 约定：vendor / auth / field_map / tables / sync_mode / watermark。"""

    vendor: str = "generic"

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = dict(config or {})

    def test_connection(self) -> tuple[bool, str]:
        """探测连通性；默认仅检查配置完整性。"""
        return True, "ok"

    @abstractmethod
    def extract(self) -> list[dict[str, Any]]:
        """拉取外部记录（或从本地待处理队列）。"""

    def map(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """按 field_map 做字段映射。"""
        fmap: dict[str, str] = self.config.get("field_map") or {}
        if not fmap:
            return records
        out: list[dict[str, Any]] = []
        for row in records:
            mapped: dict[str, Any] = {}
            for src, dst in fmap.items():
                if src in row:
                    mapped[dst] = row[src]
            # 保留未映射字段（加前缀避免覆盖）
            for k, v in row.items():
                if k not in fmap and k not in mapped:
                    mapped[k] = v
            out.append(mapped)
        return out

    @abstractmethod
    def load(self, records: list[dict[str, Any]], *, context: dict[str, Any]) -> SyncResult:
        """写入业务库 / 事件表。context 含 db、tenant_id、connector_id。"""

    def run_sync(self, *, context: dict[str, Any]) -> SyncResult:
        ok, msg = self.test_connection()
        if not ok:
            return SyncResult(errors=[msg])
        try:
            raw = self.extract()
            mapped = self.map(raw)
            return self.load(mapped, context=context)
        except Exception as exc:  # noqa: BLE001 — 同步任务需完整错误进 result_json
            return SyncResult(errors=[str(exc)])
