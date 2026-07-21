"""压测 compose-edit：乱七八糟用户话术能否落到合理能力/页面。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.compose_edit import compose_edit_from_instruction

# (话术, industry_key, 期望能力前缀或特殊标记)
CASES: list[tuple[str, str, str]] = [
    # —— 办公 SSOT / 同义 ——
    ("加一个请假申请", "office", "leave_request"),
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
    # —— 销售 ——
    ("加一个线索录入", "sales", "sales_lead"),
    ("公海领取功能", "sales", "sales_lead"),
    ("丢单原因分析页", "sales", "kill_pipeline"),
    ("赢单复盘要证据", "sales", "deal_evidence"),
    ("报价合同", "sales", "quote_contract"),
    ("销售漏斗看板", "sales", "chart_funnel|ops_kpi|chart_dashboard"),
    # —— 制造 / 现场 ——
    ("产线设备坏了要报修", "mfg", "device_repair"),
    ("质检SOP录入", "mfg", "quality_inspect"),
    ("库存盘点", "mfg", "inventory_count"),
    ("物业报修水管漏了", "realestate", "property_repair"),
    ("巡检打卡", "mfg", "site_patrol"),
    # —— 行业杂 ——
    ("智能导诊", "med", "med_triage"),
    ("护士排班", "med", "nurse_shift"),
    ("玩家FAQ", "game", "game_support"),
    ("家校通知", "edu", "school_notice"),
    ("作业答疑", "edu", "homework_qa"),
    ("会员积分营销", "retail", "member_loyalty"),
    # —— 口语乱七八糟 ——
    ("嗯那个…帮忙加一下请假的吧谢谢", "office", "leave_request"),
    ("能不能整一个报销？老板要看", "office", "expense_claim"),
    ("加页面：季度OKR看板", "", "chart|ops|gen_|data_nl"),
    ("我要一个科学计算器", "", "gen_"),
    ("2048小游戏", "", "game_2048|gen_"),
    ("随便来个神秘功能叫星际物流调度", "", "gen_"),
    ("加一个自定义的客户满意度回访表", "sales", "gen_|sales_|survey|form"),
    ("帮我搞个飞书同步提醒之类的", "", "notify|gen_|im"),
    # —— 改/删意图（允许空 ops 但不应误 add 错能力） ——
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
        if "patch" in expected and ("patch_page" in kinds or not ops or any(o.get("capability_key") == "leave_request" for o in ops)):
            return True, f"ops={[o.get('op') for o in ops]}"
        return False, f"unexpected ops={[o.get('op') for o in ops]}"

    if not op:
        return False, "no add op"
    cap = str(op.get("capability_key") or "")
    widget = str(op.get("widget") or "")
    pending = bool(op.get("pending_codegen"))
    formal = not cap.startswith("gen_") and widget and widget != "GeneratedPageWidget"

    alts = expected.split("|")
    matched = False
    for a in alts:
        a = a.strip()
        if a == "gen_" and cap.startswith("gen_"):
            matched = True
            break
        if a and (a in cap or a in widget.lower()):
            matched = True
            break
    if not matched:
        return False, f"cap={cap} widget={widget} pending={pending}"

    # 期望正式能力时，禁止掉进 GeneratedPageWidget
    if not any(a.startswith("gen_") for a in alts) and "gen_" not in expected:
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
            # 附带 reply 方便排查
            soft.append(f"    reply={result.get('reply','')[:120]}")

    total = len(CASES)
    print("\n========")
    print(f"passed {passed}/{total}  failed {len(failed)}")
    if failed:
        print("\n失败明细:")
        for f, s in zip(failed, soft):
            print(f)
            print(s)
    # 写报告
    out = ROOT / "docs" / "previews" / "compose-edit-messy-demand-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(
            {"passed": passed, "total": total, "failed": failed},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"report → {out}")
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
