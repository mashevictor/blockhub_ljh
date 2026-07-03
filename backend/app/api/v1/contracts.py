from __future__ import annotations

import urllib.parse
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.data.contract_templates import (
    get_template,
    get_template_fields,
    list_templates_brief,
    render_body,
)
from app.db.models import User
from app.db.session import get_db
from app.services import contract_store
from app.services.file_storage import read_bytes, uploads_root
from app.services.llm_gateway import llm_configured

router = APIRouter(prefix="/contracts", tags=["contracts"])


def _pdf_headers(disposition: str, title: str, contract_id: str) -> dict[str, str]:
    """Content-Disposition 须 ASCII 安全，中文标题用 RFC 5987 filename*。"""
    ascii_name = f"{disposition}-{contract_id}.pdf"
    utf_name = urllib.parse.quote(f"{title or 'contract'}.pdf")
    return {
        "Content-Disposition": f'{disposition}; filename="{ascii_name}"; filename*=UTF-8\'\'{utf_name}',
    }


class PartiesBody(BaseModel):
    party_a: str = ""
    party_b: str = ""
    fields: dict[str, Any] | None = None
    seal_company: str = ""


class CreateContractBody(BaseModel):
    title: str = Field(default="", max_length=300)
    template_key: str = "labor"
    parties: PartiesBody | None = None
    field_values: dict[str, Any] | None = None


class UpdateContractBody(BaseModel):
    title: str | None = None
    body_html: str | None = None
    parties: PartiesBody | dict[str, Any] | None = None
    template_key: str | None = None
    field_values: dict[str, Any] | None = None


class FieldValuesBody(BaseModel):
    field_values: dict[str, Any]
    rerender: bool = True


class SealBody(BaseModel):
    company_name: str = ""
    seal_text: str = "合同专用章"
    style: str = "round"  # round | square


class DraftBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)


class AssetBody(BaseModel):
    asset_type: str
    data_url: str
    label: str = ""
    placement: dict[str, Any] | None = None


class PlacementItem(BaseModel):
    id: str
    placement: dict[str, Any]


class PlacementsBody(BaseModel):
    items: list[PlacementItem]


@router.get("/config")
def contracts_config() -> dict:
    return {
        "title": "合同盖章",
        "description": "自定义文本合同、手写签名与电子章，一键生成 PDF",
        "agent_id": "contract_esign",
        "llm_configured": llm_configured(),
        "opensource_refs": [
            {"name": "开放签 kaifangqian-base", "url": "https://github.com/kaifangqian/kaifangqian-base", "note": "手写签名/印章/PDF 签署参考"},
            {"name": "Mini Contract.Pro", "url": "https://github.com/freeleepm/mini-contract", "note": "模板市场+AI起草"},
            {"name": "docxtpl", "url": "https://github.com/elapouya/docxtpl", "note": "Word 模板占位符（可后续接入）"},
        ],
        "templates": list_templates_brief(),
    }


@router.get("/templates")
def list_templates() -> dict:
    return {"items": list_templates_brief()}


@router.get("/templates/{key}")
def template_detail(key: str) -> dict:
    tpl = get_template(key)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    return {
        "key": key,
        "name": tpl["name"],
        "description": tpl["description"],
        "category": tpl.get("category", ""),
        "fields": get_template_fields(key),
        "sample_body_html": render_body(key, {}, title=tpl.get("default_title", "")),
    }


@router.get("/templates/{key}/preview")
def preview_template(key: str, party_a: str = "", party_b: str = "") -> dict:
    tpl = get_template(key)
    if not tpl:
        raise HTTPException(404, "模板不存在")
    vals = {"party_a": party_a or "甲方", "party_b": party_b or "乙方"}
    return {"key": key, "body_html": render_body(key, vals, title=tpl.get("default_title", ""))}


@router.get("")
def list_all(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return {"items": contract_store.list_contracts(db, user)}


@router.post("")
def create(
    body: CreateContractBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    fv: dict[str, Any] = dict(body.field_values or {})
    if body.parties:
        if body.parties.party_a:
            fv["party_a"] = body.parties.party_a
        if body.parties.party_b:
            fv["party_b"] = body.parties.party_b
        if body.parties.seal_company:
            fv["seal_company"] = body.parties.seal_company
        if body.parties.fields:
            fv.update(body.parties.fields)
    tpl = get_template(body.template_key) or get_template("labor")
    title = (body.title or "").strip() or str(tpl.get("default_title", "合同") if tpl else "合同")
    c = contract_store.create_contract(
        db, user, title=title, template_key=body.template_key, field_values=fv,
    )
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.get("/files/{file_key:path}")
def get_file(
    file_key: str,
    user: Annotated[User, Depends(get_current_user)],
):
    path = uploads_root() / file_key
    if not path.is_file() or "contracts" not in file_key:
        raise HTTPException(404, "文件不存在")
    media = "application/pdf" if file_key.endswith(".pdf") else "image/png"
    return FileResponse(path, media_type=media)


@router.get("/{contract_id}")
def get_one(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    return contract_store.contract_to_dict(c)


@router.put("/{contract_id}")
def update(
    contract_id: str,
    body: UpdateContractBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        if body.field_values:
            c = contract_store.apply_field_values(db, c, user, body.field_values, rerender=True)
        if body.title is not None or body.body_html is not None or body.template_key is not None or body.parties is not None:
            parties_data = None
            if body.parties is not None:
                parties_data = body.parties.model_dump() if isinstance(body.parties, PartiesBody) else body.parties
            c = contract_store.update_contract(
                db, c, user,
                title=body.title,
                body_html=body.body_html,
                parties=parties_data,
                template_key=body.template_key,
            )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.delete("/{contract_id}")
def remove(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    contract_store.delete_contract(db, c, user)
    return {"success": True}


@router.post("/{contract_id}/render")
def render_from_fields(
    contract_id: str,
    body: FieldValuesBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.apply_field_values(db, c, user, body.field_values, rerender=body.rerender)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.post("/{contract_id}/generate")
def ai_generate(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.ai_generate_contract(db, c, user)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.post("/{contract_id}/draft")
def ai_draft(
    contract_id: str,
    body: DraftBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.ai_draft(db, c, user, body.prompt)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.post("/{contract_id}/review")
def ai_review(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.ai_review(db, c, user)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.post("/{contract_id}/assets")
def upload_asset(
    contract_id: str,
    body: AssetBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        asset = contract_store.upsert_asset(
            db, c, user,
            asset_type=body.asset_type,
            data_url=body.data_url,
            label=body.label,
            placement=body.placement,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, contract_id, user)
    return {"success": True, "asset": contract_store.asset_to_dict(asset), "contract": contract_store.contract_to_dict(loaded)}


@router.put("/{contract_id}/placements")
def set_placements(
    contract_id: str,
    body: PlacementsBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.update_placements(db, c, user, [i.model_dump() for i in body.items])
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.post("/{contract_id}/default-seal")
def default_seal(
    contract_id: str,
    body: SealBody | None = None,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    opts = body or SealBody()
    asset = contract_store.ensure_default_seal(
        db, c, user,
        company_name=opts.company_name,
        seal_text=opts.seal_text,
        style=opts.style,
    )
    loaded = contract_store.get_contract(db, contract_id, user)
    return {"success": True, "asset": contract_store.asset_to_dict(asset) if asset else None, "contract": contract_store.contract_to_dict(loaded)}


@router.get("/{contract_id}/preview.pdf")
def preview_pdf(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    pdf_bytes, _ = contract_store.preview_pdf(c)
    return Response(
        pdf_bytes,
        media_type="application/pdf",
        headers=_pdf_headers("inline", c.title, contract_id),
    )


@router.post("/{contract_id}/sign")
def sign(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    c = contract_store.get_contract(db, contract_id, user)
    if not c:
        raise HTTPException(404, "合同不存在")
    try:
        c = contract_store.sign_contract(db, c, user)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    loaded = contract_store.get_contract(db, c.id, user)
    return {"success": True, "contract": contract_store.contract_to_dict(loaded)}


@router.get("/{contract_id}/signed.pdf")
def download_signed(
    contract_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    c = contract_store.get_contract(db, contract_id, user)
    if not c or not c.signed_pdf_key:
        raise HTTPException(404, "尚未签署或 PDF 不存在")
    try:
        data = read_bytes(c.signed_pdf_key)
    except FileNotFoundError as e:
        raise HTTPException(404, "PDF 文件丢失") from e
    return Response(
        data,
        media_type="application/pdf",
        headers=_pdf_headers("attachment", c.title, contract_id),
    )
