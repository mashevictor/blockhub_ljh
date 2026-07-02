from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models import User
from app.db.session import get_db
from app.services.catalog_seed import seed_catalog
from app.services.db_seed import ensure_seed_data

router = APIRouter(prefix="/seed", tags=["seed"])


class SeedRequest(BaseModel):
    force: bool = False


class SeedResponse(BaseModel):
    success: bool = True
    message: str
    counts: dict[str, int]


@router.post("", response_model=SeedResponse)
def seed_database(
    body: SeedRequest,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> SeedResponse:
    ensure_seed_data(db)
    counts = seed_catalog(db, force=body.force)
    return SeedResponse(
        message="Catalog 数据已写入 PostgreSQL",
        counts=counts,
    )
