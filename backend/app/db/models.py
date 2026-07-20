from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from pgvector.sqlalchemy import Vector

from app.db.base import Base


def _uuid() -> str:
    return str(uuid4())


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    config_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list[User]] = relationship(back_populates="tenant")
    apps: Mapped[list[AppRecord]] = relationship(back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="employee")
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped[Tenant] = relationship(back_populates="users")
    publish_records: Mapped[list[PublishRecord]] = relationship(back_populates="user")


class AppRecord(Base):
    __tablename__ = "apps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    public_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    icon_url: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    primary_color: Mapped[str] = mapped_column(String(16), nullable=False, default="#4338ca")
    industry_key: Mapped[str] = mapped_column(String(64), nullable=False, default="office")
    scenarios: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    capability_keys: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    modules: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    schema_url: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="published")
    audience: Mapped[str] = mapped_column(String(32), nullable=False, default="both")
    deliver: Mapped[str] = mapped_column(String(32), nullable=False, default="both")
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="industry")
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    contact_phone: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    plaza_visibility: Mapped[str] = mapped_column(String(32), nullable=False, default="none")
    plaza_dept_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    plaza_published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    page_schema: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    build_manifest: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # 对话改页 / Runtime 写回：乐观锁版本（多人协作）
    schema_rev: Mapped[int] = mapped_column(nullable=False, default=1)
    schema_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    schema_updated_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    schema_editor_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped[Tenant] = relationship(back_populates="apps")
    publish_records: Mapped[list[PublishRecord]] = relationship(back_populates="app")
    schema_revisions: Mapped[list["AppSchemaRevision"]] = relationship(back_populates="app")
    schema_change_requests: Mapped[list["AppSchemaChangeRequest"]] = relationship(
        back_populates="app"
    )


class AppSchemaRevision(Base):
    """page_schema 每次成功写回的快照，支持历史列表与回滚。"""

    __tablename__ = "app_schema_revisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    app_id: Mapped[str] = mapped_column(ForeignKey("apps.id"), nullable=False, index=True)
    public_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    rev: Mapped[int] = mapped_column(nullable=False)
    page_schema: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    capability_keys: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    summary: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="compose")
    editor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    editor_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    app: Mapped[AppRecord] = relationship(back_populates="schema_revisions")


class AppSchemaChangeRequest(Base):
    """对话改页：个人草稿 → 提交审批 → 管理员通过后才写入正式 page_schema。"""

    __tablename__ = "app_schema_change_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    app_id: Mapped[str] = mapped_column(ForeignKey("apps.id"), nullable=False, index=True)
    public_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    # draft | pending | approved | rejected | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", index=True)
    base_rev: Mapped[int] = mapped_column(nullable=False, default=1)
    page_schema: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    capability_keys: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    summary: Mapped[str] = mapped_column(String(240), nullable=False, default="")
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewer_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    review_comment: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    published_rev: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    app: Mapped[AppRecord] = relationship(back_populates="schema_change_requests")


class PublishRecord(Base):
    __tablename__ = "publish_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    app_id: Mapped[str] = mapped_column(ForeignKey("apps.id"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(32), nullable=False, default="publish")
    payload: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    app: Mapped[AppRecord] = relationship(back_populates="publish_records")
    user: Mapped[User | None] = relationship(back_populates="publish_records")


class CatalogAgent(Base):
    __tablename__ = "catalog_agents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    icon: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    color: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    pipeline: Mapped[str] = mapped_column(Text, nullable=False, default="")
    capability_keys: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    office_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    industry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CatalogCapability(Base):
    __tablename__ = "catalog_capabilities"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    widget: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    agent_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)


class CatalogOfficeGroup(Base):
    __tablename__ = "catalog_office_groups"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    icon: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    agent: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    items: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CatalogIndustryPack(Base):
    __tablename__ = "catalog_industry_packs"

    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    icon: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    color: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    enrichment_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    enriched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    enrichment_source: Mapped[str] = mapped_column(String(32), nullable=False, default="")


class CatalogOfficeScenario(Base):
    __tablename__ = "catalog_office_scenarios"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    category_icon: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    agent: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    auto_generate: Mapped[str] = mapped_column(Text, nullable=False, default="")


class CatalogIndustryScenario(Base):
    __tablename__ = "catalog_industry_scenarios"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    pack_key: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    pack_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    pack_icon: Mapped[str] = mapped_column(String(16), nullable=False, default="")
    pack_color: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    problem: Mapped[str] = mapped_column(Text, nullable=False, default="")
    pages: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    standard: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    agent: Mapped[str] = mapped_column(String(64), nullable=False, default="")


class CatalogHeroPreset(Base):
    __tablename__ = "catalog_hero_presets"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    hint: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    weight: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    color: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    picks: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    flow_lines: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class CatalogChipTemplate(Base):
    __tablename__ = "catalog_chip_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    text: Mapped[str] = mapped_column(String(200), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    picks: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    scenario_names: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ContractRecord(Base):
    __tablename__ = "contracts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    template_key: Mapped[str] = mapped_column(String(64), nullable=False, default="blank")
    body_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    parties_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft", index=True)
    review_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    signed_pdf_key: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assets: Mapped[list[ContractAsset]] = relationship(back_populates="contract", cascade="all, delete-orphan")
    events: Mapped[list[ContractEvent]] = relationship(back_populates="contract", cascade="all, delete-orphan")


class ContractAsset(Base):
    __tablename__ = "contract_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    contract_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(32), nullable=False)
    file_key: Mapped[str] = mapped_column(String(512), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    placement_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract: Mapped[ContractRecord] = relationship(back_populates="assets")


class ContractEvent(Base):
    __tablename__ = "contract_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    contract_id: Mapped[str] = mapped_column(ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    contract: Mapped[ContractRecord] = relationship(back_populates="events")


class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="empty")
    doc_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    documents: Mapped[list[KbDocument]] = relationship(back_populates="knowledge_base", cascade="all, delete-orphan")


class KbDocument(Base):
    __tablename__ = "kb_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    kb_id: Mapped[str] = mapped_column(ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    file_key: Mapped[str] = mapped_column(String(512), nullable=False)
    storage: Mapped[str] = mapped_column(String(16), nullable=False, default="local")
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False, default="application/octet-stream")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    knowledge_base: Mapped[KnowledgeBase] = relationship(back_populates="documents")
    chunks: Mapped[list[KbDocumentChunk]] = relationship(back_populates="document", cascade="all, delete-orphan")


class KbDocumentChunk(Base):
    __tablename__ = "kb_document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(
        ForeignKey("kb_documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kb_id: Mapped[str] = mapped_column(ForeignKey("knowledge_bases.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    document: Mapped[KbDocument] = relationship(back_populates="chunks")


class ApprovalRecord(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    applicant_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    approval_type: Mapped[str] = mapped_column(String(32), nullable=False, default="general")
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    approver_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    applicant: Mapped[User] = relationship(foreign_keys=[applicant_id])
    approver: Mapped[User | None] = relationship(foreign_keys=[approver_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_key: Mapped[str] = mapped_column(String(128), nullable=False, default="default")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    messages: Mapped[list[ChatMessage]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations_json: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class CustomCapability(Base):
    __tablename__ = "custom_capabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="自定义")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    keywords: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    proposed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlazaFeedLike(Base):
    __tablename__ = "plaza_feed_likes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    app_public_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    user_key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlazaFeedComment(Base):
    __tablename__ = "plaza_feed_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    app_public_id: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    author_name: Mapped[str] = mapped_column(String(120), nullable=False, default="访客")
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    recipient_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="system")
    reference_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IntegrationConnector(Base):
    __tablename__ = "integration_connectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    connector_type: Mapped[str] = mapped_column(String(64), nullable=False, default="webhook")
    config_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)
    last_sync_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class EtlJob(Base):
    __tablename__ = "etl_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    connector_id: Mapped[str] = mapped_column(
        ForeignKey("integration_connectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    trigger: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    result_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    ran_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IntegrationEvent(Base):
    """CRM/Webhook 入站事件（P4-I1，幂等 external_id）。"""

    __tablename__ = "integration_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    connector_id: Mapped[str] = mapped_column(
        ForeignKey("integration_connectors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, default="crm.upsert", index=True)
    external_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    resource: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class DemoBooking(Base):
    __tablename__ = "demo_bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    contact_phone: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    salutation: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    company_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="home")
    share_token: Mapped[str] = mapped_column(String(32), nullable=False, default="", index=True)
    agent_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    email_sent: Mapped[bool] = mapped_column(nullable=False, default=False)
    sms_sent: Mapped[bool] = mapped_column(nullable=False, default=False)
    delivery_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeviceRepairTicket(Base):
    """CapShip · device_repair 能力包业务表（真实工单，非 mock）。"""

    __tablename__ = "device_repair_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    assignee_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    ticket_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    asset_code: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    fault: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)
    comment: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])
    assignee: Mapped[User | None] = relationship(foreign_keys=[assignee_id])


class QualityInspectRecord(Base):
    """CapShip · quality_inspect 质检 / SOP 记录。"""

    __tablename__ = "quality_inspect_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    product_code: Mapped[str] = mapped_column(String(120), nullable=False)
    process_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    result: Mapped[str] = mapped_column(String(32), nullable=False, default="pass")  # pass | fail
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)  # open | closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class InventoryCountRecord(Base):
    """CapShip · inventory_count 库存盘点。"""

    __tablename__ = "inventory_count_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    sku_code: Mapped[str] = mapped_column(String(120), nullable=False)
    qty: Mapped[int] = mapped_column(nullable=False, default=0)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)  # pending | confirmed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MemberLoyaltyRecord(Base):
    """CapShip · member_loyalty 旧触达单（保留兼容）。"""

    __tablename__ = "member_loyalty_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    member_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    member_phone: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    campaign_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    points: Mapped[int] = mapped_column(nullable=False, default=0)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)  # pending | sent
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MemberLoyaltyMember(Base):
    """CapShip · member_loyalty 会员档案。"""

    __tablename__ = "member_loyalty_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    phone: Mapped[str] = mapped_column(String(32), nullable=False, default="", index=True)
    points: Mapped[int] = mapped_column(nullable=False, default=0)
    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)  # active | sleeping
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MemberLoyaltyCampaign(Base):
    """CapShip · member_loyalty 营销活动。"""

    __tablename__ = "member_loyalty_campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    campaign_type: Mapped[str] = mapped_column(String(32), nullable=False, default="points")  # points | redeem | wake
    rule_text: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    points_delta: Mapped[int] = mapped_column(nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)  # active | ended
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MemberLoyaltyPointTxn(Base):
    """CapShip · member_loyalty 积分流水。"""

    __tablename__ = "member_loyalty_point_txns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("member_loyalty_members.id"), nullable=False, index=True)
    campaign_id: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    txn_type: Mapped[str] = mapped_column(String(32), nullable=False, default="earn")  # earn | redeem
    points: Mapped[int] = mapped_column(nullable=False, default=0)
    reason: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MemberLoyaltyOutreach(Base):
    """CapShip · member_loyalty 定向触达。"""

    __tablename__ = "member_loyalty_outreaches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    member_id: Mapped[str] = mapped_column(ForeignKey("member_loyalty_members.id"), nullable=False, index=True)
    campaign_id: Mapped[str] = mapped_column(String(36), nullable=False, default="")
    message: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)  # pending | sent
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MedTriageRecord(Base):
    """CapShip · med_triage 医疗导诊 / 预问诊。"""

    __tablename__ = "med_triage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    patient_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    symptoms: Mapped[str] = mapped_column(Text, nullable=False, default="")
    suggested_dept: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    urgency: Mapped[str] = mapped_column(String(32), nullable=False, default="normal")  # low | normal | high
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class NurseShiftRecord(Base):
    """CapShip · nurse_shift 护士排班 / 调班。"""

    __tablename__ = "nurse_shift_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    nurse_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    shift_date: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    from_shift: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    to_shift: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    reason: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", index=True)  # pending | approved | rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class GameSupportRecord(Base):
    """CapShip · game_support 玩家 FAQ / 客服工单。"""

    __tablename__ = "game_support_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class SchoolNoticeRecord(Base):
    """CapShip · school_notice 家校通知。"""

    __tablename__ = "school_notice_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    audience: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="notice")  # notice | signup | message
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="published", index=True)  # published | acked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class HomeworkQaRecord(Base):
    """CapShip · homework_qa 作业答疑。"""

    __tablename__ = "homework_qa_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    student_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    subject: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="homework")  # homework | qa | wrongbook
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)  # open | reviewed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class PropertyRepairRecord(Base):
    """CapShip · property_repair 物业报修。"""

    __tablename__ = "property_repair_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    asset_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    fault: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)  # open | dispatched | done
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class SitePatrolRecord(Base):
    """CapShip · site_patrol 巡检打卡。"""

    __tablename__ = "site_patrol_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    site_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    checkpoint: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    result: Mapped[str] = mapped_column(String(32), nullable=False, default="ok")  # ok | issue
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)  # open | closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class ClassScheduleRecord(Base):
    """CapShip · class_schedule 课表查询。"""

    __tablename__ = "class_schedule_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    schedule_date: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    time_slot: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="course")  # course | exam | classroom
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="published", index=True)  # published | archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class HotelBookingRecord(Base):
    """CapShip · hotel_booking 酒店预订。"""

    __tablename__ = "hotel_booking_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    guest_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    room_type: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    check_in: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    check_out: Mapped[str] = mapped_column(String(10), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="booked", index=True)  # booked | checked_in | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class StudyCoachCourse(Base):
    """CapShip · study_coach 课本课程（含 LLM 学习大纲）。"""

    __tablename__ = "study_coach_courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    textbook_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    subject: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    grade: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="student")  # student | parent | teacher
    student_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    catalog_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    plan_json: Mapped[list[Any]] = mapped_column(JSON, nullable=False, default=list)
    plan_source: Mapped[str] = mapped_column(String(32), nullable=False, default="fallback")  # deepseek | fallback
    progress_pct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active", index=True)  # active | archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class StudyCoachDrill(Base):
    """CapShip · study_coach 复习 / 家默 / 考试记录。"""

    __tablename__ = "study_coach_drills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    course_id: Mapped[str] = mapped_column(ForeignKey("study_coach_courses.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    unit_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    kind: Mapped[str] = mapped_column(String(32), nullable=False, default="review")  # review | dictation | exam
    score: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    result: Mapped[str] = mapped_column(String(32), nullable=False, default="")  # pass | fail | partial | ""
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="done", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])

class DeliveryOrderRecord(Base):
    """CapShip · delivery_order 外卖配送。"""

    __tablename__ = "delivery_order_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    pickup: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    dropoff: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    rider_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class HouseViewingRecord(Base):
    """CapShip · house_viewing 看房签约。"""

    __tablename__ = "house_viewing_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    client_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    property_addr: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    schedule_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class CampaignOpsRecord(Base):
    """CapShip · campaign_ops 活动运营。"""

    __tablename__ = "campaign_ops_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    channel: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    metric: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class FitnessCheckinRecord(Base):
    """CapShip · fitness_checkin 健身打卡。"""

    __tablename__ = "fitness_checkin_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    member_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    class_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    schedule_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class TravelPlanRecord(Base):
    """CapShip · travel_plan 旅行攻略。"""

    __tablename__ = "travel_plan_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    destination: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    days: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])

class WeddingPlanRecord(Base):
    """CapShip · wedding_plan 婚礼筹备。"""

    __tablename__ = "wedding_plan_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    vendor: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    budget: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class DecoMaterialRecord(Base):
    """CapShip · deco_material 装修选材。"""

    __tablename__ = "deco_material_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    material_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    budget: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class PetClinicRecord(Base):
    """CapShip · pet_clinic 宠物问诊。"""

    __tablename__ = "pet_clinic_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    pet_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    symptom: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    schedule_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class GovServiceRecord(Base):
    """CapShip · gov_service 政务办事。"""

    __tablename__ = "gov_service_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    dept: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    ticket_no: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class LegalCaseRecord(Base):
    """CapShip · legal_case 法务合同。"""

    __tablename__ = "legal_case_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    party: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    deadline: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])

class LeaveRequestRecord(Base):
    """CapShip · leave_request 请假审批。"""

    __tablename__ = "leave_request_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    applicant: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    start_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    end_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class ExpenseClaimRecord(Base):
    """CapShip · expense_claim 报销记账。"""

    __tablename__ = "expense_claim_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    amount: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    invoice_no: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class PolicyQaRecord(Base):
    """CapShip · policy_qa 制度问答。"""

    __tablename__ = "policy_qa_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    dept: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    answer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class HireOnboardRecord(Base):
    """CapShip · hire_onboard 招聘入职。"""

    __tablename__ = "hire_onboard_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    candidate: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    stage: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    owner: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class SalesLeadRecord(Base):
    """CapShip · sales_lead 销售线索（获客方法 + 漏斗状态）。"""

    __tablename__ = "sales_lead_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    customer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    amount: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    owner: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pool_status: Mapped[str] = mapped_column(String(32), nullable=False, default="private", index=True)
    owner_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    assignee_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    referrer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class DealEvidenceRecord(Base):
    """CapShip · deal_evidence 成交证据（晋级门禁）。"""

    __tablename__ = "deal_evidence_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), nullable=False, default="", index=True)
    customer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    evidence_type: Mapped[str] = mapped_column(String(64), nullable=False, default="other")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_stage: Mapped[str] = mapped_column(String(32), nullable=False, default="following")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class KillPipelineRecord(Base):
    """CapShip · kill_pipeline 杀单工作台。"""

    __tablename__ = "kill_pipeline_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    lead_id: Mapped[str] = mapped_column(String(36), nullable=False, default="", index=True)
    customer: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    kill_reason: Mapped[str] = mapped_column(String(64), nullable=False, default="other")
    learning: Mapped[str] = mapped_column(Text, nullable=False, default="")
    amount_lost: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    competitor: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="killed", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class QuoteContractRecord(Base):
    """CapShip · quote_contract 报价合同。"""

    __tablename__ = "quote_contract_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    customer: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    amount: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class OpsKpiRecord(Base):
    """CapShip · ops_kpi 经营看板。"""

    __tablename__ = "ops_kpi_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    period: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    value: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class MfgOpsRecord(Base):
    """CapShip · 制造场景专用记录（OEE/领料/保养/排班/能耗/培训）。"""

    __tablename__ = "mfg_ops_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    kind: Mapped[str] = mapped_column(String(40), nullable=False, default="", index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_a: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_b: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_c: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    field_d: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class ItTicketRecord(Base):
    """CapShip · it_ticket IT 报障工单（真表，非 Integration 演示）。"""

    __tablename__ = "it_ticket_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    ticket_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="hardware")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    urgency: Mapped[str] = mapped_column(String(32), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    assignee_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])

class MeetingBookingRecord(Base):
    """CapShip · meeting_booking 会议室预约真表。"""

    __tablename__ = "meeting_booking_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    room_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    start_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    end_at: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    attendees: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])


class AssetManageRecord(Base):
    """CapShip · asset_manage 资产领用/盘点真表。"""

    __tablename__ = "asset_manage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), nullable=False, index=True)
    app_public_id: Mapped[str] = mapped_column(String(64), nullable=False, default="", index=True)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    record_no: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="borrow")
    asset_name: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    asset_code: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    quantity: Mapped[str] = mapped_column(String(32), nullable=False, default="1")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    reporter: Mapped[User] = relationship(foreign_keys=[reporter_id])
