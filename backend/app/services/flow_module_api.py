"""模块数据流 — DeepSeek 生成模拟 API 接口（含输入/输出节点）。"""

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
            "output_api": _api("GET", f"{base}/egress/deliver", "推送至员工端 / 通知渠道"),
        }
    return {
        "node_id": node_id,
        "label": label,
        "kind": kind,
        "input_api": _api("POST", f"{base}/modules/{slug}/input", f"接收上游数据 · {note or label}"),
        "output_api": _api("GET", f"{base}/modules/{slug}/output", f"输出处理结果 · {note or label}"),
    }


def _normalize_api_block(raw: dict | None, fallback: dict) -> dict:
    if not isinstance(raw, dict):
        return fallback
    out = dict(fallback)
    for key in ("input_api", "output_api"):
        block = raw.get(key)
        if isinstance(block, dict) and block.get("path"):
            out[key] = {
                "method": str(block.get("method", fallback[key]["method"])).upper(),
                "path": str(block["path"]),
                "description": str(block.get("description", fallback[key]["description"])),
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
        "路径统一以 /api/v1/runtime/{app_slug}/ 开头，使用英文 kebab-case。"
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
            merged.append(_normalize_api_block(raw, fb))
        else:
            merged.append(fb)
    return {"nodes": merged, "source": "deepseek", "llm_configured": True}
