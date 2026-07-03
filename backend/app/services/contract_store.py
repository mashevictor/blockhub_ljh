from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.data.contract_templates import apply_parties, get_template
from app.db.models import ContractAsset, ContractEvent, ContractRecord, User
from app.services.contract_pdf import build_contract_pdf, generate_default_seal
from app.services.file_storage import contract_dir, file_url, save_data_url
from app.services.llm_gateway import chat_complete, llm_configured

DEFAULT_SIGNATURE_PLACEMENT = {"page": 0, "x_pct": 12, "y_pct": 14, "width_pct": 28, "height_pct": 8}
DEFAULT_SEAL_PLACEMENT = {"page": 0, "x_pct": 62, "y_pct": 12, "width_pct": 22, "height_pct": 22}

DRAFT_SYSTEM = (
    "你是企业法务助手。根据用户要求起草中文合同正文，使用简洁专业的法律用语。"
    "输出 HTML 片段（p/h2 标签），不要 markdown，不要包裹 html/body。"
    "保留 {{party_a}} {{party_b}} 占位符若用户未指定具体名称。"
)

REVIEW_SYSTEM = (
    "你是企业法务审阅助手。审阅合同正文，列出风险点与修改建议。"
    "用中文分条输出，格式：【风险等级】问题描述 → 建议。"
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _record_event(db: Session, contract_id: str, actor_id: str | None, action: str, payload: dict | None = None) -> None:
    db.add(ContractEvent(
        contract_id=contract_id,
        actor_id=actor_id,
        action=action,
        payload_json=payload or {},
    ))


def contract_to_dict(c: ContractRecord, *, include_assets: bool = True) -> dict:
    data = {
        "id": c.id,
        "title": c.title,
        "template_key": c.template_key,
        "body_html": c.body_html,
        "parties": c.parties_json or {},
        "status": c.status,
        "review_notes": c.review_notes,
        "signed_pdf_url": file_url(c.signed_pdf_key) if c.signed_pdf_key else "",
        "created_at": c.created_at.isoformat() if c.created_at else "",
        "updated_at": c.updated_at.isoformat() if c.updated_at else "",
        "signed_at": c.signed_at.isoformat() if c.signed_at else None,
    }
    if include_assets:
        data["assets"] = [asset_to_dict(a) for a in (c.assets or [])]
    return data


def asset_to_dict(a: ContractAsset) -> dict:
    return {
        "id": a.id,
        "asset_type": a.asset_type,
        "file_key": a.file_key,
        "file_url": file_url(a.file_key),
        "label": a.label,
        "placement": a.placement_json or {},
    }


def list_contracts(db: Session, user: User) -> list[dict]:
    rows = db.scalars(
        select(ContractRecord)
        .where(ContractRecord.tenant_id == user.tenant_id)
        .order_by(ContractRecord.updated_at.desc())
    ).all()
    return [contract_to_dict(r, include_assets=False) for r in rows]


def get_contract(db: Session, contract_id: str, user: User) -> ContractRecord | None:
    return db.scalar(
        select(ContractRecord)
        .options(selectinload(ContractRecord.assets))
        .where(ContractRecord.id == contract_id, ContractRecord.tenant_id == user.tenant_id)
    )


def create_contract(
    db: Session,
    user: User,
    *,
    title: str,
    template_key: str = "blank",
    parties: dict | None = None,
) -> ContractRecord:
    parties = parties or {"party_a": "", "party_b": ""}
    tpl = get_template(template_key) or get_template("blank")
    body = apply_parties(tpl["body"], {**parties, "title": title}) if tpl else ""
    c = ContractRecord(
        tenant_id=user.tenant_id,
        title=title,
        template_key=template_key,
        body_html=body,
        parties_json=parties,
        status="draft",
        created_by_id=user.id,
    )
    db.add(c)
    db.flush()
    _record_event(db, c.id, user.id, "created", {"template_key": template_key})
    db.commit()
    db.refresh(c)
    return c


def update_contract(
    db: Session,
    contract: ContractRecord,
    user: User,
    *,
    title: str | None = None,
    body_html: str | None = None,
    parties: dict | None = None,
    template_key: str | None = None,
) -> ContractRecord:
    if contract.status == "signed":
        raise ValueError("已签署合同不可编辑")
    if title is not None:
        contract.title = title
    if body_html is not None:
        contract.body_html = body_html
    if parties is not None:
        contract.parties_json = parties
    if template_key is not None:
        contract.template_key = template_key
        tpl = get_template(template_key)
        if tpl:
            parties_merged = {**(contract.parties_json or {}), "title": contract.title or tpl["name"]}
            contract.body_html = apply_parties(tpl["body"], parties_merged)
    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "updated")
    db.commit()
    db.refresh(contract)
    return contract


def ai_draft(db: Session, contract: ContractRecord, user: User, prompt: str) -> ContractRecord:
    if not llm_configured():
        raise ValueError("未配置 LLM API Key，无法智能起草")
    parties = contract.parties_json or {}
    user_msg = (
        f"合同标题：{contract.title}\n"
        f"甲方：{parties.get('party_a', '')}\n"
        f"乙方：{parties.get('party_b', '')}\n"
        f"模板类型：{contract.template_key}\n"
        f"用户要求：{prompt}\n"
        "请输出完整合同正文 HTML。"
    )
    text = chat_complete(
        [{"role": "system", "content": DRAFT_SYSTEM}, {"role": "user", "content": user_msg}],
        temperature=0.5,
    )
    if not text:
        raise ValueError("LLM 起草失败，请稍后重试")
    contract.body_html = text.strip()
    contract.status = "draft"
    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "ai_draft", {"prompt": prompt})
    db.commit()
    db.refresh(contract)
    return contract


def ai_review(db: Session, contract: ContractRecord, user: User) -> ContractRecord:
    if not llm_configured():
        raise ValueError("未配置 LLM API Key，无法法务审阅")
    user_msg = f"合同标题：{contract.title}\n\n正文：\n{contract.body_html}"
    text = chat_complete(
        [{"role": "system", "content": REVIEW_SYSTEM}, {"role": "user", "content": user_msg}],
        temperature=0.3,
    )
    if not text:
        raise ValueError("LLM 审阅失败，请稍后重试")
    contract.review_notes = text.strip()
    contract.status = "reviewing"
    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "ai_review")
    db.commit()
    db.refresh(contract)
    return contract


def upsert_asset(
    db: Session,
    contract: ContractRecord,
    user: User,
    *,
    asset_type: str,
    data_url: str,
    label: str = "",
    placement: dict | None = None,
) -> ContractAsset:
    if contract.status == "signed":
        raise ValueError("已签署合同不可修改签章")
    if asset_type not in ("signature", "seal"):
        raise ValueError("asset_type 须为 signature 或 seal")

    default_placement = DEFAULT_SIGNATURE_PLACEMENT if asset_type == "signature" else DEFAULT_SEAL_PLACEMENT
    placement = {**default_placement, **(placement or {})}

    existing = next((a for a in contract.assets if a.asset_type == asset_type), None)
    fname = f"{asset_type}.png"
    dest = contract_dir(contract.id) / fname
    save_data_url(data_url, dest)
    file_key = f"contracts/{contract.id}/{fname}"

    if existing:
        existing.file_key = file_key
        existing.label = label or existing.label
        existing.placement_json = placement
        asset = existing
    else:
        asset = ContractAsset(
            contract_id=contract.id,
            asset_type=asset_type,
            file_key=file_key,
            label=label or ("手写签名" if asset_type == "signature" else "电子章"),
            placement_json=placement,
        )
        db.add(asset)

    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "asset_upload", {"asset_type": asset_type})
    db.commit()
    db.refresh(contract)
    db.refresh(asset)
    return asset


def ensure_default_seal(db: Session, contract: ContractRecord, user: User) -> ContractAsset | None:
    if any(a.asset_type == "seal" for a in contract.assets):
        return next(a for a in contract.assets if a.asset_type == "seal")
    parties = contract.parties_json or {}
    label = parties.get("party_a", "")[:6] + "章" if parties.get("party_a") else "合同专用章"
    file_key = generate_default_seal(label, contract.id)
    asset = ContractAsset(
        contract_id=contract.id,
        asset_type="seal",
        file_key=file_key,
        label=label,
        placement_json=DEFAULT_SEAL_PLACEMENT,
    )
    db.add(asset)
    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "default_seal")
    db.commit()
    db.refresh(asset)
    return asset


def update_placements(db: Session, contract: ContractRecord, user: User, placements: list[dict]) -> ContractRecord:
    if contract.status == "signed":
        raise ValueError("已签署合同不可修改")
    by_id = {a.id: a for a in contract.assets}
    for item in placements:
        aid = item.get("id")
        if aid and aid in by_id:
            by_id[aid].placement_json = {**by_id[aid].placement_json, **(item.get("placement") or {})}
    contract.updated_at = _now()
    _record_event(db, contract.id, user.id, "placement_update")
    db.commit()
    db.refresh(contract)
    return contract


def preview_pdf(contract: ContractRecord) -> tuple[bytes, str]:
    assets = [asset_to_dict(a) for a in contract.assets]
    return build_contract_pdf(
        contract_id=contract.id,
        title=contract.title,
        body_html=contract.body_html,
        parties=contract.parties_json or {},
        assets=assets,
        signed=False,
    )


def sign_contract(db: Session, contract: ContractRecord, user: User) -> ContractRecord:
    if contract.status == "signed":
        return contract
    if not any(a.asset_type == "signature" for a in contract.assets):
        raise ValueError("请先添加手写签名")
    if not any(a.asset_type == "seal" for a in contract.assets):
        ensure_default_seal(db, contract, user)

    loaded = get_contract(db, contract.id, user)
    if not loaded:
        raise ValueError("合同不存在")
    assets = [asset_to_dict(a) for a in loaded.assets]
    _, rel = build_contract_pdf(
        contract_id=loaded.id,
        title=loaded.title,
        body_html=loaded.body_html,
        parties=loaded.parties_json or {},
        assets=assets,
        signed=True,
    )
    loaded.signed_pdf_key = rel
    loaded.status = "signed"
    loaded.signed_at = _now()
    loaded.updated_at = _now()
    _record_event(db, loaded.id, user.id, "signed", {"pdf_key": rel})
    db.commit()
    db.refresh(loaded)
    return loaded


def delete_contract(db: Session, contract: ContractRecord, user: User) -> None:
    _record_event(db, contract.id, user.id, "deleted")
    db.delete(contract)
    db.commit()
