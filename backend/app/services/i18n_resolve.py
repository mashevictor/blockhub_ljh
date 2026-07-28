"""Locale helpers — no coupling to React / message JSON files."""

from __future__ import annotations

from typing import Mapping


DEFAULT_LOCALE = "zh-CN"
FALLBACK_LOCALE = "zh-CN"


def normalize_locale(lang: str | None) -> str:
    if not lang:
        return DEFAULT_LOCALE
    raw = lang.strip().replace("_", "-")
    lower = raw.lower()
    if lower.startswith("en"):
        return "en-US"
    if lower.startswith("zh"):
        return "zh-CN"
    return raw


def pick_label(
    labels: Mapping[str, str] | None,
    lang: str | None,
    *,
    fallback: str = "",
    fallback_locale: str = FALLBACK_LOCALE,
) -> str:
    """Pick a display string from a labels map (Accept-Language aware)."""
    if not labels:
        return fallback
    locale = normalize_locale(lang)
    if locale in labels and labels[locale]:
        return labels[locale]
    # en → en-US already normalized; try bare prefixes
    for key, val in labels.items():
        if val and key.lower().startswith(locale.split("-", 1)[0].lower()):
            return val
    if fallback_locale in labels and labels[fallback_locale]:
        return labels[fallback_locale]
    if fallback:
        return fallback
    return next((v for v in labels.values() if v), "")
