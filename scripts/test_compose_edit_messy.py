"""压测 compose-edit：乱七八糟用户话术能否落到合理能力/页面。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.compose_edit import compose_edit_from_instruction

# (话术, industry_key, 期望能力前缀或特殊标记)
# 计划表 ≥10 条 + 扩展口语
CASES: list[tuple[str, str, str]] = [
    # —— 计划必测 10 条 ——
    ("加一个请假申请", "office", "leave_request"),
    ("产线设备坏了要报修", "mfg", "device_repair"),
    ("公海领取功能", "sales", "sales_lead"),
    ("丢单原因分析页", "sales", "kill_pipeline"),
    ("赢单复盘要证据", "sales", "deal_evidence"),
    ("销售漏斗看板", "sales", "chart_funnel"),
    ("加页面：季度OKR看板", "", "ops_kpi|chart_dashboard"),
    ("我要一个科学计算器", "", "tool_pad"),
    ("2048小游戏", "", "game_2048"),
    ("加一个贪吃蛇", "", "generated_code"),
    ("银行KYC开户", "bank", "finance_kyc"),
    ("反洗钱监测工单", "bank", "finance_aml"),
    # —— 扩展 ——
    ("帮我挂个年假审批", "office", "leave_request"),
    ("加班申请也要", "office", "leave_request"),
    ("团建经费审批", "office", "expense_claim"),
    ("差旅报销搞一下", "office", "expense_claim"),
    ("费用报销", "office", "expense_claim"),
    ("入职办理流程", "office", "hire_onboard"),
    ("制度政策问答", "office", "policy_qa"),
    ("来个知识库上传", "office", "kb_document"),
    ("会议室预约", "office", "meeting_booking"),
    ("IT报障电脑开不了机", "office", "it_ticket"),
    ("用印申请", "office", "seal_request"),
    ("资产领用", "office", "asset_manage"),
    ("加一个线索录入", "sales", "sales_lead"),
    ("报价合同", "sales", "quote_contract"),
    ("质检SOP录入", "mfg", "quality_inspect"),
    ("库存盘点", "mfg", "inventory_count"),
    ("物业报修水管漏了", "realestate", "property_repair"),
    ("巡检打卡", "mfg", "site_patrol"),
    ("智能导诊", "med", "med_triage"),
    ("护士排班", "med", "nurse_shift"),
    ("玩家FAQ", "game", "game_support"),
    ("家校通知", "edu", "school_notice"),
    ("作业答疑", "edu", "homework_qa"),
    ("会员积分营销", "retail", "member_loyalty"),
    ("嗯那个…帮忙加一下请假的吧谢谢", "office", "leave_request"),
    ("能不能整一个报销？老板要看", "office", "expense_claim"),
    ("来个英雄联盟模拟", "", "generated_code"),
    ("加一个股票API测试", "", "generated_code"),
    ("随便来个神秘功能叫星际物流调度", "", "gen_"),
    ("加一个自定义的客户满意度回访表", "sales", "gen_|sales_|survey|form"),
    ("帮我搞个飞书同步提醒之类的", "", "notify|gen_|im"),
    # —— 改/删意图 ——
    ("把请假申请改成事假申请", "office", "rename|empty"),
    ("去掉知识库", "office", "remove|empty"),
    ("请假开始结束日期改成日期选择", "office", "patch|empty|leave"),
]

MENU_WITH_LEAVE = [
    {"key": "leave_request", "label": "请假申请", "capability_key": "leave_request", "category": "人事行政"},
    {"key": "kb_document", "label": "知识库", "capability_key": "kb_document", "category": "知识协同"},
]


def expect_ok(expected: str, op: dict | None, ops: list) -> tuple[bool, str]:
    if expected in {"rename|empty", "remove|empty", "patch|empty|leave"}:
        kinds = {str(o.get("op")) for o in ops}
        if "rename" in expected and ("rename" in kinds or not ops):
            return True, f"ops={[o.get('op') for o in ops]}"
        if "remove" in expected and ("remove" in kinds or not ops):
            return True, f"ops={[o.get('op') for o in ops]}"
        if "patch" in expected and (
            "patch_page" in kinds
            or not ops
            or any(o.get("capability_key") == "leave_request" for o in ops)
        ):
            return True, f"ops={[o.get('op') for o in ops]}"
        return False, f"unexpected ops={[o.get('op') for o in ops]}"

    if not op:
        return False, "no add op"
    cap = str(op.get("capability_key") or "")
    widget = str(op.get("widget") or "")
    pending = bool(op.get("pending_codegen"))
    page_kind = str(op.get("page_kind") or "")
    interactive = op.get("interactive") if isinstance(op.get("interactive"), dict) else None
    if not interactive and isinstance(op.get("page_mock"), dict):
        interactive = op["page_mock"].get("interactive")
    html = str(op.get("source_html") or "").strip()
    formal = not cap.startswith("gen_") and widget and widget != "GeneratedPageWidget"

    # tool_pad：计算器等
    if expected == "tool_pad":
        ok = (
            isinstance(interactive, dict)
            and str(interactive.get("type") or "") == "tool_pad"
            and not pending
        )
        if not ok:
            return False, f"expected tool_pad interactive, got interactive={interactive} pending={pending} cap={cap}"
        return True, f"cap={cap} tool_pad buttons={len(interactive.get('buttons') or [])}"

    # generated_code：贪吃蛇 / 英雄联盟 / 股票API 等可玩页
    if expected == "generated_code":
        ok = page_kind == "generated_code" and (bool(html) or pending) and widget == "GeneratedPageWidget"
        # 有 foresight HTML 时禁止再挂空 pending 骨架
        if html and pending:
            return False, f"foresight html but still pending cap={cap}"
        # 禁止无意义 +1 计数器壳
        if html and ("点击互动" in html and "+1" in html and 'id="n"' in html):
            return False, f"meaningless +1 counter shell cap={cap}"
        if not ok:
            return False, f"expected generated_code, kind={page_kind} html_len={len(html)} pending={pending} widget={widget}"
        return True, f"cap={cap} kind={page_kind} html_len={len(html)} pending={pending}"

    alts = expected.split("|")
    matched = False
    for a in alts:
        a = a.strip()
        if a == "gen_" and cap.startswith("gen_"):
            matched = True
            break
        if a and (a in cap or a in widget.lower() or a in page_kind):
            matched = True
            break
    if not matched:
        return False, f"cap={cap} widget={widget} pending={pending} kind={page_kind}"

    # 英雄联盟等：必须立刻可玩
    label_sum = f"{op.get('label') or ''} {op.get('summary') or ''}"
    if any(w in label_sum for w in ("英雄联盟", "对战模拟", "贪吃蛇")):
        if not html or pending:
            return False, f"game foresight missing html/pending cap={cap} pending={pending} html_len={len(html)}"

    # 期望正式能力时，禁止掉进 GeneratedPageWidget
    if not any(a.startswith("gen_") for a in alts) and "gen_" not in expected and expected not in {
        "tool_pad",
        "generated_code",
    }:
        if not formal:
            return False, f"expected formal, got cap={cap} widget={widget}"
    return True, f"cap={cap} widget={widget} cat={op.get('category')} pending={pending}"


def main() -> None:
    passed = 0
    failed: list[str] = []
    soft: list[str] = []

    for i, (instr, industry, expected) in enumerate(CASES, 1):
        menu = MENU_WITH_LEAVE if any(x in expected for x in ("rename", "remove", "patch")) else []
        result = compose_edit_from_instruction(
            instruction=instr,
            menu=menu,
            capability_keys=[m["capability_key"] for m in menu],
            app_name="压测应用",
            industry_key=industry,
            entry_source="industry_site" if industry else "capship_workbench",
        )
        ops = list(result.get("ops") or [])
        add = next((o for o in ops if o.get("op") == "add"), None)
        ok, detail = expect_ok(expected, add, ops)
        mark = "OK" if ok else "FAIL"
        line = f"[{i:02d}] {mark}  「{instr}」  expect={expected}  → {detail}"
        print(line)
        if ok:
            passed += 1
        else:
            failed.append(line)
            soft.append(
                {
                    "instruction": instr,
                    "expected": expected,
                    "detail": detail,
                    "reply": result.get("reply"),
                    "ops": ops,
                }
            )

    total = len(CASES)
    out = ROOT / "docs" / "previews" / "compose-edit-messy-demand-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"passed": passed, "total": total, "failed": soft}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print()
    print("========")
    print(f"passed {passed}/{total}  failed {len(failed)}")
    if failed:
        print()
        print("失败明细:")
        for f in failed:
            print(f)
    print(f"report → {out}")
    raise SystemExit(0 if not failed else 1)


if __name__ == "__main__":
    main()
