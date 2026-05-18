import hashlib
import re
from typing import Iterable

from sqlalchemy.orm import Session

from app.models import Capability, Document, Evidence


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return normalized


def capability_key(name: str | None, domain: str | None, area: str | None) -> tuple[str, str, str]:
    return (normalize_text(name), normalize_text(domain), normalize_text(area))


def content_hash(text: str | None) -> str:
    return hashlib.sha256(normalize_text(text).encode("utf-8")).hexdigest()


def find_duplicate_document(db: Session, text: str) -> Document | None:
    incoming_hash = content_hash(text)
    for document in db.query(Document).all():
        if content_hash(document.content) == incoming_hash:
            return document
    return None


def find_existing_capability(db: Session, standardized_name: str, domain: str, area: str) -> Capability | None:
    incoming_key = capability_key(standardized_name, domain, area)
    for capability in db.query(Capability).all():
        if capability_key(capability.standardized_name, capability.domain, capability.area) == incoming_key:
            return capability
    return None


def find_existing_extracted_for_document(db: Session, document_id: str, standardized_name: str, domain: str, area: str):
    from app.models import ExtractedCapability

    incoming_key = capability_key(standardized_name, domain, area)
    for item in db.query(ExtractedCapability).filter(ExtractedCapability.document_id == document_id).all():
        if capability_key(item.standardized_name, item.domain, item.area) == incoming_key:
            return item
    return None


def evidence_exists(db: Session, document_id: str, entity_id: str, quote: str | None) -> bool:
    normalized_quote = normalize_text(quote)
    for evidence in db.query(Evidence).filter(Evidence.document_id == document_id, Evidence.entity_id == entity_id).all():
        if normalize_text(evidence.quote) == normalized_quote:
            return True
    return False


def dedupe_capabilities(db: Session) -> dict:
    from app.models import EntityRelationship, ExtractedCapability, ValidationStatus

    grouped: dict[tuple[str, str, str], list[Capability]] = {}
    for capability in db.query(Capability).all():
        grouped.setdefault(capability_key(capability.standardized_name, capability.domain, capability.area), []).append(capability)

    removed = 0
    merged_relationships = 0
    merged_evidence = 0
    for capabilities in grouped.values():
        if len(capabilities) < 2:
            continue

        keeper = _choose_keeper(db, capabilities)
        duplicates = [capability for capability in capabilities if capability.id != keeper.id]
        duplicate_ids = [capability.id for capability in duplicates]

        for evidence in db.query(Evidence).filter(Evidence.entity_type == "Capability", Evidence.entity_id.in_(duplicate_ids)).all():
            evidence.entity_id = keeper.id
            merged_evidence += 1

        for extracted in db.query(ExtractedCapability).filter(ExtractedCapability.published_capability_id.in_(duplicate_ids)).all():
            extracted.published_capability_id = keeper.id

        for relationship in db.query(EntityRelationship).filter(EntityRelationship.source_id.in_(duplicate_ids)).all():
            relationship.source_id = keeper.id
            merged_relationships += 1
        for relationship in db.query(EntityRelationship).filter(EntityRelationship.target_id.in_(duplicate_ids)).all():
            relationship.target_id = keeper.id
            merged_relationships += 1

        for duplicate in duplicates:
            db.delete(duplicate)
            removed += 1

    removed_extracted = 0
    extracted_grouped: dict[tuple[str, str, str], list[ExtractedCapability]] = {}
    for item in db.query(ExtractedCapability).all():
        extracted_grouped.setdefault(capability_key(item.standardized_name, item.domain, item.area), []).append(item)

    for items in extracted_grouped.values():
        if len(items) < 2:
            continue
        keeper = sorted(items, key=lambda item: (_extracted_rank(item), item.id))[0]
        for duplicate in items:
            if duplicate.id == keeper.id:
                continue
            if duplicate.status == ValidationStatus.pending:
                duplicate.status = ValidationStatus.rejected
            removed_extracted += 1

    db.commit()
    return {
        "removed_duplicates": removed,
        "merged_evidence": merged_evidence,
        "merged_relationships": merged_relationships,
        "closed_duplicate_extracted": removed_extracted,
    }


def _choose_keeper(db: Session, capabilities: Iterable[Capability]) -> Capability:
    capabilities = list(capabilities)
    evidence_counts = {
        capability.id: db.query(Evidence).filter(Evidence.entity_type == "Capability", Evidence.entity_id == capability.id).count()
        for capability in capabilities
    }
    return sorted(capabilities, key=lambda capability: (-evidence_counts[capability.id], capability.id))[0]


def _extracted_rank(item) -> int:
    from app.models import ValidationStatus

    if item.status == ValidationStatus.approved and item.published_capability_id:
        return 0
    if item.status == ValidationStatus.pending:
        return 1
    if item.status == ValidationStatus.approved:
        return 2
    return 3
