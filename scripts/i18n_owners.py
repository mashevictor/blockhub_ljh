#!/usr/bin/env python3
"""Shared helpers: map web-capability folders ↔ owned capability keys."""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _ensure_backend() -> None:
    backend = str(ROOT / "backend")
    if backend not in sys.path:
        sys.path.insert(0, backend)


def npm_to_folder(npm: str) -> str:
    return npm.split("/")[-1]


def folder_to_npm(folder: str) -> str:
    return f"@blockhub/{folder}"


def default_web_pkg(key: str) -> str:
    return f"@blockhub/web-capability-{key.replace('_', '-')}"


def build_web_owner_map() -> dict[str, set[str]]:
    """Return folder name → set of capability keys owned by that package."""
    _ensure_backend()
    from app.data.capability_registry import ALL_CAPABILITIES

    owners: dict[str, set[str]] = defaultdict(set)
    for c in ALL_CAPABILITIES.values():
        npm = (c.web_pkg or "").strip() or default_web_pkg(c.key)
        folder = npm_to_folder(npm)
        if not folder.startswith("web-capability-"):
            continue
        owners[folder].add(c.key)
    return dict(owners)


def list_web_capability_folders() -> list[Path]:
    pkgs = ROOT / "packages"
    return sorted(p for p in pkgs.glob("web-capability-*") if p.is_dir())


def allowed_key_prefixes(folder: str, owned_keys: set[str]) -> tuple[str, ...]:
    """Locale keys in a package may use these prefixes."""
    prefixes = ["common.", "error."]
    for key in sorted(owned_keys):
        prefixes.append(f"cap.{key}.")
    return tuple(prefixes)


def key_allowed(key: str, prefixes: tuple[str, ...]) -> bool:
    if key.startswith("_"):
        return True
    return any(key.startswith(p) for p in prefixes)
