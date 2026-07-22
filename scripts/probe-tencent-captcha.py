# -*- coding: utf-8 -*-
"""一次性探测：CaptchaAppId + AppSecretKey 是否被腾讯云接受（勿提交密钥）。"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

# 从 backend/.env 装载（不打印值）
env_path = ROOT / "backend" / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

from app.services.tencent_api import tc3_json_request  # noqa: E402

APP_ID = int(os.environ.get("TENCENT_CAPTCHA_APP_ID") or "194728032")
APP_SECRET = (
    os.environ.get("TENCENT_CAPTCHA_APP_SECRET_KEY")
    or os.environ.get("CAPTCHA_TEST_SECRET")
    or ""
).strip()
SECRET_ID = (os.environ.get("TENCENT_SECRET_ID") or os.environ.get("COS_SECRET_ID") or "").strip()
SECRET_KEY = (os.environ.get("TENCENT_SECRET_KEY") or os.environ.get("COS_SECRET_KEY") or "").strip()

# 允许命令行传入本次要测的 AppSecretKey（不写盘）
if len(sys.argv) > 1:
    APP_SECRET = sys.argv[1].strip()

print(f"CaptchaAppId={APP_ID}")
print(f"AppSecretKey_len={len(APP_SECRET)}")
print(f"CAM_configured={bool(SECRET_ID and SECRET_KEY)}")

if not APP_SECRET:
    print("FAIL: missing AppSecretKey")
    sys.exit(2)
if not SECRET_ID or not SECRET_KEY:
    print("FAIL: missing TENCENT_SECRET_ID/COS_SECRET_ID for API signing")
    sys.exit(3)

# 用明显无效的 ticket 打 DescribeCaptchaResult：
# - 密钥/AppId 配对正确时，通常返回 CaptchaCode!=1 + CaptchaMsg（如 ticket 错误）
# - AppSecretKey 错误时，常见 CaptchaCode=7 / 提示密钥错误
payload = {
    "CaptchaType": 9,
    "Ticket": "blockhub-probe-invalid-ticket",
    "UserIp": "127.0.0.1",
    "Randstr": "@probe",
    "CaptchaAppId": APP_ID,
    "AppSecretKey": APP_SECRET,
}

try:
    resp = tc3_json_request(
        secret_id=SECRET_ID,
        secret_key=SECRET_KEY,
        service="captcha",
        host="captcha.tencentcloudapi.com",
        action="DescribeCaptchaResult",
        version="2019-07-22",
        payload=payload,
    )
except RuntimeError as e:
    print(f"API_ERROR: {e}")
    sys.exit(4)

code = resp.get("CaptchaCode")
msg = resp.get("CaptchaMsg")
print(f"CaptchaCode={code}")
print(f"CaptchaMsg={msg}")
print(f"EvilLevel={resp.get('EvilLevel')}")
print(f"RequestId={resp.get('RequestId')}")

# 腾讯云常见：7=AppSecretKey 错误；其它非1多为 ticket 无效（说明 AppId+Secret 已被接受）
try:
    code_i = int(code)
except (TypeError, ValueError):
    code_i = -999

if code_i == 7 or (isinstance(msg, str) and ("密钥" in msg or "Secret" in msg or "secret" in msg.lower())):
    print("VERDICT: AppSecretKey 很可能不正确")
    sys.exit(1)
if code_i == 1:
    print("VERDICT: 意外通过（探测 ticket 不应通过）")
    sys.exit(1)

print("VERDICT: AppId+AppSecretKey 可被接口接受（本次失败来自无效 ticket，属预期）")
sys.exit(0)
