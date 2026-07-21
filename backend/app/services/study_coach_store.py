"""CapShip · study_coach 课本学习闭环（规划 / 进度 / 家默 / 考试）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import StudyCoachCourse, StudyCoachDrill, StudyCoachTonight, User
from app.services.deepseek_client import deepseek_json_chat
from app.services import textbook_toc as toc_lib

VALID_ROLE = frozenset({"student", "parent", "teacher"})
VALID_UNIT_STATUS = frozenset({"pending", "learning", "review", "mastered"})
VALID_DRILL_KIND = frozenset({"review", "dictation", "exam"})
VALID_RESULT = frozenset({"", "pass", "fail", "partial"})
VALID_TONIGHT_TEMPLATE = frozenset(
    {"dictation", "word_cards", "math_drill", "wrongbook", "read_aloud"}
)
VALID_TONIGHT_STATUS = frozenset({"draft", "preview", "practicing", "done", "abandoned"})
TEMPLATE_LABEL = {
    "dictation": "本课听写单",
    "word_cards": "本课单词卡",
    "math_drill": "本课口算/巩固",
    "wrongbook": "错题巩固",
    "read_aloud": "本课朗读清单",
}
TEMPLATE_DRILL_KIND = {
    "dictation": "dictation",
    "word_cards": "review",
    "math_drill": "review",
    "wrongbook": "review",
    "read_aloud": "review",
}


def _no(prefix: str) -> str:
    now = datetime.now(timezone.utc)
    return f"{prefix}-{now.strftime('%Y%m%d')}-{now.strftime('%H%M%S')}{now.microsecond // 1000:03d}"


def _heuristic_catalog(textbook_name: str, subject: str, grade: str) -> dict[str, Any]:
    """规则粗解析：沪教版/人教版、五四制、年级上下册等。"""
    t = f"{textbook_name} {subject} {grade}".strip()
    publisher = ""
    for p in ("沪教版", "牛津上海版", "人教版", "部编版", "苏教版", "北师大版", "外研版", "冀教版", "湘教版", "译林版"):
        if p in t:
            publisher = p
            break
    school_system = ""
    if "五四制" in t or "五四" in t:
        school_system = "五四制"
    elif "六三制" in t or "六三" in t:
        school_system = "六三制"
    stage = ""
    if "小学" in t:
        stage = "小学"
    elif "初中" in t or "七年级" in t or "八年级" in t or "九年级" in t:
        stage = "初中"
    elif "高中" in t:
        stage = "高中"
    subj = subject.strip()
    if not subj:
        for s in ("英语", "语文", "数学", "物理", "化学", "生物", "历史", "地理", "道德与法治", "科学"):
            if s in t:
                subj = s
                break
    grade_n = grade.strip()
    if not grade_n:
        for g in (
            "一年级", "二年级", "三年级", "四年级", "五年级", "六年级",
            "七年级", "八年级", "九年级", "高一", "高二", "高三",
        ):
            if g in t:
                grade_n = g
                break
    semester = ""
    if "下册" in t or "第二学期" in t or ("下" in t and "册" in t):
        semester = "下册"
    elif "上册" in t or "第一学期" in t or ("上" in t and "册" in t):
        semester = "上册"
    series = "牛津上海版/沪教牛津" if publisher in ("沪教版", "牛津上海版") and subj == "英语" else publisher
    parts = [x for x in (publisher or series, school_system, stage, grade_n, semester, subj) if x]
    full_title = " ".join(parts) if parts else textbook_name.strip()
    return {
        "publisher": publisher,
        "series": series,
        "subject": subj,
        "school_system": school_system,
        "stage": stage,
        "grade": grade_n,
        "semester": semester,
        "full_title": full_title or textbook_name.strip(),
        "confidence": 0.45 if parts else 0.2,
        "note": "规则粗定位，待 DeepSeek 精校",
    }


def _fallback_units_for_subject(subj: str, title: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """无 DeepSeek 时：按科目给出可跟进的大任务 + 带细步骤的单元（小学语数英示范级）。"""
    s = subj or "课本"

    def u(
        order: int,
        *,
        module_order: int,
        module_name: str,
        code: str,
        name: str,
        focus: str,
        hint: str,
        days: int,
        steps: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "order": order,
            "module_order": module_order,
            "module_name": module_name,
            "unit_code": code,
            "unit_name": name,
            "focus": focus,
            "dictation_hint": hint,
            "estimated_days": days,
            "status": "pending",
            "steps": steps,
        }

    if "语文" in s:
        modules = [
            {"order": 1, "name": "识字与课文精读", "goal": "读通前几课，会认会写本课生字词，能有感情朗读", "unit_orders": [1, 2, 3]},
            {"order": 2, "name": "阅读与表达", "goal": "读懂短文大意，能口头复述并写一段连贯话", "unit_orders": [4, 5]},
            {"order": 3, "name": "阶段验收", "goal": "字词听写 + 阅读小测，查漏补缺", "unit_orders": [6]},
        ]
        units = [
            u(
                1,
                module_order=1,
                module_name="识字与课文精读",
                code="第1课",
                name="第1课 · 大青树下的小学（精读）",
                focus="感受校园生活画面，会认会写本课生字",
                hint="听写：校园、安静、热闹、敬礼、礼貌",
                days=2,
                steps=[
                    {"id": "read", "title": "朗读课文 2 遍", "kind": "review", "detail": "第一遍通读；第二遍标自然段，圈生字。约 15 分钟", "status": "pending"},
                    {"id": "chars", "title": "生字词：认读 + 组词", "kind": "dictation", "detail": "会认本课生字；会写重点字。家长抽查读音", "status": "pending"},
                    {"id": "retell", "title": "口头说：课文讲了什么", "kind": "review", "detail": "用 3～5 句话说清谁、在哪、做什么", "status": "pending"},
                ],
            ),
            u(
                2,
                module_order=1,
                module_name="识字与课文精读",
                code="第2课",
                name="第2课 · 花的学校（朗读与想象）",
                focus="展开想象，积累优美词语",
                hint="听写：阵雨、狂欢、水塘、绿草、回家",
                days=2,
                steps=[
                    {"id": "read", "title": "有感情朗读优美句", "kind": "review", "detail": "选出 2 句喜欢的话朗读并背一句", "status": "pending"},
                    {"id": "chars", "title": "听写本课词语", "kind": "dictation", "detail": "听写 8～10 个词语，错词当晚订正再默", "status": "pending"},
                    {"id": "write", "title": "仿写一句", "kind": "review", "detail": "仿课文写一句带比喻或想象的话", "status": "pending"},
                ],
            ),
            u(
                3,
                module_order=1,
                module_name="识字与课文精读",
                code="古诗",
                name="古诗二首 · 朗读背诵",
                focus="读准字音，理解大意，能背诵",
                hint="听写诗题与关键字：夜书所见、九月九日忆山东兄弟",
                days=2,
                steps=[
                    {"id": "read", "title": "读准、读顺两首诗", "kind": "review", "detail": "对照注释理解大意，约 15 分钟", "status": "pending"},
                    {"id": "recite", "title": "背诵验收", "kind": "review", "detail": "家长抽背；卡壳处再读 3 遍", "status": "pending"},
                    {"id": "chars", "title": "听写关键字词", "kind": "dictation", "detail": "听写诗题 + 易错字", "status": "pending"},
                ],
            ),
            u(
                4,
                module_order=2,
                module_name="阅读与表达",
                code="阅读",
                name="短文阅读 · 抓关键句",
                focus="能找出关键句，回答简单问题",
                hint="",
                days=2,
                steps=[
                    {"id": "read", "title": "读短文并划关键句", "kind": "review", "detail": "用笔标出每段主要意思，约 20 分钟", "status": "pending"},
                    {"id": "qa", "title": "口头答 3 个问题", "kind": "review", "detail": "谁、做了什么、结果怎样", "status": "pending"},
                    {"id": "check", "title": "阅读小测 1 篇", "kind": "exam", "detail": "限时 15 分钟，错题订正并写原因", "status": "pending"},
                ],
            ),
            u(
                5,
                module_order=2,
                module_name="阅读与表达",
                code="习作",
                name="习作 · 写一件校园里的事",
                focus="把事情写清楚：时间、地点、人物、经过",
                hint="",
                days=2,
                steps=[
                    {"id": "outline", "title": "说提纲：先说后写", "kind": "review", "detail": "口头说清四要素，再动笔", "status": "pending"},
                    {"id": "draft", "title": "写 150 字左右", "kind": "review", "detail": "注意标点；写完大声读一遍改不通顺处", "status": "pending"},
                    {"id": "polish", "title": "改一处具体描写", "kind": "review", "detail": "把一个动作写具体（怎么做、什么表情）", "status": "pending"},
                ],
            ),
            u(
                6,
                module_order=3,
                module_name="阶段验收",
                code="阶段测",
                name="语文阶段测 · 字词 + 阅读",
                focus="检验前半阶段掌握度",
                hint="复默错词本",
                days=1,
                steps=[
                    {"id": "dict", "title": "错词复默", "kind": "dictation", "detail": "只默前几课错词，全对再过关", "status": "pending"},
                    {"id": "exam", "title": "综合小测", "kind": "exam", "detail": "字词 10 分 + 阅读 1 篇，记下丢分点", "status": "pending"},
                ],
            ),
        ]
        return modules, units

    if "数学" in s:
        modules = [
            {"order": 1, "name": "数与计算", "goal": "掌握万以内数与加减，能正确列竖式", "unit_orders": [1, 2, 3]},
            {"order": 2, "name": "量与几何入门", "goal": "认识毫米/分米与简单图形，会解决一步应用题", "unit_orders": [4, 5]},
            {"order": 3, "name": "阶段验收", "goal": "限时练习 + 错题订正", "unit_orders": [6]},
        ]
        units = [
            u(
                1,
                module_order=1,
                module_name="数与计算",
                code="1.1",
                name="万以内数的认识",
                focus="读、写、比较万以内的数",
                hint="默写：数位顺序表（个十百千万）",
                days=2,
                steps=[
                    {"id": "concept", "title": "看数位表，读 5 个数", "kind": "review", "detail": "家长报数，孩子读写；约 15 分钟", "status": "pending"},
                    {"id": "practice", "title": "练习：比大小 8 题", "kind": "review", "detail": "独立完成，错题用红笔订正", "status": "pending"},
                    {"id": "check", "title": "口述：相邻数是谁", "kind": "exam", "detail": "抽 3 个数说前一个、后一个", "status": "pending"},
                ],
            ),
            u(
                2,
                module_order=1,
                module_name="数与计算",
                code="1.2",
                name="万以内加减法（不进退位）",
                focus="正确列竖式，对齐数位",
                hint="默写竖式口诀：相同数位对齐",
                days=2,
                steps=[
                    {"id": "example", "title": "跟做 2 道例题", "kind": "review", "detail": "边说边写：从哪一位算起", "status": "pending"},
                    {"id": "practice", "title": "巩固练 10 题", "kind": "review", "detail": "限时 15 分钟；错题重做一遍", "status": "pending"},
                    {"id": "check", "title": "家长抽 3 题计时", "kind": "exam", "detail": "每题 ≤1 分钟，错则回看数位对齐", "status": "pending"},
                ],
            ),
            u(
                3,
                module_order=1,
                module_name="数与计算",
                code="1.3",
                name="万以内加减法（进退位）",
                focus="进位加法、退位减法，避免漏借1",
                hint="",
                days=2,
                steps=[
                    {"id": "example", "title": "进位/退位各跟做 1 题", "kind": "review", "detail": "用圆点或小棒说清「满十进一」「退一当十」", "status": "pending"},
                    {"id": "practice", "title": "混合练 12 题", "kind": "review", "detail": "做完自查：进位点、退位点有没有标", "status": "pending"},
                    {"id": "wrong", "title": "错题本整理", "kind": "review", "detail": "每道错题写一句错因（如：忘借1）", "status": "pending"},
                ],
            ),
            u(
                4,
                module_order=2,
                module_name="量与几何入门",
                code="2.1",
                name="毫米、分米的认识",
                focus="建立长度单位表象，会换算简单关系",
                hint="默写：1 厘米=10 毫米；1 分米=10 厘米",
                days=2,
                steps=[
                    {"id": "concept", "title": "量身边 3 样物品", "kind": "review", "detail": "用尺量橡皮、铅笔、课本厚度并记录", "status": "pending"},
                    {"id": "dict", "title": "单位换算默写", "kind": "dictation", "detail": "默写基本换算关系，错的当晚再默", "status": "pending"},
                    {"id": "practice", "title": "练习页完成", "kind": "review", "detail": "完成课本对应练习，家长对答案", "status": "pending"},
                ],
            ),
            u(
                5,
                module_order=2,
                module_name="量与几何入门",
                code="2.2",
                name="长方形与正方形（初步）",
                focus="辨认边和角，能说出特征",
                hint="",
                days=2,
                steps=[
                    {"id": "concept", "title": "找家中的长方形/正方形", "kind": "review", "detail": "各找 2 个，说清有几条边、几个角", "status": "pending"},
                    {"id": "practice", "title": "判断对错 6 题", "kind": "review", "detail": "根据特征判断图形，错题改", "status": "pending"},
                    {"id": "check", "title": "口述特征验收", "kind": "exam", "detail": "不看书说出长方形、正方形各 1 条特征", "status": "pending"},
                ],
            ),
            u(
                6,
                module_order=3,
                module_name="阶段验收",
                code="阶段测",
                name="数学阶段测 · 计算 + 应用",
                focus="限时正确率，整理错因",
                hint="",
                days=1,
                steps=[
                    {"id": "exam", "title": "限时测 20 分钟", "kind": "exam", "detail": "计算 8 题 + 应用 2 题；记下超时题", "status": "pending"},
                    {"id": "wrong", "title": "错题订正并重做", "kind": "review", "detail": "每题写错因，隔日再做一遍", "status": "pending"},
                ],
            ),
        ]
        return modules, units

    if "英语" in s:
        modules = [
            {"order": 1, "name": "Module 听说入门", "goal": "听懂课堂指令，会读会说本模块核心句", "unit_orders": [1, 2, 3]},
            {"order": 2, "name": "词汇与家默巩固", "goal": "单词听写过关，能用句型做简单问答", "unit_orders": [4, 5]},
            {"order": 3, "name": "阶段验收", "goal": "听说小测 + 错词复默", "unit_orders": [6]},
        ]
        units = [
            u(
                1,
                module_order=1,
                module_name="Module 听说入门",
                code="M1-U1",
                name="Module 1 Unit 1 · Greetings",
                focus="见面问候：Hello / Good morning / How are you?",
                hint="家默：hello, morning, fine, thank you, goodbye",
                days=2,
                steps=[
                    {"id": "listen", "title": "听读课文音频 2 遍", "kind": "review", "detail": "跟读；注意升降调。约 10 分钟", "status": "pending"},
                    {"id": "speak", "title": "和家长对答 5 组", "kind": "review", "detail": "用 Hello / How are you? — I'm fine, thank you.", "status": "pending"},
                    {"id": "dict", "title": "家默本课 5 词", "kind": "dictation", "detail": "听写英文；错词抄 2 遍再默", "status": "pending"},
                ],
            ),
            u(
                2,
                module_order=1,
                module_name="Module 听说入门",
                code="M1-U2",
                name="Module 1 Unit 2 · My name",
                focus="介绍自己：What's your name? My name is…",
                hint="家默：name, my, your, is, I",
                days=2,
                steps=[
                    {"id": "listen", "title": "听读并跟读对话", "kind": "review", "detail": "分角色读：问名字 / 答名字", "status": "pending"},
                    {"id": "speak", "title": "自我介绍一遍", "kind": "review", "detail": "完整说：Hello, my name is … Nice to meet you.", "status": "pending"},
                    {"id": "dict", "title": "家默句型关键词", "kind": "dictation", "detail": "听写 5 词 + 1 句 My name is …", "status": "pending"},
                ],
            ),
            u(
                3,
                module_order=1,
                module_name="Module 听说入门",
                code="M2-U1",
                name="Module 2 Unit 1 · Colours",
                focus="颜色词与指认：What colour is it?",
                hint="家默：red, blue, yellow, green, colour",
                days=2,
                steps=[
                    {"id": "listen", "title": "看图听颜色词", "kind": "review", "detail": "指物说色：This is red.", "status": "pending"},
                    {"id": "speak", "title": "指家里物品说颜色", "kind": "review", "detail": "至少 6 样物品，家长纠音", "status": "pending"},
                    {"id": "dict", "title": "家默 5 个颜色词", "kind": "dictation", "detail": "可听中文写英文，或听英文写英文", "status": "pending"},
                ],
            ),
            u(
                4,
                module_order=2,
                module_name="词汇与家默巩固",
                code="复习",
                name="Module 1–2 词汇复现",
                focus="隔日复现错词，听说不丢",
                hint="只默错词本 + 核心句",
                days=2,
                steps=[
                    {"id": "review", "title": "错词本朗读一遍", "kind": "review", "detail": "英→中、中→英各一遍", "status": "pending"},
                    {"id": "dict", "title": "错词复默", "kind": "dictation", "detail": "全对过关；仍错的隔日再默", "status": "pending"},
                    {"id": "speak", "title": "串讲：问候+名字+颜色", "kind": "review", "detail": "30 秒小演讲，家长录像或打分", "status": "pending"},
                ],
            ),
            u(
                5,
                module_order=2,
                module_name="词汇与家默巩固",
                code="M2-U2",
                name="Module 2 Unit 2 · Classroom",
                focus="教室用品：book / pen / pencil / bag",
                hint="家默：book, pen, pencil, bag, desk",
                days=2,
                steps=[
                    {"id": "listen", "title": "听读课文并指物", "kind": "review", "detail": "指真实文具说英文", "status": "pending"},
                    {"id": "dict", "title": "家默 5 个文具词", "kind": "dictation", "detail": "听写后自己对答案", "status": "pending"},
                    {"id": "speak", "title": "问答：What's this?", "kind": "review", "detail": "It's a … 练 8 组", "status": "pending"},
                ],
            ),
            u(
                6,
                module_order=3,
                module_name="阶段验收",
                code="阶段测",
                name="英语阶段测 · 听写 + 口语",
                focus="听写正确率与开口完整度",
                hint="复默本阶段全部错词",
                days=1,
                steps=[
                    {"id": "dict", "title": "综合听写 10 词", "kind": "dictation", "detail": "含问候/颜色/文具；记录错词", "status": "pending"},
                    {"id": "exam", "title": "口语小测 1 分钟", "kind": "exam", "detail": "问候 + 自我介绍 + 指 3 样物品说颜色/名称", "status": "pending"},
                ],
            ),
        ]
        return modules, units

    # 通用
    modules = [
        {"order": 1, "name": "基础推进", "goal": f"吃透 {s} 前半册核心内容", "unit_orders": [1, 2, 3, 4]},
        {"order": 2, "name": "阶段验收", "goal": "复习巩固并完成阶段性测验", "unit_orders": [5, 6]},
    ]
    generic = [
        (f"确认教材 · {title}", "熟悉目录与学习节奏", "读目录并标出本周单元", 2),
        (f"{s} · 第一单元预习精读", "建立本单元知识地图", "通读课文/例题并划重点", 2),
        (f"{s} · 第二单元巩固练习", "掌握本单元重点", "完成一次小测或默写", 2),
        (f"{s} · 第三单元应用", "迁移到练习与表达", "完成配套练习并订正", 2),
        ("阶段复习 · 查漏补缺", "巩固前几单元薄弱点", "整理错题本", 1),
        ("综合测验 · 阶段性验收", "检验阶段掌握度", "完成单元测并记录错题", 1),
    ]
    units = []
    for i, (name, focus, hint, days) in enumerate(generic):
        units.append(
            u(
                i + 1,
                module_order=1 if i < 4 else 2,
                module_name="基础推进" if i < 4 else "阶段验收",
                code=f"U{i + 1}",
                name=name,
                focus=focus,
                hint=hint,
                days=days,
                steps=_default_steps_for_subject(s, name, focus, hint),
            )
        )
    return modules, units


def _fallback_plan(textbook_name: str, catalog: dict[str, Any]) -> dict[str, Any]:
    subj = str(catalog.get("subject") or "课本")
    title = str(catalog.get("full_title") or textbook_name.strip() or "未命名课本")
    modules, units = _fallback_units_for_subject(subj, title)
    # 若模型未带 steps，补默认
    for item in units:
        if not item.get("steps"):
            item["steps"] = _default_steps_for_subject(
                subj, item["unit_name"], item.get("focus") or "", item.get("dictation_hint") or ""
            )
    schedule = _build_schedule_from_units(units, start_offset_days=0)
    return {
        "version": 2,
        "modules": modules,
        "units": units,
        "schedule": schedule,
        "subject_tips": _subject_tips(subj),
    }


def _subject_tips(subject: str) -> dict[str, Any]:
    s = (subject or "").strip()
    if "英语" in s:
        return {
            "subject": s or "英语",
            "rhythm": "听读 → 家默 → 复习 → 小测，隔日复现错词",
            "primary_kinds": ["dictation", "review", "exam"],
            "follow_labels": {"dictation": "家默听写", "review": "听说复习", "exam": "单元测"},
        }
    if "语文" in s:
        return {
            "subject": s or "语文",
            "rhythm": "朗读背诵 → 字词 → 阅读理解 → 练笔，周末复盘",
            "primary_kinds": ["review", "dictation", "exam"],
            "follow_labels": {"dictation": "听写字词", "review": "朗读/背诵", "exam": "阅读与作文测"},
        }
    if "数学" in s:
        return {
            "subject": s or "数学",
            "rhythm": "概念例题 → 巩固练 → 错题订正 → 限时小测",
            "primary_kinds": ["review", "exam"],
            "follow_labels": {"dictation": "公式默写", "review": "练习订正", "exam": "限时测"},
        }
    return {
        "subject": s or "课本",
        "rhythm": "预习 → 精学 → 练习 → 复盘 → 测验",
        "primary_kinds": ["review", "dictation", "exam"],
        "follow_labels": {"dictation": "默写/记忆", "review": "复习巩固", "exam": "测验验收"},
    }


def _default_steps_for_subject(subject: str, unit_name: str, focus: str, hint: str) -> list[dict[str, Any]]:
    s = subject or ""
    tips = _subject_tips(s)
    labels = tips.get("follow_labels") or {}
    base = [
        {
            "id": "prep",
            "title": f"预习：{unit_name[:40]}",
            "kind": "review",
            "detail": focus or hint or "通读本单元内容并标出不懂处",
            "status": "pending",
        },
        {
            "id": "core",
            "title": str(labels.get("dictation") or labels.get("review") or "核心练习"),
            "kind": "dictation" if "英语" in s or "语文" in s else "review",
            "detail": hint or focus or "完成本单元核心练习",
            "status": "pending",
        },
        {
            "id": "check",
            "title": str(labels.get("exam") or "小测验收"),
            "kind": "exam",
            "detail": "用 10~20 分钟自测或家长抽查，记下错题",
            "status": "pending",
        },
    ]
    return base


def _build_schedule_from_units(units: list[dict[str, Any]], *, start_offset_days: int = 0) -> list[dict[str, Any]]:
    """按单元 estimated_days 展开日历提醒（从今天起）。"""
    from datetime import date, timedelta

    today = date.today()
    cursor = today + timedelta(days=max(0, start_offset_days))
    schedule: list[dict[str, Any]] = []
    for u in units:
        if not isinstance(u, dict):
            continue
        days = int(u.get("estimated_days") or 2)
        steps = u.get("steps") if isinstance(u.get("steps"), list) else []
        if not steps:
            steps = [{"id": "day", "title": u.get("unit_name") or "学习", "kind": "review", "detail": u.get("focus") or ""}]
        # 把小步骤铺到若干天上
        for d in range(max(1, days)):
            step = steps[min(d, len(steps) - 1)]
            if not isinstance(step, dict):
                continue
            day = cursor + timedelta(days=d)
            schedule.append(
                {
                    "date": day.isoformat(),
                    "unit_order": int(u.get("order") or 0),
                    "unit_name": str(u.get("unit_name") or ""),
                    "module_name": str(u.get("module_name") or ""),
                    "step_id": str(step.get("id") or f"s{d}"),
                    "title": str(step.get("title") or u.get("unit_name") or "学习任务"),
                    "reminder": str(step.get("detail") or u.get("focus") or "按计划完成本日小任务"),
                    "kind": str(step.get("kind") or "review"),
                    "done": False,
                }
            )
        cursor = cursor + timedelta(days=max(1, days))
    return schedule[:60]


def _clean_steps(raw: Any, *, subject: str, unit_name: str, focus: str, hint: str) -> list[dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        return _default_steps_for_subject(subject, unit_name, focus, hint)
    out: list[dict[str, Any]] = []
    for i, s in enumerate(raw[:8]):
        if not isinstance(s, dict):
            continue
        title = str(s.get("title") or s.get("name") or "").strip()
        if not title:
            continue
        kind = str(s.get("kind") or "review").strip().lower()
        if kind not in VALID_DRILL_KIND and kind not in {"listen", "read", "practice", "prep"}:
            kind = "review"
        if kind in {"listen", "read", "practice", "prep"}:
            kind = "review"
        out.append(
            {
                "id": str(s.get("id") or f"s{i + 1}")[:40],
                "title": title[:120],
                "kind": kind,
                "detail": str(s.get("detail") or s.get("hint") or "").strip()[:240],
                "status": "pending" if str(s.get("status") or "pending") not in ("done", "mastered") else "done",
            }
        )
    return out or _default_steps_for_subject(subject, unit_name, focus, hint)


def _clean_units(units_raw: Any, *, subject: str = "", modules_raw: Any = None) -> list[dict[str, Any]]:
    if not isinstance(units_raw, list):
        return []
    module_by_order: dict[int, str] = {}
    if isinstance(modules_raw, list):
        for m in modules_raw:
            if isinstance(m, dict):
                try:
                    mo = int(m.get("order") or 0)
                except (TypeError, ValueError):
                    mo = 0
                if mo:
                    module_by_order[mo] = str(m.get("name") or f"大任务{mo}")[:80]
    cleaned: list[dict[str, Any]] = []
    for i, u in enumerate(units_raw[:16]):
        if not isinstance(u, dict):
            continue
        name = str(u.get("unit_name") or u.get("name") or "").strip()
        if not name:
            continue
        try:
            days = int(u.get("estimated_days") or 2)
        except (TypeError, ValueError):
            days = 2
        try:
            module_order = int(u.get("module_order") or ((i // 3) + 1))
        except (TypeError, ValueError):
            module_order = (i // 3) + 1
        focus = str(u.get("focus") or "").strip()[:200]
        hint = str(u.get("dictation_hint") or u.get("dictation") or "").strip()[:200]
        st = str(u.get("status") or "pending").strip().lower()
        if st not in VALID_UNIT_STATUS:
            st = "pending"
        raw_steps = u.get("steps")
        steps = _clean_steps(raw_steps, subject=subject, unit_name=name, focus=focus, hint=hint)
        if isinstance(raw_steps, list):
            by_id = {
                str(s.get("id") or ""): s
                for s in raw_steps
                if isinstance(s, dict) and s.get("id")
            }
            for step in steps:
                prev = by_id.get(str(step.get("id") or ""))
                if prev and str(prev.get("status") or "") in ("done", "mastered"):
                    step["status"] = "done"
        cleaned.append(
            {
                "order": i + 1,
                "module_order": module_order,
                "module_name": str(u.get("module_name") or module_by_order.get(module_order) or f"阶段 {module_order}")[:80],
                "unit_code": str(u.get("unit_code") or f"U{i + 1}").strip()[:40],
                "unit_name": name[:160],
                "focus": focus,
                "dictation_hint": hint,
                "estimated_days": max(1, min(days, 14)),
                "status": st,
                "steps": steps,
                "planned_start": str(u.get("planned_start") or "")[:16],
                "planned_end": str(u.get("planned_end") or "")[:16],
                "planned_weeks": u.get("planned_weeks"),
                "unit_kind": str(u.get("unit_kind") or "")[:40],
                "toc_source": str(u.get("toc_source") or "")[:40],
            }
        )
    return cleaned


def _clean_modules(raw: Any, units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if isinstance(raw, list) and raw:
        out: list[dict[str, Any]] = []
        for i, m in enumerate(raw[:8]):
            if not isinstance(m, dict):
                continue
            name = str(m.get("name") or m.get("title") or "").strip()
            if not name:
                continue
            try:
                order = int(m.get("order") or i + 1)
            except (TypeError, ValueError):
                order = i + 1
            uos = m.get("unit_orders")
            if not isinstance(uos, list):
                uos = [u["order"] for u in units if int(u.get("module_order") or 0) == order]
            out.append(
                {
                    "order": order,
                    "name": name[:80],
                    "goal": str(m.get("goal") or m.get("focus") or "").strip()[:200],
                    "unit_orders": [int(x) for x in uos if str(x).isdigit() or isinstance(x, int)][:12],
                }
            )
        if out:
            return out
    # 由 units 聚合
    buckets: dict[int, dict[str, Any]] = {}
    for u in units:
        mo = int(u.get("module_order") or 1)
        b = buckets.setdefault(
            mo,
            {"order": mo, "name": str(u.get("module_name") or f"阶段 {mo}"), "goal": "", "unit_orders": []},
        )
        b["unit_orders"].append(int(u.get("order") or 0))
        if not b["goal"] and u.get("focus"):
            b["goal"] = str(u.get("focus"))[:200]
    return [buckets[k] for k in sorted(buckets.keys())]


def normalize_plan_payload(raw: Any, *, catalog: dict[str, Any] | None = None) -> dict[str, Any]:
    """兼容旧版 list plan → v2 {modules,units,schedule,subject_tips,progress_meta}。"""
    cat = catalog if isinstance(catalog, dict) else {}
    subject = str(cat.get("subject") or "")
    if isinstance(raw, dict) and int(raw.get("version") or 0) >= 2:
        units = _clean_units(raw.get("units"), subject=subject, modules_raw=raw.get("modules"))
        if not units and isinstance(raw.get("plan"), list):
            units = _clean_units(raw.get("plan"), subject=subject, modules_raw=raw.get("modules"))
        modules = _clean_modules(raw.get("modules"), units)
        schedule = raw.get("schedule") if isinstance(raw.get("schedule"), list) else []
        if not schedule:
            if any(u.get("planned_start") for u in units):
                schedule = toc_lib.build_schedule_from_planned(units)
            else:
                schedule = _build_schedule_from_units(units)
        tips = raw.get("subject_tips") if isinstance(raw.get("subject_tips"), dict) else _subject_tips(subject)
        meta = raw.get("progress_meta") if isinstance(raw.get("progress_meta"), dict) else {}
        return {
            "version": 2,
            "modules": modules,
            "units": units,
            "schedule": schedule,
            "subject_tips": tips,
            "progress_meta": meta,
            "toc_book_id": str(raw.get("toc_book_id") or cat.get("toc_book_id") or ""),
            "toc_source": str(raw.get("toc_source") or cat.get("toc_source") or ""),
        }
    if isinstance(raw, list):
        legacy = []
        for i, u in enumerate(raw):
            if isinstance(u, dict):
                item = dict(u)
                item.setdefault("order", i + 1)
                legacy.append(item)
        units = _clean_units(legacy, subject=subject)
        for i, u in enumerate(units):
            if i < len(legacy) and legacy[i].get("status"):
                u["status"] = str(legacy[i].get("status"))
        modules = _clean_modules(None, units)
        return {
            "version": 2,
            "modules": modules,
            "units": units,
            "schedule": _build_schedule_from_units(units),
            "subject_tips": _subject_tips(subject),
            "progress_meta": {},
            "toc_book_id": "",
            "toc_source": "legacy",
        }
    return _fallback_plan(str(cat.get("full_title") or "课本"), cat)


def _clean_catalog(raw: Any, fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return dict(fallback)
    out = dict(fallback)
    for key in (
        "publisher", "series", "subject", "school_system", "stage",
        "grade", "semester", "full_title", "note",
    ):
        val = raw.get(key)
        if isinstance(val, str) and val.strip():
            out[key] = val.strip()[:120]
    try:
        conf = float(raw.get("confidence") if raw.get("confidence") is not None else out.get("confidence") or 0.5)
    except (TypeError, ValueError):
        conf = 0.5
    out["confidence"] = max(0.0, min(conf, 1.0))
    if not out.get("full_title"):
        parts = [
            out.get("publisher") or out.get("series") or "",
            out.get("school_system") or "",
            out.get("stage") or "",
            out.get("grade") or "",
            out.get("semester") or "",
            out.get("subject") or "",
        ]
        out["full_title"] = " ".join(p for p in parts if p) or fallback.get("full_title") or ""
    return out


def _candidate_from_raw(raw: Any, fallback: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    catalog = _clean_catalog(raw, fallback)
    title = str(catalog.get("full_title") or "").strip()
    if not title:
        return None
    return catalog


def locate_textbooks(*, query: str, role: str = "student") -> list[dict[str, Any]]:
    """定位册次：优先目录库命中，再补 DeepSeek/规则候选。"""
    q = (query or "").strip()
    if not q:
        return []
    out: list[dict[str, Any]] = []
    for book, score in toc_lib.match_books(q, limit=3):
        out.append(toc_lib.catalog_from_book(book, confidence=score))
    if out:
        return out

    hint = _heuristic_catalog(q, "", "")
    system = (
        "你是中国K12教材定位助手。用户口语描述课本，你只输出可能的具体册次候选，不要生成学习单元。"
        "常见例子：沪教版/牛津上海版英语·五四制·小学二年级下；人教版语文·三年级上。"
        "规则："
        "1) 给出 1~3 个最可能的册次，按 confidence 从高到低；"
        "2) 每条拆开 publisher/series/subject/school_system/stage/grade/semester/full_title；"
        "3) 沪教英语优先牛津上海版/沪教牛津，并写明五四制或六三制；"
        "4) 信息不足也要给最合理猜测，并在 note 写清不确定点；"
        "5) full_title 写成家长/老师能一眼确认的规范全称。"
        "只返回 JSON：{\"candidates\":[{\"publisher\":\"\",\"series\":\"\",\"subject\":\"\","
        "\"school_system\":\"\",\"stage\":\"\",\"grade\":\"\",\"semester\":\"\","
        "\"full_title\":\"\",\"confidence\":0.0,\"note\":\"\"}]}"
    )
    user = (
        f"用户说的课本：{q}\n"
        f"发起角色：{role}\n"
        f"规则粗解析参考：{hint}\n"
        "请给出可点选确认的册次候选。"
    )
    parsed = deepseek_json_chat(system, user, temperature=0.1)
    if isinstance(parsed, dict):
        raw_list = parsed.get("candidates")
        if not isinstance(raw_list, list) and isinstance(parsed.get("catalog"), dict):
            raw_list = [parsed.get("catalog")]
        if isinstance(raw_list, list):
            for raw in raw_list[:3]:
                item = _candidate_from_raw(raw, hint)
                if item:
                    # 二次尝试用 full_title 撞目录库
                    lib_hits = toc_lib.match_books(str(item.get("full_title") or q), limit=1)
                    if lib_hits:
                        out.append(toc_lib.catalog_from_book(lib_hits[0][0], confidence=max(0.88, lib_hits[0][1])))
                    else:
                        item["toc_source"] = "llm_guess"
                        out.append(item)
    if not out:
        lib_again = toc_lib.match_books(q, limit=1)
        if lib_again:
            out = [toc_lib.catalog_from_book(lib_again[0][0], confidence=lib_again[0][1])]
        else:
            hint["toc_source"] = "heuristic"
            out = [hint]
    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for c in out:
        key = str(c.get("full_title") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    return uniq


def _enrich_unit_steps_with_deepseek(
    units: list[dict[str, Any]],
    *,
    catalog: dict[str, Any],
    subject: str,
) -> list[dict[str, Any]]:
    """在真实目录单元上补 focus/steps。默认用科目模板（可靠、离线）；可选 DeepSeek 润色。"""
    tips = _subject_tips(subject)
    _ = tips
    for u in units:
        if not u.get("focus"):
            kind = str(u.get("unit_kind") or "")
            name = u["unit_name"]
            if "习作" in kind or "习作" in name:
                u["focus"] = "把事情写清楚，注意标点与字数"
            elif "古诗" in name:
                u["focus"] = "读准背熟，理解大意"
            elif "测验" in kind or "阶段测" in name:
                u["focus"] = "限时验收，整理错题"
            elif subject == "英语":
                u["focus"] = "听读跟说，核心词句过关"
            elif subject == "数学":
                u["focus"] = "例题跟做 → 巩固练 → 错题订正"
            else:
                u["focus"] = "通读本课，掌握生字词与主要内容"
        if not u.get("steps"):
            u["steps"] = _default_steps_for_subject(
                subject, u["unit_name"], u.get("focus") or "", u.get("dictation_hint") or ""
            )
    # 不在热路径调用 DeepSeek：目录权威性靠 library；步骤用科目模板即可。
    return units


def plan_from_toc_book(book: dict[str, Any], catalog: dict[str, Any]) -> dict[str, Any]:
    """目录库册次 → 带学期预测日期的完整计划。"""
    subject = str(book.get("subject") or catalog.get("subject") or "")
    modules, units = toc_lib.flatten_toc_units(book)
    units = _enrich_unit_steps_with_deepseek(units, catalog=catalog, subject=subject)
    units = toc_lib.assign_planned_dates(units, semester=str(book.get("semester") or catalog.get("semester") or "上册"))
    schedule = toc_lib.build_schedule_from_planned(units)
    term_start, term_end = toc_lib.semester_window(semester=str(book.get("semester") or "上册"))
    pace = toc_lib.compute_pace(units, current_unit_order=1)
    return {
        "version": 2,
        "modules": modules,
        "units": units,
        "schedule": schedule,
        "subject_tips": _subject_tips(subject),
        "toc_book_id": book.get("id") or "",
        "toc_source": "library",
        "progress_meta": {
            "current_unit_order": 1,
            "term_start": term_start.isoformat(),
            "term_end": term_end.isoformat(),
            "edition_label": book.get("edition_label") or "",
            "pace": pace,
            "adjusted": False,
        },
    }


def generate_units_for_catalog(
    *,
    catalog: dict[str, Any],
    query: str = "",
    role: str = "student",
) -> tuple[dict[str, Any], str, dict[str, Any]]:
    """确认册次后生成计划：优先真实目录库；无库命中才走启发式/DeepSeek 大纲。"""
    cleaned = _clean_catalog(catalog, _heuristic_catalog(str(catalog.get("full_title") or query or ""), "", ""))
    title = str(cleaned.get("full_title") or query or "未命名课本").strip()
    book_id = str(cleaned.get("toc_book_id") or "") or toc_lib.guess_book_id_from_catalog(cleaned)
    if not book_id:
        hits = toc_lib.match_books(title or query, limit=1)
        if hits:
            book_id = str(hits[0][0].get("id") or "")
    book = toc_lib.get_book(book_id) if book_id else None
    if book:
        final_catalog = {**toc_lib.catalog_from_book(book), **{k: v for k, v in cleaned.items() if v}}
        final_catalog["toc_book_id"] = book["id"]
        final_catalog["toc_source"] = "library"
        final_catalog["full_title"] = book.get("full_title") or final_catalog.get("full_title")
        plan = plan_from_toc_book(book, final_catalog)
        return plan, "toc_library", final_catalog

    # 无目录库：明确标记不可靠，使用科目模板（仍可跟踪，但 unit 名非权威）
    plan = _fallback_plan(title, cleaned)
    plan["toc_source"] = "fallback_no_library"
    plan["progress_meta"] = {
        "current_unit_order": 1,
        "pace": {},
        "adjusted": False,
        "warning": "目录库暂无该册，单元名为模板；可换「语文/数学/英语三上」等已入库册次",
    }
    cleaned["toc_source"] = "fallback_no_library"
    return plan, "fallback", cleaned


def generate_study_plan(
    *,
    textbook_name: str,
    subject: str = "",
    grade: str = "",
    role: str = "student",
    catalog: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], str, dict[str, Any]]:
    """兼容旧接口：有确认 catalog 则只生成大纲，否则 locate 取首条再生成。"""
    if isinstance(catalog, dict) and str(catalog.get("full_title") or "").strip():
        return generate_units_for_catalog(catalog=catalog, query=textbook_name, role=role)
    candidates = locate_textbooks(query=textbook_name, role=role)
    picked = candidates[0] if candidates else _heuristic_catalog(textbook_name, subject, grade)
    if subject.strip():
        picked = {**picked, "subject": subject.strip() or picked.get("subject")}
    if grade.strip() and not picked.get("grade"):
        picked = {**picked, "grade": grade.strip()}
    return generate_units_for_catalog(catalog=picked, query=textbook_name, role=role)


def _units_from_plan(plan: Any) -> list[dict[str, Any]]:
    payload = normalize_plan_payload(plan)
    return [u for u in payload.get("units") or [] if isinstance(u, dict)]


def _progress_pct(plan: Any) -> int:
    units = _units_from_plan(plan)
    if not units:
        return 0
    weight = {"pending": 0, "learning": 40, "review": 70, "mastered": 100, "done": 100}
    total = 0
    step_done = 0
    step_all = 0
    for u in units:
        total += weight.get(str(u.get("status") or "pending"), 0)
        for s in u.get("steps") or []:
            if not isinstance(s, dict):
                continue
            step_all += 1
            if str(s.get("status") or "") in ("done", "mastered"):
                step_done += 1
    unit_pct = total / (len(units) * 100) * 100
    step_pct = (step_done / step_all * 100) if step_all else unit_pct
    return min(100, round(unit_pct * 0.55 + step_pct * 0.45))


def course_to_dict(row: StudyCoachCourse) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    catalog = row.catalog_json if isinstance(row.catalog_json, dict) else {}
    payload = normalize_plan_payload(row.plan_json, catalog=catalog)
    units = payload.get("units") or []
    meta = dict(payload.get("progress_meta") or {})
    current = int(meta.get("current_unit_order") or 0) or None
    pace = toc_lib.compute_pace(units, current_unit_order=current)
    meta["pace"] = pace
    return {
        "id": row.id,
        "record_no": row.record_no,
        "app_public_id": row.app_public_id,
        "textbook_name": row.textbook_name,
        "subject": row.subject,
        "grade": row.grade,
        "role": row.role,
        "student_name": row.student_name,
        "catalog": catalog,
        "plan": units,
        "modules": payload.get("modules") or [],
        "schedule": payload.get("schedule") or [],
        "subject_tips": payload.get("subject_tips") or _subject_tips(str(catalog.get("subject") or row.subject or "")),
        "progress_meta": meta,
        "unit_progress": pace,
        "toc_book_id": payload.get("toc_book_id") or catalog.get("toc_book_id") or "",
        "toc_source": payload.get("toc_source") or catalog.get("toc_source") or row.plan_source or "",
        "plan_version": int(payload.get("version") or 2),
        "plan_source": row.plan_source,
        "progress_pct": row.progress_pct,
        "status": row.status,
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def drill_to_dict(row: StudyCoachDrill) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    return {
        "id": row.id,
        "record_no": row.record_no,
        "course_id": row.course_id,
        "app_public_id": row.app_public_id,
        "unit_name": row.unit_name,
        "kind": row.kind,
        "score": row.score,
        "result": row.result,
        "notes": row.notes,
        "status": row.status,
        "reporter_id": row.reporter_id,
        "reporter_name": name,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def list_courses(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(StudyCoachCourse)
        .options(joinedload(StudyCoachCourse.reporter))
        .filter(StudyCoachCourse.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(StudyCoachCourse.app_public_id == app_public_id)
    if status:
        q = q.filter(StudyCoachCourse.status == status)
    return [course_to_dict(r) for r in q.order_by(StudyCoachCourse.created_at.desc()).limit(100).all()]


def create_course(
    db: Session,
    user: User,
    *,
    textbook_name: str = "",
    subject: str = "",
    grade: str = "",
    role: str = "student",
    student_name: str = "",
    app_public_id: str = "",
    catalog: dict[str, Any] | None = None,
) -> dict[str, Any]:
    role_n = (role or "student").strip().lower()
    if role_n not in VALID_ROLE:
        role_n = "student"
    title = (textbook_name or "").strip()
    if not title and isinstance(catalog, dict):
        title = str(catalog.get("full_title") or "").strip()
    title = title or "未命名课本"
    plan, source, catalog = generate_study_plan(
        textbook_name=title,
        subject=subject,
        grade=grade,
        role=role_n,
        catalog=catalog if isinstance(catalog, dict) else None,
    )
    subject_n = (subject or "").strip() or str(catalog.get("subject") or "")
    grade_parts = [
        str(catalog.get("stage") or "").strip(),
        str(catalog.get("grade") or "").strip(),
        str(catalog.get("semester") or "").strip(),
    ]
    grade_n = (grade or "").strip() or " ".join(p for p in grade_parts if p)
    resolved_title = str(catalog.get("full_title") or "").strip() or title

    row = StudyCoachCourse(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or "").strip(),
        reporter_id=user.id,
        record_no=_no("SC"),
        textbook_name=resolved_title,
        subject=subject_n,
        grade=grade_n,
        role=role_n,
        student_name=(student_name or "").strip() or (user.display_name or "学生"),
        catalog_json=catalog,
        plan_json=plan,
        plan_source=source,
        progress_pct=0,
        status="active",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title="课本学习 · 已定位并生成规划",
            content=(
                f"{row.record_no} · {row.textbook_name}\n"
                f"定位置信度 {catalog.get('confidence', '')} · "
                f"{len(plan.get('units') or [])} 个单元 · "
                f"{len(plan.get('modules') or [])} 个大任务 · {source}\n"
                f"{(catalog.get('note') or '')[:120]}"
            ),
            app_public_id=row.app_public_id,
            path="/study-coach",
            link_label="打开课本学习",
        )
    except Exception:
        pass
    return course_to_dict(row)


def _load_plan_payload(row: StudyCoachCourse) -> dict[str, Any]:
    catalog = row.catalog_json if isinstance(row.catalog_json, dict) else {}
    return normalize_plan_payload(row.plan_json, catalog=catalog)


def _save_plan_payload(row: StudyCoachCourse, payload: dict[str, Any]) -> None:
    row.plan_json = payload
    row.progress_pct = _progress_pct(payload)


def update_unit_progress(
    db: Session,
    tenant_id: str,
    course_id: str,
    *,
    order: int,
    status: str,
) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachCourse)
        .options(joinedload(StudyCoachCourse.reporter))
        .filter(StudyCoachCourse.tenant_id == tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not row:
        return None
    st = (status or "").strip().lower()
    if st not in VALID_UNIT_STATUS:
        st = "learning"
    payload = _load_plan_payload(row)
    units = list(payload.get("units") or [])
    found = False
    new_units: list[Any] = []
    for u in units:
        if not isinstance(u, dict):
            new_units.append(u)
            continue
        item = dict(u)
        if int(item.get("order") or 0) == int(order):
            item["status"] = st
            if st == "mastered":
                steps = []
                for s in item.get("steps") or []:
                    if isinstance(s, dict):
                        steps.append({**s, "status": "done"})
                    else:
                        steps.append(s)
                item["steps"] = steps
            found = True
        new_units.append(item)
    if not found:
        return None
    payload["units"] = new_units
    # 同步 schedule done 标记（该单元全部 mastered 时）
    if st == "mastered":
        sched = []
        for s in payload.get("schedule") or []:
            if isinstance(s, dict) and int(s.get("unit_order") or 0) == int(order):
                sched.append({**s, "done": True})
            else:
                sched.append(s)
        payload["schedule"] = sched
    _save_plan_payload(row, payload)
    db.commit()
    db.refresh(row)
    return course_to_dict(row)


def complete_step(
    db: Session,
    tenant_id: str,
    course_id: str,
    *,
    unit_order: int,
    step_id: str,
    done: bool = True,
) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachCourse)
        .options(joinedload(StudyCoachCourse.reporter))
        .filter(StudyCoachCourse.tenant_id == tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not row:
        return None
    payload = _load_plan_payload(row)
    sid = (step_id or "").strip()
    new_units: list[Any] = []
    found = False
    for u in payload.get("units") or []:
        if not isinstance(u, dict):
            new_units.append(u)
            continue
        item = dict(u)
        if int(item.get("order") or 0) != int(unit_order):
            new_units.append(item)
            continue
        steps = []
        for s in item.get("steps") or []:
            if not isinstance(s, dict):
                steps.append(s)
                continue
            step = dict(s)
            if str(step.get("id") or "") == sid:
                step["status"] = "done" if done else "pending"
                found = True
            steps.append(step)
        item["steps"] = steps
        # 小步骤全完成 → 单元进入 review；有进行中 → learning
        done_n = sum(1 for s in steps if isinstance(s, dict) and s.get("status") == "done")
        if done_n and done_n >= len([s for s in steps if isinstance(s, dict)]):
            if str(item.get("status") or "") != "mastered":
                item["status"] = "review"
        elif done_n > 0 and str(item.get("status") or "pending") == "pending":
            item["status"] = "learning"
        new_units.append(item)
    if not found:
        return None
    payload["units"] = new_units
    sched = []
    for s in payload.get("schedule") or []:
        if not isinstance(s, dict):
            sched.append(s)
            continue
        item = dict(s)
        if int(item.get("unit_order") or 0) == int(unit_order) and str(item.get("step_id") or "") == sid:
            item["done"] = bool(done)
        sched.append(item)
    payload["schedule"] = sched
    _save_plan_payload(row, payload)
    db.commit()
    db.refresh(row)
    return course_to_dict(row)


def complete_schedule_item(
    db: Session,
    tenant_id: str,
    course_id: str,
    *,
    date: str,
    unit_order: int,
    step_id: str,
    done: bool = True,
) -> dict[str, Any] | None:
    """标记日历提醒完成，并同步对应小步骤。"""
    course = complete_step(
        db, tenant_id, course_id, unit_order=unit_order, step_id=step_id, done=done
    )
    if course is None:
        # 步骤可能不存在，仅改 schedule
        row = (
            db.query(StudyCoachCourse)
            .options(joinedload(StudyCoachCourse.reporter))
            .filter(StudyCoachCourse.tenant_id == tenant_id, StudyCoachCourse.id == course_id)
            .first()
        )
        if not row:
            return None
        payload = _load_plan_payload(row)
        sched = []
        found = False
        for s in payload.get("schedule") or []:
            if not isinstance(s, dict):
                sched.append(s)
                continue
            item = dict(s)
            if (
                str(item.get("date") or "") == str(date)
                and int(item.get("unit_order") or 0) == int(unit_order)
                and str(item.get("step_id") or "") == str(step_id)
            ):
                item["done"] = bool(done)
                found = True
            sched.append(item)
        if not found:
            return None
        payload["schedule"] = sched
        _save_plan_payload(row, payload)
        db.commit()
        db.refresh(row)
        return course_to_dict(row)
    return course


def rebuild_schedule(
    db: Session,
    tenant_id: str,
    course_id: str,
    *,
    start_offset_days: int = 0,
) -> dict[str, Any] | None:
    from datetime import date as date_cls, timedelta

    row = (
        db.query(StudyCoachCourse)
        .options(joinedload(StudyCoachCourse.reporter))
        .filter(StudyCoachCourse.tenant_id == tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not row:
        return None
    payload = _load_plan_payload(row)
    catalog = row.catalog_json if isinstance(row.catalog_json, dict) else {}
    units = [u for u in (payload.get("units") or []) if isinstance(u, dict)]
    meta = dict(payload.get("progress_meta") or {})
    current = int(meta.get("current_unit_order") or 1)
    # 已完成单元保留；未完成从今天起重铺预测日期
    done_keys = {
        (int(s.get("unit_order") or 0), str(s.get("step_id") or ""))
        for s in (payload.get("schedule") or [])
        if isinstance(s, dict) and s.get("done")
    }
    start = date_cls.today() + timedelta(days=max(0, start_offset_days))
    ahead = [u for u in units if int(u.get("order") or 0) < current]
    rest = [u for u in units if int(u.get("order") or 0) >= current]
    rest = toc_lib.assign_planned_dates(
        rest,
        semester=str(catalog.get("semester") or "上册"),
        start_from=start,
    )
    # 合并：ahead 不动日期
    by_order = {int(u.get("order") or 0): u for u in ahead}
    for u in rest:
        by_order[int(u.get("order") or 0)] = u
    new_units = [by_order[k] for k in sorted(by_order.keys())]
    payload["units"] = new_units
    schedule = toc_lib.build_schedule_from_planned(new_units)
    for s in schedule:
        key = (int(s.get("unit_order") or 0), str(s.get("step_id") or ""))
        if key in done_keys:
            s["done"] = True
    payload["schedule"] = schedule
    meta["pace"] = toc_lib.compute_pace(new_units, current_unit_order=current)
    payload["progress_meta"] = meta
    _save_plan_payload(row, payload)
    db.commit()
    db.refresh(row)
    return course_to_dict(row)


def set_current_unit(
    db: Session,
    tenant_id: str,
    course_id: str,
    *,
    unit_order: int,
    mark_previous_mastered: bool = True,
    rebuild: bool = True,
) -> dict[str, Any] | None:
    """用户校正：老师/孩子实际讲到哪一课 → 对齐单元进度并重排后续日历。"""
    row = (
        db.query(StudyCoachCourse)
        .options(joinedload(StudyCoachCourse.reporter))
        .filter(StudyCoachCourse.tenant_id == tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not row:
        return None
    payload = _load_plan_payload(row)
    units = [dict(u) for u in (payload.get("units") or []) if isinstance(u, dict)]
    if not units:
        return None
    order = int(unit_order)
    if order < 1 or order > len(units):
        return None
    new_units: list[dict[str, Any]] = []
    for u in units:
        item = dict(u)
        o = int(item.get("order") or 0)
        if o < order and mark_previous_mastered:
            item["status"] = "mastered"
            steps = []
            for s in item.get("steps") or []:
                if isinstance(s, dict):
                    steps.append({**s, "status": "done"})
                else:
                    steps.append(s)
            item["steps"] = steps
        elif o == order:
            if str(item.get("status") or "") == "pending":
                item["status"] = "learning"
        new_units.append(item)
    payload["units"] = new_units
    meta = dict(payload.get("progress_meta") or {})
    meta["current_unit_order"] = order
    meta["adjusted"] = True
    meta["adjusted_at"] = datetime.now(timezone.utc).isoformat()
    meta["pace"] = toc_lib.compute_pace(new_units, current_unit_order=order)
    payload["progress_meta"] = meta
    _save_plan_payload(row, payload)
    db.commit()
    if rebuild:
        return rebuild_schedule(db, tenant_id, course_id, start_offset_days=0)
    db.refresh(row)
    return course_to_dict(row)


def today_tasks(course: dict[str, Any], *, on_date: str | None = None) -> list[dict[str, Any]]:
    from datetime import date as date_cls

    day = on_date or date_cls.today().isoformat()
    out = []
    for s in course.get("schedule") or []:
        if isinstance(s, dict) and str(s.get("date") or "") == day:
            out.append(s)
    if out:
        return out
    # 无当日日程：推送第一个未完成小步骤
    for u in course.get("plan") or []:
        if not isinstance(u, dict):
            continue
        if str(u.get("status") or "") == "mastered":
            continue
        for step in u.get("steps") or []:
            if not isinstance(step, dict):
                continue
            if str(step.get("status") or "") == "done":
                continue
            return [
                {
                    "date": day,
                    "unit_order": int(u.get("order") or 0),
                    "unit_name": str(u.get("unit_name") or ""),
                    "module_name": str(u.get("module_name") or ""),
                    "step_id": str(step.get("id") or ""),
                    "title": str(step.get("title") or ""),
                    "reminder": str(step.get("detail") or u.get("focus") or ""),
                    "kind": str(step.get("kind") or "review"),
                    "done": False,
                }
            ]
    return []


def list_drills(
    db: Session,
    tenant_id: str,
    *,
    app_public_id: str | None = None,
    course_id: str | None = None,
) -> list[dict[str, Any]]:
    q = (
        db.query(StudyCoachDrill)
        .options(joinedload(StudyCoachDrill.reporter))
        .filter(StudyCoachDrill.tenant_id == tenant_id)
    )
    if app_public_id:
        q = q.filter(StudyCoachDrill.app_public_id == app_public_id)
    if course_id:
        q = q.filter(StudyCoachDrill.course_id == course_id)
    return [drill_to_dict(r) for r in q.order_by(StudyCoachDrill.created_at.desc()).limit(200).all()]


def create_drill(
    db: Session,
    user: User,
    *,
    course_id: str,
    unit_name: str,
    kind: str = "review",
    score: str = "",
    result: str = "",
    notes: str = "",
    app_public_id: str = "",
) -> dict[str, Any] | None:
    course = (
        db.query(StudyCoachCourse)
        .filter(StudyCoachCourse.tenant_id == user.tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not course:
        return None
    kind_n = (kind or "review").strip().lower()
    if kind_n not in VALID_DRILL_KIND:
        kind_n = "review"
    result_n = (result or "").strip().lower()
    if result_n not in VALID_RESULT:
        result_n = ""
    row = StudyCoachDrill(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or course.app_public_id or "").strip(),
        reporter_id=user.id,
        course_id=course.id,
        record_no=_no("SD"),
        unit_name=(unit_name or "").strip() or "未指定单元",
        kind=kind_n,
        score=(score or "").strip(),
        result=result_n,
        notes=(notes or "").strip(),
        status="done",
    )
    payload = _load_plan_payload(course)
    new_units: list[Any] = []
    for u in payload.get("units") or []:
        if not isinstance(u, dict):
            new_units.append(u)
            continue
        item = dict(u)
        if item.get("unit_name") == row.unit_name:
            if kind_n == "exam" and result_n == "pass":
                item["status"] = "mastered"
            elif kind_n in ("review", "dictation", "exam"):
                cur = str(item.get("status") or "pending")
                if cur != "mastered":
                    item["status"] = "review"
        new_units.append(item)
    payload["units"] = new_units
    _save_plan_payload(course, payload)
    db.add(row)
    db.commit()
    db.refresh(row)
    row.reporter = user
    kind_label = {"review": "复习", "dictation": "家默", "exam": "考试"}.get(kind_n, "跟进")
    try:
        from app.services.im_delivery_service import notify_business_event

        notify_business_event(
            db,
            tenant_id=user.tenant_id,
            title=f"课本学习 · {kind_label}已记录",
            content=(
                f"{row.record_no} · {course.textbook_name}\n"
                f"{row.unit_name} · {kind_label}"
                f"{(' · ' + row.score) if row.score else ''}"
                f"{(' · ' + row.result) if row.result else ''}"
            ),
            app_public_id=row.app_public_id,
            path="/study-coach",
            link_label="打开课本学习",
        )
    except Exception:
        pass
    return drill_to_dict(row)


def tonight_to_dict(row: StudyCoachTonight) -> dict[str, Any]:
    payload = row.payload_json if isinstance(row.payload_json, dict) else {}
    return {
        "id": row.id,
        "record_no": row.record_no,
        "course_id": row.course_id,
        "unit_order": row.unit_order,
        "unit_name": row.unit_name,
        "template": row.template,
        "template_label": TEMPLATE_LABEL.get(row.template, row.template),
        "status": row.status,
        "payload": payload,
        "source": row.source,
        "drill_id": row.drill_id or "",
        "app_public_id": row.app_public_id,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "updated_at": row.updated_at.isoformat() if row.updated_at else "",
    }


def _split_hint_words(hint: str, limit: int = 10) -> list[str]:
    raw = (hint or "").replace("：", ":").replace("听写", "").replace("范围", "")
    for sep in ("、", ",", "，", ";", "；", "/", "|", " ", "\n", "\t"):
        raw = raw.replace(sep, "|")
    words = [w.strip() for w in raw.split("|") if w.strip() and len(w.strip()) <= 20]
    # drop labels like "校园:"
    cleaned: list[str] = []
    for w in words:
        if ":" in w:
            w = w.split(":")[-1].strip()
        if w and w not in cleaned:
            cleaned.append(w)
    # 无分隔的连续汉字：按 2 字切（课本听写常见「天地人你我他」）
    if len(cleaned) == 1 and len(cleaned[0]) >= 4 and all("\u4e00" <= ch <= "\u9fff" for ch in cleaned[0]):
        blob = cleaned[0]
        cleaned = [blob[i : i + 2] for i in range(0, len(blob) - (len(blob) % 2), 2)]
        if len(blob) % 2:
            cleaned.append(blob[-1])
    return cleaned[:limit]


def _fallback_tonight_payload(
    *,
    template: str,
    unit: dict[str, Any],
    course: StudyCoachCourse,
    child_name: str,
    level: str,
    note: str,
    recent_drills: list[dict[str, Any]],
) -> dict[str, Any]:
    unit_name = str(unit.get("unit_name") or "本课")
    focus = str(unit.get("focus") or "")
    hint = str(unit.get("dictation_hint") or "")
    steps = [s for s in (unit.get("steps") or []) if isinstance(s, dict)]
    subject = (course.subject or "").strip()
    kid = (child_name or course.student_name or "小朋友").strip() or "小朋友"
    items: list[dict[str, Any]] = []
    instructions = ""
    title = f"{TEMPLATE_LABEL.get(template, template)} · {unit_name}"

    if template == "dictation":
        words = _split_hint_words(hint, 10)
        if not words:
            words = ["认真", "学习", "练习", "复习", "听写", "正确", "订正", "朗读"]
        items = [
            {"id": f"w{i+1}", "type": "word", "prompt": f"听写：{w}", "answer": w, "done": False, "correct": None}
            for i, w in enumerate(words)
        ]
        instructions = f"{kid}，请合上课本，家长读词，你写在纸上或心里默写后勾选。"
    elif template == "word_cards":
        words = _split_hint_words(hint, 12)
        if not words:
            words = ["hello", "school", "friend", "happy", "read", "write", "family", "today"]
        items = [
            {
                "id": f"c{i+1}",
                "type": "card",
                "prompt": w if i % 2 == 0 else f"中文义？({w})",
                "answer": w,
                "done": False,
                "correct": None,
            }
            for i, w in enumerate(words)
        ]
        instructions = f"翻卡片：看英文说中文，或看提示想起单词。适合 {kid} 今晚巩固。"
    elif template == "math_drill":
        level_n = (level or "中").strip()
        if level_n == "易":
            pairs = [(a, b) for a in range(1, 6) for b in range(1, 6)][:10]
            items = [
                {
                    "id": f"m{i+1}",
                    "type": "math",
                    "prompt": f"{a} + {b} = ?",
                    "answer": str(a + b),
                    "done": False,
                    "correct": None,
                }
                for i, (a, b) in enumerate(pairs)
            ]
        else:
            pairs = [(a, b) for a in range(2, 10) for b in range(2, 10)][:10]
            items = [
                {
                    "id": f"m{i+1}",
                    "type": "math",
                    "prompt": f"{a} × {b} = ?",
                    "answer": str(a * b),
                    "done": False,
                    "correct": None,
                }
                for i, (a, b) in enumerate(pairs)
            ]
        instructions = f"口算 10 题（{level_n}）。围绕：{focus or unit_name}。"
    elif template == "wrongbook":
        wrongs: list[str] = []
        for d in recent_drills[:5]:
            notes = str(d.get("notes") or "")
            for line in notes.split("\n"):
                if "错" in line:
                    wrongs.extend(_split_hint_words(line.replace("错词", "").replace("错题", ""), 6))
            if d.get("result") in ("有错词", "fail", "partial") and d.get("score"):
                pass
        wrongs = [w for w in wrongs if w][:5]
        if not wrongs:
            wrongs = _split_hint_words(hint, 5) or ["订正", "再练", "巩固", "重点", "易错"]
        items = [
            {
                "id": f"x{i+1}",
                "type": "retry",
                "prompt": f"再练：{w}",
                "answer": w,
                "done": False,
                "correct": None,
            }
            for i, w in enumerate(wrongs)
        ]
        instructions = "从最近错词/错题抽出同型再练，做对勾选。"
    else:  # read_aloud
        if steps:
            for i, s in enumerate(steps[:6]):
                items.append(
                    {
                        "id": str(s.get("id") or f"r{i+1}"),
                        "type": "read",
                        "prompt": str(s.get("title") or f"朗读任务{i+1}"),
                        "answer": str(s.get("detail") or ""),
                        "done": False,
                        "correct": None,
                    }
                )
        else:
            items = [
                {"id": "r1", "type": "read", "prompt": "朗读课文第 1 遍", "answer": "通读", "done": False, "correct": None},
                {"id": "r2", "type": "read", "prompt": "朗读优美句 2 句", "answer": "摘句", "done": False, "correct": None},
                {"id": "r3", "type": "read", "prompt": "口头说课文大意", "answer": "复述", "done": False, "correct": None},
            ]
        instructions = f"按清单朗读/复述，完成一项勾一项。科目：{subject or '语文'}。"

    if note.strip():
        instructions = f"{instructions}\n家长备注：{note.strip()}"

    return {
        "title": title,
        "template": template,
        "drill_kind": TEMPLATE_DRILL_KIND.get(template, "review"),
        "child_name": kid,
        "level": (level or "中").strip() or "中",
        "instructions": instructions,
        "unit_name": unit_name,
        "unit_focus": focus,
        "items": items,
        "disclaimer": "AI/规则生成内容可能有误，重要知识点请家长过一眼再交给孩子。",
    }


def _llm_tonight_payload(
    *,
    template: str,
    unit: dict[str, Any],
    course: StudyCoachCourse,
    child_name: str,
    level: str,
    note: str,
    fallback: dict[str, Any],
) -> tuple[dict[str, Any], str]:
    system = (
        "你是小学家庭练习助手。根据课本单元生成「今晚这一练」JSON。"
        "只输出 JSON：title, instructions, items。"
        "items 为数组，每项含 id,type,prompt,answer；最多 12 项。"
        "不要编造超纲内容；听写/单词以给出的 hint 为主。"
    )
    user = (
        f"模板={TEMPLATE_LABEL.get(template, template)} ({template})\n"
        f"课本={course.textbook_name} 科目={course.subject} 年级={course.grade}\n"
        f"单元={unit.get('unit_name')} 重点={unit.get('focus')} 听写提示={unit.get('dictation_hint')}\n"
        f"步骤={unit.get('steps')}\n"
        f"孩子称呼={child_name or course.student_name or '小朋友'} 难度={level or '中'} 备注={note}\n"
        "请生成适合今晚 10～15 分钟的练习清单。"
    )
    parsed = deepseek_json_chat(system, user, temperature=0.2)
    if not isinstance(parsed, dict):
        return fallback, "fallback"
    items_raw = parsed.get("items")
    if not isinstance(items_raw, list) or not items_raw:
        return fallback, "fallback"
    items: list[dict[str, Any]] = []
    for i, raw in enumerate(items_raw[:12]):
        if not isinstance(raw, dict):
            continue
        prompt = str(raw.get("prompt") or raw.get("title") or "").strip()
        if not prompt:
            continue
        items.append(
            {
                "id": str(raw.get("id") or f"i{i+1}")[:40],
                "type": str(raw.get("type") or "item")[:32],
                "prompt": prompt[:200],
                "answer": str(raw.get("answer") or "")[:200],
                "done": False,
                "correct": None,
            }
        )
    if not items:
        return fallback, "fallback"
    out = dict(fallback)
    out["title"] = str(parsed.get("title") or fallback["title"])[:200]
    out["instructions"] = str(parsed.get("instructions") or fallback["instructions"])[:800]
    out["items"] = items
    out["disclaimer"] = fallback.get("disclaimer") or ""
    return out, "deepseek"


def list_tonight(
    db: Session,
    tenant_id: str,
    *,
    course_id: str | None = None,
    app_public_id: str | None = None,
    status: str | None = None,
) -> list[dict[str, Any]]:
    q = db.query(StudyCoachTonight).filter(StudyCoachTonight.tenant_id == tenant_id)
    if course_id:
        q = q.filter(StudyCoachTonight.course_id == course_id)
    if app_public_id:
        q = q.filter(StudyCoachTonight.app_public_id == app_public_id)
    if status and status in VALID_TONIGHT_STATUS:
        q = q.filter(StudyCoachTonight.status == status)
    return [tonight_to_dict(r) for r in q.order_by(StudyCoachTonight.created_at.desc()).limit(50).all()]


def get_tonight(db: Session, tenant_id: str, tonight_id: str) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachTonight)
        .filter(StudyCoachTonight.tenant_id == tenant_id, StudyCoachTonight.id == tonight_id)
        .first()
    )
    return tonight_to_dict(row) if row else None


def generate_tonight(
    db: Session,
    user: User,
    *,
    course_id: str,
    unit_order: int,
    template: str,
    child_name: str = "",
    level: str = "中",
    note: str = "",
    app_public_id: str = "",
) -> dict[str, Any] | None:
    course = (
        db.query(StudyCoachCourse)
        .filter(StudyCoachCourse.tenant_id == user.tenant_id, StudyCoachCourse.id == course_id)
        .first()
    )
    if not course:
        return None
    tpl = (template or "").strip()
    if tpl not in VALID_TONIGHT_TEMPLATE:
        raise ValueError("未知练习模板")
    payload_plan = _load_plan_payload(course)
    units = [u for u in (payload_plan.get("units") or []) if isinstance(u, dict)]
    unit = next((u for u in units if int(u.get("order") or 0) == int(unit_order)), None)
    if not unit:
        raise ValueError("单元不存在")
    drills = list_drills(db, user.tenant_id, course_id=course.id)[:8]
    fallback = _fallback_tonight_payload(
        template=tpl,
        unit=unit,
        course=course,
        child_name=child_name,
        level=level,
        note=note,
        recent_drills=drills,
    )
    try:
        payload, source = _llm_tonight_payload(
            template=tpl,
            unit=unit,
            course=course,
            child_name=child_name,
            level=level,
            note=note,
            fallback=fallback,
        )
    except Exception:
        payload, source = fallback, "fallback"
    # abandon previous active drafts for same course
    for old in (
        db.query(StudyCoachTonight)
        .filter(
            StudyCoachTonight.tenant_id == user.tenant_id,
            StudyCoachTonight.course_id == course.id,
            StudyCoachTonight.status.in_(("draft", "preview", "practicing")),
        )
        .all()
    ):
        old.status = "abandoned"
    row = StudyCoachTonight(
        tenant_id=user.tenant_id,
        app_public_id=(app_public_id or course.app_public_id or "").strip(),
        reporter_id=user.id,
        course_id=course.id,
        record_no=_no("ST"),
        unit_order=int(unit_order),
        unit_name=str(unit.get("unit_name") or ""),
        template=tpl,
        status="preview",
        payload_json=payload,
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return tonight_to_dict(row)


def start_tonight(db: Session, tenant_id: str, tonight_id: str) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachTonight)
        .filter(StudyCoachTonight.tenant_id == tenant_id, StudyCoachTonight.id == tonight_id)
        .first()
    )
    if not row:
        return None
    if row.status not in ("preview", "draft", "practicing"):
        raise ValueError("当前练习不可开练")
    row.status = "practicing"
    db.commit()
    db.refresh(row)
    return tonight_to_dict(row)


def save_tonight_progress(
    db: Session,
    tenant_id: str,
    tonight_id: str,
    *,
    items: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachTonight)
        .filter(StudyCoachTonight.tenant_id == tenant_id, StudyCoachTonight.id == tonight_id)
        .first()
    )
    if not row:
        return None
    payload = dict(row.payload_json or {})
    if items is not None:
        # merge done/correct by id
        by_id = {str(it.get("id")): it for it in items if isinstance(it, dict)}
        merged = []
        for old in payload.get("items") or []:
            if not isinstance(old, dict):
                continue
            nid = str(old.get("id"))
            if nid in by_id:
                upd = dict(old)
                src = by_id[nid]
                if "done" in src:
                    upd["done"] = bool(src.get("done"))
                if "correct" in src:
                    upd["correct"] = src.get("correct")
                merged.append(upd)
            else:
                merged.append(old)
        payload["items"] = merged
        row.payload_json = payload
    db.commit()
    db.refresh(row)
    return tonight_to_dict(row)


def complete_tonight(
    db: Session,
    user: User,
    tonight_id: str,
    *,
    items: list[dict[str, Any]] | None = None,
    complete_first_step: bool = True,
) -> dict[str, Any] | None:
    row = (
        db.query(StudyCoachTonight)
        .filter(StudyCoachTonight.tenant_id == user.tenant_id, StudyCoachTonight.id == tonight_id)
        .first()
    )
    if not row:
        return None
    if items is not None:
        save_tonight_progress(db, user.tenant_id, tonight_id, items=items)
        db.refresh(row)
    payload = dict(row.payload_json or {})
    its = [it for it in (payload.get("items") or []) if isinstance(it, dict)]
    done_n = sum(1 for it in its if it.get("done"))
    ok_n = sum(1 for it in its if it.get("correct") is True)
    total = len(its) or 1
    score = f"{done_n}/{total}"
    if ok_n:
        score = f"完成{done_n}/{total} · 正确{ok_n}"
    kind = str(payload.get("drill_kind") or TEMPLATE_DRILL_KIND.get(row.template, "review"))
    notes = (
        f"[今晚这一练] {TEMPLATE_LABEL.get(row.template, row.template)}\n"
        f"{payload.get('instructions') or ''}\n"
        f"完成 {done_n}/{total}"
    ).strip()
    drill = create_drill(
        db,
        user,
        course_id=row.course_id,
        unit_name=row.unit_name or str(payload.get("unit_name") or ""),
        kind=kind,
        score=score,
        result="pass" if done_n >= total else ("partial" if done_n else ""),
        notes=notes[:2000],
        app_public_id=row.app_public_id,
    )
    if complete_first_step:
        try:
            complete_step(
                db,
                user.tenant_id,
                row.course_id,
                unit_order=row.unit_order,
                step_id="read" if row.template == "read_aloud" else "chars",
                done=True,
            )
        except Exception:
            try:
                # fallback first pending step
                course = (
                    db.query(StudyCoachCourse)
                    .filter(StudyCoachCourse.tenant_id == user.tenant_id, StudyCoachCourse.id == row.course_id)
                    .first()
                )
                if course:
                    plan = _load_plan_payload(course)
                    for u in plan.get("units") or []:
                        if isinstance(u, dict) and int(u.get("order") or 0) == row.unit_order:
                            for s in u.get("steps") or []:
                                if isinstance(s, dict) and s.get("status") != "done":
                                    complete_step(
                                        db,
                                        user.tenant_id,
                                        row.course_id,
                                        unit_order=row.unit_order,
                                        step_id=str(s.get("id") or ""),
                                        done=True,
                                    )
                                    break
                            break
            except Exception:
                pass
    row.status = "done"
    row.drill_id = (drill or {}).get("id") if drill else None
    # mark all items done in payload snapshot
    for it in its:
        it["done"] = True
    payload["items"] = its
    payload["completed_score"] = score
    row.payload_json = payload
    db.commit()
    db.refresh(row)
    out = tonight_to_dict(row)
    out["drill"] = drill
    return out


def record_tonight_without_practice(
    db: Session,
    user: User,
    tonight_id: str,
) -> dict[str, Any] | None:
    """家长选择「先记下不练」：写一条 drill，练习标 done。"""
    row = (
        db.query(StudyCoachTonight)
        .filter(StudyCoachTonight.tenant_id == user.tenant_id, StudyCoachTonight.id == tonight_id)
        .first()
    )
    if not row:
        return None
    payload = dict(row.payload_json or {})
    kind = str(payload.get("drill_kind") or TEMPLATE_DRILL_KIND.get(row.template, "review"))
    drill = create_drill(
        db,
        user,
        course_id=row.course_id,
        unit_name=row.unit_name,
        kind=kind,
        score="",
        result="",
        notes=f"[今晚草稿已存未开练] {payload.get('title') or ''}\n{payload.get('instructions') or ''}"[:2000],
        app_public_id=row.app_public_id,
    )
    row.status = "done"
    row.drill_id = (drill or {}).get("id") if drill else None
    db.commit()
    db.refresh(row)
    out = tonight_to_dict(row)
    out["drill"] = drill
    return out
