"""各行业专属知识库 SSOT：每行业固定 2 个真 KnowledgeBase。

发布时按租户幂等创建；Runtime 场景通过 kb_name 锁定到对应库。
默认空库空列表；医疗 / 传统制造等深包可附带 DeepSeek 生成的示范 Markdown，
经 create_uploaded_document + index_document 真链路写入（按文件名幂等，非假列表）。
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# pack_key → 恰好 2 个专属库（name 全局唯一约定：带行业前缀）
INDUSTRY_KNOWLEDGE_BASES: dict[str, list[dict[str, str]]] = {
    "office": [
        {
            "slug": "office-policy",
            "name": "办公·制度与员工手册库",
            "description": "员工手册、考勤制度、报销规范、用印流程等制度文档 RAG 检索；不替代法务意见。",
        },
        {
            "slug": "office-ops-faq",
            "name": "办公·协作与IT运维知识库",
            "description": "会议室规范、IT 排障、入职指引、项目文档模板；向量检索 + 问答辅助。",
        },
    ],
    "mfg": [
        {
            "slug": "mfg-sop",
            "name": "制造·工艺SOP与作业指导库",
            "description": "作业指导书、工艺卡、换型检查表；RAG 检索辅助现场执行，不替代工艺员签发。",
        },
        {
            "slug": "mfg-quality",
            "name": "制造·质检与安环知识库",
            "description": "质检标准、不合格处理、安环隐患案例；检索辅助质检/巡检。",
        },
    ],
    "sales": [
        {
            "slug": "sales-playbook",
            "name": "销售·话术案例与方案库",
            "description": "产品话术、成功案例、解决方案、销售FAQ；RAG 赋能一线话术，不编造客户承诺。",
        },
        {
            "slug": "sales-compete",
            "name": "销售·竞品与产品知识库",
            "description": "竞品对比、产品说明书、报价口径、演示脚本；检索辅助售前，不替代正式报价审批。",
        },
    ],
    "med": [
        {
            "slug": "med-guidelines",
            "name": "医疗·诊疗指南与临床路径库",
            "description": "诊疗指南、临床路径、抗菌药物合理使用、危急值释义；RAG 辅助检索，不替代执业医师诊疗。",
        },
        {
            "slug": "med-pharma-sop",
            "name": "医疗·药品说明与护理SOP库",
            "description": "药品说明书、护理操作SOP、院感制度摘要；检索辅助护理/药学，不替代药师审核。",
        },
    ],
    "game": [
        {
            "slug": "game-faq",
            "name": "游戏·玩家FAQ与活动规则库",
            "description": "活动规则、玩法攻略、版本说明；客服/运营检索，不替代官方公告。",
        },
        {
            "slug": "game-compliance",
            "name": "游戏·版号合规与内容审核库",
            "description": "版号材料要点、敏感词规范、外包验收标准。",
        },
    ],
    "retail": [
        {
            "slug": "retail-ops",
            "name": "零售·门店运营与陈列知识库",
            "description": "陈列规范、补货策略、巡检要点、退换货政策。",
        },
        {
            "slug": "retail-member",
            "name": "零售·会员营销与促销知识库",
            "description": "会员等级规则、积分兑换、促销活动玩法说明。",
        },
    ],
    "edu": [
        {
            "slug": "edu-teach",
            "name": "教育·教学资料与课纲知识库",
            "description": "课纲、课件要点、考试安排说明；教研检索。",
        },
        {
            "slug": "edu-home",
            "name": "教育·家校沟通与制度知识库",
            "description": "家校通知模板、学生守则、作业答疑口径。",
        },
    ],
    "finance": [
        {
            "slug": "finance-compliance",
            "name": "金融·合规审查与风控知识库",
            "description": "合规清单、风控要点、客户告知义务摘要；不替代持牌意见。",
        },
        {
            "slug": "finance-product",
            "name": "金融·产品说明与合同条款库",
            "description": "产品说明书、合同模板要点、披露口径。",
        },
    ],
    "logistics": [
        {
            "slug": "logistics-ops",
            "name": "物流·运单异常与仓储SOP库",
            "description": "异常上报口径、仓储盘点SOP、签收规范。",
        },
        {
            "slug": "logistics-cold",
            "name": "物流·冷链与配送安全知识库",
            "description": "温控标准、配送安全、危险品注意事项。",
        },
    ],
    "realestate": [
        {
            "slug": "re-sales",
            "name": "房产·楼盘话术与签约知识库",
            "description": "楼盘卖点、认购流程、签约材料清单。",
        },
        {
            "slug": "re-property",
            "name": "房产·物业报修与业主服务库",
            "description": "报修分类、收费标准摘要、业主公约要点。",
        },
    ],
    "hotel": [
        {
            "slug": "hotel-service",
            "name": "酒旅·客房服务与品质SOP库",
            "description": "客房SOP、公区巡检、客诉处理口径。",
        },
        {
            "slug": "hotel-member",
            "name": "酒旅·预订政策与会员权益库",
            "description": "预订取消规则、会员权益、餐饮套餐说明。",
        },
    ],
    "energy": [
        {
            "slug": "energy-patrol",
            "name": "能源·巡检与缺陷处理知识库",
            "description": "线路巡检要点、缺陷分级、两票管理摘要。",
        },
        {
            "slug": "energy-safety",
            "name": "能源·安全规程与能耗知识库",
            "description": "安规条款、能耗异常处置、应急预案摘要。",
        },
    ],
    "gov": [
        {
            "slug": "gov-guide",
            "name": "政务·办事指南与材料清单库",
            "description": "事项指南、材料清单、办理时限；便民检索。",
        },
        {
            "slug": "gov-policy",
            "name": "政务·政策法规与网格治理库",
            "description": "政策解读摘要、网格事件处置口径。",
        },
    ],
    "legal": [
        {
            "slug": "legal-case",
            "name": "法务·案件与诉讼文书知识库",
            "description": "案件节点、文书模板要点；不替代律师意见。",
        },
        {
            "slug": "legal-contract",
            "name": "法务·合同审查与法规检索库",
            "description": "合同审查清单、法规摘录、风险条款提示。",
        },
    ],
    "hr": [
        {
            "slug": "hr-policy",
            "name": "人力·制度福利与员工手册库",
            "description": "薪酬福利、假期制度、员工手册；制度问答底座。",
        },
        {
            "slug": "hr-hire",
            "name": "人力·招聘入职与培训知识库",
            "description": "招聘流程、入职清单、培训大纲。",
        },
    ],
    "marketing": [
        {
            "slug": "mkt-campaign",
            "name": "营销·活动玩法与投放知识库",
            "description": "活动方案模板、投放复盘口径、素材规范。",
        },
        {
            "slug": "mkt-brand",
            "name": "营销·品牌话术与合规审核库",
            "description": "品牌话术、内容合规要点、线索培育脚本。",
        },
    ],
    "construction": [
        {
            "slug": "cons-safety",
            "name": "建筑·安全质量与验收知识库",
            "description": "安全隐患标准、质量验收要点、旁站记录规范。",
        },
        {
            "slug": "cons-material",
            "name": "建筑·材料与施工进度知识库",
            "description": "材料申购规范、进度汇报模板、图纸会审要点。",
        },
    ],
    "agriculture": [
        {
            "slug": "agri-trace",
            "name": "农业·溯源与农事记录知识库",
            "description": "溯源编码规则、农事日志规范、质检要点。",
        },
        {
            "slug": "agri-policy",
            "name": "农业·补贴政策与气象防灾库",
            "description": "补贴申报材料、气象灾害应对摘要。",
        },
    ],
    "media": [
        {
            "slug": "media-topic",
            "name": "传媒·选题策划与素材知识库",
            "description": "选题库、素材版权说明、分发排期规范。",
        },
        {
            "slug": "media-review",
            "name": "传媒·内容审核与合规知识库",
            "description": "内容审核标准、敏感表述、发布前检查清单。",
        },
    ],
    "auto": [
        {
            "slug": "auto-service",
            "name": "汽车·售后工单与维保知识库",
            "description": "维保项目、故障树摘要、配件说明。",
        },
        {
            "slug": "auto-sales",
            "name": "汽车·试驾话术与客户跟进库",
            "description": "试驾话术、车型卖点、跟进脚本。",
        },
    ],
}

assert all(len(v) == 2 for v in INDUSTRY_KNOWLEDGE_BASES.values()), "each industry must have exactly 2 KBs"

# DeepSeek 示范文档：backend/app/data/{med,mfg,game}_kb_starter/{slug}/*.md
_STARTER_ROOTS: dict[str, Path] = {
    "med": Path(__file__).resolve().parent / "med_kb_starter",
    "mfg": Path(__file__).resolve().parent / "mfg_kb_starter",
    "game": Path(__file__).resolve().parent / "game_kb_starter",
}


def industry_kb_defs(pack_key: str) -> list[dict[str, str]]:
    return list(INDUSTRY_KNOWLEDGE_BASES.get(pack_key) or [])


def starter_md_files(pack_key: str, slug: str) -> list[Path]:
    """返回某行业某 hub 下的示范 Markdown（按文件名排序）。无则空列表。"""
    root = _STARTER_ROOTS.get(pack_key)
    if not root:
        return []
    d = root / slug
    if not d.is_dir():
        return []
    return sorted(p for p in d.glob("*.md") if p.is_file())


def kb_hub_names(pack_key: str) -> list[str]:
    return [d["name"] for d in industry_kb_defs(pack_key)]


def pick_hub_for_scene(pack_key: str, scene_name: str, problem: str = "") -> dict[str, str] | None:
    """将散落的 kb 场景归属到两个行业专属库之一。"""
    hubs = industry_kb_defs(pack_key)
    if not hubs:
        return None
    blob = f"{scene_name} {problem}"
    # 行业特定启发
    if pack_key == "sales":
        if any(t in blob for t in ("竞品", "产品", "报价", "演示", "说明书")):
            return hubs[1]
        return hubs[0]
    if pack_key == "med":
        if any(t in blob for t in ("药品", "护理", "SOP", "说明书", "院感")):
            return hubs[1]
        return hubs[0]
    if pack_key == "office":
        if any(t in blob for t in ("IT", "运维", "协作", "会议", "入职", "项目")):
            return hubs[1]
        return hubs[0]
    if pack_key == "mfg":
        if any(t in blob for t in ("质检", "安环", "不合格", "隐患")):
            return hubs[1]
        # SOP / 工艺 / 图纸 / BOM / 培训资料 → 工艺库
        return hubs[0]
    if pack_key == "game":
        if any(t in blob for t in ("版号", "合规", "敏感词", "审核", "外包验收", "内容风控")):
            return hubs[1]
        # 活动规则 / FAQ / 攻略 / 版本说明 → 玩家 FAQ 库
        return hubs[0]
    # 默认：名称含第二库关键词则二，否则一
    h1, h2 = hubs[0], hubs[1]
    if any(t in blob for t in h2["name"].replace("·", " ").split()[1:]):
        return h2
    return h1


def ensure_kb_hub_scenes_in_plan(
    pack_key: str,
    menu_plan: list[dict[str, Any]],
    *,
    modules: list[dict[str, Any]] | None = None,
    capability_keys: list[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    """保证菜单含 2 个行业专属知识库入口，并为已有 kb 场景挂 kb_name。"""
    hubs = industry_kb_defs(pack_key)
    plan = list(menu_plan or [])
    mods = list(modules or [])
    keys = list(capability_keys or [])

    # 已有 kb_document 场景挂到 hub
    for item in plan:
        if str(item.get("capability_key") or "") != "kb_document":
            continue
        if item.get("kb_name"):
            continue
        hub = pick_hub_for_scene(pack_key, str(item.get("label") or ""), str(item.get("problem") or ""))
        if hub:
            item["kb_name"] = hub["name"]
            item["kb_description"] = hub["description"]
            item["kb_slug"] = hub["slug"]
            item["lock_kb"] = True
            item["form_headline"] = item.get("form_headline") or hub["name"]

    existing_hub_labels = {
        str(i.get("label") or "")
        for i in plan
        if i.get("category") == "行业知识库" or i.get("source") == "industry_kb_hub"
    }
    existing_hub_slugs = {str(i.get("kb_slug") or "") for i in plan if i.get("category") == "行业知识库"}

    for hub in hubs:
        if hub["name"] in existing_hub_labels or hub["slug"] in existing_hub_slugs:
            for item in plan:
                if item.get("label") == hub["name"] or (
                    item.get("category") == "行业知识库" and item.get("kb_slug") == hub["slug"]
                ):
                    item["capability_key"] = "kb_document"
                    item["kb_name"] = hub["name"]
                    item["kb_description"] = hub["description"]
                    item["kb_slug"] = hub["slug"]
                    item["lock_kb"] = True
                    item["form_headline"] = hub["name"]
                    item["page_kind"] = item.get("page_kind") or "chat_kb"
            continue
        scene_key = f"kb_hub_{hub['slug'].replace('-', '_')}"
        plan.append(
            {
                "key": scene_key,
                "label": hub["name"],
                "category": "行业知识库",
                "capability_key": "kb_document",
                "icon": "book",
                "standard": "✓",
                "kb_name": hub["name"],
                "kb_description": hub["description"],
                "kb_slug": hub["slug"],
                "lock_kb": True,
                "form_headline": hub["name"],
                "page_kind": "chat_kb",
            }
        )
        mods.append(
            {
                "key": "kb_document",
                "label": hub["name"],
                "kind": "module",
                "source": "industry_kb_hub",
                "category": "行业知识库",
                "scene_name": hub["name"],
                "scene_key": scene_key,
                "pages": "kb+chat",
                "standard": "✓",
            }
        )
        existing_hub_labels.add(hub["name"])
        existing_hub_slugs.add(hub["slug"])

    if "kb_document" not in keys and hubs:
        keys.append("kb_document")
    return plan, mods, keys
