"""压测 compose-edit：乱七八糟口语需求 → ops 落地矩阵。"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.compose_edit import _fallback_ops, compose_edit_from_instruction
from app.core import config as cfg

# 强制走本地语义（压测要稳定可回归；LLM 另做冒烟）
_orig_key = cfg.settings.deepseek_api_key
cfg.settings.deepseek_api_key = ""

# 故意杂乱、口语、跨域、含错别字/省略/复合意图
CASES = [
    # 办公审批类
    "帮我搞个请假的",
    "加班要申请咋弄",
    "团建报销走一下",
    "出差申请+借款一起",
    "用印盖章申请",
    "会议室约一下明天下午",
    # 销售
    "客户线索录进去",
    "公海池领一个",
    "丢单原因记一下",
    "赢单复盘要证据",
    "报价单出一份",
    # 制造/现场
    "产线机器坏了报修",
    "质检不合格怎么录",
    "今晚盘点库存",
    # 知识/问答
    "制度问问看",
    "上传个员工手册",
    "自然语言查上周审批量",
    # 排班/看板
    "护士排班表",
    "经营看板看一眼",
    "漏斗转化图",
    # 工具/未知（应 Path B 或可预见模板）
    "来个科学计算器",
    "做个抽奖转盘",
    "给客户做一个满意度问卷",
    "OKR 季度目标填报",
    "访客预约登记",
    "停车位申请",
    "快递收发登记本",
    "会议室门禁二维码",
    "年会节目报名",
    "供应商准入评估表",
    # 模糊/复合/改名
    "把请假改成事假申请",
    "不要报销了",
    "日期改成点选的",
    "随便加点啥审批",
    "我想要一个类似钉钉的审批流但是偏销售",
]


def summarize(op: dict) -> dict:
    mock = op.get("page_mock") if isinstance(op.get("page_mock"), dict) else {}
    fields = op.get("form_fields") or mock.get("fields") or []
    return {
        "op": op.get("op"),
        "label": op.get("label"),
        "cap": op.get("capability_key"),
        "widget": op.get("widget"),
        "category": op.get("category"),
        "page_kind": op.get("page_kind"),
        "pending": bool(op.get("pending_codegen")),
        "fields_n": len(fields) if isinstance(fields, list) else 0,
        "has_interactive": bool(op.get("interactive") or mock.get("interactive")),
        "scene_key": op.get("scene_key"),
    }


def grade(ops: list[dict], instruction: str) -> str:
    if not ops:
        return "EMPTY"
    add = [o for o in ops if o.get("op") == "add"]
    rename = [o for o in ops if o.get("op") == "rename"]
    remove = [o for o in ops if o.get("op") == "remove"]
    patch = [o for o in ops if o.get("op") == "patch_page"]
    if rename or remove or patch:
        return "MUTATE_OK"
    if not add:
        return "NO_ADD"
    o = add[0]
    cap = str(o.get("capability_key") or "")
    widget = str(o.get("widget") or "")
    if cap.startswith("gen_") or widget == "GeneratedPageWidget":
        mock = o.get("page_mock") if isinstance(o.get("page_mock"), dict) else {}
        fields = o.get("form_fields") or mock.get("fields") or []
        if o.get("interactive") or mock.get("interactive"):
            return "PATH_B_TOOL"
        if isinstance(fields, list) and len(fields) >= 2:
            return "PATH_B_FORM"
        return "PATH_B_WEAK"
    if widget and widget != "ListWidget":
        return "PATH_A"
    return "PATH_A_WEAK"


# 观感验收：错挂 / 空壳算 FAIL（不计入 70% 可用）
def _fields_n(o: dict) -> int:
    mock = o.get("page_mock") if isinstance(o.get("page_mock"), dict) else {}
    fields = o.get("form_fields") or mock.get("fields") or []
    return len(fields) if isinstance(fields, list) else 0


_QUALITY_EXPECT: list[tuple[str, object]] = [
    ("加班要申请咋弄", lambda ops: any(o.get("capability_key") == "leave_request" and "加班" in str(o.get("label") or "") for o in ops)),
    ("会议室约一下明天下午", lambda ops: any(o.get("capability_key") == "meeting_booking" for o in ops)),
    (
        "会议室门禁二维码",
        lambda ops: (
            not any(o.get("capability_key") == "meeting_booking" for o in ops)
            and any(_fields_n(o) >= 2 and ("门禁" in str(o.get("label") or "") or "通行" in str(o.get("label") or "")) for o in ops)
        ),
    ),
    ("做个抽奖转盘", lambda ops: any(_fields_n(o) >= 2 for o in ops)),
    ("给客户做一个满意度问卷", lambda ops: any(_fields_n(o) >= 2 for o in ops)),
    ("不要报销了", lambda ops: any(o.get("op") == "remove" for o in ops) and not any(o.get("op") == "add" for o in ops)),
]


def quality_ok(q: str, ops: list[dict], g: str) -> bool:
    if g in ("EMPTY", "NO_ADD", "PATH_B_WEAK"):
        return False
    for tip, pred in _QUALITY_EXPECT:
        if tip == q:
            return bool(pred(ops))
    return g in ("PATH_A", "PATH_B_FORM", "PATH_B_TOOL", "MUTATE_OK", "PATH_A_WEAK")


def main() -> None:
    rows = []
    try:
        for q in CASES:
            r = compose_edit_from_instruction(
                instruction=q,
                menu=[
                    {"key": "leave_request", "label": "请假申请", "capability_key": "leave_request", "category": "人事行政"},
                    {"key": "expense_claim", "label": "费用报销", "capability_key": "expense_claim", "category": "财务法务"},
                ],
                capability_keys=["leave_request", "expense_claim"],
                industry_key="office",
                entry_source="capship_workbench",
            )
            ops = list(r.get("ops") or [])
            g = grade(ops, q)
            ok = quality_ok(q, ops, g)
            rows.append(
                {
                    "q": q,
                    "grade": g,
                    "quality_ok": ok,
                    "reply": (r.get("reply") or "")[:80],
                    "ops": [summarize(o) for o in ops[:3]],
                }
            )
    finally:
        cfg.settings.deepseek_api_key = _orig_key

    by: dict[str, int] = {}
    for row in rows:
        by[row["grade"]] = by.get(row["grade"], 0) + 1

    ok_n = sum(1 for row in rows if row["quality_ok"])
    rate = round(100.0 * ok_n / max(len(rows), 1), 1)
    out = {
        "summary": by,
        "total": len(rows),
        "quality_ok": ok_n,
        "quality_rate_pct": rate,
        "pass_threshold_70": rate >= 70.0,
        "cases": rows,
    }
    out_path = ROOT / "scripts" / "_compose_edit_chaos_report.json"
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print("SUMMARY", json.dumps(by, ensure_ascii=False))
    print(f"QUALITY {ok_n}/{len(rows)} = {rate}%  pass≥70={rate >= 70}")
    print("TOTAL", len(rows))
    for row in rows:
        mark = "OK" if row["quality_ok"] else "FAIL"
        print(f"[{mark} {row['grade']:12}] {row['q']}")
        for o in row["ops"]:
            print(f"             -> {o}")
    print("WROTE", out_path)
    if rate < 70.0:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
