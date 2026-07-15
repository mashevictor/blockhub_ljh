# -*- coding: utf-8 -*-
"""Generate CapShip office batch: leave/expense/policy/hire/lead/quote/kpi (s01-s07)."""
from __future__ import annotations

import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Load batch2 writer functions via exec after injecting CAPS
src = (ROOT / "scripts/gen_capship_batch2.py").read_text(encoding="utf-8")

CAPS = [
    {
        "key": "leave_request",
        "slug": "leave-request",
        "name": "请假审批",
        "cat": "人事行政",
        "widget": "LeaveRequestWidget",
        "prefix": "LR",
        "aliases": ("请假审批", "请假申请", "假期余额", "请假"),
        "fields": [
            ("category", "请假类型", 32, "annual"),
            ("applicant", "申请人", 120, ""),
            ("start_at", "开始日期", 64, ""),
            ("end_at", "结束日期", 64, ""),
            ("note", "事由", "text", ""),
        ],
        "statuses": ("open", "approved", "rejected", "done"),
        "advance": (("approved", "通过"), ("rejected", "驳回"), ("done", "归档")),
        "choices": {"category": [("annual", "年假"), ("sick", "病假"), ("personal", "事假")]},
        "color": "#8b5cf6",
        "scene": "s01",
        "role": "HR",
        "hint": "人事 · 流程",
        "prompt": "请假在线申请、主管审批与假期余额查询。",
        "flow": [
            ">> 请假审批 · 在线提单",
            ">> 主管批复 · 通过/驳回",
            ">> 企微钉钉飞书 · 结果推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📅",
        "req": ("start_at", "end_at"),
        "title_field": "applicant",
    },
    {
        "key": "expense_claim",
        "slug": "expense-claim",
        "name": "报销记账",
        "cat": "财务法务",
        "widget": "ExpenseClaimWidget",
        "prefix": "EC",
        "aliases": ("报销记账", "费用报销", "发票上传", "报销申请"),
        "fields": [
            ("category", "费用类型", 32, "travel"),
            ("title", "报销标题", 200, ""),
            ("amount", "金额", 64, ""),
            ("invoice_no", "发票号", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "reviewing", "paid", "rejected"),
        "advance": (("reviewing", "审核中"), ("paid", "已付款"), ("rejected", "驳回")),
        "choices": {"category": [("travel", "差旅"), ("meal", "餐饮"), ("office", "办公")]},
        "color": "#0284c7",
        "scene": "s02",
        "role": "财务",
        "hint": "财务 · 票据",
        "prompt": "费用报销拍照上传、财务审核与台账查询。",
        "flow": [
            ">> 报销记账 · 费用登记",
            ">> 财务审核 · 付款闭环",
            ">> 企微钉钉飞书 · 审核推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧾",
        "req": ("title", "amount"),
        "title_field": "title",
    },
    {
        "key": "policy_qa",
        "slug": "policy-qa",
        "name": "制度问答",
        "cat": "知识协同",
        "widget": "PolicyQaWidget",
        "prefix": "PQ",
        "aliases": ("制度问答", "制度政策", "福利政策", "制度查询"),
        "fields": [
            ("category", "类型", 32, "ask"),
            ("title", "问题/制度名", 200, ""),
            ("dept", "适用部门", 120, ""),
            ("answer", "答复摘要", 200, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "answered", "archived"),
        "advance": (("answered", "已答复"), ("archived", "归档")),
        "choices": {"category": [("ask", "提问"), ("policy", "制度"), ("benefit", "福利")]},
        "color": "#6366f1",
        "scene": "s03",
        "role": "使用者",
        "hint": "知识 · 自助",
        "prompt": "公司制度、福利政策智能问答，随时自助查询。",
        "flow": [
            ">> 制度问答 · 提问入库",
            ">> 答复归档 · 知识闭环",
            ">> 企微钉钉飞书 · 答复推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📘",
        "req": ("title",),
        "title_field": "title",
    },
    {
        "key": "hire_onboard",
        "slug": "hire-onboard",
        "name": "招聘入职",
        "cat": "人事行政",
        "widget": "HireOnboardWidget",
        "prefix": "HO",
        "aliases": ("招聘入职", "招聘管理", "简历筛选", "入职指引"),
        "fields": [
            ("category", "环节", 32, "job"),
            ("candidate", "候选人/岗位", 200, ""),
            ("stage", "阶段", 64, ""),
            ("owner", "负责人", 120, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "interview", "offered", "joined"),
        "advance": (("interview", "面试"), ("offered", "Offer"), ("joined", "已入职")),
        "choices": {"category": [("job", "岗位"), ("resume", "简历"), ("onboard", "入职")]},
        "color": "#a855f7",
        "scene": "s04",
        "role": "HR",
        "hint": "HR · 人才",
        "prompt": "招聘发布、简历筛选与入职指引一站式。",
        "flow": [
            ">> 招聘入职 · 候选人登记",
            ">> 面试/Offer · 入职闭环",
            ">> 企微钉钉飞书 · 进度推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🧑‍💼",
        "req": ("candidate",),
        "title_field": "candidate",
    },
    {
        "key": "sales_lead",
        "slug": "sales-lead",
        "name": "销售线索",
        "cat": "销售行业",
        "widget": "SalesLeadWidget",
        "prefix": "SL",
        "aliases": ("销售线索", "客户跟进", "线索录入", "销售漏斗"),
        "fields": [
            ("category", "阶段", 32, "lead"),
            ("customer", "客户名称", 200, ""),
            ("amount", "预计金额", 64, ""),
            ("owner", "跟进人", 120, ""),
            ("note", "跟进备注", "text", ""),
        ],
        "statuses": ("open", "following", "won", "lost"),
        "advance": (("following", "跟进中"), ("won", "成交"), ("lost", "丢单")),
        "choices": {"category": [("lead", "线索"), ("opportunity", "商机"), ("account", "客户")]},
        "color": "#ef4444",
        "scene": "s05",
        "role": "销售",
        "hint": "CRM · 跟进",
        "prompt": "线索录入、客户跟进与销售漏斗管理。",
        "flow": [
            ">> 销售线索 · 客户登记",
            ">> 跟进成交 · 漏斗闭环",
            ">> 企微钉钉飞书 · 跟进提醒",
            ">> CapShip · 双端真接口",
        ],
        "icon": "🔥",
        "req": ("customer",),
        "title_field": "customer",
    },
    {
        "key": "quote_contract",
        "slug": "quote-contract",
        "name": "报价合同",
        "cat": "销售行业",
        "widget": "QuoteContractWidget",
        "prefix": "QC",
        "aliases": ("报价合同", "报价审批", "合同评审", "特价申请"),
        "fields": [
            ("category", "类型", 32, "quote"),
            ("title", "标题", 200, ""),
            ("customer", "客户", 120, ""),
            ("amount", "金额", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "reviewing", "approved", "signed"),
        "advance": (("reviewing", "评审中"), ("approved", "已批准"), ("signed", "已签约")),
        "choices": {"category": [("quote", "报价"), ("contract", "合同"), ("special", "特价")]},
        "color": "#dc2626",
        "scene": "s06",
        "role": "销售",
        "hint": "销售 · 签单",
        "prompt": "报价审批、合同评审与特价申请。",
        "flow": [
            ">> 报价合同 · 单据登记",
            ">> 评审签约 · 闭环完成",
            ">> 企微钉钉飞书 · 审批推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📝",
        "req": ("title",),
        "title_field": "title",
    },
    {
        "key": "ops_kpi",
        "slug": "ops-kpi",
        "name": "经营看板",
        "cat": "数据报表",
        "widget": "OpsKpiWidget",
        "prefix": "OK",
        "aliases": ("经营看板", "经营指标", "自然语言查数", "老板看板"),
        "fields": [
            ("category", "指标类型", 32, "kpi"),
            ("title", "指标/查询", 200, ""),
            ("period", "周期", 64, ""),
            ("value", "数值", 64, ""),
            ("note", "备注", "text", ""),
        ],
        "statuses": ("open", "published", "archived"),
        "advance": (("published", "已发布"), ("archived", "归档")),
        "choices": {"category": [("kpi", "KPI"), ("query", "查数"), ("alert", "预警")]},
        "color": "#f59e0b",
        "scene": "s07",
        "role": "老板",
        "hint": "老板 · 决策",
        "prompt": "核心经营指标一屏掌控，自然语言查数。",
        "flow": [
            ">> 经营看板 · 指标登记",
            ">> 发布预警 · 归档闭环",
            ">> 企微钉钉飞书 · 指标推送",
            ">> CapShip · 双端真接口",
        ],
        "icon": "📊",
        "req": ("title",),
        "title_field": "title",
    },
]

# Patch source: replace CAPS assignment block by rewriting file with new CAPS via namespace exec
ns: dict = {
    "__name__": "__not_main__",
    "__file__": str(ROOT / "scripts/gen_capship_batch2.py"),
    "Path": Path,
}
# Extract functions from batch2 by running after CAPS override
exec(compile(src, str(ROOT / "scripts/gen_capship_batch2.py"), "exec"), ns)
# Override CAPS and migration bits
ns["CAPS"] = CAPS
ns["ROOT"] = ROOT


def write_migration() -> None:
    parts = [
        '"""batch CapShip office: leave/expense/policy/hire/lead/quote/kpi (s01-s07).',
        "",
        "Revision ID: 032",
        "Revises: 031",
        '"""',
        "",
        "from typing import Sequence, Union",
        "",
        "import sqlalchemy as sa",
        "from alembic import op",
        "from ops_utils import create_index_if_missing, create_table_if_missing",
        "",
        'revision: str = "032"',
        'down_revision: Union[str, None] = "031"',
        "branch_labels: Union[str, Sequence[str], None] = None",
        "depends_on: Union[str, Sequence[str], None] = None",
        "",
        "",
        "def _capship_indexes(table: str) -> None:",
        "    for name, cols in (",
        '        (f"ix_{table}_tenant_id", ["tenant_id"]),',
        '        (f"ix_{table}_app_public_id", ["app_public_id"]),',
        '        (f"ix_{table}_reporter_id", ["reporter_id"]),',
        '        (f"ix_{table}_record_no", ["record_no"]),',
        '        (f"ix_{table}_status", ["status"]),',
        "    ):",
        "        create_index_if_missing(name, table, cols)",
        "",
        "",
        "def upgrade() -> None:",
    ]
    for c in CAPS:
        t = f"{c['key']}_records"
        parts.append('    create_table_if_missing(')
        parts.append(f'        "{t}",')
        parts.append('        sa.Column("id", sa.String(36), primary_key=True),')
        parts.append('        sa.Column("tenant_id", sa.String(36), sa.ForeignKey("tenants.id"), nullable=False),')
        parts.append('        sa.Column("app_public_id", sa.String(64), nullable=False, server_default=""),')
        parts.append('        sa.Column("reporter_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),')
        parts.append('        sa.Column("record_no", sa.String(32), nullable=False),')
        for fname, _, size, _ in c["fields"]:
            if size == "text":
                parts.append(f'        sa.Column("{fname}", sa.Text(), nullable=False, server_default=""),')
            else:
                parts.append(f'        sa.Column("{fname}", sa.String({size}), nullable=False, server_default=""),')
        parts.append('        sa.Column("status", sa.String(32), nullable=False, server_default="open"),')
        parts.append(
            '        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),'
        )
        parts.append(
            '        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),'
        )
        parts.append("    )")
        parts.append(f'    _capship_indexes("{t}")')
        parts.append("")
    parts.append("")
    parts.append("def downgrade() -> None:")
    for c in reversed(CAPS):
        parts.append(f'    op.drop_table("{c["key"]}_records")')
    parts.append("")
    path = ROOT / "backend/alembic/versions/032_capship_batch_office.py"
    path.write_text("\n".join(parts), encoding="utf-8")
    print("wrote", path)


# Rebind
ns["write_migration"] = write_migration
ns["CAPS"] = CAPS

# Fix body_json in write_web if still broken in executed ns - patch function source already fixed in batch2

write_migration()
models_path = ROOT / "backend/app/db/models.py"
text = models_path.read_text(encoding="utf-8")
if "class LeaveRequestRecord" not in text:
    block = "\n\n" + "\n\n".join(ns["write_model"](c) for c in CAPS) + "\n"
    models_path.write_text(text.rstrip() + block, encoding="utf-8")
    print("appended models")
for c in CAPS:
    ns["write_store"](c)
    ns["write_api"](c)
    ns["write_web"](c)
    ns["write_flutter"](c)
print("batch3 gen done")
