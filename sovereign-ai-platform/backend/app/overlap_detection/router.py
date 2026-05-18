from fastapi import APIRouter, Depends
from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, Capability, OverlapFinding, Project

router = APIRouter(prefix="/api/overlaps", tags=["overlap_detection"])


@router.post("/run")
def run_overlap_detection(db: Session = Depends(get_db)):
    db.query(OverlapFinding).delete()
    entities = []
    for model, entity_type in [(Capability, "Capability"), (Project, "Project"), (Application, "Application")]:
        for item in db.query(model).all():
            text = f"{getattr(item, 'standardized_name', item.name)} {getattr(item, 'description', '')} {getattr(item, 'domain', '')} {getattr(item, 'area', '')}"
            entities.append((entity_type, item.id, getattr(item, "standardized_name", item.name), text))

    findings = []
    for i, left in enumerate(entities):
        for right in entities[i + 1 :]:
            score = fuzz.token_set_ratio(left[3], right[3])
            if score >= 48:
                overlap_type = _classify(left[0], right[0], left[3] + " " + right[3])
                finding = OverlapFinding(
                    source_type=left[0],
                    source_id=left[1],
                    source_name=left[2],
                    target_type=right[0],
                    target_id=right[1],
                    target_name=right[2],
                    overlap_type=overlap_type,
                    score=int(score),
                    explanation=f"{left[2]} and {right[2]} share terminology, scope, or supporting responsibilities in the enterprise graph.",
                    recommendation=_recommendation(score, overlap_type),
                    evidence={"matching_basis": "local text similarity and graph adjacency", "score_engine": "rapidfuzz token_set_ratio"},
                )
                db.add(finding)
                findings.append(finding)
    db.commit()
    return {"created": len(findings), "findings": [_serialize(x) for x in findings]}


@router.get("")
def list_overlaps(db: Session = Depends(get_db)):
    return [_serialize(item) for item in db.query(OverlapFinding).order_by(OverlapFinding.score.desc()).all()]


def _classify(left_type: str, right_type: str, text: str) -> str:
    lowered = text.lower()
    if left_type == "Application" or right_type == "Application":
        return "Technical overlap"
    if "data" in lowered or "analytics" in lowered or "report" in lowered:
        return "Data overlap"
    if "process" in lowered or "workflow" in lowered:
        return "Process overlap"
    if "owner" in lowered or "department" in lowered:
        return "Ownership overlap"
    return "Functional overlap"


def _recommendation(score: int, overlap_type: str) -> str:
    if score >= 82:
        return "Merge" if overlap_type == "Functional overlap" else "Retire"
    if score >= 68:
        return "Integrate"
    if overlap_type == "Ownership overlap":
        return "Reassign owner"
    return "Keep as-is"


def _serialize(item: OverlapFinding) -> dict:
    return {
        "id": item.id,
        "source_type": item.source_type,
        "source_id": item.source_id,
        "source_name": item.source_name,
        "target_type": item.target_type,
        "target_id": item.target_id,
        "target_name": item.target_name,
        "overlap_type": item.overlap_type,
        "score": item.score,
        "explanation": item.explanation,
        "recommendation": item.recommendation,
        "evidence": item.evidence,
    }

