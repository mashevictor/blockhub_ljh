#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把金融场景中非真后端能力收敛到真 Path A。"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "backend" / "app" / "data" / "finance_vertical_capabilities.py"
text = path.read_text(encoding="utf-8")

text = text.replace('"capability_key": "notify_email"', '"capability_key": "notify_im"')
text = text.replace('"agent": "notify_email"', '"agent": "notify_im"')

# asset_manage → 真金融工单
replacements = [
    (
        '''        "name": "同业授信额度管理",
        "category": "同业",
        "capability_key": "asset_manage",
        "pages": "form+list",
        "problem": "同业授信额度占用与释放依赖手工台账，易超限或遗漏，需系统化管控额度使用与预警。",
        "page_kind": "form_list",
        "form_headline": "同业授信额度台账",
        "agent": "asset_manage",
        "default_category": "interbank_limit",
''',
        '''        "name": "同业授信额度管理",
        "category": "同业",
        "capability_key": "credit_approval",
        "pages": "form+list",
        "problem": "同业授信额度占用与审批留痕；真授信单入库，空库空列表。",
        "page_kind": "form_list",
        "form_headline": "同业授信额度",
        "agent": "credit_approval",
        "default_category": "interbank",
''',
    ),
    (
        '''        "name": "联合贷对账",
        "category": "联合贷",
        "capability_key": "asset_manage",
        "pages": "form+list",
        "problem": "自动匹配合作方资金流水与内部账务，降低对账差错率",
        "page_kind": "form_list",
        "form_headline": "联合贷对账任务",
        "agent": "asset_manage",
''',
        '''        "name": "联合贷对账",
        "category": "联合贷",
        "capability_key": "regulatory_report",
        "pages": "form+list",
        "problem": "联合贷对账批次与差异留痕；真监管报送单入库，空库空列表。",
        "page_kind": "form_list",
        "form_headline": "联合贷对账",
        "agent": "regulatory_report",
        "default_category": "joint_loan",
''',
    ),
]

# problem text may have been truncated with …
# fallback: regex-free line rewrite by name blocks
for old, new in replacements:
    if old in text:
        text = text.replace(old, new)
    else:
        print("WARN exact block miss, will try soft replace")

# Soft replace by name if needed
if '"capability_key": "asset_manage"' in text:
    lines = text.splitlines(True)
    out: list[str] = []
    i = 0
    while i < len(lines):
        if '"name": "同业授信额度管理"' in lines[i]:
            # rewrite until object end
            block = [lines[i]]
            i += 1
            while i < len(lines) and lines[i].strip() not in ("},", "}"):
                block.append(lines[i])
                i += 1
            if i < len(lines):
                block.append(lines[i])
                i += 1
            blob = "".join(block)
            blob = blob.replace('"capability_key": "asset_manage"', '"capability_key": "credit_approval"')
            blob = blob.replace('"agent": "asset_manage"', '"agent": "credit_approval"')
            if '"default_category"' not in blob:
                blob = blob.replace(
                    '"form_headline":',
                    '"default_category": "interbank",\n        "form_headline":',
                )
            else:
                blob = blob.replace('"default_category": "interbank_limit"', '"default_category": "interbank"')
            out.append(blob)
            continue
        if '"name": "联合贷对账"' in lines[i]:
            block = [lines[i]]
            i += 1
            while i < len(lines) and lines[i].strip() not in ("},", "}"):
                block.append(lines[i])
                i += 1
            if i < len(lines):
                block.append(lines[i])
                i += 1
            blob = "".join(block)
            blob = blob.replace('"capability_key": "asset_manage"', '"capability_key": "regulatory_report"')
            blob = blob.replace('"agent": "asset_manage"', '"agent": "regulatory_report"')
            if '"default_category"' not in blob:
                blob = blob.replace(
                    '"form_headline":',
                    '"default_category": "joint_loan",\n        "form_headline":',
                )
            out.append(blob)
            continue
        out.append(lines[i])
        i += 1
    text = "".join(out)

# strip metrics_source from ops_kpi objects
lines = text.splitlines(True)
out = []
i = 0
while i < len(lines):
    out.append(lines[i])
    if '"capability_key": "ops_kpi"' in lines[i]:
        j = i + 1
        while j < len(lines) and lines[j].strip() not in ("},", "}"):
            if '"metrics_source": "finance_ops"' in lines[j]:
                j += 1
                continue
            out.append(lines[j])
            j += 1
        if j < len(lines):
            out.append(lines[j])
        i = j + 1
        continue
    i += 1
text = "".join(out)

path.write_text(text, encoding="utf-8")
print("wrote", path)

sys.path.insert(0, str(ROOT / "backend"))
import app.data.finance_vertical_capabilities as m

importlib.reload(m)
weak = []
for pk, rows in m.VERTICAL_ROWS.items():
    for r in rows:
        if r["capability_key"] in ("notify_email", "asset_manage"):
            weak.append((pk, r["name"], r["capability_key"]))
        if r["capability_key"] == "ops_kpi" and r.get("metrics_source") == "finance_ops":
            weak.append((pk, r["name"], "ops+fo"))
print("remaining_weak", weak)
