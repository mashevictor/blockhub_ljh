"""生成官网 9 份商务评估 PDF（≥3 页 · 主页蓝绿品牌 · 微软雅黑）。

对齐 home 品牌色：#0d47a1 / #1976d2 / #00b894
字体：Microsoft YaHei（与主页 PingFang SC / 微软雅黑栈一致）
正文：DeepSeek 深化；失败则用长版兜底。

用法:
  backend/.venv/Scripts/python.exe scripts/generate-download-pdfs.py
"""

from __future__ import annotations

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
from reportlab.pdfbase.ttfonts import TTFont  # noqa: E402
from reportlab.pdfgen import canvas  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

# 品牌色（与 b2b-landing.css / .b2b-brand-scope 一致）
_NAVY = (0x0D / 255, 0x47 / 255, 0xA1 / 255)
_BLUE = (0x19 / 255, 0x76 / 255, 0xD2 / 255)
_TEAL = (0x00 / 255, 0xB8 / 255, 0x94 / 255)
_TEXT = (0x33 / 255, 0x33 / 255, 0x33 / 255)
_MUTED = (0x66 / 255, 0x66 / 255, 0x66 / 255)
_SOFT = (0xEA / 255, 0xF2 / 255, 0xFF / 255)
_BG = (0xF9 / 255, 0xFA / 255, 0xFB / 255)

_PAGE_W, _PAGE_H = A4
_MX = 18 * mm
_MT = 20 * mm
_MB = 16 * mm
_CW = _PAGE_W - 2 * _MX
_TODAY = date.today().isoformat()
_FONT = "BHSans"
_FONT_B = "BHSansBold"
_MIN_PAGES = 4

DOC_SPECS: list[dict[str, Any]] = [
    {
        "id": "security-whitepaper",
        "file": "security-whitepaper.pdf",
        "title": "积木仓 BlockHub 信息安全白皮书",
        "subtitle": "企业评估版 · 数据驻留 · 传输与静态加密 · 访问控制 · 删除承诺",
        "doc_code": "BH-SEC-WP-2026.07",
        "classification": "对外可控分发 · 供采购 / 安全 / 合规评估",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "文档目的、读者与置信度边界",
            "产品安全架构总览",
            "数据驻留、分类与出境控制",
            "传输安全、静态加密与密钥管理",
            "身份认证、RBAC 与多租户隔离",
            "开发运维安全与变更管理",
            "审计日志、留存与事件响应",
            "第三方与子处理器管控",
            "删除、退出与客户可索取证据",
            "附录：安全控制对照清单",
        ],
    },
    {
        "id": "integration-checklist",
        "file": "integration-checklist.pdf",
        "title": "积木仓企业系统集成清单",
        "subtitle": "ERP / CRM / IM / SSO · 对接方式 · 实施周期 · 验收口径",
        "doc_code": "BH-INT-CL-2026.07",
        "classification": "对外可控分发 · 供 IT / 集成商评估",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "集成原则与不做边界",
            "已验证系统与成熟度说明",
            "标准对接模式详解",
            "安全、鉴权与环境隔离",
            "行业典型对接场景",
            "实施阶段、周期与客户配合项",
            "验收口径与回滚策略",
            "附录：联调检查表",
        ],
    },
    {
        "id": "dpa-summary",
        "file": "dpa-summary.pdf",
        "title": "数据处理协议（DPA）核心条款摘要",
        "subtitle": "处理目的 · 角色划分 · 子处理器 · 境内存储 · 安全义务",
        "doc_code": "BH-DPA-SM-2026.07",
        "classification": "摘要版 · 正式签约以盖章文本为准",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "摘要效力与适用部署模式",
            "定义、角色与处理目的",
            "数据类别与处理活动",
            "子处理器与变更机制",
            "安全措施与违规通知",
            "客户审计权与配合义务",
            "跨境、保留与删除",
            "附录：条款速查表",
        ],
    },
    {
        "id": "deployment-modes",
        "file": "deployment-modes.pdf",
        "title": "积木仓部署模式对照说明",
        "subtitle": "PaaS 标准 · 混合部署 · 私有化 · 网络边界与运维责任",
        "doc_code": "BH-DEP-MD-2026.07",
        "classification": "对外可控分发 · 供架构 / 采购选型",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "选型原则与推荐路径",
            "PaaS 标准详解",
            "混合部署详解",
            "私有化详解",
            "三档对照：网络 / 数据 / 运维 / SLA",
            "从试点到量产的升级路径",
            "风险与责任划分建议",
            "附录：选型问卷",
        ],
    },
    {
        "id": "security-faq",
        "file": "security-faq.pdf",
        "title": "企业安全问卷答复手册（预填版）",
        "subtitle": "常见问卷框架 · 预填样例 · 适用边界与来源说明",
        "doc_code": "BH-SEC-FAQ-2026.07",
        "classification": "预填样例 · 可按客户问卷二次定制",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "使用说明与置信度声明",
            "组织与治理类问题",
            "数据与模型类问题",
            "部署与合规类问题",
            "身份权限与审计类问题",
            "第三方与子处理器类问题",
            "业务连续性与事件响应",
            "附录：如何获取完整定制答复包",
        ],
    },
    {
        "id": "audit-log-sample",
        "file": "audit-log-sample.pdf",
        "title": "操作审计日志样例与留存策略",
        "subtitle": "字段规范 · 留存周期 · 导出格式 · SIEM 对接说明",
        "doc_code": "BH-AUD-LG-2026.07",
        "classification": "对外可控分发 · 供安全 / 内审评估",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "审计目标与不可篡改原则",
            "覆盖范围与动作分类",
            "字段字典与样例行",
            "留存、归档与延长选项",
            "检索、导出与权限",
            "SIEM / Syslog 对接",
            "常见审计场景示例",
            "附录：字段速查",
        ],
    },
    {
        "id": "one-pager-mfg",
        "file": "one-pager-mfg.pdf",
        "title": "行业方案一页纸 · 智能制造",
        "subtitle": "销售线索快速响应 · 人工确认闭环 · 试点指标可核验",
        "doc_code": "BH-OP-MFG-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "客户背景与业务痛点",
            "方案目标与成功标准",
            "方案架构与人机协同",
            "系统对接与数据流",
            "实施路径与治理",
            "试点指标与验收口径",
            "商务框架与风险说明",
            "附录：下一步行动清单",
        ],
    },
    {
        "id": "one-pager-retail",
        "file": "one-pager-retail.pdf",
        "title": "行业方案一页纸 · 连锁零售",
        "subtitle": "门店制度问答 · 知识库落地 · 总部到门店分批推广",
        "doc_code": "BH-OP-RTL-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "客户背景与痛点",
            "方案目标与成功标准",
            "方案架构与知识治理",
            "权限、组织与合规",
            "推广节奏与门店启用",
            "试点指标与验收",
            "商务框架",
            "附录：下一步行动清单",
        ],
    },
    {
        "id": "one-pager-logistics",
        "file": "one-pager-logistics.pdf",
        "title": "行业方案一页纸 · 智慧物流",
        "subtitle": "运单查询 · 异常推送 · 7×24 服务降本",
        "doc_code": "BH-OP-LOG-2026.07",
        "classification": "案例摘要 · 脱敏 · 供商务转发",
        "tagline": "五分钟搭好，打开就能用",
        "outline": [
            "客户背景与痛点",
            "方案目标与成功标准",
            "方案架构与转人工策略",
            "TMS 对接与字段边界",
            "通知渠道与值班协同",
            "试点指标与验收",
            "商务框架",
            "附录：下一步行动清单",
        ],
    },
]


def _register_fonts() -> None:
    yahei = Path(r"C:\Windows\Fonts\msyh.ttc")
    yahei_b = Path(r"C:\Windows\Fonts\msyhbd.ttc")
    noto = Path(r"C:\Windows\Fonts\Noto Sans SC (TrueType).otf")
    noto_b = Path(r"C:\Windows\Fonts\Noto Sans SC Bold (TrueType).otf")
    if yahei.exists() and yahei_b.exists():
        pdfmetrics.registerFont(TTFont(_FONT, str(yahei), subfontIndex=0))
        pdfmetrics.registerFont(TTFont(_FONT_B, str(yahei_b), subfontIndex=0))
        return
    if noto.exists() and noto_b.exists():
        pdfmetrics.registerFont(TTFont(_FONT, str(noto)))
        pdfmetrics.registerFont(TTFont(_FONT_B, str(noto_b)))
        return
    raise RuntimeError("未找到微软雅黑或 Noto Sans SC 字体")


def _strip_md(s: str) -> str:
    t = s or ""
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = t.replace("**", "").replace("`", "").replace("*", "")
    return t.strip()


def _wrap(c: canvas.Canvas, text: str, font: str, size: float, max_w: float) -> list[str]:
    if not text:
        return [""]
    buf = ""
    lines: list[str] = []
    for ch in text:
        trial = buf + ch
        if c.stringWidth(trial, font, size) <= max_w:
            buf = trial
        else:
            if buf:
                lines.append(buf)
            buf = ch
    if buf:
        lines.append(buf)
    return lines or [""]


def _expand_sections(sections: list[dict[str, Any]], min_paras: int = 28) -> list[dict[str, Any]]:
    """保证段落总量，不足则扩展附录，支撑 ≥3 页。"""
    total = sum(len(s.get("paragraphs") or []) for s in sections)
    if total >= min_paras:
        return sections
    need = min_paras - total
    appendix_bank = [
        "本附录用于支撑信息部门评审，不改变正文承诺边界。",
        "如条款与正式合同冲突，以双方盖章文本与订单附件为准。",
        "建议将本资料与部署模式说明、DPA 摘要一并提交采购与安全会签。",
        "试点阶段优先验证权限隔离、审计导出与关键写回确认链路。",
        "正式上线前完成：测试环境联调、账号矩阵、回滚预案与验收纪要。",
        "客户可要求在 NDA 下获取子处理器清单与年度安全评估摘要。",
        "指标类表述如无单独说明，均指脱敏试点或参考区间，不作保底承诺。",
        "技术支持时段与响应等级以订阅档位 / 私有化 SLA 附件为准。",
        "变更管理遵循最小权限与双人复核；生产写回默认可配置人工确认。",
        "资料版本随产品迭代更新，下载页以最新 PDF 为准。",
        "评估过程中的疑问可通过预约演示或客户成功经理书面澄清。",
        "本文件可内部转发；对外公开转载须取得积木仓书面许可。",
    ]
    extra: list[str] = []
    i = 0
    while len(extra) < need:
        extra.append(appendix_bank[i % len(appendix_bank)])
        i += 1
    # chunk into appendix sections of 4 paras
    out = list(sections)
    chunk: list[str] = []
    idx = 1
    for p in extra:
        chunk.append(p)
        if len(chunk) >= 4:
            out.append({"heading": f"附录 {idx} · 评审补充说明", "paragraphs": chunk})
            chunk = []
            idx += 1
    if chunk:
        out.append({"heading": f"附录 {idx} · 评审补充说明", "paragraphs": chunk})
    return out


def fallback_body(spec: dict[str, Any]) -> dict[str, Any]:
    """长版商务兜底（保证可排到 3 页以上）。"""
    title = spec["title"]
    base_note = (
        f"本文描述积木仓 BlockHub 默认产品能力与合同可承诺项；"
        f"私有化/行业定制以签约附件为准。文档编号 {spec['doc_code']}。"
    )
    # 通用长章节模板 + 文档特异段落
    common_tail = [
        {
            "heading": "评审建议与下一步",
            "paragraphs": [
                "建议信息安全、架构、采购与业务负责人共同审阅本资料，并对照贵司问卷题号标注差异项。",
                "差异项可在预约演示后输出《定制答复包》与差距分析清单，避免口头承诺进入合同。",
                "试点验收建议预先书面约定：权限矩阵、审计导出样例、关键写回确认与回滚条件。",
                "正式商务路径：资料评估 → 演示与 PoC → 报价与 DPA → 上线与运维交接。",
            ],
        },
        {
            "heading": "术语与表述约定",
            "paragraphs": [
                "「默认」指标准产品配置，可在混合/私有化中按方案调整。",
                "「支持」指产品具备能力或已有对接模板，不等同于零工作量上线。",
                "「参考区间」用于商务沟通，最终以盖章报价单与订单为准。",
                "「可核验」指试点阶段可用日志、报表或验收纪要交叉验证，而非市场宣传口径。",
            ],
        },
        {
            "heading": "联系与获取盖章件",
            "paragraphs": [
                "在线入口：blockhub.club 信任与合规中心、落地案例与预约演示。",
                "可索取：盖章 DPA、完整安全问卷 Word、子处理器清单、渗透测试摘要（NDA）。",
                "本 PDF 与官网在线版同步维护；若版本冲突，以文档编号更新日期较新者为准。",
                "对外转发请保持完整文档（含置信度说明与文档编号），避免截取导致误解。",
            ],
        },
    ]

    specifics: dict[str, list[dict[str, Any]]] = {
        "security-whitepaper": [
            {
                "heading": "1. 文档目的、读者与置信度边界",
                "paragraphs": [
                    f"《{title}》面向企业信息安全、合规、IT 架构与采购决策人员，说明积木仓在数据驻留、加密、访问控制、审计与退出删除方面的默认实践。",
                    "可用于供应商安全问卷预填、尽职调查与架构评审；不构成等保测评结论或第三方认证替代。",
                    "文中「合同可承诺项」指标准订阅/私有化合同中可落地的条款方向；最终以双方盖章文本为准。",
                    "如需行业监管专项（金融、政务等），请在演示后索取补充控制说明，勿将本白皮书直接等同行业认证。",
                ],
            },
            {
                "heading": "2. 产品安全架构总览",
                "paragraphs": [
                    "积木仓 BlockHub 以多租户 PaaS 为默认形态，提供应用配置、能力包交付、知识库与业务 API；Web 与 App 共用契约。",
                    "安全控制覆盖：传输层、存储层、身份权限、租户隔离、操作审计、密钥与密钥轮换、第三方调用边界。",
                    "混合部署将业务数据面下沉客户 VPC；私有化将控制面与数据面整体落客户环境，责任边界在实施方案书面划分。",
                    "安全设计原则：最小权限、默认境内、可审计、可删除、可验证。",
                ],
            },
            {
                "heading": "3. 数据驻留、分类与出境控制",
                "paragraphs": [
                    "客户业务数据（应用配置、知识库文档、业务表单、操作日志等）默认存储于中国大陆境内数据中心。",
                    "未经客户书面授权，客户数据不用于大模型训练，不向第三方营销用途共享。",
                    "跨境访问默认关闭；开通须单独补充条款并完成客户侧审批。",
                    "建议客户侧同步完成数据分类分级，明确哪些字段可进入可选 LLM 调用链路。",
                ],
            },
            {
                "heading": "4. 传输安全、静态加密与密钥管理",
                "paragraphs": [
                    "管理端与员工端全链路 HTTPS/TLS 1.2+；混合/私有化可选 mTLS。",
                    "静态数据默认 AES-256 加密；密钥由云 KMS 托管，私有化可对接客户 HSM。",
                    "手机号、证件号等敏感字段支持列级脱敏展示与导出控制。",
                    "密钥轮换、访问审计与环境隔离（开发/测试/生产）在运维规范中执行。",
                ],
            },
            {
                "heading": "5. 身份认证、RBAC 与多租户隔离",
                "paragraphs": [
                    "采用 RBAC，支持组织/部门/门店多级隔离；租户间数据逻辑隔离。",
                    "支持企业微信扫码、OIDC/SAML（按部署模式）与最小权限配置。",
                    "高风险操作（权限变更、批量导出、生产写回）建议开启审批或双人复核。",
                    "账号生命周期：入职开通、调岗权限收敛、离职及时停用，可与客户 IdP 同步。",
                ],
            },
            {
                "heading": "6. 开发运维安全与变更管理",
                "paragraphs": [
                    "变更经评审与发布窗口；生产变更可追溯到操作者与版本。",
                    "依赖组件与基础镜像按补丁策略更新；高危漏洞按约定时限处置。",
                    "备份与恢复演练按部署模式执行；客户侧备份责任在混合/私有化方案中明确。",
                    "第三方代码与开源组件清单可在签约后按需提供摘要。",
                ],
            },
            {
                "heading": "7. 审计日志、留存与事件响应",
                "paragraphs": [
                    "登录、权限变更、数据导出、应用发布等关键操作全量记入审计日志。",
                    "默认留存 180 天，可延长至 365 天；支持 CSV/JSON 导出与 SIEM 对接（私有化可选）。",
                    "安全事件确认后按合同时限通知客户，并提供影响面与处置说明。",
                    "详见配套资料《操作审计日志样例与留存策略》。",
                ],
            },
            {
                "heading": "8. 第三方与子处理器管控",
                "paragraphs": [
                    "基础设施默认境内云厂商；可选短信/邮件网关、客户指定 LLM API。",
                    "子处理器变更按 DPA 约定通知；客户可提出合理异议。",
                    "可选 LLM 调用仅处理当次请求，默认不入库训练；关闭策略由客户配置。",
                ],
            },
            {
                "heading": "9. 删除、退出与客户可索取证据",
                "paragraphs": [
                    "合同终止或客户书面请求后 30 个自然日内完成删除，并出具删除确认函。",
                    "备份卷按滚动策略清除；子处理器同步删除确认可一并提供。",
                    "签约客户可在 NDA 下索取安全评估摘要、渗透测试摘要与子处理器清单。",
                ],
            },
            {
                "heading": "10. 附录：安全控制对照清单",
                "paragraphs": [
                    "传输加密：TLS1.2+；静态加密：AES-256；身份：RBAC + SSO 可选。",
                    "审计：关键操作全量；留存：180/365 天；删除：30 日确认函。",
                    "驻留：默认境内；训练：默认禁止；跨境：默认关闭。",
                    "建议将本清单粘贴到贵司问卷「控制措施」栏，并标注部署模式差异。",
                ],
            },
        ],
        "integration-checklist": [
            {
                "heading": "1. 集成原则与不做边界",
                "paragraphs": [
                    "积木仓以标准 API + Webhook 对接现有 ERP/CRM/OA，避免替换核心系统。",
                    "默认：只读主数据、线索/工单双向同步、SSO、消息回写；写回可配置人工确认。",
                    "不做：无字段字典的盲目全量同步、无鉴权的回调、绕过客户审批的生产写回。",
                    "集成目标是「可验收、可回滚、可审计」，而非一次性脚本。",
                ],
            },
            {
                "heading": "2. 已验证系统与成熟度说明",
                "paragraphs": [
                    "ERP/财务：用友 U8/YonBIP、金蝶云星空（REST 或中间表）。",
                    "CRM：自建 CRM（Webhook+HMAC）、纷享销客/销售易（字段模板扩展）。",
                    "协同：钉钉、企业微信、飞书（群消息/审批回调）。",
                    "身份：企业微信 OAuth、Azure AD、LDAP（私有化）。「已验证」指完成联调或生产对接的类型，具体版本以实施说明书为准。",
                ],
            },
            {
                "heading": "3. 标准对接模式详解",
                "paragraphs": [
                    "入站 Webhook：HMAC 验签、重放保护、幂等键；失败可重试并记审计。",
                    "出站 REST：超时、熔断与错误码映射；密钥分环境管理。",
                    "SSO：OIDC/SAML 或企微扫码；权限映射到积木仓 RBAC。",
                    "文件类：知识库上传 PDF/Word 后切片检索，权限随组织隔离。",
                ],
            },
            {
                "heading": "4. 安全、鉴权与环境隔离",
                "paragraphs": [
                    "开发/测试/生产密钥分离；生产回调 URL 白名单。",
                    "最小字段原则：仅同步业务所需字段，敏感字段脱敏。",
                    "生产写回默认建议人工确认或审批流节点。",
                    "联调日志保留至验收完成，并可导出供双方存档。",
                ],
            },
            {
                "heading": "5. 行业典型对接场景",
                "paragraphs": [
                    "制造：CRM 新线索 → 智能体草拟话术 → 销售确认回写。",
                    "零售：制度文档入知识库 → 门店员工自然语言问答。",
                    "物流：TMS 运单状态 → 7×24 查询与异常推送。",
                    "各场景均可配置转人工与审计，避免全自动误触达。",
                ],
            },
            {
                "heading": "6. 实施阶段、周期与客户配合项",
                "paragraphs": [
                    "标准 REST：5–10 个工作日（含联调与 UAT）。",
                    "复杂 ERP 中间表：2–4 周；需客户 DBA/集成商提供测试环境与字段字典。",
                    "客户配合：账号、测试数据、网络放通、验收人与变更窗口。",
                    "延期风险通常来自字段不清、环境不通或验收口径未书面化。",
                ],
            },
            {
                "heading": "7. 验收口径与回滚策略",
                "paragraphs": [
                    "验收建议包含：鉴权通过率、关键路径端到端、权限隔离抽检、审计可导出。",
                    "回滚：关闭写回开关、回退版本、保留联调日志与配置快照。",
                    "验收纪要双方签字后进入正式运维与变更流程。",
                ],
            },
            {
                "heading": "8. 附录：联调检查表",
                "paragraphs": [
                    "□ 环境与密钥 □ 回调验签 □ 幂等与重试 □ 字段映射 □ SSO/权限",
                    "□ 写回确认 □ 审计导出 □ 失败告警 □ 回滚演练 □ 验收纪要",
                    "可将本表复制到项目群，作为每日联调站会清单。",
                    "完成后附截图与日志样例，便于信息部门归档。",
                ],
            },
        ],
    }

    # reuse whitepaper-length structure for remaining docs via generic long copy
    if spec["id"] not in specifics:
        outline_secs = []
        for i, h in enumerate(spec["outline"], 1):
            outline_secs.append(
                {
                    "heading": f"{i}. {h}" if not str(h)[0].isdigit() else h,
                    "paragraphs": [
                        f"本章说明「{h}」在积木仓 BlockHub 中的默认实践与评估要点，供信息部门与业务共同确认。",
                        "表述保持克制：可验证、可合同化；不使用「绝对」「零风险」等无法举证的措辞。",
                        "若贵司制度有更严要求，请在演示后提交控制点清单，我们将输出差距分析与实施方案选项。",
                        "相关配套资料见信任与合规中心：安全白皮书、DPA 摘要、部署模式说明与审计日志样例。",
                    ],
                }
            )
        specifics[spec["id"]] = outline_secs

    sections = specifics[spec["id"]] + common_tail
    sections = _expand_sections(sections, min_paras=48)
    return {"confidence_note": base_note, "sections": sections, "source": "fallback"}


def enrich_with_deepseek(spec: dict[str, Any]) -> dict[str, Any]:
    fallback = fallback_body(spec)
    if not settings.deepseek_api_key:
        return fallback

    # 长文生成：默认 25s 不够，临时抬高
    try:
        settings.deepseek_timeout = 180  # type: ignore[misc]
    except Exception:
        pass

    outline = "\n".join(f"- {x}" for x in spec["outline"])
    system = (
        "你是企业级 B2B 安全/售前文档撰稿人，服务对象是信息安全、合规、采购与架构负责人。\n"
        "输出严格 JSON，不要 markdown 代码块，不要 HTML。\n"
        "语气：商务、克制、可核验；禁止夸张（绝对安全/零事故/保证过审）。\n"
        "指标须写明试点/参考/以合同为准。\n"
        "必须足够长：至少 10 个章节，每章 4–6 段，总汉字约 4500–7000，确保排版后不少于 4 页 A4。\n"
        '格式：{"confidence_note":"60–120字置信度与适用范围",'
        '"sections":[{"heading":"1. 标题","paragraphs":["段落…"]}]}'
    )
    user = (
        f"文档编号：{spec['doc_code']}\n"
        f"标题：{spec['title']}\n"
        f"副标题：{spec['subtitle']}\n"
        f"分类：{spec['classification']}\n"
        f"品牌口号：{spec.get('tagline')}\n"
        f"建议目录：\n{outline}\n"
        f"产品：积木仓 BlockHub（企业智能应用 PaaS；选型即交付；Web+App 同契约；"
        f"默认境内；空库空列表；真 API）。\n"
        f"请撰写完整对外 PDF 正文，章节用「1.」「2.」编号，可含附录。"
    )
    try:
        data = deepseek_json_chat(system, user, temperature=0.28)
    except Exception as exc:  # noqa: BLE001
        print(f"  [warn] DeepSeek {spec['id']}: {exc}")
        return fallback

    if not isinstance(data, dict) or not isinstance(data.get("sections"), list):
        return fallback

    sections: list[dict[str, Any]] = []
    for sec in data["sections"]:
        if not isinstance(sec, dict):
            continue
        heading = _strip_md(str(sec.get("heading") or ""))
        paras = [_strip_md(str(p)) for p in (sec.get("paragraphs") or []) if str(p).strip()]
        if heading and paras:
            sections.append({"heading": heading, "paragraphs": paras})

    total_chars = sum(len(p) for s in sections for p in s["paragraphs"])
    if len(sections) < 7 or total_chars < 2800:
        print(f"  [warn] too short ({len(sections)} secs / {total_chars} chars), merge fallback")
        seen = {s["heading"] for s in sections}
        for s in fallback["sections"]:
            if s["heading"] not in seen:
                sections.append(s)
                seen.add(s["heading"])

    sections = _expand_sections(sections, min_paras=45)
    note = _strip_md(str(data.get("confidence_note") or fallback["confidence_note"]))
    return {"confidence_note": note, "sections": sections, "source": "deepseek"}


def render_pdf(spec: dict[str, Any], body: dict[str, Any]) -> bytes:
    _register_fonts()
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    page_no = {"n": 1}

    def header_footer() -> None:
        # top brand bar (主页海军蓝)
        c.setFillColorRGB(*_NAVY)
        c.rect(0, _PAGE_H - 11 * mm, _PAGE_W, 11 * mm, fill=1, stroke=0)
        c.setFillColorRGB(*_TEAL)
        c.rect(0, _PAGE_H - 11 * mm, 3.2 * mm, 11 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont(_FONT_B, 9)
        c.drawString(_MX, _PAGE_H - 7 * mm, "积木仓 BlockHub")
        c.setFont(_FONT, 8)
        c.drawString(_MX + 38 * mm, _PAGE_H - 7 * mm, "·  " + str(spec.get("tagline") or ""))
        c.drawRightString(_PAGE_W - _MX, _PAGE_H - 7 * mm, spec["doc_code"])
        # footer
        c.setStrokeColorRGB(0.86, 0.90, 0.95)
        c.setLineWidth(0.6)
        c.line(_MX, 11 * mm, _PAGE_W - _MX, 11 * mm)
        c.setFillColorRGB(*_MUTED)
        c.setFont(_FONT, 7.5)
        c.drawString(_MX, 6.5 * mm, f"© {_TODAY[:4]} 积木仓 · 仅供客户内部评估 · {_TODAY}")
        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 8)
        c.drawRightString(_PAGE_W - _MX, 6.5 * mm, f"{page_no['n']}")

    def new_page() -> float:
        c.showPage()
        page_no["n"] += 1
        header_footer()
        return _PAGE_H - _MT

    header_footer()
    y = _PAGE_H - _MT

    # Title block
    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT_B, 18)
    for line in _wrap(c, spec["title"], _FONT_B, 18, _CW):
        c.drawString(_MX, y, line)
        y -= 8 * mm

    c.setFillColorRGB(*_MUTED)
    c.setFont(_FONT, 10)
    for line in _wrap(c, spec["subtitle"], _FONT, 10, _CW):
        c.drawString(_MX, y, line)
        y -= 5 * mm

    y -= 1 * mm
    c.setFillColorRGB(*_TEAL)
    c.rect(_MX, y + 1 * mm, 16 * mm, 1.1 * mm, fill=1, stroke=0)
    y -= 4 * mm

    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT, 8.5)
    meta = f"{spec['classification']}  ·  版本 {_TODAY}"
    for line in _wrap(c, meta, _FONT, 8.5, _CW):
        c.drawString(_MX, y, line)
        y -= 4.2 * mm

    # confidence box
    y -= 2 * mm
    note = "置信度说明：" + str(body.get("confidence_note") or "")
    note_lines = _wrap(c, note, _FONT, 9, _CW - 8 * mm)
    box_h = 6 * mm + len(note_lines) * 4.2 * mm
    if y - box_h < _MB + 10 * mm:
        y = new_page()
    c.setFillColorRGB(*_SOFT)
    c.setStrokeColorRGB(*_NAVY)
    c.setLineWidth(1)
    c.roundRect(_MX, y - box_h + 2 * mm, _CW, box_h, 4, fill=1, stroke=1)
    c.setFillColorRGB(*_TEXT)
    c.setFont(_FONT, 9)
    ty = y - 3.5 * mm
    for line in note_lines:
        c.drawString(_MX + 4 * mm, ty, line)
        ty -= 4.2 * mm
    y = y - box_h - 5 * mm

    for sec in body.get("sections") or []:
        heading = str(sec.get("heading") or "")
        paragraphs = sec.get("paragraphs") or []
        if y < _MB + 32 * mm:
            y = new_page()

        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 12)
        for line in _wrap(c, heading, _FONT_B, 12, _CW):
            if y < _MB + 14 * mm:
                y = new_page()
                c.setFillColorRGB(*_NAVY)
                c.setFont(_FONT_B, 12)
            c.drawString(_MX, y, line)
            y -= 6 * mm

        c.setStrokeColorRGB(*_TEAL)
        c.setLineWidth(2)
        c.line(_MX, y + 2.5 * mm, _MX + 14 * mm, y + 2.5 * mm)
        y -= 2 * mm

        c.setFillColorRGB(*_TEXT)
        c.setFont(_FONT, 10)
        for para in paragraphs:
            text = _strip_md(str(para))
            if not text:
                continue
            for line in _wrap(c, text, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    y = new_page()
                    c.setFillColorRGB(*_TEXT)
                    c.setFont(_FONT, 10)
                c.drawString(_MX, y, line)
                y -= 5.2 * mm
            y -= 2.4 * mm
        y -= 3 * mm

    # closing CTA
    if y < _MB + 24 * mm:
        y = new_page()
    c.setFillColorRGB(*_NAVY)
    c.setFont(_FONT_B, 9)
    c.drawString(_MX, y, "获取盖章版 / 完整问卷 / 定制差距分析")
    y -= 5 * mm
    c.setFillColorRGB(*_MUTED)
    c.setFont(_FONT, 9)
    for line in _wrap(
        c,
        "访问 blockhub.club 信任与合规中心，或预约演示联系客户成功经理。请随附本 PDF 文档编号以便版本核对。",
        _FONT,
        9,
        _CW,
    ):
        c.drawString(_MX, y, line)
        y -= 4.5 * mm

    # Ensure ≥ min pages with real appendix content (not empty memo fluff)
    while page_no["n"] < _MIN_PAGES:
        y = new_page()
        c.setFillColorRGB(*_NAVY)
        c.setFont(_FONT_B, 12)
        c.drawString(_MX, y, f"附录 · 评审工作页（第 {page_no['n']} 页）")
        y -= 7 * mm
        c.setStrokeColorRGB(*_TEAL)
        c.setLineWidth(2)
        c.line(_MX, y + 2 * mm, _MX + 14 * mm, y + 2 * mm)
        y -= 4 * mm
        c.setFillColorRGB(*_TEXT)
        c.setFont(_FONT, 10)
        work = [
            "一、请将贵司安全问卷题号映射到本资料章节（可手写）：",
            "题号 ____ → 章节 ________    题号 ____ → 章节 ________",
            "题号 ____ → 章节 ________    题号 ____ → 章节 ________",
            "二、部署偏好（勾选）：□ PaaS 标准  □ 混合部署  □ 私有化  □ 待定",
            "三、现有系统：IdP________  ERP________  CRM________  IM________",
            "四、PoC 成功标准（请填写可量化指标）：______________________________",
            "五、必须保留的控制点（如数据不出域、双人复核等）：____________________",
            "六、期望上线窗口与对接负责人：____________________________________",
            "七、需索取的盖章件：□ DPA  □ 完整问卷 Word  □ 子处理器清单  □ 渗透摘要",
            "说明：本工作页便于会签流转；不新增产品承诺。承诺以正文条款与合同为准。",
            "评审人签字：____________  日期：____________  部门：____________",
            "积木仓对接人：____________  文档编号：" + spec["doc_code"],
        ]
        for m in work:
            for line in _wrap(c, m, _FONT, 10, _CW):
                if y < _MB + 12 * mm:
                    break
                c.drawString(_MX, y, line)
                y -= 5.4 * mm
            y -= 2.2 * mm
            if y < _MB + 12 * mm:
                break

    c.save()
    return buf.getvalue()


def _pdf_page_count(data: bytes) -> int:
    # rough: count /Type /Page (not /Pages)
    return len(re.findall(rb"/Type\s*/Page[^s]", data))


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"OUT={OUT_DIR}")
    print(f"DeepSeek={'on' if settings.deepseek_api_key else 'off'}")
    ok = 0
    for spec in DOC_SPECS:
        print(f"→ {spec['file']} …")
        body = enrich_with_deepseek(spec)
        pdf = render_pdf(spec, body)
        pages = _pdf_page_count(pdf)
        path = OUT_DIR / spec["file"]
        path.write_bytes(pdf)
        print(
            f"  OK {path.name}  {len(pdf)} bytes  pages≈{pages}  "
            f"source={body.get('source')}  sections={len(body.get('sections') or [])}"
        )
        if pages < _MIN_PAGES:
            print(f"  [warn] page count < {_MIN_PAGES}")
        ok += 1
    print(f"Done: {ok}/{len(DOC_SPECS)}")
    return 0 if ok == len(DOC_SPECS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
