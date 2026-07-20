#!/usr/bin/env bash
# 邮件模板本地渲染 + 可选试发
#
# 用法:
#   bash scripts/smoke-email-templates.sh
#   bash scripts/smoke-email-templates.sh --send you@example.com
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
export PYTHONPATH=.
export OUT_DIR="$ROOT/docs/email-preview"
mkdir -p "$OUT_DIR"

python3 <<'PY'
import os
import sys
from pathlib import Path

sys.path.insert(0, ".")

from app.services.publish_email import _build_html, _build_text
from app.services.booking_email import build_booking_email_html, build_booking_email_text

out = Path(os.environ["OUT_DIR"]).resolve()
out.mkdir(parents=True, exist_ok=True)

app_name = "示例智能门店助手"
web = "https://blockhub.club/r/demo123"
dl = "https://blockhub.club/api/v1/runtime/demo123/download"
scenarios = ["智能问答", "请假审批", "知识库"]

pub_html = _build_html(
    recipient_name="老刘",
    app_name=app_name,
    deliver="both",
    web_url=web,
    download_url=dl,
    scenarios=scenarios,
    apk_attached=False,
)
pub_text = _build_text(
    recipient_name="老刘",
    app_name=app_name,
    deliver="both",
    web_url=web,
    download_url=dl,
    scenarios=scenarios,
    apk_attached=False,
)
(out / "publish_delivery.html").write_text(pub_html, encoding="utf-8")
(out / "publish_delivery.txt").write_text(pub_text, encoding="utf-8")

share = "https://blockhub.club/share/demoToken12"
summary = (
    "① 贵司关注的销售与服务响应场景，可与积木仓方案匹配。\n"
    "② 同行业试点：平均首响约 28 分钟，一线采纳率 72%。\n"
    "③ 建议信息部门同事查看安全与对接说明。"
)
book_html = build_booking_email_html(
    salutation="王总",
    company_name="示例制造有限公司",
    summary=summary,
    share_url=share,
)
book_text = build_booking_email_text(
    salutation="王总",
    company_name="示例制造有限公司",
    summary=summary,
    share_url=share,
)
(out / "booking_delivery.html").write_text(book_html, encoding="utf-8")
(out / "booking_delivery.txt").write_text(book_text, encoding="utf-8")

print("OK wrote:")
for p in sorted(out.glob("*delivery.*")):
    print(" ", p, "bytes=", p.stat().st_size)

assert "#0F172A" in pub_html
assert "#d4af37" not in pub_html.lower()
assert "打开网页版" in pub_html
assert "不随信附带" in pub_html or "不附带" in pub_html
assert "打开专属演示资料包" in book_html
print("assert: light B2B template OK")
PY

if [[ "${1:-}" == "--send" ]]; then
  export TO="${2:?need recipient email}"
  echo "Trying live send to $TO ..."
  python3 <<'PY'
import os
import sys

sys.path.insert(0, ".")
from app.services.publish_email import send_publish_delivery_email
from app.services.booking_email import send_booking_delivery_email
from app.services.email_service import smtp_configured

if not smtp_configured():
    print("FAIL: SMTP not configured (SMTP_ENABLED + SMTP_USER + SMTP_PASSWORD in backend/.env)")
    raise SystemExit(2)

to = os.environ["TO"]
ok1 = send_publish_delivery_email(
    to,
    {
        "id": "smokeemail",
        "name": "邮件冒烟应用",
        "web_url": "https://blockhub.club/r/smokeemail",
        "download_url": "https://blockhub.club/api/v1/runtime/smokeemail/download",
        "deliver": "both",
        "scenarios": ["智能问答", "审批"],
    },
)
ok2 = send_booking_delivery_email(
    to=to,
    salutation="测试",
    company_name="冒烟公司",
    summary="① 这是冒烟摘要一行。\n② 第二行。\n③ 第三行。",
    share_url="https://blockhub.club/share/smoketest01",
)
print("publish_sent=", ok1, "booking_sent=", ok2)
raise SystemExit(0 if ok1 and ok2 else 1)
PY
fi

echo "Preview: open docs/email-preview/publish_delivery.html and booking_delivery.html"
