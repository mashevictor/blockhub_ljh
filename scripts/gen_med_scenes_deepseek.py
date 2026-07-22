# -*- coding: utf-8 -*-
"""DeepSeek 生成「医疗健康」场景 — 科学、专业、含 AI 技术点。

对齐销售包结构：真 capability + fields + default_category。
禁止伪医疗营销话术；须含可落地的 AI 能力表述（预问诊规则/LLM、RAG 指南、NL 问数等）。
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ.setdefault("DEEPSEEK_TIMEOUT", "120")

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

_env = ROOT / "backend" / ".env"
if _env.is_file():
    for line in _env.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k:
            os.environ[k] = v
os.environ.setdefault("DEEPSEEK_TIMEOUT", "120")

from importlib import reload  # noqa: E402

import app.core.config as _cfg  # noqa: E402

reload(_cfg)
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

OUT = ROOT / "scripts" / "_med_scenes_full_deepseek.json"

ALLOWED = [
    "med_triage",
    "nurse_shift",
    "kb_document",
    "chat_qa",
    "policy_qa",
    "approval_flow",
    "approval_inbox",
    "notify_im",
    "leave_request",
    "asset_manage",
    "chart_dashboard",
    "data_nl_query",
    "erp_connector",
    "rbac_page",
    "site_patrol",
    "quality_inspect",
]

BANNED_NAMES = [
    "费用报销", "借款", "用印", "会议室", "入职", "离职", "IT报障", "VPN",
    "对接OA", "对接HR", "单点登录", "SSO", "通用审批", "多级会签",
    "包治百病", "神药", "偏方治癌",
]

# (大类, 覆盖提示含 AI/专业要点, 条数)
CATEGORIES: list[tuple[str, str, int]] = [
    (
        "AI导诊与分诊",
        "症状预问诊NLP科室推荐、急诊ESI/分级分诊辅助、导诊待办闭环、复诊预约引导、"
        "主诉结构化、过敏史采集、红旗症状预警、儿科/妇产分诊分流",
        8,
    ),
    (
        "智能护理排班",
        "调班申请冲突检测、护士长审批、排班一览、弹性排班、夜班交接清单、"
        "人力负荷看板、请假联动补位、班次合规校验（连续夜班上限）",
        7,
    ),
    (
        "临床知识RAG",
        "诊疗指南向量检索、药品说明书问答、临床路径参考、护理SOP检索、"
        "病例讨论纪要助手、继续教育题库、抗菌药物合理使用问答、检验危急值释义",
        8,
    ),
    (
        "医疗安全质控",
        "不良事件上报审批、近错事件、院感巡查、质控SOP检查、医疗待办中心、"
        "院感预警推送、手卫生抽查、高警示药品核对",
        7,
    ),
    (
        "临床协同审批",
        "会诊转诊、MDT多学科会诊、手术申请、床位协调、危急值通知、"
        "输血申请审批、特殊检查申请",
        6,
    ),
    (
        "智慧物资设备",
        "高值耗材追溯领用、设备台账、申购审批、维保到期提醒、计量检定到期、灭菌包追溯",
        5,
    ),
    (
        "医疗智能分析",
        "科室运营看板、自然语言医疗问数、床位占用分析、门诊量趋势、"
        "平均住院日分析、DRG/病组粗览（仅运营指标勿编造临床结论）",
        6,
    ),
    (
        "互联互通与合规",
        "HIS/LIS/PACS对接、数据脱敏权限、企微医护提醒、钉钉排班同步、"
        "隐私合规问答、角色权限RBAC",
        5,
    ),
]


def _banned(name: str) -> bool:
    n = name or ""
    return any(b in n for b in BANNED_NAMES)


def gen_category(category: str, hints: str, n: int) -> list[dict]:
    system = f"""你是三甲医院信息科 + 临床信息化顾问，同时熟悉 CapShip 能力装配。输出严格 JSON。

专业与科学硬约束：
1. 使用规范医疗术语（主诉、现病史、ESI/分诊级别、危急值、院感、MDT、DRG、SOP、LIS/HIS/PACS 等）。
2. 禁止夸大疗效、禁止替代医生诊断；AI 仅作「辅助决策/检索/分流」，problem 中必须写明边界。
3. 每条 scene 的 problem 必须同时包含：①真实业务痛点 ②AI/算法技术点（如：规则引擎+LLM预问诊、RAG指南检索、冲突检测、NL2SQL问数、Webhook触达）③真库闭环（写入/查询正式 API，空库空列表）。
4. form 字段用临床可读标签；placeholder 给真实示例（勿编造具体患者隐私）。
5. 只写院内医疗场景，禁止办公人事/IT/用印。
6. 场景名禁止：{", ".join(BANNED_NAMES)}
7. capability_key 只能从：{", ".join(ALLOWED)}
8. 导诊/预问诊/分诊/挂号分流 → med_triage；调班/排班 → nurse_shift；不良事件/会诊/手术/申购 → approval_flow；指南/说明书 → kb_document 或 chat_qa；制度合规 → policy_qa；问数 → data_nl_query。
9. 恰好 {n} 条，name 短（≤10字）、互不重复；page_kind：form_list|chat_kb|chart|notify|integration
10. form_list 给 2～4 fields；default_category 英文短横线 slug；另给 ai_angle（一句话技术点）。
"""
    user = f"""大类：{category}
覆盖提示：{hints}

输出：
{{
  "scenes": [
    {{
      "name": "场景短名",
      "category": "{category}",
      "capability_key": "...",
      "pages": "form+list|chat+kb|chart|notify|kb|integration|form+approval",
      "problem": "痛点 + AI技术点 + 真库闭环 + 不替代诊疗的边界",
      "ai_angle": "本场景核心AI技术一句话",
      "page_kind": "...",
      "default_category": "英文slug",
      "form_headline": "专业标题",
      "fields": [{{"key":"","label":"","type":"text|number|date|textarea","placeholder":"","optional":false}}]
    }}
  ]
}}
恰好 {n} 条；category 固定为「{category}」。
"""
    r = deepseek_json_chat(system, user, temperature=0.2)
    if not r:
        raise RuntimeError(f"DeepSeek failed: {category}")
    scenes = []
    for s in r.get("scenes") or []:
        name = str(s.get("name") or "").strip()
        if not name or _banned(name):
            continue
        ck = str(s.get("capability_key") or "")
        if ck not in ALLOWED:
            pk = str(s.get("page_kind") or "")
            s["capability_key"] = {
                "chat_kb": "chat_qa",
                "chart": "chart_dashboard",
                "notify": "notify_im",
                "integration": "erp_connector",
            }.get(pk, "med_triage")
        # 合并 ai_angle 进 problem，保证 SSOT 可读
        angle = str(s.get("ai_angle") or "").strip()
        problem = str(s.get("problem") or name).strip()
        if angle and angle not in problem:
            problem = f"{problem} 【AI】{angle}"
        s["problem"] = problem
        s["category"] = category
        s["name"] = name
        scenes.append(s)
    if len(scenes) < n:
        print(f"WARN {category}: kept {len(scenes)}/{n}", file=sys.stderr)
    return scenes[:n]


def main() -> None:
    overview = (
        "医疗健康深度包：AI 预问诊与分诊（规则+LLM）、指南 RAG、护理排班冲突检测、"
        "不良事件与 MDT 审批、医疗 NL 问数与 HIS 对接；正式能力接真 API，空库空列表；"
        "AI 仅辅助导诊与检索，不替代执业医师诊疗。"
    )
    highlights = [
        "AI 预问诊 · 规则引擎+大模型科室建议",
        "临床指南 RAG · 药品/SOP 可问答",
        "护理排班冲突检测与审批闭环",
        "医疗问数 / 运营看板 · 真指标可查",
    ]
    all_scenes: list[dict] = []
    seen: set[str] = set()
    for cat, hints, n in CATEGORIES:
        print(f"generating {cat} ×{n} …")
        batch = gen_category(cat, hints, n)
        for s in batch:
            name = str(s.get("name") or "").strip()
            if name in seen or _banned(name):
                continue
            seen.add(name)
            all_scenes.append(s)
        print(f"  ok total={len(all_scenes)}")

    payload = {
        "overview": overview,
        "highlights": highlights,
        "categories": [c[0] for c in CATEGORIES],
        "scenes": all_scenes,
        "source": "deepseek_med_ai_v2",
        "scene_count": len(all_scenes),
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} scenes={len(all_scenes)}")
    from collections import Counter

    print("by category:", dict(Counter(s["category"] for s in all_scenes)))
    print("by capability:", dict(Counter(s["capability_key"] for s in all_scenes)))


if __name__ == "__main__":
    main()
