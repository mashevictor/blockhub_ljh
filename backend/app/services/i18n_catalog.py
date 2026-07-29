"""Localize catalog capability / hero payloads (Accept-Language, Mode L)."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

from app.data.capability_registry import ALL_CAPABILITIES
from app.data.hero_presets import HERO_PRESETS
from app.services.i18n_resolve import normalize_locale, pick_label

ROOT = Path(__file__).resolve().parents[3]
MESSAGES = ROOT / "shared" / "i18n" / "messages"
SEED = ROOT / "shared" / "i18n" / "seed"


class _HasHeaders(Protocol):
    headers: Any


def resolve_request_locale(request: _HasHeaders | None, lang: str | None = None) -> str:
    if lang:
        return normalize_locale(lang)
    if request is None:
        return normalize_locale(None)
    headers = getattr(request, "headers", None) or {}
    header = ""
    try:
        header = headers.get("accept-language") or headers.get("Accept-Language") or ""
    except Exception:
        header = ""
    if not header:
        return normalize_locale(None)
    # Take first tag: "en-US,en;q=0.9,zh-CN;q=0.8"
    first = header.split(",", 1)[0].split(";", 1)[0].strip()
    return normalize_locale(first)


@lru_cache(maxsize=4)
def _load_flat_messages(locale: str, stem: str) -> dict[str, str]:
    path = MESSAGES / locale / f"{stem}.gen.json"
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return {k: v for k, v in data.items() if not str(k).startswith("_") and isinstance(v, str)}


@lru_cache(maxsize=1)
def _category_en() -> dict[str, str]:
    path = SEED / "category.en-US.json"
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    return {k: v for k, v in data.items() if not str(k).startswith("_") and isinstance(v, str)}


@lru_cache(maxsize=1)
def _hero_by_id() -> dict[str, dict[str, Any]]:
    return {p["id"]: p for p in HERO_PRESETS}


def localize_capability(item: dict[str, Any], lang: str | None) -> dict[str, Any]:
    locale = normalize_locale(lang)
    out = dict(item)
    key = str(out.get("key") or "")
    cap = ALL_CAPABILITIES.get(key)
    labels = cap.resolved_labels() if cap else {"zh-CN": str(out.get("name") or key)}
    # Prefer codegen messages when present (includes seed overlays)
    msgs = _load_flat_messages(locale, "capability")
    name_key = f"cap.{key}.name"
    cat_key = f"cap.{key}.category"
    if name_key in msgs:
        out["name"] = msgs[name_key]
    else:
        out["name"] = pick_label(labels, locale, fallback=str(out.get("name") or key))
    zh_cat = (cap.category if cap else None) or str(out.get("category") or "")
    if cat_key in msgs:
        out["category"] = msgs[cat_key]
    elif locale == "en-US":
        out["category"] = _category_en().get(zh_cat, zh_cat)
    else:
        out["category"] = zh_cat
    out["labels"] = labels
    return out


def _flow_lines_from_messages(msgs: dict[str, str], pid: str, fallback: list[str]) -> list[str]:
    indexed: list[tuple[int, str]] = []
    prefix = f"hero.{pid}.flow."
    for k, v in msgs.items():
        if not k.startswith(prefix) or not v:
            continue
        suffix = k[len(prefix) :]
        if suffix.isdigit():
            indexed.append((int(suffix), v))
    if not indexed:
        return list(fallback)
    indexed.sort(key=lambda x: x[0])
    return [text for _, text in indexed]


def localize_hero(item: dict[str, Any], lang: str | None) -> dict[str, Any]:
    locale = normalize_locale(lang)
    out = dict(item)
    pid = str(out.get("id") or "")
    preset = _hero_by_id().get(pid) or {}
    labels = preset.get("labels") or {"zh-CN": str(out.get("label") or pid)}
    msgs = _load_flat_messages(locale, "hero")

    out["label"] = msgs.get(f"hero.{pid}.label") or pick_label(
        labels, locale, fallback=str(out.get("label") or pid)
    )
    if f"hero.{pid}.hint" in msgs:
        out["hint"] = msgs[f"hero.{pid}.hint"]
    if f"hero.{pid}.prompt" in msgs:
        out["prompt"] = msgs[f"hero.{pid}.prompt"]
    if f"hero.{pid}.role" in msgs:
        out["role"] = msgs[f"hero.{pid}.role"]

    flows = _flow_lines_from_messages(msgs, pid, list(out.get("flowLines") or out.get("flow_lines") or []))
    out["flowLines"] = flows

    # Localize module pick labels via capability messages when possible
    picks = out.get("picks") or []
    if isinstance(picks, list) and locale != "zh-CN":
        cap_msgs = _load_flat_messages(locale, "capability")
        new_picks = []
        for pick in picks:
            if not isinstance(pick, dict):
                new_picks.append(pick)
                continue
            p = dict(pick)
            if p.get("type") == "module" and p.get("key"):
                mk = f"cap.{p['key']}.name"
                if mk in cap_msgs:
                    p["label"] = cap_msgs[mk]
            new_picks.append(p)
        out["picks"] = new_picks

    out["labels"] = labels
    return out


def localize_capabilities(
    items: list[dict[str, Any]], lang: str | None
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    localized = [localize_capability(i, lang) for i in items]
    by_category: dict[str, list[dict[str, Any]]] = {}
    for item in localized:
        by_category.setdefault(str(item.get("category") or ""), []).append(item)
    return localized, by_category


def localize_industry_pack(pack: dict[str, Any], lang: str | None) -> dict[str, Any]:
    """Localize pack name/tagline from industry.gen.json (fallback: pack labels)."""
    locale = normalize_locale(lang)
    out = dict(pack)
    key = str(out.get("key") or "")
    msgs = _load_flat_messages(locale, "industry")
    labels = out.get("labels") if isinstance(out.get("labels"), dict) else {}
    tagline_labels = out.get("tagline_labels") if isinstance(out.get("tagline_labels"), dict) else {}
    if key:
        nk = f"industry.{key}.name"
        tk = f"industry.{key}.tagline"
        if nk in msgs:
            out["name"] = msgs[nk]
        elif labels:
            out["name"] = pick_label(labels, locale, fallback=str(out.get("name") or key))
        if tk in msgs:
            out["tagline"] = msgs[tk]
        elif tagline_labels:
            out["tagline"] = pick_label(
                tagline_labels, locale, fallback=str(out.get("tagline") or "")
            )
    return out


def localize_scene_row(scene: dict[str, Any], pack_key: str, index: int, lang: str | None) -> dict[str, Any]:
    """Localize a scene by pack + 1-based index (scene.{pack}.{idx:03d}.*)."""
    locale = normalize_locale(lang)
    out = dict(scene)
    msgs = _load_flat_messages(locale, "scene")
    idx = f"{index:03d}"
    nkey = f"scene.{pack_key}.{idx}.name"
    pkey = f"scene.{pack_key}.{idx}.problem"
    ckey = f"scene.{pack_key}.{idx}.category"
    if nkey in msgs:
        out["name"] = msgs[nkey]
    if pkey in msgs:
        out["problem"] = msgs[pkey]
    if ckey in msgs:
        out["category"] = msgs[ckey]
    return out


def localize_industry_pack_detail(detail: dict[str, Any], lang: str | None) -> dict[str, Any]:
    """Deep-localize industry pack detail (pack + scenes + groups)."""
    locale = normalize_locale(lang)
    if locale == "zh-CN":
        return detail
    out = dict(detail)
    pack = dict(out.get("pack") or {})
    pack_key = str(pack.get("key") or "")
    out["pack"] = localize_industry_pack(pack, locale)

    scenes_in = list(out.get("scenes") or [])
    scenes_out = [
        localize_scene_row(s, pack_key, i, locale) if isinstance(s, dict) else s
        for i, s in enumerate(scenes_in, start=1)
    ]
    out["scenes"] = scenes_out

    # Rebuild groups from localized scenes to keep category labels in sync
    grouped: dict[str, list[dict[str, Any]]] = {}
    for s in scenes_out:
        if not isinstance(s, dict):
            continue
        cat = str(s.get("category") or "")
        grouped.setdefault(cat, []).append(s)
    out["groups"] = [{"category": k, "items": v} for k, v in grouped.items()]
    out["locale"] = locale
    return out


_CJK_RE = re.compile(r"[\u4e00-\u9fff]")


def has_cjk(text: str) -> bool:
    return bool(_CJK_RE.search(text or ""))
