"""CapShip · study_coach 课本学习闭环（规划 / 进度 / 家默 / 考试）。"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.db.models import StudyCoachCourse, StudyCoachDrill, User
from app.services.deepseek_client import deepseek_json_chat

VALID_ROLE = frozenset({"student", "parent", "teacher"})
VALID_UNIT_STATUS = frozenset({"pending", "learning", "review", "mastered"})
VALID_DRILL_KIND = frozenset({"review", "dictation", "exam"})
VALID_RESULT = frozenset({"", "pass", "fail", "partial"})


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


def _fallback_plan(textbook_name: str, catalog: dict[str, Any]) -> list[dict[str, Any]]:
    subj = catalog.get("subject") or "课本"
    title = catalog.get("full_title") or textbook_name.strip() or "未命名课本"
    units = [
        f"确认教材 · {title}",
        f"{subj} · Module/Unit 1 预习精读",
        f"{subj} · Module/Unit 2 词句巩固",
        f"{subj} · Module/Unit 3 练习与听说",
        "阶段复习 · 家默跟进",
        "综合测验 · 查漏补缺",
    ]
    return [
        {
            "order": i + 1,
            "unit_code": f"U{i + 1}",
            "unit_name": name,
            "focus": "",
            "dictation_hint": "",
            "estimated_days": 2 if i < 4 else 1,
            "status": "pending",
        }
        for i, name in enumerate(units)
    ]


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


def _clean_units(units_raw: Any) -> list[dict[str, Any]]:
    if not isinstance(units_raw, list):
        return []
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
        cleaned.append(
            {
                "order": i + 1,
                "unit_code": str(u.get("unit_code") or f"U{i + 1}").strip()[:40],
                "unit_name": name[:160],
                "focus": str(u.get("focus") or "").strip()[:200],
                "dictation_hint": str(u.get("dictation_hint") or u.get("dictation") or "").strip()[:200],
                "estimated_days": max(1, min(days, 14)),
                "status": "pending",
            }
        )
    return cleaned


def _candidate_from_raw(raw: Any, fallback: dict[str, Any]) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    catalog = _clean_catalog(raw, fallback)
    title = str(catalog.get("full_title") or "").strip()
    if not title:
        return None
    return catalog


def locate_textbooks(*, query: str, role: str = "student") -> list[dict[str, Any]]:
    """仅定位册次候选（不落库、不生成大纲）。返回 1~3 条 catalog。"""
    q = (query or "").strip()
    if not q:
        return []
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
    out: list[dict[str, Any]] = []
    if isinstance(parsed, dict):
        raw_list = parsed.get("candidates")
        if not isinstance(raw_list, list) and isinstance(parsed.get("catalog"), dict):
            raw_list = [parsed.get("catalog")]
        if isinstance(raw_list, list):
            for raw in raw_list[:3]:
                item = _candidate_from_raw(raw, hint)
                if item:
                    out.append(item)
    if not out:
        # 无模型时至少给出规则定位，方便用户确认或纠错
        out = [hint]
    # 去重 full_title
    seen: set[str] = set()
    uniq: list[dict[str, Any]] = []
    for c in out:
        key = str(c.get("full_title") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    return uniq


def generate_units_for_catalog(
    *,
    catalog: dict[str, Any],
    query: str = "",
    role: str = "student",
) -> tuple[list[dict[str, Any]], str, dict[str, Any]]:
    """用户已确认册次后，按该册目录生成 Module/Unit 级规划。"""
    cleaned = _clean_catalog(catalog, _heuristic_catalog(str(catalog.get("full_title") or query or ""), "", ""))
    title = str(cleaned.get("full_title") or query or "未命名课本").strip()
    system = (
        "你是中国K12教材目录专家。用户已确认具体课本册次，请按该册真实目录输出学习单元。"
        "规则："
        "1) units 必须对齐 Module/Unit/课文级目录名，禁止「第一单元预习」空泛标题；"
        "2) 每个 unit 给 focus 与 dictation_hint（家默听写要点）；"
        "3) 本册覆盖尽量完整，6~12 个单元；不要抄袭教材全文；"
        "4) 可微调 catalog 字段，但不要改成另一册书。"
        "只返回 JSON：{\"catalog\":{...},\"units\":[{\"order\":1,\"unit_code\":\"Module1-U1\","
        "\"unit_name\":\"具体目录名\",\"focus\":\"\",\"dictation_hint\":\"\",\"estimated_days\":1}]}"
    )
    user = (
        f"已确认教材：{cleaned}\n"
        f"用户原话：{query or title}\n"
        f"发起角色：{role}\n"
        "请输出该册目录级学习规划。"
    )
    parsed = deepseek_json_chat(system, user, temperature=0.2)
    if not isinstance(parsed, dict):
        return _fallback_plan(title, cleaned), "fallback", cleaned
    final_catalog = _clean_catalog(parsed.get("catalog"), cleaned)
    # 防止模型漂到别的书
    if cleaned.get("full_title") and not final_catalog.get("full_title"):
        final_catalog["full_title"] = cleaned["full_title"]
    units = _clean_units(parsed.get("units"))
    generic_hits = sum(
        1
        for u in units
        if any(x in u["unit_name"] for x in ("预习与精读", "练习巩固", "重点回顾", "熟悉目录", "Module/Unit 1 预习"))
    )
    if len(units) < 4 or generic_hits >= max(2, len(units) // 2):
        return _fallback_plan(title, final_catalog), "fallback", final_catalog
    return units, "deepseek", final_catalog


def generate_study_plan(
    *,
    textbook_name: str,
    subject: str = "",
    grade: str = "",
    role: str = "student",
    catalog: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], str, dict[str, Any]]:
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


def _progress_pct(plan: list[Any]) -> int:
    if not plan:
        return 0
    weight = {"pending": 0, "learning": 40, "review": 70, "mastered": 100}
    total = 0
    for u in plan:
        if isinstance(u, dict):
            total += weight.get(str(u.get("status") or "pending"), 0)
    return min(100, round(total / (len(plan) * 100) * 100))


def course_to_dict(row: StudyCoachCourse) -> dict[str, Any]:
    name = ""
    if row.reporter is not None:
        name = row.reporter.display_name or row.reporter.email or ""
    plan = row.plan_json if isinstance(row.plan_json, list) else []
    catalog = row.catalog_json if isinstance(row.catalog_json, dict) else {}
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
        "plan": plan,
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
                f"定位置信度 {catalog.get('confidence', '')} · {len(plan)} 个单元 · {source}\n"
                f"{(catalog.get('note') or '')[:120]}"
            ),
            app_public_id=row.app_public_id,
            path="/study-coach",
            link_label="打开课本学习",
        )
    except Exception:
        pass
    return course_to_dict(row)


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
    plan = list(row.plan_json) if isinstance(row.plan_json, list) else []
    found = False
    new_plan: list[Any] = []
    for u in plan:
        if not isinstance(u, dict):
            new_plan.append(u)
            continue
        item = dict(u)
        if int(item.get("order") or 0) == int(order):
            item["status"] = st
            found = True
        new_plan.append(item)
    if not found:
        return None
    row.plan_json = new_plan
    row.progress_pct = _progress_pct(new_plan)
    db.commit()
    db.refresh(row)
    return course_to_dict(row)


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
    plan = list(course.plan_json) if isinstance(course.plan_json, list) else []
    new_plan: list[Any] = []
    for u in plan:
        if not isinstance(u, dict):
            new_plan.append(u)
            continue
        item = dict(u)
        if item.get("unit_name") == row.unit_name:
            if kind_n == "exam" and result_n == "pass":
                item["status"] = "mastered"
            elif kind_n in ("review", "dictation", "exam"):
                cur = str(item.get("status") or "pending")
                if cur != "mastered":
                    item["status"] = "review"
        new_plan.append(item)
    course.plan_json = new_plan
    course.progress_pct = _progress_pct(new_plan)
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
