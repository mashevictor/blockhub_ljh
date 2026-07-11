from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.booking_delivery import get_share_pack

router = APIRouter(prefix="/share", tags=["share"])


class ShareArtifact(BaseModel):
    id: str
    title: str
    description: str = ""
    href: str = ""


class SharePackOut(BaseModel):
    token: str
    salutation: str
    company_name: str
    agent_summary: str
    artifacts: list[ShareArtifact]
    created_at: str = ""


@router.get("/{token}", response_model=SharePackOut)
def get_share_pack_api(token: str, db: Session = Depends(get_db)) -> SharePackOut:
    data = get_share_pack(db, token.strip())
    if not data:
        raise HTTPException(status_code=404, detail="资料链接无效或已过期")
    return SharePackOut(**data)
