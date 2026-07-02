from app.core.config import settings


def app_web_url(public_id: str) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/r/{public_id}"


def app_download_url(public_id: str) -> str:
    base = settings.public_base_url.rstrip("/")
    return f"{base}/r/{public_id}/download"


def app_qr_payload(public_id: str) -> str:
    return app_web_url(public_id)
