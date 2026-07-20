"""教材目录库：无 PDF 时的可靠单元来源（仅目录/课名，无正文）。"""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

_LIBRARY_PATH = Path(__file__).resolve().parent.parent / "data" / "textbook_toc_library.json"


@lru_cache(maxsize=1)
def load_library() -> dict[str, Any]:
    raw = _LIBRARY_PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    return data if isinstance(data, dict) else {"books": []}


def list_books() -> list[dict[str, Any]]:
    return [b for b in (load_library().get("books") or []) if isinstance(b, dict)]


def get_book(book_id: str) -> dict[str, Any] | None:
    bid = (book_id or "").strip()
    for b in list_books():
        if str(b.get("id") or "") == bid:
            return b
    return None


def catalog_from_book(book: dict[str, Any], *, confidence: float = 0.92) -> dict[str, Any]:
    return {
        "publisher": book.get("publisher") or "",
        "series": book.get("series") or "",
        "subject": book.get("subject") or "",
        "school_system": book.get("school_system") or "",
        "stage": book.get("stage") or "",
        "grade": book.get("grade") or "",
        "semester": book.get("semester") or "",
        "full_title": book.get("full_title") or "",
        "confidence": confidence,
        "note": f"目录库命中 · {book.get('edition_label') or book.get('id')}",
        "toc_book_id": book.get("id") or "",
        "toc_source": "library",
        "edition_label": book.get("edition_label") or "",
    }


def _norm(s: str) -> str:
    t = (s or "").strip().lower()
    for a, b in (
        ("统编", "部编"),
        ("义务教育教科书", ""),
        ("小学", ""),
        ("年级", "年级"),
        (" ", ""),
        ("·", ""),
        ("-", ""),
        ("（", ""),
        ("）", ""),
        ("(", ""),
        (")", ""),
    ):
        t = t.replace(a, b)
    return t


def match_books(query: str, *, limit: int = 3) -> list[tuple[dict[str, Any], float]]:
    """按别名/全称/科目年级册次打分匹配目录库。"""
    q = (query or "").strip()
    if not q:
        return []
    nq = _norm(q)
    scored: list[tuple[dict[str, Any], float]] = []
    for book in list_books():
        score = 0.0
        aliases = [str(a) for a in (book.get("aliases") or [])] + [str(book.get("full_title") or "")]
        for a in aliases:
            na = _norm(a)
            if not na:
                continue
            if nq == na or na in nq or nq in na:
                score = max(score, 0.98 if nq == na else 0.9)
        # 字段组合
        subj = str(book.get("subject") or "")
        grade = str(book.get("grade") or "")
        sem = str(book.get("semester") or "")
        pub = str(book.get("publisher") or "")
        hits = 0
        if subj and subj in q:
            hits += 1
        if grade and (grade in q or grade.replace("年级", "") in q):
            hits += 1
        if sem and (sem in q or ("上" in q and "上" in sem) or ("下" in q and "下" in sem)):
            hits += 1
        if pub and any(p in q for p in (pub, "部编", "统编", "人教", "沪教", "牛津") if p):
            hits += 1
        if hits >= 3:
            score = max(score, 0.85 + 0.03 * hits)
        elif hits == 2 and subj in q:
            score = max(score, 0.72)
        if score >= 0.7:
            scored.append((book, min(score, 0.99)))
    scored.sort(key=lambda x: x[1], reverse=True)
    # 去重 id
    seen: set[str] = set()
    out: list[tuple[dict[str, Any], float]] = []
    for b, s in scored:
        bid = str(b.get("id") or "")
        if bid in seen:
            continue
        seen.add(bid)
        out.append((b, s))
        if len(out) >= limit:
            break
    return out


def flatten_toc_units(book: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """目录 → modules + 扁平 units（带 module 归属）。"""
    modules_out: list[dict[str, Any]] = []
    units_out: list[dict[str, Any]] = []
    order = 0
    for m in book.get("modules") or []:
        if not isinstance(m, dict):
            continue
        mo = int(m.get("order") or len(modules_out) + 1)
        mname = str(m.get("name") or f"阶段{mo}")
        uos: list[int] = []
        for u in m.get("units") or []:
            if not isinstance(u, dict):
                continue
            name = str(u.get("name") or "").strip()
            if not name:
                continue
            order += 1
            uos.append(order)
            try:
                weeks = float(u.get("weeks") or 1)
            except (TypeError, ValueError):
                weeks = 1.0
            days = max(1, min(14, round(weeks * 5)))  # 按教学周≈5 个学习日
            units_out.append(
                {
                    "order": order,
                    "module_order": mo,
                    "module_name": mname,
                    "unit_code": str(u.get("code") or f"U{order}")[:40],
                    "unit_name": name[:160],
                    "unit_kind": str(u.get("kind") or "单元")[:40],
                    "focus": "",
                    "dictation_hint": "",
                    "estimated_days": days,
                    "planned_weeks": weeks,
                    "status": "pending",
                    "steps": [],
                    "planned_start": "",
                    "planned_end": "",
                    "toc_source": "library",
                }
            )
        modules_out.append(
            {
                "order": mo,
                "name": mname[:80],
                "goal": str(m.get("goal") or "").strip()[:200],
                "unit_orders": uos,
            }
        )
    return modules_out, units_out


def semester_window(*, semester: str, today: date | None = None) -> tuple[date, date]:
    """按学期推教学窗口（中国小学常见节奏，可被用户校正覆盖）。"""
    today = today or date.today()
    year = today.year
    sem = semester or ""
    if "下" in sem:
        # 春季学期：约 2 月中旬 — 6 月底
        start = date(year, 2, 17) if today.month <= 7 else date(year + 1, 2, 17)
        if today >= start:
            end = date(start.year, 6, 30)
        else:
            start = date(year, 2, 17)
            end = date(year, 6, 30)
        if today > end:
            start = date(year + 1, 2, 17)
            end = date(year + 1, 6, 30)
        return start, end
    # 上册/秋季：约 9 月 1 日 — 1 月中旬
    if today.month >= 8:
        start = date(year, 9, 1)
        end = date(year + 1, 1, 15)
    elif today.month == 1 and today.day <= 20:
        start = date(year - 1, 9, 1)
        end = date(year, 1, 15)
    else:
        # 春夏问上册：指向即将到来的秋季
        start = date(year, 9, 1)
        end = date(year + 1, 1, 15)
    return start, end


def assign_planned_dates(
    units: list[dict[str, Any]],
    *,
    semester: str,
    today: date | None = None,
    start_from: date | None = None,
) -> list[dict[str, Any]]:
    """按 weeks 权重把单元铺到学期教学日（跳过周末）。"""
    today = today or date.today()
    term_start, term_end = semester_window(semester=semester, today=today)
    cursor = start_from or max(term_start, today)
    if cursor > term_end:
        cursor = term_start

    total_weeks = sum(float(u.get("planned_weeks") or 1) for u in units) or 1.0
    # 可用教学日
    teaching_days: list[date] = []
    d = cursor
    while d <= term_end and len(teaching_days) < 200:
        if d.weekday() < 5:
            teaching_days.append(d)
        d += timedelta(days=1)
    if not teaching_days:
        teaching_days = [cursor]

    out: list[dict[str, Any]] = []
    idx = 0
    for u in units:
        item = dict(u)
        weeks = float(u.get("planned_weeks") or 1)
        share = max(1, int(round(len(teaching_days) * (weeks / total_weeks))))
        share = min(share, max(1, len(teaching_days) - idx))
        chunk = teaching_days[idx : idx + share]
        if not chunk:
            chunk = [teaching_days[-1]]
        item["planned_start"] = chunk[0].isoformat()
        item["planned_end"] = chunk[-1].isoformat()
        item["estimated_days"] = len(chunk)
        idx += share
        out.append(item)
    return out


def build_schedule_from_planned(units: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """按 planned_start~end 与 steps 展开日历提醒。"""
    schedule: list[dict[str, Any]] = []
    for u in units:
        if not isinstance(u, dict):
            continue
        try:
            start = date.fromisoformat(str(u.get("planned_start") or ""))
            end = date.fromisoformat(str(u.get("planned_end") or ""))
        except ValueError:
            continue
        steps = [s for s in (u.get("steps") or []) if isinstance(s, dict)]
        if not steps:
            steps = [
                {
                    "id": "core",
                    "title": u.get("unit_name") or "学习",
                    "kind": "review",
                    "detail": u.get("focus") or "按课本完成本单元学习",
                }
            ]
        days: list[date] = []
        d = start
        while d <= end and len(days) < 20:
            if d.weekday() < 5:
                days.append(d)
            d += timedelta(days=1)
        if not days:
            days = [start]
        for i, day in enumerate(days):
            step = steps[min(i, len(steps) - 1)]
            schedule.append(
                {
                    "date": day.isoformat(),
                    "unit_order": int(u.get("order") or 0),
                    "unit_name": str(u.get("unit_name") or ""),
                    "module_name": str(u.get("module_name") or ""),
                    "step_id": str(step.get("id") or f"s{i}"),
                    "title": str(step.get("title") or u.get("unit_name") or "学习任务"),
                    "reminder": str(step.get("detail") or u.get("focus") or ""),
                    "kind": str(step.get("kind") or "review"),
                    "done": False,
                    "planned": True,
                }
            )
    return schedule[:80]


def compute_pace(units: list[dict[str, Any]], *, today: date | None = None, current_unit_order: int | None = None) -> dict[str, Any]:
    """预测进度 vs 实际进度。"""
    today = today or date.today()
    planned_order = 0
    for u in units:
        if not isinstance(u, dict):
            continue
        try:
            ps = date.fromisoformat(str(u.get("planned_start") or ""))
            pe = date.fromisoformat(str(u.get("planned_end") or ""))
        except ValueError:
            continue
        if ps <= today <= pe:
            planned_order = int(u.get("order") or 0)
            break
        if pe < today:
            planned_order = int(u.get("order") or 0)
    if not planned_order and units:
        planned_order = 1

    actual_order = int(current_unit_order or 0)
    if not actual_order:
        actual_order = 1
        for u in units:
            if not isinstance(u, dict):
                continue
            st = str(u.get("status") or "pending")
            if st == "mastered":
                actual_order = int(u.get("order") or 0) + 1
                continue
            if st in ("learning", "review"):
                actual_order = int(u.get("order") or 0)
                break
            if st == "pending":
                actual_order = int(u.get("order") or 0)
                break
        actual_order = min(actual_order, len(units) or 1)

    delta = actual_order - planned_order
    if delta >= 2:
        pace = "ahead"
        label = f"超前约 {delta} 个单元"
    elif delta <= -2:
        pace = "behind"
        label = f"落后约 {-delta} 个单元"
    else:
        pace = "on_track"
        label = "与学期预测基本一致"

    planned_unit = next((u for u in units if int(u.get("order") or 0) == planned_order), None)
    actual_unit = next((u for u in units if int(u.get("order") or 0) == actual_order), None)
    return {
        "today": today.isoformat(),
        "planned_unit_order": planned_order,
        "actual_unit_order": actual_order,
        "delta_units": delta,
        "pace": pace,
        "pace_label": label,
        "planned_unit_name": (planned_unit or {}).get("unit_name") or "",
        "actual_unit_name": (actual_unit or {}).get("unit_name") or "",
    }


def guess_book_id_from_catalog(catalog: dict[str, Any]) -> str:
    if catalog.get("toc_book_id"):
        return str(catalog["toc_book_id"])
    title = str(catalog.get("full_title") or "")
    hits = match_books(title, limit=1)
    return str(hits[0][0].get("id") or "") if hits else ""
