"""Vendor / white-label prefixes (env-overridable)."""

from __future__ import annotations

import os


def web_pkg_prefix() -> str:
    """npm scope for Web capability packages, e.g. ``@blockhub/web-capability`` or ``@capship/web-capability``."""
    return (
        os.environ.get("CAPSHIP_WEB_PKG_PREFIX")
        or os.environ.get("WEB_PKG_PREFIX")
        or "@blockhub/web-capability"
    ).rstrip("-")


def android_vendor_prefix() -> str:
    """Android applicationId vendor root, e.g. ``com.blockhub`` or ``com.capship``."""
    return (
        os.environ.get("CAPSHIP_ANDROID_VENDOR")
        or os.environ.get("ANDROID_VENDOR_PREFIX")
        or "com.blockhub"
    ).rstrip(".")


def pub_pkg_prefix() -> str:
    """Dart/Flutter package name prefix, e.g. ``capability_`` or ``capship_``."""
    return os.environ.get("CAPSHIP_PUB_PREFIX") or os.environ.get("PUB_PKG_PREFIX") or "capability_"
