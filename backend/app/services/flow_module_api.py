"""模块数据流 — 大模型生成模拟 API 接口（含输入/输出节点）。"""

from __future__ import annotations

import re
import unicodedata

from app.core.config import settings
from app.services.deepseek_client import deepseek_json_chat

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slug(text: str) -> str:
    s = unicodedata.normalize("NFKD", text)
    s = s.encode("ascii", "ignore").decode("ascii").lower().strip()
    s = _SLUG_RE.sub("-", s).strip("-")
    return s or "node"


def _api(method: str, path: str, desc: str) -> dict:
    return {"method": method.upper(), "path": path, "description": desc}


def _module_path_slug(node_id: str, label: str) -> str:
    s = _slug(label)
    if s != "node":
        return s
    from_id = _SLUG_RE.sub("-", node_id.lower()).strip("-")
    return (from_id[-32:] if from_id else "") or "mod"


def _fallback_node_apis(app_slug: str, node_id: str, label: str, kind: str, note: str) -> dict:
    slug = _module_path_slug(node_id, label) if kind == "module" else node_id
    base = f"/api/v1/runtime/{app_slug}"
    if kind == "ingress":
        return {
            "node_id": node_id,
            "label": label,
            "kind": kind,
            "input_api": _api("POST", f"{base}/ingress/webhook", "外部系统 / 用户提交业务请求"),
            "output_api": _api("POST", f"{base}/ingress/dispatch", "校验后分发至首模块"),
        }
    if kind == "egress":
        return {
            "node_id": node_id,
            "label": label,
            "kind": kind,
            "input_api": _api("POST", f"{base}/egress/collect", "汇聚各模块处理结果"),
            "output_api": _api("GET", f"{base}/egress/deliver", "推送至各端 / 通知渠道"),
        }
    return {
        "node_id": node_id,
        "label": label,
        "kind": kind,
        "input_api": _api("POST", f"{base}/modules/{slug}/input", f"接收上游数据 · {note or label}"),
        "output_api": _api("GET", f"{base}/modules/{slug}/output", f"输出处理结果 · {note or label}"),
    }


def _canonicalize_path(path: str, *, app_slug: str, kind: str, side: str, fallback_path: str) -> str:
    """
    大模型常生成不完整路径（如 /ingress、/ingress/output），会致 404。
    强制归约为 runtime 已注册的 action 形路径：
      /api/v1/runtime/{slug}/ingress|{egress}|modules/.../{action}
    """
    raw = (path or "").strip()
    if not raw.startswith("/"):
        raw = "/" + raw
    # 去掉 query
    raw = raw.split("?", 1)[0].rstrip("/") or "/"
    base = f"/api/v1/runtime/{app_slug}"

    # 统一 app_slug，防止模型写错
    m = re.match(r"^/api/v1/runtime/[^/]+(/.*)?$", raw)
    if m:
        rest = m.group(1) or ""
        raw = f"{base}{rest}"

    if kind == "ingress":
        if re.match(rf"^{re.escape(base)}/ingress/[a-zA-Z0-9_-]+$", raw):
            # /ingress/output 等非标准动作映射到派发
            action = raw.rsplit("/", 1)[-1].lower()
            if side == "input_api" and action in ("output", "dispatch", "out"):
                return f"{base}/ingress/webhook"
            if side == "output_api" and action in ("input", "webhook", "in"):
                return f"{base}/ingress/dispatch"
            if side == "input_api" and action in ("input", "in", "receive"):
                return f"{base}/ingress/webhook"
            if side == "output_api" and action in ("output", "out"):
                return f"{base}/ingress/dispatch"
            return raw
        # 缺 action：/ingress
        if raw == f"{base}/ingress" or raw.endswith("/ingress"):
            return f"{base}/ingress/webhook" if side == "input_api" else f"{base}/ingress/dispatch"
        return fallback_path

    if kind == "egress":
        if re.match(rf"^{re.escape(base)}/egress/[a-zA-Z0-9_-]+$", raw):
            return raw
        if raw == f"{base}/egress" or raw.endswith("/egress"):
            return f"{base}/egress/collect" if side == "input_api" else f"{base}/egress/deliver"
        return fallback_path

    # module
    if re.match(rf"^{re.escape(base)}/modules/[a-zA-Z0-9_-]+/(input|output)$", raw):
        return raw
    mod = re.match(rf"^{re.escape(base)}/modules/([a-zA-Z0-9_-]+)(?:/(.*))?$", raw)
    if mod:
        slug = mod.group(1)
        action = (mod.group(2) or "").lower()
        if side == "input_api":
            return f"{base}/modules/{slug}/input"
        return f"{base}/modules/{slug}/output" if action in ("", "output", "out") else f"{base}/modules/{slug}/output"
    return fallback_path


def _normalize_api_block(raw: dict | None, fallback: dict, *, app_slug: str) -> dict:
    if not isinstance(raw, dict):
        return fallback
    out = {
        "node_id": fallback["node_id"],
        "label": fallback["label"],
        "kind": fallback["kind"],
        "input_api": dict(fallback["input_api"]),
        "output_api": dict(fallback["output_api"]),
    }
    kind = str(fallback.get("kind") or "module")
    for key in ("input_api", "output_api"):
        block = raw.get(key)
        if not isinstance(block, dict):
            continue
        fb = fallback[key]
        path = _canonicalize_path(
            str(block.get("path") or fb["path"]),
            app_slug=app_slug,
            kind=kind,
            side=key,
            fallback_path=fb["path"],
        )
        out[key] = {
            "method": str(block.get("method") or fb["method"]).upper(),
            "path": path,
            "description": str(block.get("description") or fb["description"]),
        }
    return out


def generate_flow_module_apis(
    *,
    app_slug: str,
    app_name: str,
    nodes: list[dict],
) -> dict:
    """
    nodes: [{ node_id, label, kind: ingress|module|egress, note? }]
    返回 { nodes: [...], source: deepseek|fallback, llm_configured: bool }
    """
    app_slug = _slug(app_slug) or "app"
    fallbacks = [
        _fallback_node_apis(app_slug, n["node_id"], n["label"], n["kind"], n.get("note", ""))
        for n in nodes
    ]

    llm_ok = bool(settings.deepseek_api_key)
    if not llm_ok:
        return {"nodes": fallbacks, "source": "fallback", "llm_configured": False}

    flow_desc = " → ".join(n["label"] for n in nodes)
    node_lines = "\n".join(
        f"- {n['node_id']}: {n['label']} ({n['kind']})" + (f" · {n.get('note', '')}" if n.get("note") else "")
        for n in nodes
    )
    system = (
        "你是积木仓 BlockHub 的 API 架构师。为应用数据流每个节点设计 REST 模拟接口。"
        "每个节点必须有 input_api（上游流入）和 output_api（下游流出）。"
        "路径必须以 /api/v1/runtime/{app_slug}/ 开头，且必须带 action 段，禁止写成裸 /ingress 或 /egress。\n"
        "硬性路径约定：\n"
        f"- ingress.input_api.path = /api/v1/runtime/{app_slug}/ingress/webhook\n"
        f"- ingress.output_api.path = /api/v1/runtime/{app_slug}/ingress/dispatch\n"
        f"- egress.input_api.path = /api/v1/runtime/{app_slug}/egress/collect\n"
        f"- egress.output_api.path = /api/v1/runtime/{app_slug}/egress/deliver\n"
        f"- module: /api/v1/runtime/{app_slug}/modules/{{kebab}}/input 与 .../output\n"
        "你可以改 description，但 path 尽量遵守上述约定。"
        "只返回 JSON："
        '{"nodes":[{"node_id":"...","label":"...","kind":"ingress|module|egress",'
        '"input_api":{"method":"POST|GET|PUT","path":"...","description":"中文说明"},'
        '"output_api":{"method":"...","path":"...","description":"..."}}]}'
    )
    user = (
        f"应用名：{app_name}\n"
        f"app_slug：{app_slug}\n"
        f"完整数据流：{flow_desc}\n\n"
        f"节点列表：\n{node_lines}\n\n"
        "ingress 是业务输入入口，egress 是触达输出，module 是中间处理能力。"
    )
    parsed = deepseek_json_chat(system, user)
    if not parsed or not isinstance(parsed.get("nodes"), list):
        return {"nodes": fallbacks, "source": "fallback", "llm_configured": True}

    by_id = {str(n.get("node_id")): n for n in parsed["nodes"] if n.get("node_id")}
    merged: list[dict] = []
    for fb in fallbacks:
        raw = by_id.get(fb["node_id"])
        if raw:
            merged.append(_normalize_api_block(raw, fb, app_slug=app_slug))
        else:
            merged.append(fb)
    return {"nodes": merged, "source": "deepseek", "llm_configured": True}
