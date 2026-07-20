"""APK build profiles — capability_keys + 显式 app_ui_id → Flutter shell.

android_app_id 一律由 public_id 推导（每应用唯一），profile 只决定壳/语音行为。
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

from app.data.delivery_templates import normalize_app_ui_id, recommend_app_ui_for_keys

_ROOT = Path(__file__).resolve().parents[3]
_CONTRACT_ROOT = _ROOT / "packages" / "capship-contract"
if _CONTRACT_ROOT.is_dir() and str(_CONTRACT_ROOT) not in sys.path:
    sys.path.insert(0, str(_CONTRACT_ROOT))

try:
    from capship_contract.android_id import android_app_id_for_public_id as _contract_android_id
    from capship_contract.vendor import android_vendor_prefix
except ImportError:  # pragma: no cover
    _contract_android_id = None

    def android_vendor_prefix() -> str:
        return "com.blockhub"

FALLBACK_ANDROID_APP_ID = f"{android_vendor_prefix()}.runtime"


def android_app_id_for_public_id(public_id: str) -> str:
    """Map publish public_id → unique Android applicationId（委托 L2 contract，可白标）。"""
    if _contract_android_id is not None:
        return _contract_android_id(public_id)
    raw = (public_id or "").strip().lower()
    slug = re.sub(r"[^a-z0-9_]", "_", raw)
    slug = re.sub(r"_+", "_", slug).strip("_")
    if not slug:
        slug = "app"
    if slug[0].isdigit():
        slug = f"a{slug}"
    return f"{android_vendor_prefix()}.app.{slug}"


@dataclass(frozen=True)
class ApkBuildProfile:
    profile_id: str
    app_ui_id: str = "bottom_tabs"
    voice_demo: bool = False
    android_app_id: str = FALLBACK_ANDROID_APP_ID
    tenant_slug: str = "demo"


PROFILE_BY_CAPABILITY: dict[str, ApkBuildProfile] = {
    "shanghai_voice": ApkBuildProfile(
        profile_id="shanghai_voice",
        app_ui_id="immersive_chat",
        voice_demo=True,
    ),
    "shanghai_voice_stream": ApkBuildProfile(
        profile_id="shanghai_voice",
        app_ui_id="immersive_chat",
        voice_demo=True,
    ),
    "chat_voice": ApkBuildProfile(
        profile_id="chat_voice",
        app_ui_id="immersive_chat",
        voice_demo=False,
    ),
}

DEFAULT_PROFILE = ApkBuildProfile(
    profile_id="generic",
    app_ui_id="bottom_tabs",
    voice_demo=False,
)


def resolve_apk_build_profile(
    capability_keys: list[str],
    *,
    app_ui_id: str | None = None,
    public_id: str | None = None,
) -> ApkBuildProfile:
    keys = capability_keys or []
    ui = normalize_app_ui_id(app_ui_id) if app_ui_id else recommend_app_ui_for_keys(keys)

    base = DEFAULT_PROFILE
    for key in keys:
        if key in PROFILE_BY_CAPABILITY:
            base = PROFILE_BY_CAPABILITY[key]
            break

    # 用户显式选的 App UI 覆盖推断（沉浸对话才开 voice_demo 壳）
    voice = ui == "immersive_chat" or base.voice_demo
    android_id = (
        android_app_id_for_public_id(public_id) if public_id else FALLBACK_ANDROID_APP_ID
    )

    return ApkBuildProfile(
        profile_id=base.profile_id if ui == "immersive_chat" and base.voice_demo else "generic",
        app_ui_id=ui,
        voice_demo=voice and ui == "immersive_chat",
        android_app_id=android_id,
        tenant_slug=base.tenant_slug,
    )
