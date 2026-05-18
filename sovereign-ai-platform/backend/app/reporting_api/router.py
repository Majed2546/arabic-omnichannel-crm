from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Capability, Document, ExtractedCapability, OverlapFinding, ValidationStatus

router = APIRouter(prefix="/api/dashboard", tags=["reporting_api"])


@router.get("/summary")
def summary(db: Session = Depends(get_db)):
    return {
        "documents": db.query(Document).count(),
        "pending_capabilities": db.query(ExtractedCapability).filter(ExtractedCapability.status == ValidationStatus.pending).count(),
        "validated_capabilities": db.query(Capability).count(),
        "overlap_findings": db.query(OverlapFinding).count(),
        "avg_overlap_score": round(sum(o.score for o in db.query(OverlapFinding).all()) / max(db.query(OverlapFinding).count(), 1), 1),
    }

