import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def new_id() -> str:
    return str(uuid.uuid4())


class ValidationStatus(str, enum.Enum):
    pending = "pending"
    in_review = "in_review"
    edited = "edited"
    approved = "approved"
    rejected = "rejected"
    merged = "merged"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(255))
    file_name: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(20), default="mixed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OrganizationUnit(Base):
    __tablename__ = "organization_units"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    mandate: Mapped[str] = mapped_column(Text, default="")


class CapabilityDomain(Base):
    __tablename__ = "capability_domains"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)


class CapabilityArea(Base):
    __tablename__ = "capability_areas"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255))
    domain_id: Mapped[str | None] = mapped_column(ForeignKey("capability_domains.id"), nullable=True)


class Capability(Base):
    __tablename__ = "capabilities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255))
    standardized_name: Mapped[str] = mapped_column(String(255))
    domain: Mapped[str] = mapped_column(String(255))
    area: Mapped[str] = mapped_column(String(255))
    parent_capability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sub_capability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_unit_id: Mapped[str | None] = mapped_column(ForeignKey("organization_units.id"), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ValidationStatus] = mapped_column(Enum(ValidationStatus), default=ValidationStatus.approved)
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_standardized_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    naming_audit: Mapped[list | None] = mapped_column(JSON, nullable=True)


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str] = mapped_column(String)
    quote: Mapped[str] = mapped_column(Text)
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.75)


class ExtractedCapability(Base):
    __tablename__ = "extracted_capabilities"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"))
    name: Mapped[str] = mapped_column(String(255))
    standardized_name: Mapped[str] = mapped_column(String(255))
    domain: Mapped[str] = mapped_column(String(255))
    area: Mapped[str] = mapped_column(String(255))
    capability: Mapped[str] = mapped_column(String(255))
    sub_capability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    evidence_quote: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[ValidationStatus] = mapped_column(Enum(ValidationStatus), default=ValidationStatus.pending)
    published_capability_id: Mapped[str | None] = mapped_column(String, nullable=True)
    original_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_standardized_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    original_area: Mapped[str | None] = mapped_column(String(255), nullable=True)
    capability_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    keywords: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ontology_match_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_audit: Mapped[list | None] = mapped_column(JSON, nullable=True)


class Process(Base):
    __tablename__ = "processes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    owner_unit_id: Mapped[str | None] = mapped_column(ForeignKey("organization_units.id"), nullable=True)


class Initiative(Base):
    __tablename__ = "initiatives"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    responsibilities: Mapped[str] = mapped_column(Text, default="")


class KPI(Base):
    __tablename__ = "kpis"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    target: Mapped[str] = mapped_column(String(255), default="")


class EntityRelationship(Base):
    __tablename__ = "entity_relationships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    source_type: Mapped[str] = mapped_column(String(80))
    source_id: Mapped[str] = mapped_column(String)
    relationship: Mapped[str] = mapped_column(String(80))
    target_type: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[str] = mapped_column(String)


class OverlapFinding(Base):
    __tablename__ = "overlap_findings"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    source_type: Mapped[str] = mapped_column(String(80))
    source_id: Mapped[str] = mapped_column(String)
    source_name: Mapped[str] = mapped_column(String(255))
    target_type: Mapped[str] = mapped_column(String(80))
    target_id: Mapped[str] = mapped_column(String)
    target_name: Mapped[str] = mapped_column(String(255))
    overlap_type: Mapped[str] = mapped_column(String(80))
    score: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)
    recommendation: Mapped[str] = mapped_column(String(80))
    evidence: Mapped[dict] = mapped_column(JSON, default=dict)
