from sqlalchemy.orm import Session

from app.capability_extraction.service import extract_capabilities
from app.models import Application, Capability, Document, EntityRelationship, Evidence, KPI, OrganizationUnit, Process, Project, ValidationStatus


DEMO_TEXT = """
Procurement Department owns Strategic Sourcing, Purchase Requisition Management, and Supplier Performance Management.
The Source-to-Pay process is enabled by ERP Procurement and the Supplier Portal.
The eProcurement Modernization project overlaps with Vendor Portal Upgrade because both target supplier onboarding, requisition workflow, and ERP integrations.
Contract Digitization supports Contract Lifecycle Management and improves Contract Compliance Rate.
Finance Department governs budget control and invoice matching for procurement.
"""


def seed_demo(db: Session) -> None:
    db.query(EntityRelationship).delete()
    for model in [Evidence, Capability, Document, Application, Project, Process, KPI, OrganizationUnit]:
        db.query(model).delete()

    procurement = OrganizationUnit(name="Procurement Department", mandate="Owns sourcing, purchasing operations, and supplier management.")
    finance = OrganizationUnit(name="Finance Department", mandate="Governs budget control, invoice matching, and spend compliance.")
    it = OrganizationUnit(name="IT Department", mandate="Runs enterprise platforms, integrations, identities, and data services.")
    vmo = OrganizationUnit(name="Vendor Management Office", mandate="Coordinates supplier performance and vendor lifecycle.")
    db.add_all([procurement, finance, it, vmo])
    db.flush()

    doc = Document(title="Procurement Transformation Brief", file_name="procurement_transformation.txt", file_type=".txt", content=DEMO_TEXT)
    db.add(doc)
    db.flush()

    capabilities = []
    for candidate in extract_capabilities(DEMO_TEXT):
        owner = procurement.id if candidate.domain == "Procurement" and candidate.standardized_name != "Contract Lifecycle Management" else None
        cap = Capability(
            name=candidate.name,
            standardized_name=candidate.standardized_name,
            domain=candidate.domain,
            area=candidate.area,
            parent_capability=candidate.capability,
            sub_capability=candidate.sub_capability,
            owner_unit_id=owner,
            status=ValidationStatus.approved,
        )
        db.add(cap)
        db.flush()
        db.add(Evidence(document_id=doc.id, entity_type="Capability", entity_id=cap.id, quote=candidate.evidence_quote, confidence=candidate.confidence))
        capabilities.append(cap)

    erp = Application(name="ERP Procurement", description="Core procurement ERP covering requisitions, purchase orders, budgets, and invoice matching.")
    portal = Application(name="Supplier Portal", description="Supplier registration, onboarding, performance scorecards, and tender participation.")
    archive = Application(name="Contract Archive", description="Legacy contract repository with partial contract lifecycle coverage.")
    db.add_all([erp, portal, archive])

    p1 = Project(name="eProcurement Modernization", description="Modernize requisition workflow, ERP integrations, purchase orders, and supplier collaboration.", owner_unit_id=it.id)
    p2 = Project(name="Vendor Portal Upgrade", description="Upgrade supplier onboarding, vendor registration, performance scorecards, and ERP integration.", owner_unit_id=vmo.id)
    p3 = Project(name="Contract Digitization", description="Digitize contract archive and contract compliance reporting.", owner_unit_id=procurement.id)
    db.add_all([p1, p2, p3])

    process = Process(name="Source-to-Pay", description="End-to-end procurement process from sourcing through payment.")
    kpi1 = KPI(name="Procurement Cycle Time", target="Reduce average cycle time by 30%.")
    kpi2 = KPI(name="Contract Compliance Rate", target="Reach 95% compliant contracts.")
    db.add_all([process, kpi1, kpi2])
    db.flush()

    for cap in capabilities:
        if cap.owner_unit_id:
            db.add(EntityRelationship(source_type="OrganizationUnit", source_id=cap.owner_unit_id, relationship="owns", target_type="Capability", target_id=cap.id))
        db.add(EntityRelationship(source_type="Process", source_id=process.id, relationship="enables", target_type="Capability", target_id=cap.id))
        db.add(EntityRelationship(source_type="Application", source_id=erp.id, relationship="supports", target_type="Capability", target_id=cap.id))
    db.add(EntityRelationship(source_type="Application", source_id=portal.id, relationship="supports", target_type="Capability", target_id=capabilities[0].id))
    db.add(EntityRelationship(source_type="Project", source_id=p1.id, relationship="implemented_by", target_type="Application", target_id=erp.id))
    db.add(EntityRelationship(source_type="Project", source_id=p2.id, relationship="implemented_by", target_type="Application", target_id=portal.id))
    db.add(EntityRelationship(source_type="Project", source_id=p3.id, relationship="implemented_by", target_type="Application", target_id=archive.id))
    db.commit()

