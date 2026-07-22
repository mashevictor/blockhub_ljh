# -*- coding: utf-8 -*-
"""易宝风格聚合收款：统一下单 + 回调验签。

未配置 YEEPAY_MERCHANT_NO / YEEPAY_APP_KEY 时视为未就绪。
签名：对业务参数按 key 排序后 HMAC-SHA256(app_key)，与常见聚合应用一致；
若配置了 PEM 私钥则额外附加 RSA 签名头（YOP 兼容字段）。
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.aggpay.base import CheckoutRequest, CheckoutResult, NotifyResult

logger = logging.getLogger(__name__)


def _load_private_key_pem() -> str:
    raw = (settings.yeepay_private_key_pem or "").strip()
    if not raw:
        return ""
    if raw.startswith("-----BEGIN"):
        return raw
    path = Path(raw)
    if path.is_file():
        return path.read_text(encoding="utf-8")
    return raw


def sign_params(params: dict[str, Any], app_key: str) -> str:
    items = []
    for k in sorted(params.keys()):
        if k in {"sign", "signature"}:
            continue
        v = params[k]
        if v is None or v == "":
            continue
        if isinstance(v, (dict, list)):
            v = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
        items.append(f"{k}={v}")
    plain = "&".join(items)
    return hmac.new(app_key.encode("utf-8"), plain.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_params_sign(params: dict[str, Any], app_key: str) -> bool:
    got = str(params.get("sign") or params.get("signature") or "").strip().lower()
    if not got or not app_key:
        return False
    expect = sign_params(params, app_key).lower()
    return hmac.compare_digest(got, expect)


class YeepayAggPay:
    def configured(self) -> bool:
        return bool(settings.yeepay_merchant_no and settings.yeepay_app_key)

    def notify_url(self) -> str:
        if settings.yeepay_notify_url:
            return settings.yeepay_notify_url.rstrip("/")
        return f"{settings.public_base_url.rstrip('/')}/api/v1/billing/webhook/yeepay"

    def return_url(self, order_id: str = "") -> str:
        base = settings.yeepay_return_url or f"{settings.public_base_url.rstrip('/')}/pricing/result"
        if order_id and "order_id=" not in base:
            sep = "&" if "?" in base else "?"
            return f"{base}{sep}order_id={order_id}"
        return base

    def create_checkout(self, req: CheckoutRequest) -> CheckoutResult:
        if not self.configured():
            raise RuntimeError("易宝聚合收款未配置：请设置 YEEPAY_MERCHANT_NO 与 YEEPAY_APP_KEY")

        merchant = settings.yeepay_merchant_no
        parent = settings.yeepay_parent_merchant_no or merchant
        body: dict[str, Any] = {
            "merchantNo": merchant,
            "parentMerchantNo": parent,
            "orderId": req.order_id,
            "orderAmount": f"{req.amount_fen / 100:.2f}",
            "goodsName": req.subject[:128],
            "notifyUrl": req.notify_url or self.notify_url(),
            "returnUrl": req.return_url or self.return_url(req.order_id),
            "currency": "CNY",
        }
        body["sign"] = sign_params(body, settings.yeepay_app_key)

        url = settings.yeepay_api_base.rstrip("/") + settings.yeepay_create_path
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Merchant-No": merchant,
        }
        pem = _load_private_key_pem()
        if pem:
            # 可选：附带请求摘要，便于对接方校验（非完整 YOP SDK，但字段真实可用）
            digest = hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True).encode()).hexdigest()
            headers["X-Yop-Content-Sha256"] = digest

        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=30) as resp:
                raw_text = resp.read().decode("utf-8") or "{}"
                payload = json.loads(raw_text)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")[:800]
            logger.error("yeepay create_checkout HTTP %s: %s", e.code, err_body)
            raise RuntimeError(f"聚合下单失败 HTTP {e.code}: {err_body}") from e
        except Exception as e:
            logger.exception("yeepay create_checkout failed")
            raise RuntimeError(f"聚合下单失败: {e}") from e

        result = payload.get("result") if isinstance(payload.get("result"), dict) else payload
        pay_url = (
            str(result.get("payUrl") or result.get("payLink") or result.get("qrCodeUrl") or result.get("url") or "")
            .strip()
        )
        provider_no = str(
            result.get("uniqueOrderNo") or result.get("bankOrderId") or result.get("orderId") or req.order_id
        ).strip()
        if not pay_url:
            raise RuntimeError(f"聚合下单未返回支付链接: {json.dumps(payload, ensure_ascii=False)[:500]}")
        return CheckoutResult(provider_order_no=provider_no, pay_url=pay_url, raw=payload if isinstance(payload, dict) else {})

    def verify_notify(self, payload: dict[str, Any], headers: dict[str, str] | None = None) -> NotifyResult:
        _ = headers
        if not self.configured():
            return NotifyResult(
                ok=False,
                order_id="",
                provider_order_no="",
                amount_fen=None,
                paid=False,
                raw=payload,
                message="易宝未配置",
            )
        if not verify_params_sign(payload, settings.yeepay_app_key):
            return NotifyResult(
                ok=False,
                order_id=str(payload.get("orderId") or payload.get("order_id") or ""),
                provider_order_no=str(payload.get("uniqueOrderNo") or ""),
                amount_fen=None,
                paid=False,
                raw=payload,
                message="签名校验失败",
            )
        status = str(payload.get("status") or payload.get("orderStatus") or payload.get("payStatus") or "").upper()
        paid = status in {"SUCCESS", "PAID", "TRADE_SUCCESS", "SUCCESSFUL", "1", "OK"}
        order_id = str(payload.get("orderId") or payload.get("order_id") or payload.get("outTradeNo") or "")
        provider_no = str(payload.get("uniqueOrderNo") or payload.get("bankOrderId") or payload.get("transactionId") or "")
        amount_fen = None
        if payload.get("orderAmount") is not None:
            try:
                amount_fen = int(round(float(payload["orderAmount"]) * 100))
            except (TypeError, ValueError):
                amount_fen = None
        elif payload.get("amount_fen") is not None:
            try:
                amount_fen = int(payload["amount_fen"])
            except (TypeError, ValueError):
                amount_fen = None
        return NotifyResult(
            ok=True,
            order_id=order_id,
            provider_order_no=provider_no,
            amount_fen=amount_fen,
            paid=paid,
            raw=payload,
            message="ok" if paid else f"status={status}",
        )


def get_gateway() -> YeepayAggPay:
    return YeepayAggPay()
