from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, Capability, EntityRelationship, Evidence, OrganizationUnit, Process, Project

router = APIRouter(prefix="/api/graph", tags=["graph_builder"])


@router.get("")
def graph_snapshot(db: Session = Depends(get_db)):
    nodes = []
    for model, label in [
        (OrganizationUnit, "OrganizationUnit"),
        (Capability, "Capability"),
        (Process, "Process"),
        (Application, "Application"),
        (Project, "Project"),
    ]:
        for item in db.query(model).all():
            nodes.append({"id": item.id, "label": label, "name": item.name if hasattr(item, "name") else item.standardized_name})
    edges = [
        {
            "id": rel.id,
            "source": rel.source_id,
            "target": rel.target_id,
            "relationship": rel.relationship,
            "source_type": rel.source_type,
            "target_type": rel.target_type,
        }
        for rel in db.query(EntityRelationship).all()
    ]
    evidence = [{"id": e.id, "entity_id": e.entity_id, "quote": e.quote, "confidence": e.confidence} for e in db.query(Evidence).all()]
    return {"nodes": nodes, "edges": edges, "evidence": evidence}

