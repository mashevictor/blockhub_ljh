"""CapShip L2 contract — pure keys→schema/manifest helpers (no FastAPI / SQLAlchemy).

BlockHub 产品仓通过 path 依赖本包；热路径仍可暂留 backend 薄封装，避免双份业务逻辑。
"""

from __future__ import annotations

__version__ = "0.1.0"

from .android_id import android_app_id_for_public_id
from .manifest import build_manifest
from .registry_core import CORE_CAPABILITIES, CapabilityDef, core_capabilities_by_key
from .schema_minimal import build_page_schema
from .vendor import android_vendor_prefix, web_pkg_prefix

__all__ = [
    "CapabilityDef",
    "CORE_CAPABILITIES",
    "android_app_id_for_public_id",
    "android_vendor_prefix",
    "build_manifest",
    "build_page_schema",
    "core_capabilities_by_key",
    "web_pkg_prefix",
]
