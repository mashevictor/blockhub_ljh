"""ERP Adapter 接口骨架（按签约再接金蝶/用友具体实现）。

产品集成页可依赖本协议；无签约时仅保留 field_map 文档级对接。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class ErpSyncResult:
    ok: bool
    external_id: str | None = None
    message: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


class ErpAdapter(Protocol):
    """金蝶 / 用友等 ERP 出站适配器最小协议。"""

    vendor: str  # "kingdee" | "yonyou" | ...

    def test_connection(self) -> ErpSyncResult:
        ...

    def push_record(self, entity: str, payload: dict[str, Any]) -> ErpSyncResult:
        ...

    def pull_records(self, entity: str, *, since: str | None = None) -> list[dict[str, Any]]:
        ...


@dataclass
class StubErpAdapter:
    """本地占位：不落外部系统，便于联调编排。"""

    vendor: str = "stub"

    def test_connection(self) -> ErpSyncResult:
        return ErpSyncResult(ok=True, message="stub ok")

    def push_record(self, entity: str, payload: dict[str, Any]) -> ErpSyncResult:
        return ErpSyncResult(
            ok=True,
            external_id=f"stub-{entity}",
            message="accepted (no remote)",
            raw={"entity": entity, "payload": payload},
        )

    def pull_records(self, entity: str, *, since: str | None = None) -> list[dict[str, Any]]:
        return []
