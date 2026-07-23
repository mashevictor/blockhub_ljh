#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用 DeepSeek 丰富金融五垂直场景 SSOT（仅映射已有 capability，不发明新 Path A）。"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

ALLOWED_KEYS = frozenset(
    {
        "finance_kyc",
        "finance_aml",
        "credit_approval",
        "due_diligence",
        "regulatory_report",
        "insurance_case",
        "finance_news",
        "kb_document",
        "chat_qa",
        "approval_flow",
        "legal_case",
        "notify_im",
        "notify_email",
        "notify_inapp",
        "chart_dashboard",
        "data_nl_query",
        "meeting_booking",
        "expense_claim",
        "leave_request",
        "it_ticket",
        "asset_manage",
        "policy_qa",
        "ops_kpi",
        "hire_onboard",
        "campaign_ops",
        "seal_request",
        "approval_inbox",
    }
)

KB_BY_VERTICAL = {
    "bank": ["bank-compliance", "bank-product"],
    "securities": ["securities-compliance", "securities-product"],
    "insurance": ["insurance-compliance", "insurance-product"],
    "fund": ["fund-compliance", "fund-product"],
    "fintech": ["fintech-compliance", "fintech-product"],
}

EXISTING = {
    "bank": [
        "对公开户 KYC",
        "零售开户 KYC",
        "授信审批",
        "反洗钱监测",
        "合规审查",
        "银行·合规与反洗钱库",
        "银行·产品与信贷说明库",
        "风险经营看板",
        "行业新闻 Agent",
    ],
    "securities": [
        "开户适当性",
        "投研尽调",
        "券商合规审查",
        "产品销售说明",
        "理财产品问答",
        "金融合同会签",
        "券商·合规适当性库",
        "券商·产品与投研库",
        "行业新闻 Agent",
    ],
    "insurance": [
        "核保申请",
        "理赔受理",
        "代理人展业",
        "保险产品说明",
        "保险合规审查",
        "保险·合规与告知库",
        "保险·产品条款库",
        "行业新闻 Agent",
    ],
    "fund": [
        "产品披露",
        "投后管理",
        "投后巡检通知",
        "监管报送",
        "资管合规审查",
        "基金·合规与报送库",
        "基金·产品披露库",
        "行业新闻 Agent",
    ],
    "fintech": [
        "风控预警",
        "贷后管理",
        "消金客户 KYC",
        "监管报送",
        "风控告警通知",
        "消金·风控合规库",
        "消金·产品与贷后库",
        "经营风险看板",
        "行业新闻 Agent",
    ],
}

VERTICAL_HINT = {
    "bank": "商业银行：对公/零售/信用卡/普惠小微/同业/运营/贷后/审计/客服",
    "securities": "券商：经纪/两融/投行承销/财富/自营风控/研究所/清算/客服",
    "insurance": "保险：个险/团险/车险/健康险/再保/保全/续期/客服/精算协同",
    "fund": "公募/私募/资管：产品设计/募集/交易运营/估值/投资者服务/投研/风控",
    "fintech": "消费金融/金科：获客/授信决策/催收协同/反欺诈/联合贷/客服/运营",
}


def load_env() -> dict[str, str]:
    kv: dict[str, str] = {}
    for p in (ROOT / ".env", ROOT / "backend" / ".env"):
        if not p.exists():
            continue
        for line in p.read_text(encoding="utf-8-sig").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            kv[k.strip()] = v.strip().strip('"').strip("'")
    return kv


def deepseek_chat(messages: list[dict[str, str]], *, timeout: int = 90) -> str:
    env = load_env()
    key = env.get("DEEPSEEK_API_KEY") or env.get("LLM_API_KEY") or ""
    if not key:
        raise RuntimeError("未找到 DEEPSEEK_API_KEY")
    base = (env.get("DEEPSEEK_BASE_URL") or env.get("LLM_BASE_URL") or "https://api.deepseek.com/v1").rstrip("/")
    model = env.get("DEEPSEEK_MODEL") or env.get("LLM_MODEL") or "deepseek-chat"
    body = json.dumps(
        {"model": model, "messages": messages, "temperature": 0.4},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return str(data["choices"][0]["message"]["content"])


def extract_json(text: str) -> list[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start = text.find("[")
    end = text.rfind("]")
    if start < 0 or end < 0:
        raise ValueError("响应中无 JSON 数组")
    return json.loads(text[start : end + 1])


def normalize_row(raw: dict, vertical: str, existing_names: set[str]) -> dict | None:
    name = str(raw.get("name") or "").strip()
    if not name or name in existing_names:
        return None
    key = str(raw.get("capability_key") or "").strip()
    if key not in ALLOWED_KEYS:
        return None
    category = str(raw.get("category") or "业务运营").strip() or "业务运营"
    problem = str(raw.get("problem") or "").strip() or f"{name}；真能力入库，空库空列表。"
    pages = str(raw.get("pages") or "form+list").strip()
    page_kind = str(raw.get("page_kind") or "form_list").strip()
    row: dict = {
        "name": name,
        "category": category,
        "capability_key": key,
        "pages": pages,
        "problem": problem,
        "page_kind": page_kind,
        "form_headline": str(raw.get("form_headline") or name).strip()[:80],
        "agent": key,
    }
    if raw.get("default_category"):
        row["default_category"] = str(raw["default_category"]).strip()[:40]
    kb = str(raw.get("kb_slug") or "").strip()
    if kb and kb in KB_BY_VERTICAL.get(vertical, []):
        row["kb_slug"] = kb
    elif key in ("kb_document", "chat_qa", "policy_qa", "approval_flow"):
        # 默认挂合规库
        row["kb_slug"] = KB_BY_VERTICAL[vertical][0]
    if key == "finance_news":
        row["vertical"] = vertical
        row["pages"] = "list"
        row["page_kind"] = "list"
    if key == "chart_dashboard" or key == "ops_kpi":
        row["metrics_source"] = "finance_ops"
        row["pages"] = "chart"
        row["page_kind"] = "chart"
    if key == "notify_im":
        row["pages"] = "notify"
        row["page_kind"] = "notify"
    return row


def gen_for_vertical(vertical: str) -> list[dict]:
    existing = EXISTING[vertical]
    allowed = ", ".join(sorted(ALLOWED_KEYS))
    kbs = ", ".join(KB_BY_VERTICAL[vertical])
    prompt = f"""你是 CapShip 金融行业包产品架构师。为垂直「{vertical}」（{VERTICAL_HINT[vertical]}）补充业务场景。

硬约束：
1. 只输出 JSON 数组，不要 markdown。
2. 每个元素字段：name, category, capability_key, pages, problem, page_kind, form_headline；可选 default_category, kb_slug。
3. capability_key 只能从以下选择：{allowed}
4. kb_slug 只能是：{kbs}（知识库/审批/问答类尽量带）
5. 不要重复这些已有场景名：{json.dumps(existing, ensure_ascii=False)}
6. 新增 12~16 条，覆盖前中后台，名称短（<=12字），problem 一句话说明真业务价值。
7. 同一 capability_key 可复用多次，但须用不同 default_category 或不同业务名区分。
8. pages/page_kind：工单类 form+list/form_list；知识库 kb+chat/chat_kb；审批 approval+kb/form_list；通知 notify/notify；看板 chart/chart；新闻 list/list。
9. 禁止编造未列出的 capability_key。
"""
    raw = deepseek_chat(
        [
            {"role": "system", "content": "只输出合法 JSON 数组。中文。"},
            {"role": "user", "content": prompt},
        ]
    )
    items = extract_json(raw)
    out: list[dict] = []
    names = set(existing)
    for it in items:
        if not isinstance(it, dict):
            continue
        row = normalize_row(it, vertical, names)
        if not row:
            continue
        names.add(row["name"])
        out.append(row)
    return out


def main() -> int:
    out_path = ROOT / "backend" / "app" / "data" / "_finance_scene_enrichment.json"
    result: dict[str, list[dict]] = {}
    for v in ("bank", "securities", "insurance", "fund", "fintech"):
        print(f"generating {v} ...", flush=True)
        rows = gen_for_vertical(v)
        result[v] = rows
        print(f"  -> {len(rows)} new scenes", flush=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
