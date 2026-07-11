"""Generate printable HTML download docs for B2B enrichment."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "home" / "public" / "downloads"


def page(title: str, subtitle: str, sections: list[tuple[str, list[str]]]) -> str:
    body = ""
    for h, paras in sections:
        body += f"<h2>{h}</h2>" + "".join(f"<p>{p}</p>" for p in paras)
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"/><title>{title} · 积木仓</title>
<style>
@page {{ margin: 18mm; }}
body {{ font-family: "PingFang SC","Microsoft YaHei",sans-serif; max-width: 800px; margin: 0 auto; padding: 32px 24px; color: #1e293b; line-height: 1.7; }}
h1 {{ color: #0d47a1; font-size: 24px; margin-bottom: 4px; }}
.sub {{ color: #64748b; font-size: 13px; margin-bottom: 28px; }}
h2 {{ color: #0d47a1; font-size: 16px; margin: 24px 0 8px; border-left: 4px solid #00b894; padding-left: 10px; }}
p {{ font-size: 14px; margin: 0 0 10px; }}
.footer {{ margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }}
@media print {{ .noprint {{ display: none; }} }}
</style></head><body>
<p class="noprint" style="background:#eff6ff;padding:10px;border-radius:8px;font-size:13px;">&gt;&gt; 积木仓资料 · 浏览器打印为 PDF（Ctrl+P）</p>
<h1>{title}</h1>
<p class="sub">{subtitle} · 积木仓 BlockHub · 2026</p>
{body}
<div class="footer">© 积木仓 · 本资料仅供预约客户内部评估使用</div>
</body></html>"""


DOCS: dict[str, tuple[str, str, list[tuple[str, list[str]]]]] = {
    "security-whitepaper.html": (
        "安全白皮书",
        "数据流 · 加密 · 访问控制 · 删除承诺",
        [
            ("数据存储与出境", ["客户业务数据默认存储于中国大陆境内数据中心。", "未经客户书面授权，数据不会用于模型训练或第三方共享。"]),
            ("传输与加密", ["全链路 HTTPS/TLS 1.2+。静态数据 AES-256 加密存储。"]),
            ("访问控制", ["基于角色的权限管理（RBAC）。操作日志全量留存，支持导出审计。"]),
            ("删除承诺", ["合同终止或客户书面请求后 30 天内完成数据删除，并提供删除确认函。"]),
        ],
    ),
    "integration-checklist.html": (
        "系统集成清单",
        "常见 ERP/CRM/协同办公对接说明",
        [
            ("已支持系统", ["用友 U8/YonSuite · 金蝶云星空 · 钉钉 · 企业微信 · 飞书 · Salesforce（API）"]),
            ("对接方式", ["REST API / Webhook / 数据库只读视图 / 中间件同步，按客户 IT 规范选型。"]),
            ("数据流", ["智能体仅读取业务所需字段；写回操作需配置审批或人工确认节点。"]),
            ("实施周期", ["标准对接 2–4 周；复杂定制按里程碑评估。"]),
        ],
    ),
    "dpa-summary.html": (
        "数据处理协议摘要",
        "DPA 核心条款 · 子处理器 · 境内存储",
        [
            ("处理目的", ["仅为提供约定智能体服务而处理客户数据，不得用于其他商业目的。"]),
            ("子处理器", ["云基础设施、邮件/SMS 服务商等均在附录列明，变更提前 30 天通知。"]),
            ("安全义务", ["采取行业合理安全措施；发生泄露 72 小时内通知客户。"]),
            ("跨境", ["默认境内处理；如需跨境传输须单独签署补充协议。"]),
        ],
    ),
    "deployment-modes.html": (
        "部署模式对比",
        "SaaS · 混合 · 私有化",
        [
            ("SaaS 标准", ["最快上线，按坐席订阅，适合试点与小团队。"]),
            ("混合部署", ["应用层 SaaS，业务数据存客户 VPC 或本地数据库，适合中型企业。"]),
            ("私有化", ["全栈部署于客户机房或专属云，适合等保/行业监管要求高的客户。"]),
            ("选型建议", ["先 SaaS 试点验证场景，再按数据敏感度升级混合或私有化。"]),
        ],
    ),
    "security-faq.html": (
        "安全常见问题答复",
        "50 题问卷 · 42 题预填",
        [
            ("客户数据会不会用于模型训练？", ["不会。客户数据与通用模型训练隔离，合同明确禁止未授权使用。"]),
            ("删数据流程是什么？", ["提交工单 → 7 个工作日内完成删除 → 提供书面确认。"]),
            ("是否支持私有化部署？", ["支持。含本地部署、专属云与混合模式，详见部署模式对比。"]),
            ("等保二级如何对齐？", ["提供等保差距分析清单，配合客户测评机构完成整改与备案。"]),
        ],
    ),
    "audit-log-sample.html": (
        "操作日志样例",
        "审计字段 · 留存 · 导出",
        [
            ("记录字段", ["时间戳、操作者、IP、资源类型、动作、结果、关联业务 ID"]),
            ("留存策略", ["默认留存 180 天，可配置延长至 3 年（私有化）。"]),
            ("导出方式", ["管理后台 CSV/JSON 导出，支持 SIEM 对接。"]),
        ],
    ),
    "one-pager-mfg.html": (
        "一页纸方案摘要",
        "制造 · 销售线索快速响应",
        [
            ("客户痛点", ["CRM 线索多、首响慢、高价值线索流失。"]),
            ("方案", ["智能体草拟跟进话术 + 销售人工确认发送，30 分钟内触达。"]),
            ("试点结果", ["200 条真实线索验证：首响 28 分钟，采纳率 72%。"]),
            ("商务框架", ["混合部署首年约 80–120 万，含标准 CRM 对接与 7×12 技术支持。"]),
        ],
    ),
    "one-pager-retail.html": (
        "一页纸方案摘要",
        "零售 · 智慧办公",
        [
            ("场景", ["请假审批、制度问答、门店排班、福利咨询。"]),
            ("价值", ["5 分钟配置首场景，120+ 门店五端同步。"]),
            ("部署", ["SaaS 标准，按坐席订阅，2 周完成制度文档整理。"]),
        ],
    ),
    "one-pager-logistics.html": (
        "一页纸方案摘要",
        "物流 · 运单跟踪",
        [
            ("场景", ["运单查询、异常通知、客服问答 7×24 值守。"]),
            ("价值", ["对接 TMS，工单量下降约 35%，满意度 +0.6。"]),
            ("试点", ["14 天 POC，500 条脱敏运单验证准确率。"]),
        ],
    ),
}


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, (title, sub, sections) in DOCS.items():
        ROOT.joinpath(name).write_text(page(title, sub, sections), encoding="utf-8")
    print(f"Wrote {len(DOCS)} files to {ROOT}")


if __name__ == "__main__":
    main()
