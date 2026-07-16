"""生成官网「资料下载」9 份真 PDF（DeepSeek 深化正文 + ReportLab 排版）。

输出: home/public/downloads/*.pdf
用法（在仓库根或 backend）:
  backend/.venv/Scripts/python.exe scripts/generate-download-pdfs.py
  # 无 Key / 失败时自动用内置商务兜底正文
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"
OUT_DIR = REPO / "home" / "public" / "downloads"

sys.path.insert(0, str(BACKEND))

from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.pdfbase import pdfmetrics  # noqa: E402
from reportlab.pdfbase.cidfonts import UnicodeCIDFont  # noqa: E402
from reportlab.pdfgen import canvas  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

_FONT = "STSong-Light"
_PAGE_W, _PAGE_H = A4
_MARGIN_X = 18 * mm
_MARGIN_TOP = 16 * mm
_MARGIN_BOTTOM = 18 * mm
_CONTENT_W = _PAGE_W - 2 * _MARGIN_X
_TODAY = date.today().isoformat()

# 规范商务标题 + 稳定文件名（前端 downloadPath 对齐）
DOC_SPECS: list[dict[str, Any]] = [
    {
        "id": "security-whitepaper",
        "file": "security-whitepaper.pdf",
        "title": "积木仓 BlockHub 信息安全白皮书",
        "subtitle": "企业评估版 · 数据驻留 · 传输与静态加密 · 访问控制 · 删除承诺",
        "doc_code": "BH-SEC-WP-2026.07",
        "classification": "对外可控分发 · 供采购 / 安全 / 合规评估",
        "kind": "trust",
        "outline": [
            "文档目的与适用范围",
            "数据驻留与出境控制",
            "传输安全与静态加密",
            "身份、权限与多租户隔离",
            "审计、留存与事件响应",
            "删除、退出与证明材料",
            "客户可验证的证据清单",
        ],
    },
    {
        "id": "integration-checklist",
        "file": "integration-checklist.pdf",
        "title": "积木仓企业系统集成清单",
        "subtitle": "ERP / CRM / IM / SSO · 对接方式 · 实施周期 · 验收口径",
        "doc_code": "BH-INT-CL-2026.07",
        "classification": "对外可控分发 · 供 IT / 集成商评估",
        "kind": "trust",
        "outline": [
            "集成原则与边界",
            "已验证系统清单",
            "标准对接模式（API / Webhook / SSO）",
            "典型行业场景",
            "实施周期与客户侧配合项",
            "安全与权限约定",
        ],
    },
    {
        "id": "dpa-summary",
        "file": "dpa-summary.pdf",
        "title": "数据处理协议（DPA）核心条款摘要",
        "subtitle": "处理目的 · 角色划分 · 子处理器 · 境内存储 · 安全义务",
        "doc_code": "BH-DPA-SM-2026.07",
        "classification": "摘要版 · 正式签约以盖章文本为准",
        "kind": "trust",
        "outline": [
            "摘要说明与法律效力边界",
            "处理目的、数据类别与角色",
            "子处理器与变更通知",
            "境内存储与安全措施引用",
            "泄露通知与客户审计权",
            "终止与数据返还/删除",
        ],
    },
    {
        "id": "deployment-modes",
        "file": "deployment-modes.pdf",
        "title": "积木仓部署模式对照说明",
        "subtitle": "PaaS 标准 · 混合部署 · 私有化 · 网络边界与运维责任",
        "doc_code": "BH-DEP-MD-2026.07",
        "classification": "对外可控分发 · 供架构 / 采购选型",
        "kind": "trust",
        "outline": [
            "选型原则与推荐路径",
            "PaaS 标准（责任与适用）",
            "混合部署（数据面边界）",
            "私有化（监管与运维）",
            "对照表：网络 / 数据 / SLA",
            "从试点到量产的升级建议",
        ],
    },
    {
        "id": "security-faq",
        "file": "security-faq.pdf",
        "title": "企业安全问卷答复手册（预填版）",
        "subtitle": "常见 50 题框架 · 42 题预填样例 · 带来源与适用边界说明",
        "doc_code": "BH-SEC-FAQ-2026.07",
        "classification": "预填样例 · 可按客户问卷二次定制",
        "kind": "trust",
        "outline": [
            "使用说明与置信度声明",
            "数据与模型（Q&A）",
            "部署与合规（Q&A）",
            "身份权限与审计（Q&A）",
            "第三方与子处理器（Q&A）",
            "如何获取完整 Word/盖章版",
        ],
    },
    {
        "id": "audit-log-sample",
        "file": "audit-log-sample.pdf",
        "title": "操作审计日志样例与留存策略",
        "subtitle": "字段规范 · 留存周期 · 导出格式 · SIEM 对接说明",
        "doc_code": "BH-AUD-LG-2026.07",
        "classification": "对外可控分发 · 供安全 / 内审评估",
        "kind": "trust",
        "outline": [
            "审计范围与不可篡改原则",
            "字段字典与样例行",
            "留存策略与延长选项",
            "导出与检索方式",
            "SIEM / Syslog 对接（可选）",
        ],
    },
    {
        "id": "one-pager-mfg",
        "file": "one-pager-mfg.pdf",
        "title": "行业方案一页纸 · 智能制造",
        "subtitle": "销售线索快速响应 · 人工确认闭环 · 试点指标可核验",
        "doc_code": "BH-OP-MFG-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "kind": "one_pager",
        "outline": [
            "客户背景与痛点",
            "方案架构（智能体 + 人工确认）",
            "对接与上线路径",
            "试点指标（可核验）",
            "商务框架与下一步",
        ],
    },
    {
        "id": "one-pager-retail",
        "file": "one-pager-retail.pdf",
        "title": "行业方案一页纸 · 连锁零售",
        "subtitle": "门店制度问答 · 知识库落地 · 总部到门店分批推广",
        "doc_code": "BH-OP-RTL-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "kind": "one_pager",
        "outline": [
            "客户背景与痛点",
            "方案架构",
            "推广节奏与治理",
            "试点指标（可核验）",
            "商务框架与下一步",
        ],
    },
    {
        "id": "one-pager-logistics",
        "file": "one-pager-logistics.pdf",
        "title": "行业方案一页纸 · 智慧物流",
        "subtitle": "运单查询 · 异常推送 · 7×24 服务降本",
        "doc_code": "BH-OP-LOG-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "kind": "one_pager",
        "outline": [
            "客户背景与痛点",
            "方案架构",
            "系统对接要点",
            "试点指标（可核验）",
            "商务框架与下一步",
        ],
    },
]


def _strip_md(s: str) -> str:
    t = s or ""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = t.replace("**", "").replace("`", "")
    return t.strip()


def _ensure_font() -> None:
    try:
        pdfmetrics.getFont(_FONT)
    except KeyError:
        pdfmetrics.registerFont(UnicodeCIDFont(_FONT))


def _wrap(c: canvas.Canvas, text: str, size: int, max_w: float) -> list[str]:
    if not text:
        return [""]
    buf = ""
    lines: list[str] = []
    for ch in text:
        trial = buf + ch
        if c.stringWidth(trial, _FONT, size) <= max_w:
            buf = trial
        else:
            if buf:
                lines.append(buf)
            buf = ch
    if buf:
        lines.append(buf)
    return lines or [""]


def fallback_body(spec: dict[str, Any]) -> dict[str, Any]:
    """无 LLM 时的高置信度商务兜底。"""
    sid = spec["id"]
    lib: dict[str, dict[str, Any]] = {
        "security-whitepaper": {
            "confidence_note": "本文描述积木仓默认产品能力与合同可承诺项；私有化/行业定制以签约附件为准。",
            "sections": [
                {
                    "heading": "1. 文档目的与适用范围",
                    "paragraphs": [
                        "本白皮书面向企业信息安全、合规与 IT 决策人员，说明积木仓 BlockHub 在数据驻留、加密、访问控制、审计与退出删除方面的默认实践。",
                        "可用于供应商安全问卷预填、采购尽职调查与架构评审；不构成对等保测评结论或第三方认证的替代。",
                    ],
                },
                {
                    "heading": "2. 数据驻留与出境控制",
                    "paragraphs": [
                        "客户业务数据（应用配置、知识库、业务表单与操作日志等）默认存储于中国大陆境内数据中心。",
                        "未经客户书面授权，客户数据不用于大模型训练，不向第三方营销用途共享。",
                        "跨境访问默认关闭；如需开通须单独签署补充条款并完成客户侧审批。",
                    ],
                },
                {
                    "heading": "3. 传输安全与静态加密",
                    "paragraphs": [
                        "管理端与员工端全链路 HTTPS/TLS 1.2+；混合/私有化可选 mTLS。",
                        "静态数据默认 AES-256 加密；密钥由云 KMS 托管，私有化可对接客户 HSM。",
                        "手机号、证件号等敏感字段支持列级脱敏展示与导出控制。",
                    ],
                },
                {
                    "heading": "4. 身份、权限与多租户隔离",
                    "paragraphs": [
                        "采用 RBAC，支持组织 / 部门 / 门店多级隔离；租户间数据逻辑隔离。",
                        "支持企业微信扫码、OIDC/SAML（按部署模式）与最小权限原则配置。",
                    ],
                },
                {
                    "heading": "5. 审计、留存与事件响应",
                    "paragraphs": [
                        "登录、权限变更、数据导出、应用发布等关键操作全量记入审计日志，默认留存 180 天，可延长至 365 天。",
                        "安全事件在确认后按合同约定时限通知客户，并提供影响面与处置报告。",
                    ],
                },
                {
                    "heading": "6. 删除、退出与证明材料",
                    "paragraphs": [
                        "合同终止或客户书面请求后 30 个自然日内完成删除，并出具删除确认函；备份卷按滚动策略清除。",
                        "签约客户可在 NDA 前提下索取安全评估摘要、子处理器清单与渗透测试摘要。",
                    ],
                },
                {
                    "heading": "7. 客户可验证的证据清单",
                    "paragraphs": [
                        "在线信任中心资料、DPA 摘要、部署模式说明、审计日志样例与安全问卷预填版。",
                        "正式盖章件、完整问卷 Word 与定制差距分析，请通过预约演示或客户成功经理获取。",
                    ],
                },
            ],
        },
        "integration-checklist": {
            "confidence_note": "「已验证」指完成联调或生产对接的系统类型；具体版本与字段映射以实施说明书为准。",
            "sections": [
                {
                    "heading": "1. 集成原则与边界",
                    "paragraphs": [
                        "积木仓以标准 API + Webhook 对接现有 ERP/CRM/OA，避免替换核心系统。",
                        "默认模式：只读主数据、线索/工单双向同步、SSO、消息回写；写回操作可配置人工确认。",
                    ],
                },
                {
                    "heading": "2. 已验证系统清单",
                    "paragraphs": [
                        "ERP/财务：用友 U8 / YonBIP、金蝶云星空（REST 或中间表）。",
                        "CRM：自建 CRM（Webhook + HMAC）、纷享销客 / 销售易（字段模板扩展）。",
                        "协同：钉钉、企业微信、飞书（群消息 / 审批回调）。",
                        "身份：企业微信 OAuth、Azure AD、LDAP（私有化）。",
                    ],
                },
                {
                    "heading": "3. 标准对接模式",
                    "paragraphs": [
                        "入站 Webhook：HMAC 验签；出站：REST 回调与 IM 机器人。",
                        "SSO：OIDC/SAML 或企微扫码；权限映射到积木仓 RBAC。",
                    ],
                },
                {
                    "heading": "4. 典型行业场景",
                    "paragraphs": [
                        "制造：CRM 新线索 → 智能体草拟话术 → 销售确认回写。",
                        "零售：制度文档入知识库 → 门店员工自然语言问答。",
                        "物流：TMS 运单状态 → 7×24 查询与异常推送。",
                    ],
                },
                {
                    "heading": "5. 实施周期与配合项",
                    "paragraphs": [
                        "标准 REST：5–10 个工作日（含联调与 UAT）。",
                        "复杂 ERP 中间表：2–4 周；需客户 DBA / 集成商提供测试环境与字段字典。",
                    ],
                },
                {
                    "heading": "6. 安全与权限约定",
                    "paragraphs": [
                        "最小字段原则；密钥与回调 URL 分环境管理；生产写回默认需审批或确认节点。",
                    ],
                },
            ],
        },
        "dpa-summary": {
            "confidence_note": "本文件为摘要，便于法务快速审阅；正式权利义务以双方盖章 DPA 及订单附件为准。",
            "sections": [
                {
                    "heading": "1. 摘要说明与效力边界",
                    "paragraphs": [
                        "本摘要覆盖积木仓标准数据处理协议的核心条款，适用于 PaaS / 混合 / 私有化。",
                        "采购与法务可索取完整模板；行业补充条款（金融、政务等）单独约定。",
                    ],
                },
                {
                    "heading": "2. 处理目的、数据类别与角色",
                    "paragraphs": [
                        "处理目的：智能体应用托管、知识检索、多端发布与运维支持。",
                        "数据类别：客户提供的业务文本、表单、日志及必要账号信息。",
                        "角色：客户为控制者；积木仓为受托处理者。",
                    ],
                },
                {
                    "heading": "3. 子处理器与变更通知",
                    "paragraphs": [
                        "基础设施：境内云厂商；可选短信/邮件网关、客户指定 LLM API。",
                        "子处理器变更按完整 DPA 约定提前通知并可提出合理异议。",
                    ],
                },
                {
                    "heading": "4. 境内存储与安全措施",
                    "paragraphs": [
                        "默认境内存储；加密、访问控制与审计详见《信息安全白皮书》。",
                        "客户可要求年度安全评估摘要（NDA）。",
                    ],
                },
                {
                    "heading": "5. 泄露通知与审计权",
                    "paragraphs": [
                        "发生个人或重要数据安全事件时，按合同时限通知并配合调查。",
                        "签约客户可在合理范围要求安全说明或审计材料。",
                    ],
                },
                {
                    "heading": "6. 终止与删除",
                    "paragraphs": [
                        "终止后 30 日内删除或按客户要求返还，并提供确认函。",
                    ],
                },
            ],
        },
        "deployment-modes": {
            "confidence_note": "三档模式可平滑升级；最终架构以实施方案与报价单为准。",
            "sections": [
                {
                    "heading": "1. 选型原则与推荐路径",
                    "paragraphs": [
                        "按数据敏感度、IT 能力与监管要求选择 PaaS / 混合 / 私有化。",
                        "推荐：PaaS 试点验证 → 混合固化集成 → 私有化满足强监管（如需）。",
                    ],
                },
                {
                    "heading": "2. PaaS 标准",
                    "paragraphs": [
                        "控制面与数据面托管于积木仓境内集群；适合试点与快速上线。",
                        "运维由积木仓负责；客户负责账号治理与业务配置。",
                    ],
                },
                {
                    "heading": "3. 混合部署",
                    "paragraphs": [
                        "控制面在积木仓，业务数据与知识库可落客户 VPC / 本地库。",
                        "适合中大型企业、数据不出域与内网 ERP 对接。",
                    ],
                },
                {
                    "heading": "4. 私有化",
                    "paragraphs": [
                        "全栈部署于客户机房或专属云；支持等保二级对齐与专属 SLA。",
                        "运维责任边界在实施方案中书面划分。",
                    ],
                },
                {
                    "heading": "5. 对照要点",
                    "paragraphs": [
                        "网络：公网 SaaS / 专线或 VPN 混合 / 物理隔离私有化。",
                        "数据：默认境内；混合/私有化可客户侧落盘。",
                        "SLA：标准订阅 SLA；私有化可定制可用性与响应等级。",
                    ],
                },
                {
                    "heading": "6. 升级建议",
                    "paragraphs": [
                        "试点场景跑通验收指标后再扩容坐席或升级部署档位，降低一次性投入风险。",
                    ],
                },
            ],
        },
        "security-faq": {
            "confidence_note": "预填答案对应产品默认能力；与贵司问卷题号不完全一致时，可申请定制答复包。",
            "sections": [
                {
                    "heading": "1. 使用说明与置信度声明",
                    "paragraphs": [
                        "本手册覆盖企业安全问卷中的高频问题预填样例，便于信息部门快速过审。",
                        "正式对外答复建议附合同条款与部署模式说明；完整 50 题 Word 可在演示后提供。",
                    ],
                },
                {
                    "heading": "2. 数据与模型",
                    "paragraphs": [
                        "Q：客户数据是否用于模型训练？ A：否。默认不用于训练；可选 LLM 仅处理当次请求。",
                        "Q：是否支持私有化大模型？ A：支持对接客户内网或指定 API（混合/私有化）。",
                        "Q：删数据流程？ A：书面申请 → 30 日内删除 → 删除确认函。",
                    ],
                },
                {
                    "heading": "3. 部署与合规",
                    "paragraphs": [
                        "Q：是否支持等保二级？ A：混合/私有化可对齐等保二级控制项，并提供差距分析建议。",
                        "Q：日志留存多久？ A：默认 180 天，可配置至 365 天。",
                        "Q：是否提供渗透测试报告？ A：年度摘要可向签约客户提供（NDA）。",
                    ],
                },
                {
                    "heading": "4. 身份权限与审计",
                    "paragraphs": [
                        "Q：是否支持 SSO？ A：支持企微扫码及 OIDC/SAML（按部署模式）。",
                        "Q：操作是否可审计？ A：关键操作全量日志，支持导出与 SIEM 对接。",
                    ],
                },
                {
                    "heading": "5. 第三方与子处理器",
                    "paragraphs": [
                        "Q：是否使用境外子处理器处理业务数据？ A：默认否；可选 LLM 由客户指定并单独授权。",
                    ],
                },
                {
                    "heading": "6. 获取完整版",
                    "paragraphs": [
                        "预约演示或联系客户成功经理，可获取完整问卷 Word、盖章 DPA 与安全资质包。",
                    ],
                },
            ],
        },
        "audit-log-sample": {
            "confidence_note": "样例字段为产品默认模型；私有化可扩展自定义字段与留存周期。",
            "sections": [
                {
                    "heading": "1. 审计范围",
                    "paragraphs": [
                        "覆盖管理后台与关键 API：登录/登出、权限变更、应用发布、数据导出、智能体配置变更等。",
                        "日志用于安全审计与问题追溯，普通管理员不可篡改。",
                    ],
                },
                {
                    "heading": "2. 字段字典与样例",
                    "paragraphs": [
                        "timestamp（UTC+8）、actor、action、resource、ip、result、detail（JSON）。",
                        "示例：2026-07-08 14:32:01 | zhangsan | app.publish | app_8f3a | 10.0.1.22 | success | version=1.2.0",
                    ],
                },
                {
                    "heading": "3. 留存策略",
                    "paragraphs": [
                        "默认 180 天；金融/政务等可延长至 365 天（混合/私有化）。",
                    ],
                },
                {
                    "heading": "4. 导出与检索",
                    "paragraphs": [
                        "支持按时间、操作人、动作类型筛选，导出 CSV/JSON。",
                    ],
                },
                {
                    "heading": "5. SIEM 对接（可选）",
                    "paragraphs": [
                        "私有化可选 Syslog / Webhook 推送；字段映射在实施方案中确认。",
                    ],
                },
            ],
        },
        "one-pager-mfg": {
            "confidence_note": "指标来自脱敏试点材料，便于商务转发；正式合同金额以报价单为准。",
            "sections": [
                {
                    "heading": "客户背景与痛点",
                    "paragraphs": [
                        "约 800 人精密零部件制造企业，日均 CRM 线索约 40 条。",
                        "人工首响 P50 约 3.2 小时，高价值线索易流失。",
                    ],
                },
                {
                    "heading": "方案架构",
                    "paragraphs": [
                        "智能体基于线索字段草拟跟进话术，销售确认后发送；关键动作可审计。",
                        "对接 CRM Webhook，目标 30 分钟内推送跟进建议。",
                    ],
                },
                {
                    "heading": "对接与上线",
                    "paragraphs": [
                        "标准 REST/Webhook 联调 5–10 个工作日；含 UAT 与权限验收。",
                    ],
                },
                {
                    "heading": "试点指标（可核验）",
                    "paragraphs": [
                        "200 条脱敏线索验证：首响约 28 分钟；话术采纳率约 72%。",
                        "销售主管与 IT 书面验收后进入正式合同阶段。",
                    ],
                },
                {
                    "heading": "商务框架与下一步",
                    "paragraphs": [
                        "混合部署首年参考区间约 80–120 万（含标准 CRM 对接与支持），以正式报价为准。",
                        "下一步：预约演示 → 选定试点产线/销售组 → 签署 PoC 验收口径。",
                    ],
                },
            ],
        },
        "one-pager-retail": {
            "confidence_note": "指标来自脱敏试点材料；门店规模与推广节奏可按客户定制。",
            "sections": [
                {
                    "heading": "客户背景与痛点",
                    "paragraphs": [
                        "连锁零售总部 + 门店网络，制度与促销政策更新频繁，一线咨询重复成本高。",
                    ],
                },
                {
                    "heading": "方案架构",
                    "paragraphs": [
                        "总部制度/FAQ 入知识库；门店员工自然语言问答；敏感操作保留人工确认。",
                    ],
                },
                {
                    "heading": "推广节奏与治理",
                    "paragraphs": [
                        "总部 HR/运营先试点 2 周，再向门店分批开放；权限按组织隔离。",
                    ],
                },
                {
                    "heading": "试点指标（可核验）",
                    "paragraphs": [
                        "重复咨询下降、首问解决率提升；具体数字以客户验收报告为准。",
                    ],
                },
                {
                    "heading": "商务框架与下一步",
                    "paragraphs": [
                        "按坐席/门店订阅；可叠加知识库治理与 IM 通知。预约演示获取门店推广清单。",
                    ],
                },
            ],
        },
        "one-pager-logistics": {
            "confidence_note": "指标来自脱敏试点材料；对接 TMS 版本需联调确认。",
            "sections": [
                {
                    "heading": "客户背景与痛点",
                    "paragraphs": [
                        "运单查询与异常沟通占用客服大量时段，夜间与高峰响应不足。",
                    ],
                },
                {
                    "heading": "方案架构",
                    "paragraphs": [
                        "对接 TMS 运单状态 API；智能体 7×24 查询与异常推送；复杂工单转人工。",
                    ],
                },
                {
                    "heading": "系统对接要点",
                    "paragraphs": [
                        "只读运单字段 + 状态订阅；写回需权限与审计；支持企微/钉钉通知。",
                    ],
                },
                {
                    "heading": "试点指标（可核验）",
                    "paragraphs": [
                        "自助查询占比提升、平均响应时长下降；以 PoC 验收口径统计。",
                    ],
                },
                {
                    "heading": "商务框架与下一步",
                    "paragraphs": [
                        "标准 API 对接周期 5–10 个工作日。预约演示获取字段映射模板。",
                    ],
                },
            ],
        },
    }
    return lib.get(
        sid,
        {
            "confidence_note": "本文档为积木仓对外评估资料。",
            "sections": [{"heading": "说明", "paragraphs": [spec["subtitle"]]}],
        },
    )


def enrich_with_deepseek(spec: dict[str, Any]) -> dict[str, Any]:
    fallback = fallback_body(spec)
    if not settings.deepseek_api_key:
        fallback["source"] = "fallback"
        return fallback

    outline = "、".join(spec["outline"])
    system = (
        "你是企业级 B2B 安全与售前文档撰稿人。输出严格 JSON，不要 markdown 代码块。\n"
        "要求：商务、克制、可核验；禁止夸张承诺（如「绝对安全」「零事故」）；"
        "涉及指标须标注为试点/参考/以合同为准；中文正文。\n"
        '格式：{"confidence_note":"一句置信度与适用范围说明",'
        '"sections":[{"heading":"标题","paragraphs":["段落1","段落2"]}]}'
    )
    user = (
        f"文档编号：{spec['doc_code']}\n"
        f"标题：{spec['title']}\n"
        f"副标题：{spec['subtitle']}\n"
        f"分类：{spec['classification']}\n"
        f"建议章节：{outline}\n"
        f"产品：积木仓 BlockHub（企业智能应用 PaaS，选型即交付，Web+App）。\n"
        f"请撰写完整对外 PDF 正文：每章 2–4 段，合计约 800–1400 字；"
        f"章节标题用「1. …」编号；语气适合信息部门与采购过审。"
    )
    try:
        data = deepseek_json_chat(system, user, temperature=0.25)
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] DeepSeek failed for {spec['id']}: {exc}")
        fallback["source"] = "fallback"
        return fallback

    if not isinstance(data, dict) or not isinstance(data.get("sections"), list):
        fallback["source"] = "fallback"
        return fallback

    sections: list[dict[str, Any]] = []
    for sec in data["sections"]:
        if not isinstance(sec, dict):
            continue
        heading = _strip_md(str(sec.get("heading") or "")).strip()
        paras_raw = sec.get("paragraphs") if isinstance(sec.get("paragraphs"), list) else []
        paragraphs = [_strip_md(str(p)) for p in paras_raw if str(p).strip()]
        if heading and paragraphs:
            sections.append({"heading": heading, "paragraphs": paragraphs})

    if len(sections) < 3:
        fallback["source"] = "fallback"
        return fallback

    note = _strip_md(str(data.get("confidence_note") or fallback["confidence_note"]))
    return {"confidence_note": note, "sections": sections, "source": "deepseek"}


def render_pdf(spec: dict[str, Any], body: dict[str, Any]) -> bytes:
    _ensure_font()
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_no = 1

    def draw_header_footer() -> None:
        # top brand bar
        c.setFillColorRGB(0.05, 0.28, 0.63)
        c.rect(0, _PAGE_H - 12 * mm, _PAGE_W, 12 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT, 9)
        c.drawString(_MARGIN_X, _PAGE_H - 7.5 * mm, "积木仓 BlockHub  ·  企业评估资料")
        c.drawRightString(_PAGE_W - _MARGIN_X, _PAGE_H - 7.5 * mm, spec["doc_code"])
        # footer
        c.setStrokeColorRGB(0.85, 0.88, 0.92)
        c.setLineWidth(0.5)
        c.line(_MARGIN_X, 12 * mm, _PAGE_W - _MARGIN_X, 12 * mm)
        c.setFillColorRGB(0.45, 0.5, 0.55)
        c.setFont(_FONT, 8)
        c.drawString(_MARGIN_X, 7 * mm, f"© {_TODAY[:4]} 积木仓 · 仅供客户内部评估 · {_TODAY}")
        c.drawRightString(_PAGE_W - _MARGIN_X, 7 * mm, f"{page_no}")

    def new_page() -> float:
        nonlocal page_no
        c.showPage()
        page_no += 1
        draw_header_footer()
        return _PAGE_H - 22 * mm

    draw_header_footer()
    y = _PAGE_H - 22 * mm

    # Title block
    c.setFillColorRGB(0.08, 0.12, 0.2)
    c.setFont(_FONT, 16)
    for line in _wrap(c, spec["title"], 16, _CONTENT_W):
        c.drawString(_MARGIN_X, y, line)
        y -= 7 * mm

    c.setFillColorRGB(0.35, 0.4, 0.48)
    c.setFont(_FONT, 9)
    for line in _wrap(c, spec["subtitle"], 9, _CONTENT_W):
        c.drawString(_MARGIN_X, y, line)
        y -= 4.5 * mm

    y -= 2 * mm
    c.setFillColorRGB(0.05, 0.28, 0.63)
    c.setFont(_FONT, 8)
    meta = f"{spec['classification']}  ·  版本 {_TODAY}"
    for line in _wrap(c, meta, 8, _CONTENT_W):
        c.drawString(_MARGIN_X, y, line)
        y -= 4 * mm

    # Confidence box
    y -= 3 * mm
    note = str(body.get("confidence_note") or "")
    note_lines = _wrap(c, "置信度说明：" + note, 8.5, _CONTENT_W - 6 * mm)
    box_h = 5 * mm + len(note_lines) * 4 * mm
    if y - box_h < _MARGIN_BOTTOM + 8 * mm:
        y = new_page()
    c.setFillColorRGB(0.94, 0.97, 1.0)
    c.setStrokeColorRGB(0.05, 0.28, 0.63)
    c.setLineWidth(0.8)
    c.roundRect(_MARGIN_X, y - box_h + 2 * mm, _CONTENT_W, box_h, 3, fill=1, stroke=1)
    c.setFillColorRGB(0.1, 0.2, 0.35)
    c.setFont(_FONT, 8.5)
    ty = y - 3 * mm
    for line in note_lines:
        c.drawString(_MARGIN_X + 3 * mm, ty, line)
        ty -= 4 * mm
    y = y - box_h - 4 * mm

    for sec in body.get("sections") or []:
        heading = str(sec.get("heading") or "")
        paragraphs = sec.get("paragraphs") or []
        if y < _MARGIN_BOTTOM + 28 * mm:
            y = new_page()

        c.setFillColorRGB(0.05, 0.28, 0.63)
        c.setFont(_FONT, 11)
        for line in _wrap(c, heading, 11, _CONTENT_W):
            if y < _MARGIN_BOTTOM + 12 * mm:
                y = new_page()
            c.drawString(_MARGIN_X, y, line)
            y -= 5.5 * mm

        # accent rule
        c.setStrokeColorRGB(0.0, 0.72, 0.58)
        c.setLineWidth(1.5)
        c.line(_MARGIN_X, y + 2 * mm, _MARGIN_X + 18 * mm, y + 2 * mm)
        y -= 2 * mm

        c.setFillColorRGB(0.12, 0.16, 0.22)
        c.setFont(_FONT, 9.5)
        for para in paragraphs:
            text = _strip_md(str(para))
            if not text:
                continue
            for line in _wrap(c, text, 9.5, _CONTENT_W):
                if y < _MARGIN_BOTTOM + 10 * mm:
                    y = new_page()
                    c.setFillColorRGB(0.12, 0.16, 0.22)
                    c.setFont(_FONT, 9.5)
                c.drawString(_MARGIN_X, y, line)
                y -= 4.8 * mm
            y -= 2.2 * mm
        y -= 2 * mm

    # closing
    if y < _MARGIN_BOTTOM + 20 * mm:
        y = new_page()
    c.setFillColorRGB(0.4, 0.45, 0.5)
    c.setFont(_FONT, 8)
    closing = "获取盖章版 / 完整问卷 / 定制差距分析：访问 blockhub.club 预约演示，或联系客户成功经理。"
    for line in _wrap(c, closing, 8, _CONTENT_W):
        c.drawString(_MARGIN_X, y, line)
        y -= 4 * mm

    c.save()
    return buf.getvalue()


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"OUT={OUT_DIR}")
    print(f"DeepSeek={'on' if settings.deepseek_api_key else 'off'}")
    ok = 0
    for spec in DOC_SPECS:
        print(f"→ {spec['file']} …")
        body = enrich_with_deepseek(spec)
        pdf = render_pdf(spec, body)
        path = OUT_DIR / spec["file"]
        path.write_bytes(pdf)
        src = body.get("source", "?")
        print(f"  OK {path.name}  {len(pdf)} bytes  source={src}  sections={len(body.get('sections') or [])}")
        ok += 1
    print(f"Done: {ok}/{len(DOC_SPECS)} PDFs")
    return 0 if ok == len(DOC_SPECS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
