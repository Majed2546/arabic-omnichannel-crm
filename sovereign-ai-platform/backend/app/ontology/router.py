from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.ontology.library import ONTOLOGY_CAPABILITIES, capability_payload, ontology_domains
from app.ontology.normalization_migration import normalize_existing_capabilities
from app.ontology.service import extract_with_debug

router = APIRouter(prefix="/api/ontology", tags=["ontology"])


class TestExtractionRequest(BaseModel):
    text: str


@router.get("")
def get_ontology():
    return {
        "version": "v1",
        "entity_types": [
            "BusinessDomain",
            "CapabilityArea",
            "Capability",
            "OrganizationUnit",
            "Task",
            "Service",
            "Process",
            "Application",
            "Project",
            "Role",
            "Owner",
            "Evidence",
            "Document",
        ],
        "relationships": [
            {"source": "OrganizationUnit", "relationship": "owns", "target": "Capability"},
            {"source": "OrganizationUnit", "relationship": "performs", "target": "Task"},
            {"source": "Task", "relationship": "indicates", "target": "Capability"},
            {"source": "Capability", "relationship": "belongs_to", "target": "CapabilityArea"},
            {"source": "CapabilityArea", "relationship": "belongs_to", "target": "BusinessDomain"},
            {"source": "Capability", "relationship": "supported_by", "target": "Application"},
            {"source": "Capability", "relationship": "delivered_as", "target": "Service"},
            {"source": "Capability", "relationship": "implemented_by", "target": "Process"},
            {"source": "Project", "relationship": "improves", "target": "Capability"},
            {"source": "Evidence", "relationship": "extracted_from", "target": "Document"},
            {"source": "Evidence", "relationship": "supports", "target": "Capability"},
        ],
        "domains": ontology_domains(),
    }


@router.get("/domains")
def get_domains():
    return ontology_domains()


@router.get("/capabilities")
def get_capabilities():
    return [capability_payload(item) for item in ONTOLOGY_CAPABILITIES]


@router.post("/normalize-capabilities")
def normalize_capabilities(db: Session = Depends(get_db)):
    return normalize_existing_capabilities(db)


@router.post("/test-extraction")
def test_extraction(payload: TestExtractionRequest):
    candidates, debug = extract_with_debug(payload.text)
    debug.saved_capabilities_count = len(candidates)
    return {
        "capabilities": [
            {
                "name": item.name,
                "standardized_name": item.standardized_name,
                "domain": item.domain,
                "area": item.area,
                "evidence_quote": item.evidence_quote,
                "ontology_match": item.ontology_match,
                "extraction_type": item.extraction_type,
                "match_score": item.match_score,
            }
            for item in candidates
        ],
        "debug": debug.__dict__,
    }
