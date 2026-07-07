from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from app.core.config import settings
from app.services.file_storage import read_bytes, save_bytes, uploads_root

logger = logging.getLogger(__name__)


def cos_configured() -> bool:
    return bool(settings.cos_secret_id and settings.cos_secret_key and settings.cos_bucket)


def kb_file_key(tenant_id: str, kb_id: str, filename: str) -> str:
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in filename)[:180]
    return f"kb/{tenant_id}/{kb_id}/{uuid4().hex}_{safe}"


def save_kb_bytes(*, tenant_id: str, kb_id: str, filename: str, data: bytes) -> tuple[str, str]:
    """返回 (file_key, storage) storage=cos|local"""
    key = kb_file_key(tenant_id, kb_id, filename)
    if cos_configured():
        try:
            _upload_cos(key, data)
            return key, "cos"
        except Exception:
            logger.exception("COS upload failed, fallback to local storage")
    dest = uploads_root() / key
    save_bytes(data, dest)
    return key, "local"


def load_kb_bytes(file_key: str, storage: str) -> bytes:
    if storage == "cos" and cos_configured():
        return _download_cos(file_key)
    return read_bytes(file_key)


def public_file_url(file_key: str, storage: str) -> str:
    if storage == "cos" and settings.cos_cdn_base_url:
        return f"{settings.cos_cdn_base_url.rstrip('/')}/{file_key}"
    return f"{settings.api_prefix}/kb/files/{file_key}"


def _cos_client():
    from qcloud_cos import CosConfig, CosS3Client

    config = CosConfig(
        Region=settings.cos_region,
        SecretId=settings.cos_secret_id,
        SecretKey=settings.cos_secret_key,
        Scheme="https",
    )
    return CosS3Client(config)


def _upload_cos(key: str, data: bytes) -> None:
    client = _cos_client()
    client.put_object(Bucket=settings.cos_bucket, Body=data, Key=key)


def _download_cos(key: str) -> bytes:
    client = _cos_client()
    resp = client.get_object(Bucket=settings.cos_bucket, Key=key)
    return resp["Body"].get_raw_stream().read()
