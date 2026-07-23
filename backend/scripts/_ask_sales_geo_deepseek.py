"""Ask DeepSeek: GEO-first sales feature pack (5 features)."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / ".env"
OUT = ROOT / "scripts" / "_sales_geo_deepseek.json"


def load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    for line in ENV.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def main() -> None:
    e = load_env()
    key = e.get("DEEPSEEK_API_KEY") or e.get("LLM_API_KEY") or ""
    if not key:
        raise SystemExit("no DEEPSEEK_API_KEY")
    base = (e.get("DEEPSEEK_BASE_URL") or "https://api.deepseek.com/v1").rstrip("/")
    model = e.get("DEEPSEEK_MODEL") or "deepseek-chat"

    system = "你是B2B销售SaaS产品经理。只输出严格JSON，不要markdown围栏。"
    user = """昨天我们已落地的销售获客差异化（必须保留并作为背景）：
1) 目的/方法优先，不是漏斗硬塞获客（录入/分配/清洗/公海/评分/转介绍）
2) 角色视图：一线销售 / 销售主管 / 市场 看到不同首页与动作
3) 真库 sales_lead + 渠道 source 聚合；跟进成交降为二级漏斗
4) Runtime 用 GtgtStepComposer 单字段推进；空库空列表

用户痛点：当前销售页面规划差、功能不对。要求把 GEO获客 作为第一重点，且实现逻辑必须能在现有 CapShip 栈落地（PG真库+API+Web/App widget，禁止假数据冒充）。

GEO=生成式引擎优化获客：让豆包/DeepSeek/Kimi/ChatGPT等AI回答里更容易引用你的品牌，并把由此带来的咨询沉淀成线索。

请设计正好5个功能（F1必须是GEO获客主路径），每个含：
- id, name, one_liner
- why_diff（相对传统CRM线索看板差异化一句话）
- who（角色）
- page_layout（页面区块从上到下，数组）
- gtgt_steps（若有填表：[{key,label}]，最多5步；没有则[]）
- landable_logic（可落地实现：表/API/数据流；禁止声称可爬取ChatGPT全网）
- anti_fake（如何保证空库=空列表）

输出JSON对象：
{"yesterday_diff_summary":["..."],"geo_core_logic":"...","features":[...正好5个...]}
"""

    payload = {
        "model": model,
        "temperature": 0.3,
        "max_tokens": 2500,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    req = urllib.request.Request(
        base + "/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    text = str(body["choices"][0]["message"]["content"]).strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:].lstrip()
    data = json.loads(text)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"WROTE {OUT}")


if __name__ == "__main__":
    main()
