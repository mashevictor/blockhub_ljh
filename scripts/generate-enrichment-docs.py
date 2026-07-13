"""DeepSeek 合成信任/案例/定价资料正文，并生成可打印 HTML（与官网 enrichment 子站同源）。"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BACKEND = REPO / "backend"
OUT_TS = REPO / "home" / "src" / "data" / "enrichmentContent.ts"
DL_DIR = REPO / "home" / "public" / "downloads"

sys.path.insert(0, str(BACKEND))

from app.core.config import settings  # noqa: E402
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

COMMON_LINKS = [
    {"label": "信任与合规中心", "href": "/trust"},
    {"label": "落地案例", "href": "/cases"},
    {"label": "定价说明", "href": "/pricing"},
    {"label": "预约演示", "href": "/#contact-demo"},
]

TRUST_DOCS_META = [
    ("security-whitepaper", "安全白皮书", "数据流与存储 · 加密与访问控制 · 30 天删除承诺", "/downloads/security-whitepaper.html"),
    ("integration", "系统集成清单", "用友 / 金蝶 / 钉钉 / 企业微信等常见对接说明", "/downloads/integration-checklist.html"),
    ("dpa", "数据处理协议摘要", "DPA 核心条款 · 子处理器说明 · 境内存储", "/downloads/dpa-summary.html"),
    ("deployment", "部署模式对比", "PaaS / 混合 / 私有化 · 网络边界与运维责任", "/downloads/deployment-modes.html"),
    ("security-faq", "安全常见问题答复（预填版）", "50 题常见问卷 · 42 题预填 · 带来源说明", "/downloads/security-faq.html"),
    ("audit-log", "操作日志样例", "审计字段说明 · 留存策略 · 导出方式", "/downloads/audit-log-sample.html"),
]


def ts_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def fallback_trust_sections(doc_id: str) -> list[dict]:
    lib = {
        "security-whitepaper": [
            {"heading": "文档说明", "paragraphs": [
                "本白皮书面向企业信息部门与安全团队，概述积木仓 BlockHub 在数据存储、传输加密、访问控制与删除承诺方面的实践。",
                "内容可与 [信任与合规中心](/trust) 在线资料对照；如需完整 DPA 与等保对齐说明，请 [预约演示](/#contact-demo) 获取资质包。",
            ]},
            {"heading": "数据存储与出境", "paragraphs": [
                "客户业务数据（应用配置、知识库文档、业务表单等）默认存储于**中国大陆境内**数据中心。",
                "未经客户书面授权，客户数据**不会用于**大模型训练、也不会向第三方营销共享。",
                "跨境访问需客户明确开通并签署补充条款；默认关闭境外管理员登录。",
            ]},
            {"heading": "传输与加密", "paragraphs": [
                "管理端与员工端全链路 **HTTPS/TLS 1.2+**；API 调用支持 mTLS（混合/私有化可选）。",
                "静态数据采用 **AES-256** 加密存储；密钥由云 KMS 或客户 HSM 托管（私有化可选）。",
                "敏感字段（手机号、身份证等）支持列级脱敏展示与导出控制。",
            ]},
            {"heading": "访问控制与审计", "paragraphs": [
                "基于角色的权限管理（RBAC），支持组织/部门/门店多级隔离。",
                "关键操作（登录、权限变更、数据导出、智能体发布）**全量操作日志**留存，默认 180 天，可延长至 1 年。",
                "支持 CSV/JSON 导出，字段说明见 [操作日志样例](/trust/audit-log)。",
            ]},
            {"heading": "删除与退出", "paragraphs": [
                "合同终止或客户书面请求后 **30 个自然日内**完成数据删除，并提供删除确认函。",
                "备份卷按滚动策略清除；子处理器同步删除确认可一并提供。",
            ]},
        ],
        "integration": [
            {"heading": "集成原则", "paragraphs": [
                "积木仓采用「标准 API + 可选 Webhook」与现有 ERP/CRM/OA 对接，避免替换核心系统。",
                "常见模式：只读同步主数据、线索/工单双向同步、单点登录（SSO）、消息通知回写。",
            ]},
            {"heading": "已验证系统", "paragraphs": [
                "**ERP/财务**：用友 U8/YonBIP、金蝶云星空（REST/中间表）。",
                "**CRM**：纷享销客、销售易、自建 CRM（Webhook + 自定义字段映射）。",
                "**协同**：钉钉、企业微信、飞书（通讯录同步、消息卡片、审批回调）。",
                "**身份**：Azure AD、企业微信扫码、LDAP（私有化）。",
            ]},
            {"heading": "典型对接场景", "paragraphs": [
                "制造：CRM 新线索 → 积木仓智能体草拟话术 → 销售确认后回写跟进记录。",
                "零售：HR 制度 PDF → 知识库 → 门店员工自然语言问答。",
                "物流：TMS 运单状态 API → 智能体 7×24 查询与异常推送。",
            ]},
            {"heading": "实施周期", "paragraphs": [
                "标准 REST 对接：**5–10 个工作日**（含联调与 UAT）。",
                "复杂 ERP 中间表：**2–4 周**；需客户方 DBA/集成商配合。",
                "详细接口清单与字段映射模板可在 [预约演示](/#contact-demo) 后获取。",
            ]},
        ],
        "dpa": [
            {"heading": "协议范围", "paragraphs": [
                "本摘要为积木仓标准数据处理协议（DPA）的核心条款概览，适用于 SaaS/PaaS/混合/私有化各部署模式。",
                "正式签约以双方盖章版为准；采购与法务可在 [信任与合规中心](/trust) 索取完整模板。",
            ]},
            {"heading": "处理目的与类别", "paragraphs": [
                "处理目的：提供智能体应用托管、知识库检索、多端发布与运维支持。",
                "数据类别：企业提供的业务文本、表单、日志及必要的员工账号信息。",
                "处理者角色：积木仓为**受托处理者**；客户为控制者。",
            ]},
            {"heading": "子处理器", "paragraphs": [
                "基础设施：境内云厂商（计算/存储/网络）。",
                "可选：短信/邮件网关、客户指定的 LLM API（如 DeepSeek）——仅在客户开启相关能力时调用。",
                "子处理器清单与变更通知机制见完整 DPA 附录。",
            ]},
            {"heading": "境内存储与安全措施", "paragraphs": [
                "默认境内存储；加密、访问控制与审计要求见 [安全白皮书](/trust/security-whitepaper)。",
                "客户可要求年度安全评估摘要或渗透测试报告（NDA 前提下）。",
            ]},
        ],
        "deployment": [
            {"heading": "选型概览", "paragraphs": [
                "积木仓提供 **PaaS 标准 / 混合部署 / 私有化** 三档，匹配不同数据敏感度与 IT 能力。",
                "建议路径：PaaS 试点验证场景 → 混合部署固化集成 → 私有化满足等保/行业监管（如需要）。",
            ]},
            {"heading": "PaaS 标准", "paragraphs": [
                "应用与元数据托管在积木仓境内集群；**最快 5 分钟**完成首场景配置。",
                "适合 50 人以下试点、PoC 或对 IT 依赖较小的团队。",
                "按坐席订阅；标准集成与基础技术支持包含在报价内。",
            ]},
            {"heading": "混合部署", "paragraphs": [
                "应用控制面在积木仓，**业务数据与客户知识库**存客户 VPC 或本地数据库。",
                "适合中型企业、数据不出境要求、需对接内网 ERP/CRM 的客户。",
                "首年参考区间见 [定价说明](/pricing)。",
            ]},
            {"heading": "私有化", "paragraphs": [
                "全栈部署于客户机房或专属云；支持等保二级对齐与专属 SLA。",
                "适合金融、政务、大型制造等监管要求高或需本地运维的场景。",
                "定制报价；含实施、培训与可选驻场。",
            ]},
        ],
        "security-faq": [
            {"heading": "使用说明", "paragraphs": [
                "以下为常见 50 题安全问卷中的 **42 题预填样例**（节选展示）。正式版含来源页码，可在演示后索取 Word/PDF。",
                "在线提问：各子站智能体助手支持引用本资料作答。",
            ]},
            {"heading": "数据与模型", "paragraphs": [
                "**Q：客户数据是否用于模型训练？** A：否。默认不用于训练；可选 LLM 调用仅处理当次请求。",
                "**Q：是否支持私有化大模型？** A：支持对接客户内网或指定 API（混合/私有化）。",
                "**Q：删数据流程？** A：书面申请 → 30 天内删除 → 提供删除确认函。",
            ]},
            {"heading": "部署与合规", "paragraphs": [
                "**Q：是否支持等保二级？** A：混合/私有化可参考等保二级控制项对齐；提供差距分析与整改建议。",
                "**Q：日志留存多久？** A：默认 180 天，可配置至 1 年；见 [操作日志样例](/trust/audit-log)。",
                "**Q：是否提供渗透测试报告？** A：年度摘要可向签约客户提供（NDA）。",
            ]},
        ],
        "audit-log": [
            {"heading": "审计范围", "paragraphs": [
                "操作日志覆盖管理后台与关键 API：登录/登出、权限变更、应用发布、数据导出、智能体配置变更等。",
                "日志用于安全审计、问题追溯与合规检查，**不可被普通管理员篡改**。",
            ]},
            {"heading": "字段说明（样例）", "paragraphs": [
                "`timestamp` 操作时间（UTC+8）；`actor` 操作人账号；`action` 动作类型；`resource` 对象 ID；`ip` 来源 IP；`result` 成功/失败；`detail` JSON 扩展。",
                "示例：`2026-07-08 14:32:01 | zhangsan | app.publish | app_8f3a | 10.0.1.22 | success | version=1.2.0`",
            ]},
            {"heading": "留存与导出", "paragraphs": [
                "默认留存 **180 天**；金融/政务客户可延长至 365 天（混合/私有化）。",
                "支持按时间范围、操作人、动作类型筛选导出 CSV/JSON。",
                "SIEM 对接：Syslog/Webhook（私有化可选）。",
            ]},
        ],
    }
    return lib.get(doc_id, [{"heading": "内容", "paragraphs": ["资料整理中，请预约演示获取完整版。"]}])


def deepseek_sections(doc_id: str, title: str, desc: str) -> list[dict] | None:
    if not settings.deepseek_api_key:
        return None
    system = (
        "你是积木仓 BlockHub 企业级 AI PaaS 的合规与技术写作专家。"
        "为 B2B 官网信任资料撰写专业、可转发内容。只返回 JSON："
        '{"sections":[{"heading":"小节标题","paragraphs":["段落1","段落2"]}]}'
        "每篇 5-6 个小节，每节 2-4 段；可用 **加粗** 与 [链接文字](/path) 内链。"
        "路径示例：/trust /cases /pricing /#contact-demo /trust/security-whitepaper"
    )
    user = f"资料 id={doc_id} 标题={title} 摘要={desc}"
    data = deepseek_json_chat(system, user, temperature=0.35)
    if not data or "sections" not in data:
        return None
    return data["sections"]


def build_docs() -> dict[str, dict]:
    docs: dict[str, dict] = {}
    for doc_id, title, desc, dl in TRUST_DOCS_META:
        sections = deepseek_sections(doc_id, title, desc) or fallback_trust_sections(doc_id)
        docs[doc_id] = {
            "id": doc_id,
            "title": title,
            "subtitle": desc,
            "downloadPath": dl,
            "sections": sections,
            "relatedLinks": [
                {"label": "返回信任与合规中心", "href": "/trust"},
                *COMMON_LINKS,
            ],
        }
    return docs


def write_ts(docs: dict[str, dict]) -> None:
    blocks = []
    for doc in docs.values():
        sec_lines = []
        for s in doc["sections"]:
            paras = ",\n          ".join(f"`{ts_escape(p)}`" for p in s["paragraphs"])
            sec_lines.append(
                f"      {{ heading: `{ts_escape(s['heading'])}`, paragraphs: [{paras}] }},"
            )
        rel = ",\n      ".join(
            f"{{ label: `{ts_escape(r['label'])}`, href: `{r['href']}` }}"
            for r in doc["relatedLinks"]
        )
        blocks.append(
            f"""  '{doc["id"]}': {{
    id: '{doc["id"]}',
    title: `{ts_escape(doc["title"])}`,
    subtitle: `{ts_escape(doc["subtitle"])}`,
    downloadPath: '{doc["downloadPath"]}',
    sections: [
{chr(10).join(sec_lines)}
    ],
    relatedLinks: [
      {rel},
    ],
  }},"""
        )

    content = f"""/** 信任资料正文 · DeepSeek 合成（scripts/generate-enrichment-docs.py） */

import {{ sectionsToBlocks, type EnrichBlock, type EnrichLinkItem, type EnrichSection }} from './enrichBlocks'

export interface TrustDocArticle {{
  id: string
  title: string
  subtitle: string
  downloadPath: string
  sections: EnrichSection[]
  relatedLinks: EnrichLinkItem[]
}}

export const TRUST_DOC_ARTICLES: Record<string, TrustDocArticle> = {{
{chr(10).join(blocks)}
}}

export function getTrustDocArticle(id: string): TrustDocArticle | undefined {{
  return TRUST_DOC_ARTICLES[id]
}}

export function resolveTrustDocBlocks(id: string): EnrichBlock[] {{
  const doc = getTrustDocArticle(id)
  if (!doc) return []
  return sectionsToBlocks(doc.sections, {{ relatedLinks: doc.relatedLinks }})
}}
"""
    OUT_TS.write_text(content, encoding="utf-8")
    print(f"[enrich] wrote {OUT_TS}")


HTML_STYLE = """
@page { margin: 18mm; }
body { font-family: "PingFang SC","Microsoft YaHei",sans-serif; max-width: 820px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.75; background: #f8fafc; }
.brand { background: linear-gradient(90deg,#0d47a1,#1976d2); color:#fff; padding:14px 20px; border-radius:10px; margin-bottom:24px; font-size:13px; }
.brand strong { font-size:16px; display:block; margin-bottom:4px; }
h1 { color: #0d47a1; font-size: 24px; margin: 0 0 6px; }
.sub { color: #64748b; font-size: 13px; margin-bottom: 28px; }
.panel { background:#fff; border:1px solid #e2e8f0; border-top:4px solid #0d47a1; border-radius:10px; padding:18px 20px; margin-bottom:18px; }
.panel h2 { color: #0d47a1; font-size: 16px; margin: 0 0 10px; border-left: 4px solid #00b894; padding-left: 10px; }
p { font-size: 14px; margin: 0 0 10px; }
.footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
@media print { .noprint { display: none; } body { background:#fff; } }
"""


def md_inline(text: str) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def write_html(doc: dict) -> None:
    panels = []
    for sec in doc["sections"]:
        paras = "".join(f"<p>{md_inline(p)}</p>" for p in sec["paragraphs"])
        panels.append(f'<div class="panel"><h2>{sec["heading"]}</h2>{paras}</div>')
    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><title>{doc["title"]} · 积木仓</title>
<style>{HTML_STYLE}</style></head><body>
<p class="noprint" style="background:#eff6ff;padding:10px;border-radius:8px;font-size:13px;">&gt;&gt; 积木仓资料 · 浏览器打印为 PDF（Ctrl+P）· 与官网 <a href="/trust/{doc["id"]}">在线版</a> 同步</p>
<div class="brand"><strong>积木仓 BlockHub</strong>五分钟搭好，打开就能用 · 信任与合规资料</div>
<h1>{doc["title"]}</h1>
<p class="sub">{doc["subtitle"]} · 2026</p>
{"".join(panels)}
<div class="footer">© 积木仓 · 本资料仅供预约客户内部评估使用 · DeepSeek 辅助生成</div>
</body></html>"""
    out = DL_DIR / Path(doc["downloadPath"]).name
    out.write_text(html, encoding="utf-8")


def write_case_one_pagers() -> None:
    """从 siteCases 逻辑生成案例一页纸 HTML（简化：读 fallback）。"""
    cases = {
        "one-pager-mfg.html": ("制造行业 · 一页纸方案摘要", "销售线索快速响应 · 人工确认版", [
            ("客户背景", ["800 人精密零部件制造，日均 CRM 线索约 40 条。", "首响 P50 约 3.2 小时，高价值线索流失。"]),
            ("方案", ["智能体草拟话术 + 销售确认发送。", "对接 CRM Webhook，30 分钟内推送跟进建议。"]),
            ("指标", ["200 条脱敏线索验证；首响 28 分钟；采纳率 72%。", "销售主管与 IT 书面验收，首年合同约 80 万。"]),
        ]),
        "one-pager-retail.html": ("连锁零售 · 智慧办公", "五端同步 · 制度问答", [
            ("场景", ["请假审批、制度问答、门店排班、福利咨询。"]),
            ("价值", ["5 分钟配置首场景；120+ 门店五端同步。"]),
            ("部署", ["PaaS 标准，按坐席订阅；2 周完成制度文档整理。"]),
        ]),
        "one-pager-logistics.html": ("物流货代 · 运单跟踪", "7×24 智能问答", [
            ("场景", ["运单查询、异常通知、报价审批辅助。"]),
            ("价值", ["对接 TMS；工单下降 35%；满意度 +0.6。"]),
            ("试点", ["14 天，500 条脱敏运单验证准确率。"]),
        ]),
    }
    for filename, (title, sub, sections) in cases.items():
        doc = {"id": filename, "title": title, "subtitle": sub, "downloadPath": f"/downloads/{filename}", "sections": [
            {"heading": h, "paragraphs": ps} for h, ps in sections
        ]}
        write_html(doc)


def main() -> None:
    docs = build_docs()
    write_ts(docs)
    DL_DIR.mkdir(parents=True, exist_ok=True)
    for doc in docs.values():
        write_html(doc)
    write_case_one_pagers()
    print(f"[enrich] generated {len(docs)} trust HTML + 3 case one-pagers in {DL_DIR}")


if __name__ == "__main__":
    main()
