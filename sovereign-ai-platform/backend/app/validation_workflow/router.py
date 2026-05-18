from datetime import datetime
from difflib import SequenceMatcher
from pathlib import Path
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dedupe import dedupe_capabilities, evidence_exists, find_existing_capability
from app.graph_builder.service import publish_capability_to_graph
from app.models import Capability, Document, Evidence, ExtractedCapability, ValidationStatus
from app.ontology.library import find_capability_by_standard_name
from app.ontology.naming import standardize_capability_names
from app.schemas import ExtractedCapabilityUpdate, MergeRequest

router = APIRouter(prefix="/api/capabilities", tags=["validation_workflow"])


ACTIVE_REVIEW_STATUSES = {ValidationStatus.pending, ValidationStatus.in_review, ValidationStatus.edited}


@router.get("/extracted")
def list_extracted(document_id: str | None = None, latest: bool = False, status: str | None = None, db: Session = Depends(get_db)):
    query = db.query(ExtractedCapability)
    if latest and not document_id:
        latest_doc = db.query(Document).order_by(Document.created_at.desc()).first()
        document_id = latest_doc.id if latest_doc else None
    if document_id:
        query = query.filter(ExtractedCapability.document_id == document_id)
    if status:
        if status == "pending":
            query = query.filter(ExtractedCapability.status.in_(list(ACTIVE_REVIEW_STATUSES)))
        else:
            query = query.filter(ExtractedCapability.status == ValidationStatus(status))
    items = _dedupe_extracted_list(query.all())
    document_ids = {item.document_id for item in items}
    documents = {doc.id: doc for doc in db.query(Document).filter(Document.id.in_(document_ids)).all()} if document_ids else {}
    return [_serialize_extracted(item, documents.get(item.document_id)) for item in items]


@router.patch("/extracted/{item_id}")
def edit_extracted(item_id: str, payload: ExtractedCapabilityUpdate, db: Session = Depends(get_db)):
    item = db.get(ExtractedCapability, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Extracted capability not found")
    _preserve_original_output(item)
    before = _curation_snapshot(item)
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes or "standardized_name" in changes:
        suggested_name, suggested_standard = standardize_capability_names(
            changes.get("name") or item.name,
            changes.get("standardized_name") or item.standardized_name,
        )
        changes["name"] = suggested_name
        changes["standardized_name"] = suggested_standard
        changes["capability"] = suggested_standard
    for key, value in changes.items():
        setattr(item, key, value)
    if item.status in ACTIVE_REVIEW_STATUSES:
        item.status = ValidationStatus.edited
    if item.published_capability_id:
        capability = db.get(Capability, item.published_capability_id)
        if capability:
            capability.name = item.name
            capability.standardized_name = item.standardized_name
            capability.domain = item.domain
            capability.area = item.area
            capability.parent_capability = item.capability
            capability.sub_capability = item.sub_capability
            capability.description = item.description
    audit = item.review_audit or []
    audit.append({"at": datetime.utcnow().isoformat(), "action": "save_draft", "before": before, "changes": changes})
    item.review_audit = audit
    db.commit()
    db.refresh(item)
    return _serialize_extracted(item, db.get(Document, item.document_id))


@router.post("/extracted/{item_id}/approve")
def approve_extracted(item_id: str, db: Session = Depends(get_db)):
    item = db.get(ExtractedCapability, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Extracted capability not found")
    if not item.evidence_quote:
        raise HTTPException(status_code=422, detail="Capabilities require source evidence before approval")
    _normalize_item_names(item)
    capability = find_existing_capability(db, item.standardized_name, item.domain, item.area)
    created = capability is None
    if capability is None:
        capability = Capability(
            name=item.name,
            standardized_name=item.standardized_name,
            domain=item.domain,
            area=item.area,
            parent_capability=item.capability,
            sub_capability=item.sub_capability,
            description=item.description,
            status=ValidationStatus.approved,
        )
        db.add(capability)
        db.flush()

    evidence = None
    if not evidence_exists(db, item.document_id, capability.id, item.evidence_quote):
        evidence = Evidence(
            document_id=item.document_id,
            entity_type="Capability",
            entity_id=capability.id,
            quote=item.evidence_quote,
            confidence=item.confidence,
        )
        db.add(evidence)
    item.status = ValidationStatus.approved
    item.published_capability_id = capability.id
    db.commit()
    if created and evidence:
        publish_capability_to_graph(capability, evidence)
    return {"capability_id": capability.id, "status": "approved", "already_exists": not created}


@router.post("/extracted/{item_id}/reject")
def reject_extracted(item_id: str, db: Session = Depends(get_db)):
    item = db.get(ExtractedCapability, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Extracted capability not found")
    item.status = ValidationStatus.rejected
    db.commit()
    return {"id": item.id, "status": "rejected"}


@router.post("/merge")
def merge_extracted(payload: MergeRequest, db: Session = Depends(get_db)):
    items = db.query(ExtractedCapability).filter(ExtractedCapability.id.in_(payload.source_ids)).all()
    if not items:
        raise HTTPException(status_code=404, detail="No extracted capabilities found")
    base = items[0]
    suggested_name, suggested_standard = standardize_capability_names(base.name, payload.standardized_name)
    base.standardized_name = suggested_standard
    base.name = suggested_name
    base.capability = suggested_standard
    base.evidence_quote = " | ".join(item.evidence_quote for item in items if item.evidence_quote)
    for item in items[1:]:
        item.status = ValidationStatus.merged
    db.commit()
    return _serialize_extracted(base, db.get(Document, base.document_id))


@router.post("/extracted/{item_id}/merge-into/{capability_id}")
def merge_into_existing_capability(item_id: str, capability_id: str, db: Session = Depends(get_db)):
    item = db.get(ExtractedCapability, item_id)
    capability = db.get(Capability, capability_id)
    if not item or not capability:
        raise HTTPException(status_code=404, detail="Capability or extracted item not found")
    _preserve_original_output(item)
    item.status = ValidationStatus.merged
    item.published_capability_id = capability.id
    audit = item.review_audit or []
    audit.append({"at": datetime.utcnow().isoformat(), "action": "merge_into_existing", "target_capability_id": capability.id, "target_name": capability.standardized_name})
    item.review_audit = audit
    db.commit()
    return {"id": item.id, "status": "merged", "capability_id": capability.id}


@router.get("/map")
def capability_map(db: Session = Depends(get_db)):
    caps = _dedupe_capability_list(db.query(Capability).all())
    return {
        "domains": [
            {
                "name": domain,
                "areas": [
                    {
                        "name": area,
                        "capabilities": [c for c in [_cap(x) for x in caps if x.domain == domain and x.area == area]],
                    }
                    for area in sorted({c.area for c in caps if c.domain == domain})
                ],
            }
            for domain in sorted({c.domain for c in caps})
        ]
    }


def _cap(item: Capability) -> dict:
    return {
        "id": item.id,
        "name": item.name or item.standardized_name,
        "standardized_name": item.standardized_name,
        "description": item.description,
        "sub_capability": item.sub_capability,
        "owner_unit_id": item.owner_unit_id,
    }


@router.get("/extracted/{item_id}/suggestions")
def duplicate_suggestions(item_id: str, db: Session = Depends(get_db)):
    item = db.get(ExtractedCapability, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Extracted capability not found")
    candidates = []
    for capability in db.query(Capability).all():
        score = _similarity(item.standardized_name, capability.standardized_name)
        if item.domain == capability.domain:
            score += 0.15
        if item.area == capability.area:
            score += 0.10
        if score >= 0.45:
            candidates.append(
                {
                    "id": capability.id,
                    "name": capability.standardized_name,
                    "domain": capability.domain,
                    "area": capability.area,
                    "score": min(round(score, 2), 1),
                }
            )
    return sorted(candidates, key=lambda value: value["score"], reverse=True)[:8]


@router.get("/review-queue/summary")
def review_queue_summary(db: Session = Depends(get_db)):
    active_items = db.query(ExtractedCapability).filter(ExtractedCapability.status.in_(list(ACTIVE_REVIEW_STATUSES))).all()
    document_ids = {item.document_id for item in active_items}
    documents = {doc.id: doc for doc in db.query(Document).filter(Document.id.in_(document_ids)).all()} if document_ids else {}
    by_document: dict[str, dict] = {}
    by_domain: dict[str, int] = {}
    for item in active_items:
        document = documents.get(item.document_id)
        doc_bucket = by_document.setdefault(
            item.document_id,
            {
                "document_id": item.document_id,
                "title": _clean_document_display_name(document),
                "display_name": _clean_document_display_name(document),
                "created_at": document.created_at.isoformat() if document else None,
                "count": 0,
            },
        )
        doc_bucket["count"] += 1
        by_domain[item.domain] = by_domain.get(item.domain, 0) + 1
    return {
        "total_pending": len(active_items),
        "by_document": list(by_document.values()),
        "by_domain": [{"domain": domain, "count": count} for domain, count in sorted(by_domain.items())],
    }


@router.post("/dedupe")
def cleanup_duplicate_capabilities(db: Session = Depends(get_db)):
    return dedupe_capabilities(db)


def _serialize_extracted(item: ExtractedCapability, doc: Document | None = None) -> dict:
    ontology_item = find_capability_by_standard_name(item.standardized_name, item.domain, item.area)
    return {
        "id": item.id,
        "document_id": item.document_id,
        "document_title": doc.title if doc else None,
        "document_display_name": _clean_document_display_name(doc),
        "is_demo_seed": bool(doc and doc.file_name == "procurement_transformation.txt"),
        "name": item.name,
        "standardized_name": item.standardized_name,
        "domain": item.domain,
        "area": item.area,
        "capability": item.capability,
        "sub_capability": item.sub_capability,
        "evidence_quote": item.evidence_quote,
        "confidence": item.confidence,
        "status": item.status.value,
        "published_capability_id": item.published_capability_id,
        "already_exists": bool(item.published_capability_id and item.status == ValidationStatus.approved),
        "ontology_match": ontology_item is not None,
        "ontology_match_type": item.ontology_match_type or ("matched" if ontology_item else "new"),
        "suggested_arabic_name": item.name,
        "suggested_english_name": item.standardized_name,
        "extraction_type": "ontology_match" if ontology_item else "proposed_new",
        "capability_type": item.capability_type,
        "description": item.description,
        "keywords": item.keywords or [],
        "reviewer_notes": item.reviewer_notes,
        "original_name": item.original_name,
        "original_standardized_name": item.original_standardized_name,
        "original_domain": item.original_domain,
        "original_area": item.original_area,
    }


def _preserve_original_output(item: ExtractedCapability) -> None:
    if not item.original_name:
        item.original_name = item.name
    if not item.original_standardized_name:
        item.original_standardized_name = item.standardized_name
    if not item.original_domain:
        item.original_domain = item.domain
    if not item.original_area:
        item.original_area = item.area


def _normalize_item_names(item: ExtractedCapability) -> None:
    _preserve_original_output(item)
    suggested_name, suggested_standard = standardize_capability_names(item.name, item.standardized_name)
    item.name = suggested_name
    item.standardized_name = suggested_standard
    item.capability = suggested_standard


def _curation_snapshot(item: ExtractedCapability) -> dict:
    return {
        "name": item.name,
        "standardized_name": item.standardized_name,
        "domain": item.domain,
        "area": item.area,
        "capability_type": item.capability_type,
        "description": item.description,
        "keywords": item.keywords or [],
        "ontology_match_type": item.ontology_match_type,
        "reviewer_notes": item.reviewer_notes,
    }


def _similarity(left: str | None, right: str | None) -> float:
    left = (left or "").casefold().strip()
    right = (right or "").casefold().strip()
    if not left or not right:
        return 0
    return SequenceMatcher(None, left, right).ratio()


def _clean_document_display_name(doc: Document | None) -> str:
    if not doc:
        return "قدرات بحاجة إلى تصنيف"
    raw = doc.title or doc.file_name or ""
    value = Path(raw).stem
    value = re.sub(r"^[0-9a-fA-F-]{8,}[_\-\s]*", "", value)
    value = re.sub(r"^\d+[_\-\s]*", "", value)
    value = value.replace("_", " ").replace("-", " ")
    value = " ".join(value.split())
    if not value or value.lower().startswith(("tmp", "temp", "upload")):
        return "قدرات بحاجة إلى تصنيف"
    return value


def _dedupe_capability_list(capabilities: list[Capability]) -> list[Capability]:
    from app.dedupe import capability_key

    unique: dict[tuple[str, str, str], Capability] = {}
    for capability in capabilities:
        key = capability_key(capability.standardized_name, capability.domain, capability.area)
        if key not in unique:
            unique[key] = capability
    return list(unique.values())


def _dedupe_extracted_list(items: list[ExtractedCapability]) -> list[ExtractedCapability]:
    from app.dedupe import capability_key

    unique: dict[tuple[str, str, str, str], ExtractedCapability] = {}
    for item in items:
        key = (item.document_id, *capability_key(item.standardized_name, item.domain, item.area))
        current = unique.get(key)
        if current is None or _extracted_response_rank(item) < _extracted_response_rank(current):
            unique[key] = item
    return list(unique.values())


def _extracted_response_rank(item: ExtractedCapability) -> int:
    if item.status == ValidationStatus.pending:
        return 0
    if item.status == ValidationStatus.approved and item.published_capability_id:
        return 1
    if item.status == ValidationStatus.approved:
        return 2
    return 3
