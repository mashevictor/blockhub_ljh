from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models import DemoBooking
from app.db.session import get_db
from app.services.booking_delivery import deliver_booking, mask_phone, new_share_token, share_url

router = APIRouter(prefix="/demo-bookings", tags=["demo-bookings"])


class DemoBookingCreate(BaseModel):
    contact: str = Field(..., min_length=3, max_length=255, description="邮箱或电话")
    salutation: str = Field("", max_length=120)
    company_name: str = Field("", max_length=200)
    source: str = Field("home", max_length=64)


class DemoBookingOut(BaseModel):
    id: str
    ok: bool = True
    share_token: str = ""
    share_url: str = ""
    agent_summary: str = ""
    contact_email: str = ""
    contact_phone_masked: str = ""
    email_sent: bool = False
    sms_sent: bool = False


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
        share_token=new_share_token(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    try:
        result = deliver_booking(db, row)
    except Exception:
        import logging

        logging.getLogger(__name__).exception("booking delivery failed id=%s", row.id)
        return DemoBookingOut(
            id=row.id,
            contact_email=email,
            contact_phone_masked=mask_phone(phone),
        )

    return DemoBookingOut(
        id=row.id,
        share_token=result.share_token,
        share_url=result.share_url,
        agent_summary=result.agent_summary,
        contact_email=email,
        contact_phone_masked=mask_phone(phone),
        email_sent=result.email_sent,
        sms_sent=result.sms_sent,
    )
