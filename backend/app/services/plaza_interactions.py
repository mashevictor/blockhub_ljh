"""Plaza feed likes & comments (PG-backed)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import PlazaFeedComment, PlazaFeedLike


def plaza_interaction_counts(db: Session, app_public_id: str) -> tuple[int, int]:
    likes = (
        db.query(PlazaFeedLike)
        .filter(PlazaFeedLike.app_public_id == app_public_id)
        .count()
    )
    comments = (
        db.query(PlazaFeedComment)
        .filter(PlazaFeedComment.app_public_id == app_public_id)
        .count()
    )
    return likes, comments


def toggle_plaza_like(db: Session, *, app_public_id: str, user_key: str) -> dict:
    user_key = (user_key or "anonymous").strip()[:255] or "anonymous"
    row = (
        db.query(PlazaFeedLike)
        .filter(
            PlazaFeedLike.app_public_id == app_public_id,
            PlazaFeedLike.user_key == user_key,
        )
        .first()
    )
    liked = False
    if row:
        db.delete(row)
    else:
        db.add(PlazaFeedLike(app_public_id=app_public_id, user_key=user_key))
        liked = True
    db.commit()
    likes, comments = plaza_interaction_counts(db, app_public_id)
    return {"liked": liked, "likes": likes, "comments": comments}


def add_plaza_comment(
    db: Session,
    *,
    app_public_id: str,
    author_name: str,
    text: str,
) -> dict:
    author = (author_name or "访客").strip()[:120] or "访客"
    body = text.strip()
    if not body:
        raise ValueError("评论不能为空")
    row = PlazaFeedComment(
        app_public_id=app_public_id,
        author_name=author,
        text=body[:500],
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    likes, comments = plaza_interaction_counts(db, app_public_id)
    return {
        "id": row.id,
        "author": row.author_name,
        "text": row.text,
        "created_at": row.created_at.isoformat() if row.created_at else "",
        "likes": likes,
        "comments": comments,
    }


def list_plaza_comments(db: Session, *, app_public_id: str, limit: int = 20) -> list[dict]:
    rows = (
        db.query(PlazaFeedComment)
        .filter(PlazaFeedComment.app_public_id == app_public_id)
        .order_by(PlazaFeedComment.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "author": r.author_name,
            "text": r.text,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in rows
    ]


def user_liked(db: Session, *, app_public_id: str, user_key: str) -> bool:
    user_key = (user_key or "anonymous").strip()[:255] or "anonymous"
    return (
        db.query(PlazaFeedLike)
        .filter(
            PlazaFeedLike.app_public_id == app_public_id,
            PlazaFeedLike.user_key == user_key,
        )
        .first()
        is not None
    )
