#!/usr/bin/env python3
"""冒烟：验证 LLM_*（意图）与 CODEGEN_*（智能出页）OpenAI 兼容接口是否可用。

用法（服务器）:
  cd ~/blockhub/backend
  .venv/bin/python ../scripts/smoke-llm-providers.py

不打印完整 API Key；失败时打印 HTTP 状态与短错误。
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

# pydantic Settings 的 env_file=".env" 相对 cwd；强制在 backend 下读
import os

os.chdir(BACKEND)

from app.core.config import settings  # noqa: E402
from app.services.llm_gateway import (  # noqa: E402
    codegen_provider_label,
    intent_provider_label,
    _codegen_endpoint,
    _intent_endpoint,
)


def _mask(key: str) -> str:
    k = (key or "").strip()
    if len(k) <= 8:
        return "***"
    return f"{k[:4]}...{k[-4:]} (len={len(k)})"


def _post(label: str, key: str, base: str, model: str, timeout: int) -> int:
    url = f"{base.rstrip('/')}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "只回复两个字母：ok"},
        ],
        "temperature": 0.1,
        "max_tokens": 16,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    print(f"-> {label}")
    print(f"  model={model}")
    print(f"  base={base}")
    print(f"  key={_mask(key)}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            text = str(data["choices"][0]["message"]["content"]).strip()
            print(f"  OK HTTP {resp.status} reply={text[:80]!r}")
            return 0
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="ignore")[:400]
        print(f"  FAIL HTTP {e.code}: {raw}")
        if e.code == 429:
            print("  hint: quota/QPS — check Zhipu console")
        if e.code in (401, 403):
            print("  hint: bad key — check LLM_API_KEY / CODEGEN_API_KEY")
        return 1
    except Exception as e:  # noqa: BLE001
        print(f"  FAIL {type(e).__name__}: {e}")
        return 1


def main() -> int:
    fail = 0
    print("=== LLM / CODEGEN smoke ===")
    print(f"intent_provider={intent_provider_label()}")
    print(f"codegen_provider={codegen_provider_label()}")

    if not (settings.llm_api_key or "").strip() and not (settings.codegen_api_key or "").strip():
        print("FAIL: missing LLM_API_KEY / CODEGEN_API_KEY in backend/.env")
        return 1

    if (settings.llm_api_key or "").strip() or (settings.llm_model or "").strip():
        key, base, model, timeout = _intent_endpoint()
        if not key or not base or not model:
            print("FAIL: incomplete LLM_* (API_KEY / BASE_URL / MODEL)")
            fail += 1
        else:
            fail += _post("intent (LLM_*)", key, base, model, timeout)
    else:
        print("- skip intent: LLM_* not set")

    key, base, model, timeout = _codegen_endpoint()
    if not key or not base or not model:
        print("FAIL: incomplete codegen endpoint")
        fail += 1
    else:
        fail += _post("codegen (CODEGEN_* or LLM_*)", key, base, model, timeout)

    print("")
    if fail:
        print(f"Result: FAIL ({fail})")
        return 1
    print("Result: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
