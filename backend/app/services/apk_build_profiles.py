"""APK build profiles — map published capability_keys to Flutter build env.

Each profile drives branding / dart-define flags for per-app APK assembly.
Extend PROFILE_ORDER when new capabilities need distinct mobile shells.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ApkBuildProfile:
    profile_id: str
    voice_demo: bool = False
    android_app_id: str = "com.blockhub.runtime"
    tenant_slug: str = "demo"


# First matching key wins (most specific profiles first).
PROFILE_BY_CAPABILITY: dict[str, ApkBuildProfile] = {
    "shanghai_voice": ApkBuildProfile(
        profile_id="shanghai_voice",
        voice_demo=True,
        android_app_id="com.blockhub.shanghai.voice",
    ),
    "shanghai_voice_stream": ApkBuildProfile(
        profile_id="shanghai_voice",
        voice_demo=True,
        android_app_id="com.blockhub.shanghai.voice",
    ),
    "chat_voice": ApkBuildProfile(
        profile_id="chat_voice",
        voice_demo=False,
        android_app_id="com.blockhub.voice.chat",
    ),
}

DEFAULT_PROFILE = ApkBuildProfile(
    profile_id="generic",
    voice_demo=False,
    android_app_id="com.blockhub.runtime",
)


def resolve_apk_build_profile(capability_keys: list[str]) -> ApkBuildProfile:
    keys = capability_keys or []
    for key in keys:
        if key in PROFILE_BY_CAPABILITY:
            return PROFILE_BY_CAPABILITY[key]
    return DEFAULT_PROFILE
