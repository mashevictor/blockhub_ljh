#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""DeepSeek 批量丰富剩余行业场景（edu/energy/gov/legal/hr/construction/agriculture/media/auto/marketing/mfg）。"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

_env = ROOT / "backend" / ".env"
if _env.is_file():
    for line in _env.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k:
            os.environ[k] = v
os.environ.setdefault("DEEPSEEK_TIMEOUT", "180")

from importlib import reload  # noqa: E402

import app.core.config as _cfg  # noqa: E402

reload(_cfg)
from app.services.deepseek_client import deepseek_json_chat  # noqa: E402

OUT_DIR = ROOT / "scripts" / "_vertical_deepseek"
OUT_DIR.mkdir(parents=True, exist_ok=True)

BANNED = [
    "用印", "会议室", "单点登录", "SSO", "对接OA", "对接HR", "对接SAP",
    "通用审批", "多级会签", "IT报障", "VPN", "包治百病",
]

# industry -> (中文名, allowed_keys, categories[(cat, hints, n)])
INDUSTRIES: dict[str, dict] = {
    "edu": {
        "name": "教育培训",
        "allowed": [
            "school_notice", "homework_qa", "class_schedule", "study_coach",
            "edu_grade_alert", "edu_tuition", "edu_attendance", "edu_quiz", "edu_textbook",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query",
        ],
        "categories": [
            ("家校协同", "家校通知、家长留言、活动报名、缴费提醒触达、班级群公告、成绩推送家长、请假联动家校、紧急通知", 6),
            ("学业评估", "成绩预警、薄弱知识点、单元测验分析、作业完成率、学情画像、补考登记、进步榜、不及格跟进", 6),
            ("教务排课", "课程排课、调课申请、教室冲突检测、课表查询、考试安排、代课登记、学期校历、选修分班", 6),
            ("教学互动", "作业答疑、题库练习、在线答疑、课本学习、家默督导、错题本、课堂提问、实验报告提交", 6),
            ("学籍财务", "学费收缴、退费申请、学籍异动、教材发放、奖学金申请、考勤统计、宿舍考勤、证书发放", 5),
            ("师资教研", "教研备课、听课评课、培训报名、公开课预约、教案库检索、教研纪要、师资档案", 5),
        ],
    },
    "energy": {
        "name": "能源电力",
        "allowed": [
            "site_patrol", "device_repair",
            "energy_defect", "energy_ticket", "energy_spare", "energy_emissions", "energy_outage",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query", "quality_inspect",
        ],
        "categories": [
            ("两票三制", "工作票、操作票、动火票、许可开工、安全措施确认、终结票、典型票库检索", 6),
            ("缺陷隐患", "缺陷登记、隐患分级、整改闭环、重复缺陷、超期预警、验收销号、安环拍图", 5),
            ("巡检点检", "线路巡检、变电站点检、无人机巡视、巡检打卡、测温异常、表计抄录", 5),
            ("停电抢修", "计划停电、故障抢修、复电确认、影响户数告知、抢修派工、保电任务", 5),
            ("物资双碳", "备件领用、备件归还、碳排填报、能耗统计、油耗台账、危化品领用", 5),
            ("调度安环", "调度令执行、开关操作、接地线管理、反措落实、安规问答RAG、场站应急演练", 5),
        ],
    },
    "gov": {
        "name": "政务公用",
        "allowed": [
            "gov_service", "gov_appeal", "gov_grid", "gov_license", "gov_hotline",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query", "policy_qa",
        ],
        "categories": [
            ("诉求热线", "诉求受理、热线转办、催办督办、满意度回访、重复诉求合并、紧急工单、办结归档", 6),
            ("网格治理", "网格事件、隐患上报、矛盾调解、巡查打卡、人口核查、出租屋巡查、文明创建", 5),
            ("行政审批", "证照申领、材料预审、补正告知、证照年检、许可证变更、并联审批、办件进度", 5),
            ("便民服务", "政务办事指南、预约取号、事项问答RAG、一件事一次办、跨区通办、政策解读", 5),
            ("应急公开", "应急事件登记、预警推送、信息公开申请、新闻发布会筹备、舆情报送", 4),
            ("基层数据", "数据共享申请、证照电子亮证、办件量看板、自然语言问数、部门协同对接", 4),
        ],
    },
    "legal": {
        "name": "法律服务",
        "allowed": [
            "legal_case", "legal_filing", "legal_evidence", "legal_hearing", "legal_contract_ops",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "policy_qa",
        ],
        "categories": [
            ("案件立案", "立案登记、案由分类、利益冲突检索、当事人建档、管辖审查、诉讼保全申请", 5),
            ("证据鉴定", "证据台账、鉴定委托、证据交换、证人出庭、电子证据固定、阅卷笔记", 5),
            ("诉讼排期", "开庭排期、延期申请、庭审纪要、上诉期限提醒、执行立案、和解协议", 5),
            ("非诉合同", "合同审查、条款风险点、用印前法审、律师函、尽职调查清单、常法顾问问答", 5),
            ("执行回款", "执行回款登记、财产线索、失信名单跟踪、分期履行、结案归档", 4),
            ("法规知识", "法规RAG检索、案例库、司法解释问答、时效计算器辅助、合规培训题库", 5),
        ],
    },
    "hr": {
        "name": "人力资源",
        "allowed": [
            "hire_onboard", "leave_request", "policy_qa",
            "hr_perf", "hr_training", "hr_headcount", "hr_payroll",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query",
        ],
        "categories": [
            ("招聘入职", "岗位发布、简历筛选、面试评价、Offer审批、入职指引、试用期转正、背景调查登记", 6),
            ("绩效校准", "目标制定、绩效自评、上级评分、校准会议、绩效面谈、改进计划、强制分布辅助", 5),
            ("培训发展", "培训报名、签到、考试成绩、认证到期、IDP个人发展、导师结对、内训讲师库", 5),
            ("组织编制", "编制申请、异动调岗、兼岗登记、组织架构变更、职级晋升、离职交接", 5),
            ("薪酬考勤", "薪资异议、加班核算确认、请假审批、排班调班、社保公积金变更、年终奖测算登记", 5),
            ("人才盘点", "九宫格盘点、关键岗位继任、劳动合同续签、竞业限制提醒、员工手册问答", 4),
        ],
    },
    "construction": {
        "name": "建筑工程",
        "allowed": [
            "const_safety", "const_accept", "const_progress", "deco_material", "site_patrol",
            "device_repair", "chat_qa", "kb_document", "notify_im", "chart_dashboard", "quality_inspect",
        ],
        "categories": [
            ("现场安监", "隐患整改、高处作业许可、临边防护检查、安全交底、旁站记录、事故快报", 5),
            ("质量验收", "材料进场验收、隐蔽工程验收、检验批、实测实量、不合格品处理、监理通知回复", 5),
            ("进度签证", "形象进度填报、工期预警、工程签证、变更洽商、关键节点、雨季施工措施", 5),
            ("劳务物资", "劳务实名、考勤、材料调拨、周转材、机械进出场、分包结算登记", 5),
            ("图纸交底", "图纸会审、技术交底、BIM问题单、设计变更、竣工资料、装修选材", 5),
            ("竣工收尾", "竣工验收、消缺清单、保修回访、资料归档、结算争议纪要", 4),
        ],
    },
    "agriculture": {
        "name": "农业",
        "allowed": [
            "agro_patrol", "agro_subsidy", "agro_inventory",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "site_patrol", "data_nl_query",
        ],
        "categories": [
            ("田间种植", "田间巡查、农事日历、播种记录、灌溉记录、施肥打药、长势评估、采收登记", 6),
            ("病虫害", "病虫害上报、测报数据、统防统治、飞防作业、检疫申报、损失评估", 5),
            ("农资农机", "农资出入库、种子批次、农机调度、维修保养、油耗登记、共享农机预约", 5),
            ("政策补贴", "补贴申请、面积核验、材料补正、公示异议、发放确认、政策问答RAG", 5),
            ("产销溯源", "订单对接、收购流通、冷链交接、溯源码批次、品质抽检、价格行情登记", 5),
            ("智慧农情", "气象预警、墒情监测、产量预估看板、自然语言问数、企微农技提醒", 4),
        ],
    },
    "media": {
        "name": "传媒内容",
        "allowed": [
            "media_review", "media_calendar", "campaign_ops",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query",
        ],
        "categories": [
            ("选题策划", "选题申报、采访提纲、角本大纲、竞品选题监测、热点选题池、策划评审", 5),
            ("内容生产", "稿件撰写、视频成片、素材版权、配音字幕、封面图审核、多版本管理", 5),
            ("合规审核", "内容审核、敏感词、肖像授权、广告法合规、领导人报道规范、二审三审", 5),
            ("发布运营", "发布排期、多平台分发、直播场控、互动评论治理、置顶策略、下架应急", 5),
            ("活动广告", "活动运营、刊例报价、广告排期、品牌合作、效果复盘、ROI登记", 5),
            ("舆情数据", "舆情监测、热搜追踪、阅读量看板、自然语言问数、危机公关工单", 4),
        ],
    },
    "auto": {
        "name": "汽车交通",
        "allowed": [
            "auto_service", "auto_fleet", "device_repair", "sales_lead",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "campaign_ops",
        ],
        "categories": [
            ("售后维保", "维保工单、预约进厂、质检交车、保修判定、召回执行、客户回访", 5),
            ("配件库存", "配件入库、缺件订货、旧件回收、索赔件、盘点差异、紧急调拨", 5),
            ("车队运营", "车队调度、出车任务、里程油耗、违章登记、司机排班、事故快处", 5),
            ("销售试驾", "线索跟进、试驾预约、订单排产、交车仪式、二手车评估、置换登记", 5),
            ("充电年检", "充电桩运维、故障报修、年检提醒、保险到期、ETC异常、道路救援", 4),
            ("理赔协同", "事故理赔资料、定损跟进、代步车安排、保险公司对接、结案归档", 4),
        ],
    },
    "marketing": {
        "name": "市场营销",
        "allowed": [
            "campaign_ops", "mkt_lead", "mkt_content", "sales_lead",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "chart_funnel", "data_nl_query",
        ],
        "categories": [
            ("线索获客", "线索分配、线索清洗、渠道归因、落地页线索、会销报名、转介绍激励", 5),
            ("内容投放", "内容排期、素材库、投放计划、A/B文案、渠道刊例、投放复盘", 5),
            ("活动运营", "活动策划、报名核销、现场签到、抽奖台账、预算执行、复盘纪要", 5),
            ("会员触达", "会员分层、券包发放、触达任务、沉默唤醒、企微社群、生日关怀", 5),
            ("竞品监测", "竞品价格、竞品活动、舆情对比、份额看板、战报简报", 4),
            ("效果分析", "漏斗转化、ROI看板、自然语言问数、归因分析、周报自动摘要", 4),
        ],
    },
    "mfg": {
        "name": "传统制造",
        "allowed": [
            "device_repair", "quality_inspect", "mfg_oee", "material_issue", "maintenance_plan",
            "shift_attendance", "energy_carbon", "training_record", "site_patrol",
            "chat_qa", "kb_document", "notify_im", "chart_dashboard", "data_nl_query", "erp_connector",
        ],
        "categories": [
            ("设备运维", "设备报修、保养计划、点检标准、备件更换、故障代码库、TPM活动", 5),
            ("生产OEE", "生产日报、停机原因、换型时间、节拍异常、产能达成、瓶颈工序", 5),
            ("质量SPC", "来料质检、过程检、成品检、不合格评审、SPC异常、客诉返工", 5),
            ("物料仓储", "领料退料、线边仓、齐套检查、超发预警、盘点、供应商来料预约", 5),
            ("安环班组", "安环隐患、班前会、排班考勤、技能矩阵、特种作业证、能耗碳排", 5),
            ("工艺集成", "SOP问答、图纸BOM检索、MES工单同步、ERP报工、工艺变更、培训记录", 5),
        ],
    },
}


def gen_category(ind_key: str, ind_name: str, allowed: list[str], category: str, hints: str, n: int) -> list[dict]:
    system = f"""你是 CapShip「{ind_name}」行业架构师。输出严格 JSON。
硬性边界：
1. 只写{ind_name}行业特有场景，禁止搬入通用办公（用印会议室SSO/IT报障等）。
2. 场景名禁止包含：{", ".join(BANNED)}
3. capability_key 只能从：{", ".join(allowed)}
4. 不要用 approval_flow / leave_request / seal_request 顶替行业真能力（除非 allowed 明确包含）。
5. 恰好 {n} 条，name≤12字、互不重复；page_kind：form_list|chat_kb|chart|notify|integration|files
6. form_list 给 2～4 fields（key 用 title/field_a/field_b/field_c/note）；禁止假 seed；空库空列表。
7. problem 写清业务痛点 + 真库闭环。
"""
    user = f"""大类：{category}
覆盖提示：{hints}

输出：
{{
  "scenes": [
    {{
      "name": "行业特有场景短名",
      "category": "{category}",
      "capability_key": "...",
      "pages": "form+list|chat+kb|chart|notify|kb|integration",
      "problem": "一句话痛点与真库闭环",
      "page_kind": "form_list|chat_kb|chart|notify|integration|files",
      "default_category": "英文slug",
      "form_headline": "标题",
      "fields": [{{"key":"title|field_a|field_b|field_c|note","label":"","type":"text|number|date|textarea","placeholder":"","optional":false}}]
    }}
  ]
}}
恰好 {n} 条；category 固定为「{category}」。
"""
    r = deepseek_json_chat(system, user, temperature=0.25)
    if not r:
        raise RuntimeError(f"DeepSeek failed: {ind_key}/{category}")
    scenes = []
    for s in r.get("scenes") or []:
        name = str(s.get("name") or "").strip()
        if not name or any(b in name for b in BANNED):
            continue
        ck = str(s.get("capability_key") or "")
        if ck not in allowed:
            pk = str(s.get("page_kind") or "")
            s["capability_key"] = {
                "chat_kb": "chat_qa",
                "chart": "chart_dashboard",
                "notify": "notify_im",
                "integration": "erp_connector",
                "files": "kb_document",
            }.get(pk, allowed[0])
        s["category"] = category
        s["name"] = name
        scenes.append(s)
    return scenes[:n]


def gen_industry(ind_key: str) -> dict:
    spec = INDUSTRIES[ind_key]
    all_scenes: list[dict] = []
    seen: set[str] = set()
    for cat, hints, n in spec["categories"]:
        print(f"  [{ind_key}] {cat} ×{n} …", flush=True)
        batch = gen_category(ind_key, spec["name"], spec["allowed"], cat, hints, n)
        for s in batch:
            name = s["name"]
            if name in seen:
                continue
            seen.add(name)
            all_scenes.append(s)
        print(f"    ok total={len(all_scenes)}", flush=True)
    payload = {
        "industry_key": ind_key,
        "industry_name": spec["name"],
        "overview": f"{spec['name']}深度包：行业特有场景 + 真 API 空库空列表，禁止办公套皮。",
        "highlights": [c[0] for c in spec["categories"][:4]],
        "categories": [c[0] for c in spec["categories"]],
        "scenes": all_scenes,
        "source": "deepseek_vertical_batch",
        "scene_count": len(all_scenes),
    }
    out = OUT_DIR / f"_{ind_key}_scenes_deepseek.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out} scenes={len(all_scenes)}", flush=True)
    return payload


def main() -> None:
    only = sys.argv[1:] if len(sys.argv) > 1 else list(INDUSTRIES.keys())
    for k in only:
        if k not in INDUSTRIES:
            print("skip unknown", k)
            continue
        out = OUT_DIR / f"_{k}_scenes_deepseek.json"
        if out.exists() and "--force" not in sys.argv:
            data = json.loads(out.read_text(encoding="utf-8"))
            if int(data.get("scene_count") or 0) >= 20:
                print(f"skip {k} already {data['scene_count']}")
                continue
        print(f"=== generating {k} ===", flush=True)
        gen_industry(k)


if __name__ == "__main__":
    main()
