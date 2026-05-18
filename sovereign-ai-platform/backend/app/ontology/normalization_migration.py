from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.dedupe import dedupe_capabilities
from app.models import Capability, ExtractedCapability, ValidationStatus
from app.ontology.library import find_capability_by_standard_name
from app.ontology.naming import infer_capability_domain_area, standardize_capability_names


MIGRATION_NAME = "capability_naming_normalization_v1"
MIGRATION_STATUSES = {
    ValidationStatus.pending,
    ValidationStatus.in_review,
    ValidationStatus.edited,
    ValidationStatus.approved,
}


def normalize_existing_capabilities(db: Session) -> dict:
    ensure_normalization_schema(db)
    started_at = datetime.utcnow().isoformat()
    extracted_items = db.query(ExtractedCapability).filter(ExtractedCapability.status.in_(list(MIGRATION_STATUSES))).all()
    published_capabilities = db.query(Capability).all()

    normalized_extracted = 0
    normalized_published = 0
    samples: list[dict] = []

    for item in extracted_items:
        changed, sample = _normalize_extracted(item, started_at)
        if changed:
            normalized_extracted += 1
            if len(samples) < 10:
                samples.append(sample)

    for capability in published_capabilities:
        changed, sample = _normalize_published(capability, started_at)
        if changed:
            normalized_published += 1
            if len(samples) < 10:
                samples.append(sample)

    db.commit()
    dedupe_result = dedupe_capabilities(db)
    return {
        "migration": MIGRATION_NAME,
        "migration_timestamp": started_at,
        "processed_extracted": len(extracted_items),
        "processed_published": len(published_capabilities),
        "normalized_extracted": normalized_extracted,
        "normalized_published": normalized_published,
        "dedupe": dedupe_result,
        "samples": samples,
    }


def ensure_normalization_schema(db: Session) -> None:
    _add_column_if_missing(db, "capabilities", "description", "TEXT")
    _add_column_if_missing(db, "capabilities", "original_name", "VARCHAR(255)")
    _add_column_if_missing(db, "capabilities", "original_standardized_name", "VARCHAR(255)")
    _add_column_if_missing(db, "capabilities", "original_domain", "VARCHAR(255)")
    _add_column_if_missing(db, "capabilities", "original_area", "VARCHAR(255)")
    _add_column_if_missing(db, "capabilities", "naming_audit", "JSON")
    _add_column_if_missing(db, "extracted_capabilities", "original_name", "VARCHAR(255)")
    _add_column_if_missing(db, "extracted_capabilities", "original_standardized_name", "VARCHAR(255)")
    _add_column_if_missing(db, "extracted_capabilities", "original_domain", "VARCHAR(255)")
    _add_column_if_missing(db, "extracted_capabilities", "original_area", "VARCHAR(255)")
    _add_column_if_missing(db, "extracted_capabilities", "capability_type", "VARCHAR(120)")
    _add_column_if_missing(db, "extracted_capabilities", "description", "TEXT")
    _add_column_if_missing(db, "extracted_capabilities", "keywords", "JSON")
    _add_column_if_missing(db, "extracted_capabilities", "ontology_match_type", "VARCHAR(80)")
    _add_column_if_missing(db, "extracted_capabilities", "reviewer_notes", "TEXT")
    _add_column_if_missing(db, "extracted_capabilities", "review_audit", "JSON")
    db.commit()


def _add_column_if_missing(db: Session, table: str, column: str, column_type: str) -> None:
    dialect = db.bind.dialect.name if db.bind else ""
    if dialect == "sqlite":
        existing = {row[1] for row in db.execute(text(f"PRAGMA table_info({table})")).fetchall()}
        if column not in existing:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"))
        return
    db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {column_type}"))


def _normalize_extracted(item: ExtractedCapability, timestamp: str) -> tuple[bool, dict]:
    before = _snapshot(item)
    _preserve_extracted_originals(item)
    name, standardized_name, domain, area = _normalized_values(
        item.name,
        item.standardized_name,
        item.domain,
        item.area,
        f"{item.original_name or ''} {item.evidence_quote or ''} {item.description or ''}",
    )
    item.name = name
    item.standardized_name = standardized_name
    item.capability = standardized_name
    item.domain = domain
    item.area = area
    after = _snapshot(item)
    changed = before != after
    if changed:
        audit = item.review_audit or []
        audit.append({"at": timestamp, "action": MIGRATION_NAME, "original_name": before["name"], "normalized_name": after["name"], "before": before, "after": after})
        item.review_audit = audit
    return changed, {"type": "extracted", "id": item.id, "before": before, "after": after}


def _normalize_published(capability: Capability, timestamp: str) -> tuple[bool, dict]:
    before = _snapshot(capability)
    _preserve_published_originals(capability)
    name, standardized_name, domain, area = _normalized_values(
        capability.name,
        capability.standardized_name,
        capability.domain,
        capability.area,
        f"{capability.original_name or ''} {capability.description or ''} {capability.parent_capability or ''} {capability.sub_capability or ''}",
    )
    capability.name = name
    capability.standardized_name = standardized_name
    capability.parent_capability = standardized_name
    capability.domain = domain
    capability.area = area
    after = _snapshot(capability)
    changed = before != after
    if changed:
        audit = capability.naming_audit or []
        audit.append({"at": timestamp, "action": MIGRATION_NAME, "original_name": before["name"], "normalized_name": after["name"], "before": before, "after": after})
        capability.naming_audit = audit
    return changed, {"type": "published", "id": capability.id, "before": before, "after": after}


def _normalized_values(name: str | None, standardized_name: str | None, domain: str | None, area: str | None, context: str) -> tuple[str, str, str, str]:
    suggested_name, suggested_standard = standardize_capability_names(name or standardized_name or "", standardized_name)
    ontology_item = find_capability_by_standard_name(suggested_standard, domain, area) or find_capability_by_standard_name(suggested_standard)
    if ontology_item:
        return ontology_item.name_ar, ontology_item.name_en, ontology_item.domain_en, ontology_item.area_en
    inferred_domain, inferred_area = infer_capability_domain_area(
        f"{name or ''} {standardized_name or ''} {suggested_name} {suggested_standard} {domain or ''} {area or ''} {context}",
        domain,
        area,
    )
    if _is_literal_enterprise_name(suggested_name, suggested_standard):
        domain_name, domain_standard = _domain_level_capability(inferred_domain)
        return domain_name, domain_standard, inferred_domain, inferred_area
    return suggested_name, suggested_standard, inferred_domain, inferred_area


def _is_literal_enterprise_name(*values: str | None) -> bool:
    normalized = {" ".join((value or "").casefold().strip().split()) for value in values}
    return bool(normalized & {"الإدارة المؤسسية", "الادارة المؤسسية", "الإدارة", "enterprise management", "business management"})


def _domain_level_capability(domain: str) -> tuple[str, str]:
    mapping = {
        "Human Resources": ("إدارة الموارد البشرية", "HR Management"),
        "Media and Communications": ("إدارة الاتصال والإعلام", "Media and Communications Management"),
        "Procurement": ("إدارة المشتريات", "Procurement Management"),
        "Finance": ("الإدارة المالية", "Financial Management"),
        "Information Technology": ("إدارة التقنية", "Technology Management"),
        "Operations": ("إدارة العمليات", "Operations Management"),
    }
    return mapping.get(domain, ("إدارة الأعمال", "Business Management"))


def _preserve_extracted_originals(item: ExtractedCapability) -> None:
    if not item.original_name:
        item.original_name = item.name
    if not item.original_standardized_name:
        item.original_standardized_name = item.standardized_name
    if not item.original_domain:
        item.original_domain = item.domain
    if not item.original_area:
        item.original_area = item.area


def _preserve_published_originals(capability: Capability) -> None:
    if not capability.original_name:
        capability.original_name = capability.name
    if not capability.original_standardized_name:
        capability.original_standardized_name = capability.standardized_name
    if not capability.original_domain:
        capability.original_domain = capability.domain
    if not capability.original_area:
        capability.original_area = capability.area


def _snapshot(item) -> dict:
    return {
        "name": item.name,
        "standardized_name": item.standardized_name,
        "domain": item.domain,
        "area": item.area,
    }
