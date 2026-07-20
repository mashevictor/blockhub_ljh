"""Android applicationId from publish public_id."""

from __future__ import annotations

import re

from .vendor import android_vendor_prefix


def android_app_id_for_public_id(public_id: str, *, vendor: str | None = None) -> str:
    """Map publish public_id → unique Android applicationId.

    Rule: {vendor}.app.{slug}
    - slug = lowercase public_id, non [a-z0-9_] → _
    - if slug empty or starts with digit → prefix ``a``
    """
    root = (vendor or android_vendor_prefix()).rstrip(".")
    raw = (public_id or "").strip().lower()
    slug = re.sub(r"[^a-z0-9_]", "_", raw)
    slug = re.sub(r"_+", "_", slug).strip("_")
    if not slug:
        slug = "app"
    if slug[0].isdigit():
        slug = f"a{slug}"
    return f"{root}.app.{slug}"
