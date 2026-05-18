from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, Capability, Document, EntityRelationship, Evidence, OrganizationUnit, OverlapFinding, Project
from app.schemas import ChatRequest, ChatResponse
from app.copilot_rag.ollama_client import synthesize_with_ollama
from app.copilot_rag.workflow import run_grounding_workflow

router = APIRouter(prefix="/api/copilot", tags=["copilot_rag"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    intent = run_grounding_workflow(payload.question)
    evidence = []
    related = []

    if intent == "missing_owners":
        caps = db.query(Capability).filter(Capability.owner_unit_id.is_(None)).all()
        answer = "The capabilities without an assigned owning department are: " + ", ".join(c.standardized_name for c in caps)
        related = [{"type": "Capability", "id": c.id, "name": c.standardized_name} for c in caps]
    elif intent == "supporting_systems":
        apps = db.query(Application).all()
        caps = db.query(Capability).filter(Capability.domain == "Procurement").all()
        answer = "Procurement capabilities are supported by: " + ", ".join(a.name for a in apps)
        related = [{"type": "Application", "id": a.id, "name": a.name} for a in apps] + [{"type": "Capability", "id": c.id, "name": c.standardized_name} for c in caps]
    elif intent == "project_overlaps":
        overlaps = db.query(OverlapFinding).filter(OverlapFinding.source_type == "Project").all()
        if not overlaps:
            overlaps = db.query(OverlapFinding).all()
        answer = "The strongest project overlaps are: " + "; ".join(f"{o.source_name} and {o.target_name} ({o.score})" for o in overlaps[:5])
        related = [{"type": "OverlapFinding", "id": o.id, "name": f"{o.source_name} / {o.target_name}", "score": o.score} for o in overlaps[:5]]
    elif intent == "retirement_impact":
        apps = db.query(Application).all()
        caps = db.query(Capability).all()
        answer = "Retiring the named system may affect supported capabilities, dependent projects, integrations, and KPI reporting. Review graph nodes before approval."
        related = [{"type": "Application", "id": a.id, "name": a.name} for a in apps] + [{"type": "Capability", "id": c.id, "name": c.standardized_name} for c in caps[:5]]
    elif intent == "department_involvement":
        units = db.query(OrganizationUnit).all()
        answer = "The involved departments in the current graph are: " + ", ".join(u.name for u in units)
        related = [{"type": "OrganizationUnit", "id": u.id, "name": u.name} for u in units]
    else:
        docs = db.query(Document).all()
        answer = "I can answer from the uploaded documents and graph. The current corpus covers procurement capabilities, projects, IT systems, departments, processes, and KPIs."
        related = [{"type": "Document", "id": d.id, "name": d.title} for d in docs]

    for item in db.query(Evidence).limit(5).all():
        evidence.append({"document_or_node": item.document_id, "quote": item.quote, "confidence": item.confidence})

    if not evidence:
        for doc in db.query(Document).limit(3).all():
            evidence.append({"document_or_node": doc.id, "quote": doc.content[:260], "confidence": 0.68})

    grounded_answer = synthesize_with_ollama(payload.question, answer, evidence, related)

    return ChatResponse(
        direct_answer=grounded_answer,
        supporting_evidence=evidence,
        related_graph_entities=related,
        confidence_score=0.78 if evidence else 0.52,
        suggested_follow_up_questions=[
            "Which entities have missing owners?",
            "Show the highest-risk overlaps.",
            "What source evidence supports this answer?",
        ],
    )
