"""剩余行业 vertical_ops 能力目录（SSOT）— DeepSeek 丰富后自动更新。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

_RAW = json.loads((Path(__file__).with_name("_vertical_ops_catalog.json")).read_text(encoding="utf-8"))


def _norm_kinds(kinds: dict) -> dict:
    out = {}
    for k, meta in kinds.items():
        fields = [tuple(f) for f in (meta.get("fields") or [])]
        scenes = [tuple(x) for x in (meta.get("scenes") or [])]
        out[k] = {**meta, "fields": fields, "scenes": scenes}
    return out


VERTICAL_OPS: dict[str, dict[str, Any]] = {
    k: {**v, "kinds": _norm_kinds(v.get("kinds") or {})}
    for k, v in _RAW.items()
}


def all_kind_keys() -> list[str]:
    out: list[str] = []
    for ind in VERTICAL_OPS.values():
        out.extend(ind["kinds"].keys())
    return out


def kind_industry(kind: str) -> str | None:
    for ind_key, ind in VERTICAL_OPS.items():
        if kind in ind["kinds"]:
            return ind_key
    return None


def kind_meta(kind: str) -> dict[str, Any] | None:
    for ind in VERTICAL_OPS.values():
        if kind in ind["kinds"]:
            return ind["kinds"][kind]
    return None
