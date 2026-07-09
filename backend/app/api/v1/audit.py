from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.db.models import User
from app.db.session import get_db
from app.services.audit_service import list_audit_logs

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def audit_logs_api(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_admin)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    items, total = list_audit_logs(db, tenant_id=user.tenant_id, limit=limit, offset=offset)
    return {"total": total, "items": items}
