from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import DemoBooking
from app.db.session import get_db

router = APIRouter(prefix="/demo-bookings", tags=["demo-bookings"])


class DemoBookingCreate(BaseModel):
    contact: str = Field(..., min_length=3, max_length=255, description="邮箱或电话")
    salutation: str = Field("", max_length=120)
    company_name: str = Field("", max_length=200)
    source: str = Field("home", max_length=64)


class DemoBookingOut(BaseModel):
    id: str
    ok: bool = True


def _split_contact(raw: str) -> tuple[str, str]:
    s = raw.strip()
    if "@" in s:
        return s, ""
    return "", s


@router.post("", response_model=DemoBookingOut)
def create_demo_booking(body: DemoBookingCreate, db: Session = Depends(get_db)) -> DemoBookingOut:
    email, phone = _split_contact(body.contact)
    row = DemoBooking(
        contact_email=email,
        contact_phone=phone,
        salutation=body.salutation.strip(),
        company_name=body.company_name.strip(),
        source=body.source.strip() or "home",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return DemoBookingOut(id=row.id)
