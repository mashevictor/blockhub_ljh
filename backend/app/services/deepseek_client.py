"""DeepSeek API 客户端（模块推荐 / 能力补全）。"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from app.core.config import settings
from app.data.capability_registry import ALL_CAPABILITIES, capability_catalog_for_llm
from app.services.llm_text import NO_MARKDOWN_STYLE_RULE, sanitize_llm_plain_text


def _post_chat(
    messages: list[dict],
    *,
    temperature: float = 0.2,
    json_mode: bool = True,
) -> str | None:
    if not settings.deepseek_api_key:
        return None
    url = f"{settings.deepseek_base_url.rstrip('/')}/chat/completions"
    payload: dict = {
        "model": settings.deepseek_model,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.deepseek_api_key}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=settings.deepseek_timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError):
        return None


def deepseek_text_chat(system: str, user: str, *, temperature: float = 0.35) -> str | None:
    """普通文本对话（非强制 JSON），失败返回 None。"""
    raw = _post_chat(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        json_mode=False,
    )
    if not raw:
        return None
    text = raw.strip()
    return sanitize_llm_plain_text(text) or None


def deepseek_json_chat(system: str, user: str, *, temperature: float = 0.25) -> dict | None:
    """通用 JSON 对话，失败返回 None。"""
    raw = _post_chat([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], temperature=temperature, json_mode=True)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            return None


def _vision_api_key() -> str:
    return (settings.vision_api_key or settings.llm_api_key or settings.deepseek_api_key or "").strip()


def _vision_base_url() -> str:
    return (
        settings.vision_base_url or settings.llm_base_url or settings.deepseek_base_url or ""
    ).rstrip("/")


def _vision_model() -> str:
    return (settings.vision_model or settings.llm_model or settings.deepseek_model or "").strip()


def vision_configured() -> bool:
    """是否具备多模态截图理解（WaveSpeed 优先，其次 VISION_*/LLM_* VL）。"""
    from app.services.wavespeed_vision import wavespeed_configured

    if wavespeed_configured():
        return True
    if not _vision_api_key() or not _vision_base_url():
        return False
    model = _vision_model().lower()
    base = _vision_base_url().lower()
    text_only = model in (
        "deepseek-chat",
        "deepseek-reasoner",
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "",
    )
    if "deepseek.com" in base and text_only and not (settings.vision_model or "").strip():
        if not (settings.llm_base_url or "").strip() or "deepseek.com" in (settings.llm_base_url or "").lower():
            return False
    if "deepseek.com" in base and text_only:
        return False
    return True


def _normalize_data_url(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s:
        return None
    if s.startswith("data:image/"):
        return s
    if s.startswith("http://") or s.startswith("https://"):
        return s
    # 裸 base64 → 当 png
    if re.fullmatch(r"[A-Za-z0-9+/=\s]+", s) and len(s) > 64:
        return f"data:image/png;base64,{re.sub(r'\s+', '', s)}"
    return None


def _parse_json_object(raw: str) -> dict | None:
    if not raw:
        return None
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        try:
            data = json.loads(m.group())
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None


def deepseek_json_chat_with_images(
    system: str,
    user: str,
    images: list[str] | None = None,
    *,
    temperature: float = 0.25,
) -> dict | None:
    """带截图的 JSON 对话。优先 WaveSpeed Vision，其次 OpenAI 兼容 VL，再文本回退。"""
    urls: list[str] = []
    for raw in images or []:
        u = _normalize_data_url(raw)
        if u:
            urls.append(u)
        if len(urls) >= 3:
            break
    if not urls:
        return deepseek_json_chat(system, user, temperature=temperature)

    # 1) WaveSpeed.ai any-llm/vision（推荐）
    from app.services.wavespeed_vision import WaveSpeedVisionError, describe_images, wavespeed_configured

    if wavespeed_configured():
        vision_prompt = (
            "你正在协助 CapShip 对话改页。请仔细看截图中的界面（标题、菜单、按钮、表单），"
            "结合用户指令，只返回一个 JSON 对象（不要 Markdown 代码围栏），字段与系统要求一致。\n\n"
            f"{user}"
        )
        try:
            raw_text = describe_images(
                prompt=vision_prompt,
                images=urls,
                system_prompt=system,
                temperature=temperature,
                max_tokens=768,
            )
        except WaveSpeedVisionError as e:
            return {
                "reply": f"{e.detail}。也可先用文字描述页面，我继续帮你改页。",
                "intent_summary": "视觉识别不可用",
                "ops": [],
            }
        parsed = _parse_json_object(raw_text or "")
        if parsed:
            return parsed
        if raw_text:
            return {
                "reply": raw_text.strip(),
                "intent_summary": "已根据截图理解界面",
                "ops": [],
            }

    # 2) OpenAI 兼容多模态（需独立 VISION_*/LLM_*，不能仅因 WaveSpeed key 误判）
    openai_ok = bool(_vision_api_key() and _vision_base_url())
    base_l = _vision_base_url().lower()
    model_l = _vision_model().lower()
    if openai_ok and "deepseek.com" in base_l and model_l in (
        "deepseek-chat",
        "deepseek-reasoner",
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "",
    ):
        openai_ok = False

    if not openai_ok:
        hint = (
            f"（用户附带了 {len(urls)} 张界面截图，视觉通道不可用；"
            "请仅根据文字理解，并在 reply 中提示配置 WAVESPEED_API_KEY。）\n"
        )
        return deepseek_json_chat(system, hint + user, temperature=temperature)

    key = _vision_api_key()
    base = _vision_base_url()
    model = _vision_model() or "gpt-4o-mini"
    content: list[dict] = [{"type": "text", "text": user}]
    for u in urls:
        content.append({"type": "image_url", "image_url": {"url": u}})
    url = f"{base}/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
        method="POST",
    )
    timeout = max(settings.vision_timeout, settings.deepseek_timeout, 30)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError, TimeoutError, OSError):
        hint = f"（用户附带了 {len(urls)} 张截图，视觉调用失败；请根据文字理解。）\n"
        return deepseek_json_chat(system, hint + user, temperature=temperature)
    return _parse_json_object(raw or "")


def suggest_with_deepseek(user_text: str) -> dict | None:
    """返回 { items: [{key,label,reason,score,source}], supplemented: [...] }"""
    catalog = capability_catalog_for_llm()
    system = (
        "你是积木仓 BlockHub 的应用架构师。根据用户需求，判断行业、办公场景与能力模块。"
        "若需求含糊、无意义或信息不足（如乱码、单字、无法判断场景），返回 confidence<=0.3 且 items 为空。"
        "若能判断，从 catalog 选 1~5 个 module key，并给出 industries（行业 key: mfg/sales/med/game/office/retail/edu 等）、"
        "offices（办公分类：人事行政/财务法务/流程审批/知识协同/数据报表/消息通知 等）。"
        "娱乐/游戏类不要推荐办公模块（审批流、知识库），应优先 game 行业或 custom_ 扩展能力。"
        f"{NO_MARKDOWN_STYLE_RULE}"
        "reason 与 intent_summary 不要用星号加粗。"
        "只返回 JSON："
        "{\"confidence\":0-1,\"intent_summary\":\"一句话理解\","
        "\"industries\":[{\"key\":\"sales\",\"label\":\"销售行业\",\"reason\":\"...\"}],"
        "\"offices\":[{\"key\":\"流程审批\",\"label\":\"流程审批\",\"reason\":\"...\"}],"
        "\"items\":[{\"key\":\"...\",\"name\":\"中文名\",\"reason\":\"...\",\"score\":0-10}],"
        "\"supplemented\":[{\"key\":\"custom_xxx\",\"name\":\"...\",\"category\":\"...\","
        "\"flutter_pkg\":\"...\",\"reason\":\"...\"}]}"
    )
    user = f"用户需求：{user_text}\n\n已有能力 catalog：\n{catalog}"
    raw = _post_chat([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ])
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", raw)
        if not m:
            return None
        parsed = json.loads(m.group())
    return parsed


def merge_llm_items(parsed: dict) -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    supplemented: list[dict] = []

    for ind in parsed.get("industries") or []:
        key = str(ind.get("key", "")).strip()
        if not key:
            continue
        items.append({
            "key": key,
            "label": str(ind.get("label", key)),
            "type": "industry",
            "score": float(ind.get("score", 8)),
            "reason": sanitize_llm_plain_text(str(ind.get("reason", "AI 判断行业"))),
            "source": "deepseek_industry",
            "flutter_pkg": "",
        })

    for off in parsed.get("offices") or []:
        key = str(off.get("key", off.get("label", ""))).strip()
        if not key:
            continue
        items.append({
            "key": key,
            "label": str(off.get("label", key)),
            "type": "office",
            "score": float(off.get("score", 7)),
            "reason": sanitize_llm_plain_text(str(off.get("reason", "AI 判断办公场景"))),
            "source": "deepseek_office",
            "flutter_pkg": "",
        })

    for it in parsed.get("items") or []:
        key = str(it.get("key", "")).strip()
        if not key:
            continue
        cap = ALL_CAPABILITIES.get(key)
        label = str(it.get("name") or it.get("label") or (cap.name if cap else key))
        items.append({
            "key": key,
            "label": label,
            "type": "module" if not key.startswith("custom_") else "supplement",
            "score": float(it.get("score", 7)),
            "reason": sanitize_llm_plain_text(str(it.get("reason", "DeepSeek 推荐"))),
            "source": "deepseek",
            "flutter_pkg": cap.flutter_pkg if cap else str(it.get("flutter_pkg", "")),
        })

    for sup in parsed.get("supplemented") or []:
        key = str(sup.get("key", "")).strip()
        if not key.startswith("custom_"):
            key = f"custom_{key}" if key else ""
        if not key:
            continue
        supplemented.append({
            "key": key,
            "label": str(sup.get("name", key)),
            "type": "supplement",
            "category": str(sup.get("category", "扩展能力")),
            "flutter_pkg": str(sup.get("flutter_pkg", "")),
            "reason": sanitize_llm_plain_text(str(sup.get("reason", "DeepSeek 补充能力"))),
            "source": "deepseek_supplement",
        })
        items.append({
            "key": key,
            "label": str(sup.get("name", key)),
            "type": "supplement",
            "score": 6.0,
            "reason": sanitize_llm_plain_text(str(sup.get("reason", "DeepSeek 补充能力"))),
            "source": "deepseek_supplement",
        })

    return items, supplemented
