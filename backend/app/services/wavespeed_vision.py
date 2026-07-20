"""WaveSpeed.ai Any-LLM Vision — CapShip 截图理解。

API: POST https://api.wavespeed.ai/api/v3/wavespeed-ai/any-llm/vision
推荐模型（界面截图准确优先）: google/gemini-2.5-pro
更快更省: google/gemini-2.5-flash
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

from app.core.config import settings

SUBMIT_URL = "https://api.wavespeed.ai/api/v3/wavespeed-ai/any-llm/vision"
DEFAULT_VISION_MODEL = "google/gemini-2.5-flash"


class WaveSpeedVisionError(Exception):
    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


def wavespeed_configured() -> bool:
    return bool((settings.wavespeed_api_key or "").strip())


def _api_key() -> str:
    return (settings.wavespeed_api_key or "").strip()


def _model() -> str:
    return (settings.wavespeed_vision_model or DEFAULT_VISION_MODEL).strip() or DEFAULT_VISION_MODEL


def _request_json(url: str, *, method: str = "GET", payload: dict | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"Bearer {_api_key()}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    timeout = max(int(settings.wavespeed_timeout or 90), 30)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raw = ""
        try:
            raw = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass
        msg = raw
        try:
            parsed = json.loads(raw) if raw else {}
            msg = str(parsed.get("message") or parsed.get("error") or raw)
        except json.JSONDecodeError:
            pass
        low = msg.lower()
        if e.code == 403 and ("top-up" in low or "credit" in low or "充值" in msg):
            raise WaveSpeedVisionError(
                "WaveSpeed 账户余额不足，请到 wavespeed.ai 充值后再用截图识别"
            ) from e
        if e.code in (401, 403):
            raise WaveSpeedVisionError(f"WaveSpeed 鉴权失败（{e.code}）：{msg or e.reason}") from e
        raise WaveSpeedVisionError(f"WaveSpeed HTTP {e.code}：{msg or e.reason}") from e


def _unwrap(body: dict[str, Any]) -> dict[str, Any]:
    data = body.get("data")
    return data if isinstance(data, dict) else body


def _outputs_to_text(outputs: Any) -> str:
    if outputs is None:
        return ""
    if isinstance(outputs, str):
        return outputs.strip()
    if isinstance(outputs, list):
        parts: list[str] = []
        for item in outputs:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                for k in ("text", "content", "output", "message"):
                    if item.get(k):
                        parts.append(str(item[k]))
                        break
                else:
                    parts.append(json.dumps(item, ensure_ascii=False))
            else:
                parts.append(str(item))
        return "\n".join(p for p in parts if p).strip()
    if isinstance(outputs, dict):
        return _outputs_to_text(
            outputs.get("text") or outputs.get("content") or json.dumps(outputs, ensure_ascii=False)
        )
    return str(outputs).strip()


def describe_images(
    *,
    prompt: str,
    images: list[str],
    system_prompt: str = "",
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> str | None:
    """用 WaveSpeed Vision 看图。失败抛 WaveSpeedVisionError；未配置返回 None。"""
    if not wavespeed_configured():
        return None
    raw_imgs = [u.strip() for u in images if isinstance(u, str) and u.strip()][:3]
    if not raw_imgs or not (prompt or "").strip():
        return None

    # 先本地强压 + TinyPNG，再送识别（体积小 = 上传快 + 推理快）
    from app.services.image_compress import compress_many

    imgs = compress_many(raw_imgs)

    payload: dict[str, Any] = {
        "prompt": prompt.strip(),
        "images": imgs,
        "model": _model(),
        "priority": "latency",
        "reasoning": False,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "enable_sync_mode": True,
    }
    if (system_prompt or "").strip():
        payload["system_prompt"] = system_prompt.strip()

    try:
        body = _request_json(SUBMIT_URL, method="POST", payload=payload)
    except WaveSpeedVisionError:
        raise
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError) as e:
        raise WaveSpeedVisionError(f"WaveSpeed 请求失败：{e}") from e

    task = _unwrap(body)
    status = str(task.get("status") or "")
    if status == "completed":
        return _outputs_to_text(task.get("outputs")) or None
    if status in {"failed", "cancelled", "timeout"}:
        raise WaveSpeedVisionError(f"WaveSpeed 任务失败：{task.get('error') or status}")

    pred_id = str(task.get("id") or "").strip()
    if not pred_id:
        return _outputs_to_text(task.get("outputs")) or None

    result_url = ""
    urls = task.get("urls")
    if isinstance(urls, dict):
        result_url = str(urls.get("get") or "").strip()
    if not result_url:
        result_url = f"https://api.wavespeed.ai/api/v3/predictions/{pred_id}/result"

    deadline = time.monotonic() + max(int(settings.wavespeed_timeout or 60), 20)
    while time.monotonic() < deadline:
        time.sleep(0.4)
        try:
            result_body = _request_json(result_url, method="GET")
        except WaveSpeedVisionError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, ValueError):
            continue
        result = _unwrap(result_body)
        st = str(result.get("status") or "")
        if st == "completed":
            return _outputs_to_text(result.get("outputs")) or None
        if st in {"failed", "cancelled", "timeout"}:
            raise WaveSpeedVisionError(f"WaveSpeed 任务失败：{result.get('error') or st}")
    raise WaveSpeedVisionError("WaveSpeed 识别超时，请稍后重试")
