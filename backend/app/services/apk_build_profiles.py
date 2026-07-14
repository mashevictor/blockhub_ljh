"""APK build profiles — capability_keys + 显式 app_ui_id → Flutter shell."""

from __future__ import annotations

from dataclasses import dataclass

from app.data.delivery_templates import normalize_app_ui_id, recommend_app_ui_for_keys


@dataclass(frozen=True)
class ApkBuildProfile:
    profile_id: str
    app_ui_id: str = "bottom_tabs"
    voice_demo: bool = False
    android_app_id: str = "com.blockhub.runtime"
    tenant_slug: str = "demo"


PROFILE_BY_CAPABILITY: dict[str, ApkBuildProfile] = {
    "shanghai_voice": ApkBuildProfile(
        profile_id="shanghai_voice",
        app_ui_id="immersive_chat",
        voice_demo=True,
        android_app_id="com.blockhub.shanghai.voice",
    ),
    "shanghai_voice_stream": ApkBuildProfile(
        profile_id="shanghai_voice",
        app_ui_id="immersive_chat",
        voice_demo=True,
        android_app_id="com.blockhub.shanghai.voice",
    ),
    "chat_voice": ApkBuildProfile(
        profile_id="chat_voice",
        app_ui_id="immersive_chat",
        voice_demo=False,
        android_app_id="com.blockhub.voice.chat",
    ),
}

DEFAULT_PROFILE = ApkBuildProfile(
    profile_id="generic",
    app_ui_id="bottom_tabs",
    voice_demo=False,
    android_app_id="com.blockhub.runtime",
)


def resolve_apk_build_profile(
    capability_keys: list[str],
    *,
    app_ui_id: str | None = None,
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
    android_id = base.android_app_id
    if ui == "immersive_chat" and "shanghai_voice" in keys:
        android_id = "com.blockhub.shanghai.voice"
    elif ui != "immersive_chat":
        android_id = "com.blockhub.runtime" if base.profile_id == "generic" else base.android_app_id
        if ui in ("bottom_tabs", "drawer_nav"):
            android_id = "com.blockhub.runtime"

    return ApkBuildProfile(
        profile_id=base.profile_id if ui == "immersive_chat" and base.voice_demo else "generic",
        app_ui_id=ui,
        voice_demo=voice and ui == "immersive_chat",
        android_app_id=android_id,
        tenant_slug=base.tenant_slug,
    )
