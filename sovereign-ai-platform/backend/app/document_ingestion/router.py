from pathlib import Path
import logging
import re

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.capability_extraction.service import extract_with_debug
from app.config import settings
from app.database import get_db
from app.dedupe import find_duplicate_document, find_existing_capability, find_existing_extracted_for_document
from app.models import Document, ExtractedCapability, ValidationStatus
from app.ontology.library import find_capability_by_standard_name
from app.text_extraction.service import extract_text

router = APIRouter(prefix="/api/documents", tags=["document_ingestion"])
logger = logging.getLogger("uvicorn.error")


@router.post("/upload")
async def upload_document(force_reextract: bool = False, file: UploadFile = File(...), db: Session = Depends(get_db)):
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    path = upload_dir / file.filename
    path.write_bytes(await file.read())
    text = extract_text(path, file.content_type)

    duplicate_document = find_duplicate_document(db, text)
    if duplicate_document:
        existing_items = db.query(ExtractedCapability).filter(ExtractedCapability.document_id == duplicate_document.id).all()
        if force_reextract:
            extracted, existing_count = _extract_for_document(db, duplicate_document, duplicate_document.content or text)
            all_items = db.query(ExtractedCapability).filter(ExtractedCapability.document_id == duplicate_document.id).all()
            logger.info(
                "duplicate re-extraction document_id=%s file_name=%s new_extracted_count=%s total_linked_count=%s",
                duplicate_document.id,
                file.filename,
                len(extracted),
                len(all_items),
            )
            return {
                "document_id": duplicate_document.id,
                "duplicate": True,
                "reextracted": True,
                "message": "تمت إعادة الاستخراج للوثيقة الموجودة.",
                "extracted_count": len([item for item in extracted if item.status == ValidationStatus.pending]),
                "existing_count": existing_count,
                "linked_count": len(all_items),
                "extracted_capabilities": [_serialize(x) for x in all_items],
            }
        logger.info(
            "duplicate upload detected existing_document_id=%s file_name=%s extracted_count=%s",
            duplicate_document.id,
            file.filename,
            len(existing_items),
        )
        return {
            "document_id": duplicate_document.id,
            "duplicate": True,
            "reextracted": False,
            "message": "تم رفع هذه الوثيقة مسبقاً، تم عرض القدرات المستخرجة سابقاً.",
            "extracted_count": len([item for item in existing_items if item.status == ValidationStatus.pending]),
            "existing_count": len(existing_items),
            "linked_count": len(existing_items),
            "extracted_capabilities": [_serialize(x) for x in existing_items],
        }

    doc = Document(title=Path(file.filename).stem, file_name=file.filename, file_type=Path(file.filename).suffix, content=text)
    db.add(doc)
    db.flush()
    logger.info("uploaded document_id=%s file_name=%s", doc.id, file.filename)

    extracted, existing_count = _extract_for_document(db, doc, text)
    return {
        "document_id": doc.id,
        "duplicate": False,
        "reextracted": False,
        "message": None,
        "extracted_count": len([item for item in extracted if item.status == ValidationStatus.pending]),
        "existing_count": existing_count,
        "linked_count": len(extracted),
        "extracted_capabilities": [_serialize(x) for x in extracted],
    }


@router.get("")
def list_documents(db: Session = Depends(get_db)):
    return [_document_payload(doc) for doc in db.query(Document).order_by(Document.created_at.desc()).all()]


def _extract_for_document(db: Session, doc: Document, text: str) -> tuple[list[ExtractedCapability], int]:
    candidates, debug = extract_with_debug(text)
    logger.info("ontology sections document_id=%s sections=%s", doc.id, debug.sections[:10])
    logger.info("ontology tasks document_id=%s detected_tasks=%s", doc.id, len(debug.tasks))
    logger.info("ontology candidates document_id=%s candidate_count=%s", doc.id, len(debug.candidate_capabilities))
    logger.info("ontology matches document_id=%s matches=%s", doc.id, len(debug.ontology_matches))
    logger.info("ontology unmatched document_id=%s unmatched=%s", doc.id, len(debug.unmatched_candidates))

    extracted = []
    existing_count = 0
    seen_keys: set[tuple[str, str, str]] = set()
    for candidate in candidates:
        key = (
            " ".join(candidate.standardized_name.lower().strip().split()),
            " ".join(candidate.domain.lower().strip().split()),
            " ".join(candidate.area.lower().strip().split()),
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)

        existing_capability = find_existing_capability(db, candidate.standardized_name, candidate.domain, candidate.area)
        existing_extracted = find_existing_extracted_for_document(db, doc.id, candidate.standardized_name, candidate.domain, candidate.area)
        if existing_extracted:
            continue

        item = ExtractedCapability(
            document_id=doc.id,
            name=candidate.name,
            standardized_name=candidate.standardized_name,
            domain=candidate.domain,
            area=candidate.area,
            capability=candidate.capability,
            sub_capability=candidate.sub_capability,
            evidence_quote=candidate.evidence_quote,
            confidence=candidate.confidence,
            original_name=getattr(candidate, "original_name", candidate.name),
            original_standardized_name=candidate.standardized_name,
            original_domain=candidate.domain,
            original_area=candidate.area,
            capability_type="Capability",
            description=candidate.evidence_quote[:420],
            keywords=[],
            ontology_match_type="matched" if getattr(candidate, "ontology_match", False) else "new",
            review_audit=[],
            status=ValidationStatus.approved if existing_capability else ValidationStatus.pending,
            published_capability_id=existing_capability.id if existing_capability else None,
        )
        db.add(item)
        extracted.append(item)
        if existing_capability:
            existing_count += 1
    db.commit()
    debug.saved_capabilities_count = len(extracted)
    logger.info(
        "extraction document_id=%s extracted_count=%s existing_count=%s pending_count=%s",
        doc.id,
        len(extracted),
        existing_count,
        len([item for item in extracted if item.status == ValidationStatus.pending]),
    )
    return extracted, existing_count


def _serialize(item: ExtractedCapability) -> dict:
    ontology_item = find_capability_by_standard_name(item.standardized_name, item.domain, item.area)
    return {
        "id": item.id,
        "document_id": item.document_id,
        "document_title": None,
        "document_display_name": None,
        "is_demo_seed": False,
        "name": item.name,
        "standardized_name": item.standardized_name,
        "domain": item.domain,
        "area": item.area,
        "capability": item.capability,
        "sub_capability": item.sub_capability,
        "evidence_quote": item.evidence_quote,
        "confidence": item.confidence,
        "status": item.status.value,
        "already_exists": bool(item.published_capability_id and item.status == ValidationStatus.approved),
        "published_capability_id": item.published_capability_id,
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


def _document_payload(doc: Document) -> dict:
    return {
        "id": doc.id,
        "title": doc.title,
        "display_name": _clean_document_display_name(doc),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }


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
