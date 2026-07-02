from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.db.base import Base


def _uuid() -> str:
    return str(uuid4())


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
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
    created_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    tenant: Mapped[Tenant] = relationship(back_populates="apps")
    publish_records: Mapped[list[PublishRecord]] = relationship(back_populates="app")


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
