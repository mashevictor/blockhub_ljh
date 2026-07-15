"""弹幕英雄预设 → 能力匹配（高置信词表，与 DeepSeek 并行）。

用户输入含「设备报修 / 质检 / 盘点 / 会员…」时，优先命中弹幕选型的 module picks，
得分高于普通行业兜底，保证 >> 匹配到真 CapShip 能力而非旧审批流。
"""

from __future__ import annotations

from app.data.capability_registry import ALL_CAPABILITIES
from app.data.hero_presets import HERO_PRESETS


def _preset_corpus(preset: dict) -> str:
    parts = [
        str(preset.get("label") or ""),
        str(preset.get("hint") or ""),
        str(preset.get("prompt") or ""),
        " ".join(str(x) for x in (preset.get("flow_lines") or [])),
    ]
    for pick in preset.get("picks") or []:
        parts.append(str(pick.get("label") or ""))
        parts.append(str(pick.get("key") or ""))
    return " ".join(parts)


# 弹幕 id → 强相关短语（高权），避免「会员」误打到太多弱场景
_PRESET_ALIASES: dict[str, tuple[str, ...]] = {
    "s01": ("请假审批", "请假申请", "假期余额", "请假"),
    "s02": ("报销记账", "费用报销", "发票上传", "报销申请"),
    "s03": ("制度问答", "制度政策", "福利政策", "制度查询"),
    "s04": ("招聘入职", "招聘管理", "简历筛选", "入职指引"),
    "s05": ("销售线索", "客户跟进", "线索录入", "销售漏斗"),
    "s06": ("报价合同", "报价审批", "合同评审", "特价申请"),
    "s07": ("经营看板", "经营指标", "自然语言查数", "老板看板"),
    "s08": ("设备报修", "报修", "维修工单", "扫码提单", "产线故障"),
    "s09": ("质检SOP", "质检", "SOP", "终检", "不合格"),
    "s10": ("库存盘点", "盘点", "货位", "SKU", "补货"),
    "s11": ("会员营销", "会员积分", "会员管理", "促销活动", "券码", "积分兑换"),
    "s12": ("医疗导诊", "智能导诊", "就医指南", "导诊", "科室导航", "预问诊", "症状初筛"),
    "s13": ("护士排班", "调班申请", "护士调班", "值班通知", "排班调班"),
    "s14": ("玩家FAQ", "玩家攻略", "客服工单", "活动规则", "游戏FAQ"),
    "s15": ("家校通知", "活动报名", "家长留言", "学校通知", "家校"),
    "s16": ("作业答疑", "作业提交", "课程答疑", "错题巩固", "错题"),
    "s17": ("课表查询", "课程表", "考试安排", "教室查询", "课表"),
    "s19": ("物业报修", "业主报修", "小区报修", "物业工单"),
    "s21": ("酒店预订", "客房预订", "入住登记", "酒店客房"),
    "s22": ("外卖配送", "外卖", "骑手调度", "配送异常", "订单跟踪", "运单跟踪"),
    "s20": ("看房签约", "看房预约", "意向登记", "签约跟进", "带看"),
    "s18": ("活动运营", "活动策划", "报名统计", "转化复盘", "活动管理"),
    "s23": ("健身打卡", "课程预约", "训练打卡", "教练答疑", "健身"),
    "s24": ("旅行攻略", "行程规划", "景点问答", "预订提醒", "旅行"),
    "s25": ("婚礼筹备", "宾客名单", "供应商协同", "婚礼预算", "婚庆"),
    "s26": ("装修选材", "材料选型", "进度验收", "家装预算", "装修"),
    "s27": ("宠物问诊", "宠物健康", "预约就诊", "疫苗提醒", "宠物"),
    "s29": ("政务办事", "办事指南", "诉求提交", "进度查询", "政务"),
    "s30": ("法务合同", "合同审查", "法规检索", "案件跟踪", "法务"),
    "s28": ("巡检打卡", "设备巡检", "隐患上报", "安全巡检", "巡检管理"),
    "s32": ("课本学习", "学习规划", "学习进度", "家默", "听写", "复习跟进"),
    "s33": ("家默督导", "家默", "听写", "默写", "家长督导"),
    "s34": ("教学规划", "老师备课", "教学大纲", "学情跟进"),
    "s00": ("上海话", "沪语"),
    "s31": ("上海话", "沪语", "方言语音"),
}


def score_preset(text: str, preset: dict) -> float:
    """越具体命中越高。完整 label / 关键短语权重大。"""
    t = text.strip()
    if len(t) < 2:
        return 0.0
    pid = str(preset.get("id") or "")
    label = str(preset.get("label") or "").strip()
    corpus = _preset_corpus(preset)
    score = 0.0
    if label and (label in t or t in label):
        score += 9.5
    for alias in _PRESET_ALIASES.get(pid, ()):
        if alias in t:
            score += 4.5 if len(alias) >= 3 else 3.2
    # 关键词碎片（去符号）
    for token in ("报修", "质检", "SOP", "盘点", "会员", "导诊", "排班", "调班", "FAQ", "工单", "家校", "作业", "答疑", "课表", "物业", "巡检", "酒店", "预订", "报销", "请假", "上海话", "漏斗", "看板"):
        if token in t and token in corpus:
            score += 2.8
    for pick in preset.get("picks") or []:
        pl = str(pick.get("label") or "")
        pk = str(pick.get("key") or "")
        if pl and pl in t:
            score += 3.5 if pick.get("type") in ("module", "capability") else 2.0
        if pk and pk.replace("_", "") in t.replace("_", "").replace("-", ""):
            score += 2.0
    for line in preset.get("flow_lines") or []:
        # 取「·」前片段，如 「设备报修」
        frag = str(line).replace(">>", "").strip().split("·")[0].strip()
        if len(frag) >= 2 and frag in t:
            score += 2.2
    return score


def match_hero_presets(user_text: str, *, limit: int = 3) -> list[dict]:
    """返回与弹幕场景对齐的推荐项（industry/module/scenario），已带高分。"""
    text = user_text.strip()
    if len(text) < 2:
        return []

    ranked: list[tuple[float, dict]] = []
    for preset in HERO_PRESETS:
        s = score_preset(text, preset)
        if s >= 5.0:
            ranked.append((s, preset))
    ranked.sort(key=lambda x: x[0], reverse=True)

    out: list[dict] = []
    seen: set[str] = set()

    def push(key: str, label: str, pick_type: str, score: float, reason: str) -> None:
        if not key or key in seen:
            return
        seen.add(key)
        cap = ALL_CAPABILITIES.get(key)
        out.append({
            "key": key,
            "label": label or (cap.name if cap else key),
            "type": pick_type,
            "score": round(score, 1),
            "reason": reason,
            "source": "hero_preset",
            "flutter_pkg": cap.flutter_pkg if cap else "",
        })

    for base_score, preset in ranked[:limit]:
        label = str(preset.get("label") or preset.get("id") or "")
        reason = f"弹幕场景「{label}」高匹配"
        for pick in preset.get("picks") or []:
            ptype = str(pick.get("type") or "module")
            pkey = str(pick.get("key") or "").strip()
            plabel = str(pick.get("label") or pkey)
            if not pkey:
                continue
            if ptype in ("module", "capability", "supplement"):
                # 模块分最高，确保优先真 CapShip
                push(pkey, plabel, "module", base_score + 0.5, reason)
            elif ptype == "industry":
                push(pkey, plabel, "industry", base_score, reason)
            elif ptype == "office":
                push(pkey, plabel, "office", base_score - 0.5, reason)
            elif ptype == "scenario":
                push(pkey, plabel, "scenario", base_score - 0.8, f"{reason} · 场景")
        # 弹幕文案本身作为 scenario 提示
        push(f"hero:{preset.get('id')}", label, "scenario", base_score - 1.0, reason)

    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:16]


def hero_scene_catalog_for_llm() -> str:
    """供 DeepSeek：弹幕 30 场景 → 应选 capability keys。"""
    lines: list[str] = []
    for p in HERO_PRESETS:
        mods = [
            f"{x.get('key')}({x.get('label')})"
            for x in (p.get("picks") or [])
            if x.get("type") in ("module", "capability")
        ]
        if not mods:
            continue
        lines.append(f"- {p.get('id')}「{p.get('label')}」→ {', '.join(mods)}")
    return "\n".join(lines)
