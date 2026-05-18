from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine, get_db
from app.document_ingestion.router import router as document_router
from app.graph_builder.router import router as graph_router
from app.models import Application, Capability, Document, EntityRelationship, Evidence, ExtractedCapability, KPI, OrganizationUnit, Process, Project
from app.ontology.normalization_migration import normalize_existing_capabilities
from app.overlap_detection.router import router as overlap_router
from app.ontology.router import router as ontology_router
from app.copilot_rag.router import router as copilot_router
from app.reporting_api.router import router as reporting_router
from app.seed import seed_demo
from app.validation_workflow.router import router as validation_router

Base.metadata.create_all(bind=engine)

if engine.dialect.name == "postgresql":
    with engine.begin() as connection:
        for status_value in ["in_review", "edited", "merged"]:
            connection.execute(text(f"ALTER TYPE validationstatus ADD VALUE IF NOT EXISTS '{status_value}'"))

    with engine.begin() as connection:
        for statement in [
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS description TEXT",
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS original_name VARCHAR(255)",
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS original_standardized_name VARCHAR(255)",
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS original_domain VARCHAR(255)",
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS original_area VARCHAR(255)",
            "ALTER TABLE capabilities ADD COLUMN IF NOT EXISTS naming_audit JSON",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS original_name VARCHAR(255)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS original_standardized_name VARCHAR(255)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS original_domain VARCHAR(255)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS original_area VARCHAR(255)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS capability_type VARCHAR(120)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS description TEXT",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS keywords JSON",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS ontology_match_type VARCHAR(80)",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS reviewer_notes TEXT",
            "ALTER TABLE extracted_capabilities ADD COLUMN IF NOT EXISTS review_audit JSON",
        ]:
            connection.execute(text(statement))

with SessionLocal() as startup_db:
    normalize_existing_capabilities(startup_db)

app = FastAPI(
    title="Sovereign AI-Native Enterprise Intelligence Platform MVP",
    version="0.1.0",
    description="Offline-first capability mining, overlap detection, and graph-grounded copilot.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_router)
app.include_router(validation_router)
app.include_router(overlap_router)
app.include_router(ontology_router)
app.include_router(graph_router)
app.include_router(copilot_router)
app.include_router(reporting_router)


@app.get("/health")
def health():
    return {"status": "ok", "offline_ready": True}


@app.post("/api/seed/reset")
def reset_seed(db: Session = Depends(get_db)):
    seed_demo(db)
    return {"status": "seeded"}


@app.post("/api/demo/clear")
@app.delete("/api/demo/reset")
def clear_demo_data(db: Session = Depends(get_db)):
    demo_document_names = {"procurement_transformation.txt"}
    demo_entity_names = {
        "Procurement Department",
        "Finance Department",
        "IT Department",
        "Vendor Management Office",
        "ERP Procurement",
        "Supplier Portal",
        "Contract Archive",
        "eProcurement Modernization",
        "Vendor Portal Upgrade",
        "Contract Digitization",
        "Source-to-Pay",
        "Procurement Cycle Time",
        "Contract Compliance Rate",
        "Strategic Sourcing",
        "Supplier Performance Management",
        "Vendor Registration",
        "Purchase Requisition Management",
        "Purchase Order Management",
        "Contract Lifecycle Management",
        "Budget Control",
        "Invoice Matching",
        "Spend Analytics",
    }
    demo_docs = db.query(Document).filter(
        or_(
            Document.file_name.in_(demo_document_names),
            Document.file_name.ilike("%procurement%"),
            Document.file_name.ilike("%supplier%"),
            Document.file_name.ilike("%vendor%"),
            Document.file_name.ilike("%contract%"),
            Document.title.ilike("%Procurement%"),
            Document.title.ilike("%Supplier%"),
            Document.title.ilike("%Vendor%"),
            Document.title.ilike("%Contract%"),
        )
    ).all()
    demo_doc_ids = {doc.id for doc in demo_docs}
    demo_ids: set[str] = set(demo_doc_ids)

    demo_items = []
    for model in [Application, Project, Process, KPI, OrganizationUnit]:
        for item in db.query(model).filter(model.name.in_(demo_entity_names)).all():
            demo_ids.add(item.id)
            demo_items.append(item)

    for capability in db.query(Capability).filter(Capability.standardized_name.in_(demo_entity_names)).all():
        demo_ids.add(capability.id)
        demo_items.append(capability)

    if demo_doc_ids:
        db.query(ExtractedCapability).filter(ExtractedCapability.document_id.in_(demo_doc_ids)).delete(synchronize_session=False)
        db.query(Evidence).filter(Evidence.document_id.in_(demo_doc_ids)).delete(synchronize_session=False)
        for doc in demo_docs:
            db.delete(doc)

    if demo_ids:
        db.query(EntityRelationship).filter(
            (EntityRelationship.source_id.in_(demo_ids)) | (EntityRelationship.target_id.in_(demo_ids))
        ).delete(synchronize_session=False)

    for item in sorted(demo_items, key=lambda value: 1 if isinstance(value, OrganizationUnit) else 0):
        db.delete(item)

    db.commit()
    return {"status": "cleared", "removed_demo_entities": len(demo_ids), "removed_demo_documents": len(demo_doc_ids)}
