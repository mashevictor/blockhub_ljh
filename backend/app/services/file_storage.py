from __future__ import annotations

import base64
import re
from pathlib import Path

from app.core.config import settings


def uploads_root() -> Path:
    root = Path(settings.uploads_dir)
    if not root.is_absolute():
        root = Path(__file__).resolve().parents[2] / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def contract_dir(contract_id: str) -> Path:
    d = uploads_root() / "contracts" / contract_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_data_url(data_url: str, dest: Path) -> None:
    match = re.match(r"^data:image/(png|jpeg|jpg|webp);base64,(.+)$", data_url.strip(), re.I | re.S)
    if not match:
        raise ValueError("无效的图片 data URL，请使用 PNG/JPEG base64")
    raw = base64.b64decode(match.group(2))
    dest.write_bytes(raw)


def save_bytes(data: bytes, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)


def read_bytes(file_key: str) -> bytes:
    path = uploads_root() / file_key
    if not path.is_file():
        raise FileNotFoundError(file_key)
    return path.read_bytes()


def file_url(file_key: str) -> str:
    if not file_key:
        return ""
    return f"{settings.api_prefix}/contracts/files/{file_key}"


def app_icon_dir() -> Path:
    d = uploads_root() / "app-icons"
    d.mkdir(parents=True, exist_ok=True)
    return d


def creation_file_url(file_key: str) -> str:
    if not file_key:
        return ""
    return f"{settings.api_prefix}/creation/files/{file_key}"


def save_app_icon_data_url(data_url: str) -> str:
    from uuid import uuid4

    match = re.match(r"^data:image/(png|jpeg|jpg|webp);base64,(.+)$", data_url.strip(), re.I | re.S)
    if not match:
        raise ValueError("无效的图片 data URL，请使用 PNG/JPEG/WebP")
    ext = "jpg" if match.group(1).lower() in ("jpeg", "jpg") else match.group(1).lower()
    file_key = f"app-icons/{uuid4().hex}.{ext}"
    dest = uploads_root() / file_key
    save_data_url(data_url, dest)
    return creation_file_url(file_key)
