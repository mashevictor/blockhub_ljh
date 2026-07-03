"""合同模板字段定义与正文渲染。

开源参考（本模块采用 ReportLab + Pillow 自研，未嵌入 Java 栈）：
- 开放签 kaifangqian-base：手写签名、印章生成、PDF 签署（Java）
- Mini Contract.Pro：模板市场、AI 起草（多语言 SDK）
- docxtpl / DocQuill：Word 模板占位符（可选后续接入）
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# 字段类型: text | textarea | date | number | select | id_card | phone | money
FieldDef = dict[str, Any]

COMMON_PARTIES: list[FieldDef] = [
    {"key": "party_a", "label": "甲方名称", "section": "合同双方", "type": "text", "required": True, "placeholder": "XX有限公司", "maps_to": "party_a"},
    {"key": "party_b", "label": "乙方名称", "section": "合同双方", "type": "text", "required": True, "placeholder": "张三", "maps_to": "party_b"},
]

LABOR_FIELDS: list[FieldDef] = [
    {"key": "party_a", "label": "用人单位（甲方）", "section": "甲方信息", "type": "text", "required": True, "placeholder": "北京某某科技有限公司"},
    {"key": "employer_legal_rep", "label": "法定代表人", "section": "甲方信息", "type": "text", "placeholder": "李四"},
    {"key": "employer_address", "label": "甲方地址", "section": "甲方信息", "type": "text", "placeholder": "北京市海淀区XX路XX号"},
    {"key": "employer_credit_code", "label": "统一社会信用代码", "section": "甲方信息", "type": "text", "placeholder": "91110000XXXXXXXX"},
    {"key": "party_b", "label": "劳动者（乙方）", "section": "乙方信息", "type": "text", "required": True, "placeholder": "王五"},
    {"key": "employee_id_no", "label": "身份证号码", "section": "乙方信息", "type": "id_card", "placeholder": "110101199001011234"},
    {"key": "employee_address", "label": "乙方住址", "section": "乙方信息", "type": "text", "placeholder": "北京市朝阳区XX小区"},
    {"key": "employee_phone", "label": "联系电话", "section": "乙方信息", "type": "phone", "placeholder": "13800138000"},
    {"key": "contract_term_type", "label": "合同期限类型", "section": "合同期限", "type": "select", "options": ["固定期限", "无固定期限", "以完成一定工作任务为期限"], "default": "固定期限"},
    {"key": "start_date", "label": "合同起始日期", "section": "合同期限", "type": "date", "required": True, "placeholder": "2026-07-01"},
    {"key": "end_date", "label": "合同终止日期", "section": "合同期限", "type": "date", "placeholder": "2029-06-30"},
    {"key": "probation_months", "label": "试用期（月）", "section": "合同期限", "type": "number", "default": "3", "placeholder": "3"},
    {"key": "job_title", "label": "工作岗位", "section": "工作内容", "type": "text", "required": True, "placeholder": "软件工程师"},
    {"key": "work_location", "label": "工作地点", "section": "工作内容", "type": "text", "required": True, "placeholder": "北京市海淀区"},
    {"key": "work_content", "label": "工作内容描述", "section": "工作内容", "type": "textarea", "placeholder": "负责产品研发、需求分析、代码编写与测试等工作。"},
    {"key": "work_hours_type", "label": "工时制度", "section": "工作时间", "type": "select", "options": ["标准工时制", "综合计算工时制", "不定时工作制"], "default": "标准工时制"},
    {"key": "salary_monthly", "label": "月工资（元）", "section": "劳动报酬", "type": "money", "required": True, "placeholder": "15000"},
    {"key": "salary_pay_day", "label": "工资发放日", "section": "劳动报酬", "type": "number", "default": "15", "placeholder": "每月15日"},
    {"key": "social_insurance", "label": "社会保险", "section": "福利保障", "type": "text", "default": "甲方依法为乙方缴纳养老、医疗、失业、工伤、生育保险及住房公积金"},
    {"key": "other_terms", "label": "其他约定", "section": "其他", "type": "textarea", "placeholder": "双方可约定培训、保密、竞业限制等事项。"},
    {"key": "sign_place", "label": "签订地点", "section": "签署信息", "type": "text", "default": "北京市"},
    {"key": "sign_date", "label": "签订日期", "section": "签署信息", "type": "date", "placeholder": "2026-07-03"},
    {"key": "seal_company", "label": "公章单位名称", "section": "签署信息", "type": "text", "placeholder": "与甲方名称一致，用于模拟电子章"},
]

LABOR_BODY = """
<h2 style="text-align:center">劳 动 合 同</h2>
<p><strong>甲方（用人单位）：</strong>{{party_a}}</p>
<p>法定代表人：{{employer_legal_rep}}</p>
<p>住 所：{{employer_address}}</p>
<p>统一社会信用代码：{{employer_credit_code}}</p>
<p><strong>乙方（劳动者）：</strong>{{party_b}}</p>
<p>身份证号码：{{employee_id_no}}</p>
<p>住 址：{{employee_address}}</p>
<p>联系电话：{{employee_phone}}</p>
<p>根据《中华人民共和国劳动法》《中华人民共和国劳动合同法》及有关法律、法规、规章，甲乙双方在平等自愿、协商一致的基础上，签订本劳动合同，共同遵守本合同所列条款。</p>

<h3>第一条 劳动合同期限</h3>
<p>1.1 本合同为{{contract_term_type}}劳动合同。</p>
<p>1.2 合同期限自 {{start_date}} 起至 {{end_date}} 止（以完成一定工作任务为期限的，起止时间以双方书面约定为准）。</p>
<p>1.3 试用期为 {{probation_months}} 个月，试用期包含在劳动合同期限内。试用期内乙方不符合录用条件的，甲方可依法解除劳动合同。</p>

<h3>第二条 工作内容和工作地点</h3>
<p>2.1 乙方同意根据甲方工作需要，担任 <strong>{{job_title}}</strong> 岗位工作。</p>
<p>2.2 工作地点：{{work_location}}。甲方因生产经营需要调整工作地点的，应与乙方协商一致或按法律规定执行。</p>
<p>2.3 乙方应按照甲方的岗位职责要求，按时完成规定的工作任务，达到规定的质量标准。具体工作内容：{{work_content}}</p>

<h3>第三条 工作时间和休息休假</h3>
<p>3.1 甲方实行 {{work_hours_type}}。</p>
<p>3.2 甲方保证乙方每周至少休息一日，依法安排乙方享受法定节假日、年休假、婚丧假、产假等假期。</p>
<p>3.3 甲方因生产经营需要安排乙方加班的，应依法支付加班工资或安排补休。</p>

<h3>第四条 劳动报酬</h3>
<p>4.1 乙方月工资为人民币 <strong>{{salary_monthly}}</strong> 元（税前）。</p>
<p>4.2 甲方每月 {{salary_pay_day}} 日前以货币形式足额支付乙方工资，遇节假日顺延。</p>
<p>4.3 甲方根据经营状况、乙方工作绩效及岗位职责变化，可依法调整乙方工资，但不得低于当地最低工资标准。</p>

<h3>第五条 社会保险和福利待遇</h3>
<p>5.1 {{social_insurance}}。</p>
<p>5.2 乙方享受甲方依法提供的其他福利待遇，具体按甲方规章制度执行。</p>

<h3>第六条 劳动保护、劳动条件和职业危害防护</h3>
<p>6.1 甲方应为乙方提供符合国家规定的劳动安全卫生条件和必要的劳动防护用品。</p>
<p>6.2 甲方对从事有职业危害作业的乙方，应定期进行健康检查。</p>
<p>6.3 乙方应严格遵守安全操作规程，有权拒绝违章指挥和强令冒险作业。</p>

<h3>第七条 劳动合同的履行和变更</h3>
<p>7.1 甲乙双方应按照本合同约定全面履行各自义务。</p>
<p>7.2 变更本合同应经双方协商一致，采用书面形式。</p>

<h3>第八条 劳动合同的解除和终止</h3>
<p>8.1 甲乙双方解除、终止劳动合同，应符合《劳动合同法》及相关法律法规的规定。</p>
<p>8.2 解除或终止本合同时，甲方应为乙方出具解除或终止劳动合同证明，并在十五日内为乙方办理档案和社会保险关系转移手续。</p>

<h3>第九条 违约责任</h3>
<p>9.1 任何一方违反本合同约定，给对方造成损失的，应依法承担赔偿责任。</p>
<p>9.2 乙方违反服务期或竞业限制约定的，应承担违约金；违约金数额不得超过法律规定标准。</p>

<h3>第十条 劳动争议处理</h3>
<p>因履行本合同发生的劳动争议，双方可协商解决；协商不成的，可向甲方所在地劳动争议仲裁委员会申请仲裁；对仲裁裁决不服的，可依法向人民法院提起诉讼。</p>

<h3>第十一条 其他约定</h3>
<p>{{other_terms}}</p>

<h3>第十二条 合同生效</h3>
<p>12.1 本合同一式两份，甲乙双方各执一份，具有同等法律效力。</p>
<p>12.2 本合同自双方签字（或盖章）之日起生效。</p>
<p>12.3 签订地点：{{sign_place}}；签订日期：{{sign_date}}。</p>

<p><br/></p>
<p><strong>（以下无正文，为签署页）</strong></p>
<p>甲方（盖章）：________________　　　　乙方（签字）：________________</p>
<p>法定代表人或委托代理人：________　　　日期：________________</p>
<p>日期：________________</p>
"""

NDA_FIELDS: list[FieldDef] = [
    {"key": "party_a", "label": "披露方（甲方）", "section": "双方信息", "type": "text", "required": True},
    {"key": "party_b", "label": "接收方（乙方）", "section": "双方信息", "type": "text", "required": True},
    {"key": "project_name", "label": "合作项目", "section": "保密范围", "type": "text", "placeholder": "XX系统开发项目"},
    {"key": "confidential_years", "label": "保密期限（年）", "section": "保密范围", "type": "number", "default": "3"},
    {"key": "sign_date", "label": "签订日期", "section": "签署", "type": "date"},
]

NDA_BODY = """
<h2 style="text-align:center">保 密 协 议</h2>
<p>披露方（甲方）：{{party_a}}</p>
<p>接收方（乙方）：{{party_b}}</p>
<p>鉴于双方拟就「{{project_name}}」开展合作，为保护双方商业秘密，经协商一致，订立本协议。</p>
<h3>第一条 保密信息</h3>
<p>保密信息包括但不限于技术资料、源代码、商业计划、客户名单、财务数据、合同条款及其他标注为保密的信息。</p>
<h3>第二条 保密义务</h3>
<p>接收方应对保密信息严格保密，不得向任何第三方披露，仅用于双方合作项目，并采取不低于保护自身商业秘密的合理措施。</p>
<h3>第三条 保密期限</h3>
<p>保密义务自本协议签署之日起 {{confidential_years}} 年内有效，或至该信息依法进入公有领域时止。</p>
<h3>第四条 违约责任</h3>
<p>违反本协议的一方应赔偿对方因此遭受的全部直接和间接损失。</p>
<p>签订日期：{{sign_date}}</p>
<p>甲方（盖章）：________　乙方（签字）：________</p>
"""

PROCUREMENT_FIELDS: list[FieldDef] = [
    {"key": "party_a", "label": "采购方（甲方）", "section": "双方", "type": "text", "required": True},
    {"key": "party_b", "label": "供应方（乙方）", "section": "双方", "type": "text", "required": True},
    {"key": "goods_desc", "label": "采购标的", "section": "标的", "type": "textarea", "required": True},
    {"key": "total_amount", "label": "合同总价（元）", "section": "价款", "type": "money", "required": True},
    {"key": "delivery_date", "label": "交付日期", "section": "履行", "type": "date"},
    {"key": "warranty_months", "label": "质保期（月）", "section": "履行", "type": "number", "default": "12"},
    {"key": "sign_date", "label": "签订日期", "section": "签署", "type": "date"},
]

PROCUREMENT_BODY = """
<h2 style="text-align:center">采 购 合 同</h2>
<p>甲方（采购方）：{{party_a}}</p>
<p>乙方（供应方）：{{party_b}}</p>
<h3>第一条 采购标的</h3>
<p>{{goods_desc}}</p>
<h3>第二条 合同价款</h3>
<p>合同总价为人民币 {{total_amount}} 元（含税）。</p>
<h3>第三条 交付与验收</h3>
<p>乙方应于 {{delivery_date}} 前完成交付，甲方在收到货物后 7 个工作日内组织验收。</p>
<h3>第四条 质量保证</h3>
<p>质保期为 {{warranty_months}} 个月，质保期内非人为损坏由乙方免费维修或更换。</p>
<h3>第五条 争议解决</h3>
<p>协商不成，提交甲方所在地人民法院诉讼解决。</p>
<p>签订日期：{{sign_date}}</p>
<p>甲方（盖章）：________　乙方（盖章）：________</p>
"""

SERVICE_FIELDS: list[FieldDef] = [
    {"key": "party_a", "label": "委托方（甲方）", "section": "双方", "type": "text", "required": True},
    {"key": "party_b", "label": "受托方（乙方）", "section": "双方", "type": "text", "required": True},
    {"key": "service_scope", "label": "服务内容", "section": "服务", "type": "textarea", "required": True},
    {"key": "service_period", "label": "服务期限", "section": "服务", "type": "text", "placeholder": "2026-07-01 至 2026-12-31"},
    {"key": "total_fee", "label": "服务费用（元）", "section": "费用", "type": "money"},
    {"key": "sign_date", "label": "签订日期", "section": "签署", "type": "date"},
]

SERVICE_BODY = """
<h2 style="text-align:center">技 术 服 务 合 同</h2>
<p>甲方：{{party_a}}</p>
<p>乙方：{{party_b}}</p>
<h3>第一条 服务内容</h3>
<p>{{service_scope}}</p>
<h3>第二条 服务期限</h3>
<p>{{service_period}}</p>
<h3>第三条 服务费用</h3>
<p>合同总价人民币 {{total_fee}} 元，按里程碑分期支付。</p>
<h3>第四条 验收</h3>
<p>甲方在收到交付物后 10 个工作日内完成验收并出具书面确认。</p>
<p>签订日期：{{sign_date}}</p>
"""

BLANK_FIELDS: list[FieldDef] = [
    {"key": "party_a", "label": "甲方", "section": "双方", "type": "text"},
    {"key": "party_b", "label": "乙方", "section": "双方", "type": "text"},
    {"key": "custom_body", "label": "合同要点", "section": "内容", "type": "textarea", "placeholder": "简述合同标的、价款、期限等"},
]

BLANK_BODY = """
<h2>{{title}}</h2>
<p>甲方：{{party_a}}</p>
<p>乙方：{{party_b}}</p>
<p>{{custom_body}}</p>
<p>本合同一式两份，双方各执一份，自签字盖章之日起生效。</p>
"""

TEMPLATE_REGISTRY: dict[str, dict[str, Any]] = {
    "labor": {
        "key": "labor",
        "name": "劳动合同",
        "description": "符合《劳动合同法》框架的完整劳动合同，支持表单填空与 AI 生成",
        "category": "人事",
        "fields": LABOR_FIELDS,
        "body": LABOR_BODY,
        "default_title": "劳动合同",
    },
    "nda": {
        "key": "nda",
        "name": "保密协议",
        "description": "双向保密义务协议",
        "category": "法务",
        "fields": NDA_FIELDS,
        "body": NDA_BODY,
        "default_title": "保密协议",
    },
    "procurement": {
        "key": "procurement",
        "name": "采购合同",
        "description": "物资/服务采购",
        "category": "采购",
        "fields": PROCUREMENT_FIELDS,
        "body": PROCUREMENT_BODY,
        "default_title": "采购合同",
    },
    "service": {
        "key": "service",
        "name": "技术服务合同",
        "description": "软件开发/技术服务",
        "category": "技术",
        "fields": SERVICE_FIELDS,
        "body": SERVICE_BODY,
        "default_title": "技术服务合同",
    },
    "blank": {
        "key": "blank",
        "name": "自定义合同",
        "description": "自由编辑或使用 AI 生成",
        "category": "通用",
        "fields": BLANK_FIELDS,
        "body": BLANK_BODY,
        "default_title": "合同",
    },
}


def list_templates_brief() -> list[dict]:
    return [
        {"key": t["key"], "name": t["name"], "description": t["description"], "category": t.get("category", "")}
        for t in TEMPLATE_REGISTRY.values()
    ]


def get_template(key: str) -> dict | None:
    return TEMPLATE_REGISTRY.get(key)


def get_template_fields(key: str) -> list[FieldDef]:
    tpl = get_template(key)
    return deepcopy(tpl["fields"]) if tpl else []


def default_field_values(key: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for f in get_template_fields(key):
        if f.get("default") is not None:
            values[f["key"]] = str(f["default"])
    return values


def _blank(v: str | None, placeholder: str = "________") -> str:
    s = (v or "").strip()
    return s if s else placeholder


def render_body(template_key: str, values: dict[str, Any], *, title: str = "") -> str:
    tpl = get_template(template_key) or get_template("blank")
    assert tpl is not None
    body = tpl["body"]
    merged = {**default_field_values(template_key), **values}
    if title:
        merged["title"] = title
    for f in tpl["fields"]:
        k = f["key"]
        if k not in merged and f.get("default"):
            merged[k] = f["default"]
    import re
    for key in set(re.findall(r"\{\{(\w+)\}\}", body)):
        body = body.replace(f"{{{{{key}}}}}", _blank(str(merged.get(key, ""))))
    return body.strip()


def parties_from_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """存储结构：party_a/party_b + fields 子对象。"""
    return {
        "party_a": fields.get("party_a", ""),
        "party_b": fields.get("party_b", ""),
        "fields": {k: v for k, v in fields.items() if k not in ("party_a", "party_b")},
        "seal_company": fields.get("seal_company") or fields.get("party_a", ""),
    }


def flatten_parties(parties: dict | None) -> dict[str, str]:
    if not parties:
        return {}
    out = dict(parties.get("fields") or {})
    if parties.get("party_a"):
        out["party_a"] = parties["party_a"]
    if parties.get("party_b"):
        out["party_b"] = parties["party_b"]
    if parties.get("seal_company"):
        out["seal_company"] = parties["seal_company"]
    return {k: str(v) for k, v in out.items() if v is not None}
