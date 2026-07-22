# -*- coding: utf-8 -*-
"""聚合收款网关抽象。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class CheckoutRequest:
    order_id: str
    amount_fen: int
    subject: str
    notify_url: str
    return_url: str
    payer_user_id: str = ""


@dataclass
class CheckoutResult:
    provider_order_no: str
    pay_url: str
    raw: dict[str, Any]


@dataclass
class NotifyResult:
    ok: bool
    order_id: str
    provider_order_no: str
    amount_fen: int | None
    paid: bool
    raw: dict[str, Any]
    message: str = ""


class AggPayGateway(Protocol):
    def configured(self) -> bool: ...

    def create_checkout(self, req: CheckoutRequest) -> CheckoutResult: ...

    def verify_notify(self, payload: dict[str, Any], headers: dict[str, str] | None = None) -> NotifyResult: ...
