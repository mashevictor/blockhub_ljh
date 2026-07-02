from __future__ import annotations

import random
import re
import time
from dataclasses import dataclass

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE_RE = re.compile(r"^1[3-9]\d{9}$")

OTP_TTL_SECONDS = 300
_resend_cooldown = 60


@dataclass
class OtpEntry:
    code: str
    expires_at: float
    sent_at: float


_store: dict[str, OtpEntry] = {}


def detect_account_type(account: str) -> str:
    cleaned = account.strip().replace(" ", "")
    if EMAIL_RE.match(cleaned):
        return "email"
    if PHONE_RE.match(cleaned):
        return "phone"
    raise ValueError("请输入有效邮箱或 11 位手机号")


def normalize_account(account: str, account_type: str) -> str:
    cleaned = account.strip().replace(" ", "")
    if account_type == "email":
        return cleaned.lower()
    return cleaned


def _store_key(account_type: str, account: str) -> str:
    return f"{account_type}:{account}"


def issue_otp(account_type: str, account: str) -> tuple[str, int]:
    key = _store_key(account_type, account)
    now = time.time()
    existing = _store.get(key)
    if existing and now - existing.sent_at < _resend_cooldown:
        wait = int(_resend_cooldown - (now - existing.sent_at))
        raise ValueError(f"请 {wait} 秒后再获取验证码")

    code = f"{random.randint(0, 999999):06d}"
    _store[key] = OtpEntry(code=code, expires_at=now + OTP_TTL_SECONDS, sent_at=now)
    return code, OTP_TTL_SECONDS


def verify_otp(account_type: str, account: str, code: str) -> bool:
    key = _store_key(account_type, account)
    entry = _store.get(key)
    if not entry:
        return False
    if time.time() > entry.expires_at:
        _store.pop(key, None)
        return False
    if entry.code != code.strip():
        return False
    _store.pop(key, None)
    return True
