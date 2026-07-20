"""截图压缩：本地 Pillow 降分辨率 + TinyPNG（有 Key 时）再压。"""

from __future__ import annotations

import base64
import io
import json
import re
import urllib.error
import urllib.request
from typing import Any

from PIL import Image

from app.core.config import settings

_DATA_URL_RE = re.compile(r"^data:(image/[\w+.-]+);base64,(.+)$", re.I | re.S)


def _tinypng_key() -> str:
    # 兼容 TINYPNG_API_KEY / TINIFY_API_KEY（历史脚本用后者）
    return (
        settings.tinypng_api_key or getattr(settings, "tinify_api_key", "") or ""
    ).strip()


def tinypng_configured() -> bool:
    return bool(_tinypng_key())


def decode_image_bytes(raw: str) -> bytes | None:
    s = (raw or "").strip()
    if not s:
        return None
    if s.startswith("http://") or s.startswith("https://"):
        try:
            req = urllib.request.Request(s, method="GET")
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError, OSError):
            return None
    m = _DATA_URL_RE.match(s)
    if m:
        try:
            return base64.b64decode(re.sub(r"\s+", "", m.group(2)))
        except Exception:
            return None
    if re.fullmatch(r"[A-Za-z0-9+/=\s]+", s) and len(s) > 64:
        try:
            return base64.b64decode(re.sub(r"\s+", "", s))
        except Exception:
            return None
    return None


def local_compress(
    data: bytes,
    *,
    max_edge: int = 960,
    quality: int = 55,
) -> bytes:
    """强制缩边 + JPEG，显著减小上传体积。"""
    img = Image.open(io.BytesIO(data))
    if img.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        rgba = img.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        img = bg
    else:
        img = img.convert("RGB")
    w, h = img.size
    edge = max(w, h)
    if edge > max_edge:
        scale = max_edge / float(edge)
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=quality, optimize=True)
    return out.getvalue()


def tinypng_compress(data: bytes, *, max_edge: int = 960) -> bytes:
    """TinyPNG shrink + fit resize。失败抛异常。"""
    key = _tinypng_key()
    if not key:
        raise RuntimeError("TINYPNG_API_KEY 未配置")
    auth = "Basic " + base64.b64encode(f"api:{key}".encode("utf-8")).decode("ascii")
    shrink_req = urllib.request.Request(
        "https://api.tinify.com/shrink",
        data=data,
        headers={"Authorization": auth, "Content-Type": "application/octet-stream"},
        method="POST",
    )
    with urllib.request.urlopen(shrink_req, timeout=30) as resp:
        location = resp.headers.get("Location") or ""
        body = resp.read()
    if not location:
        try:
            meta: dict[str, Any] = json.loads(body.decode("utf-8")) if body else {}
            location = str((meta.get("output") or {}).get("url") or "")
        except json.JSONDecodeError:
            location = ""
    if not location:
        raise RuntimeError("TinyPNG 未返回 output Location")

    # 再 resize，进一步缩小（界面截图边长 960 足够识别）
    resize_payload = json.dumps(
        {"resize": {"method": "scale", "width": max_edge}}
    ).encode("utf-8")
    resize_req = urllib.request.Request(
        location,
        data=resize_payload,
        headers={
            "Authorization": auth,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(resize_req, timeout=30) as resp:
        return resp.read()


def compress_for_vision(raw: str) -> str:
    """输入 data URL / http URL，输出压缩后的 JPEG data URL。

    流程：本地强压 → 体积仍大时再 TinyPNG。已足够小则跳过 TinyPNG，避免多一轮网络延迟。
    """
    original = decode_image_bytes(raw)
    if not original:
        return raw
    try:
        local = local_compress(original, max_edge=960, quality=55)
    except Exception:
        return raw
    best = local
    # 本地已 <60KB 时 TinyPNG 收益极小，还会多 3~6s RTT，直接跳过
    if tinypng_configured() and len(local) >= 60_000:
        try:
            best = tinypng_compress(local, max_edge=960)
        except Exception:
            best = local
    b64 = base64.b64encode(best).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def compress_many(images: list[str]) -> list[str]:
    out: list[str] = []
    for u in images:
        if not isinstance(u, str) or not u.strip():
            continue
        out.append(compress_for_vision(u.strip()))
        if len(out) >= 3:
            break
    return out
