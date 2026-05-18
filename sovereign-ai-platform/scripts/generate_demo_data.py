from __future__ import annotations

import html
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "demo-data"


ORG_STRUCTURE = [
    ("Executive Office", "مكتب الرئيس التنفيذي", "Approves procurement transformation priorities, governance exceptions, and enterprise performance outcomes."),
    ("Procurement Department", "إدارة المشتريات", "Owns Strategic Sourcing, Purchase Requisition Management, Tender Management, Purchase Order Management, Supplier Relationship Management, and Contract Lifecycle Management."),
    ("Finance Department", "الإدارة المالية", "Governs Budget Control, Commitment Accounting, Invoice Matching, Spend Analytics, and procurement payment compliance."),
    ("IT Department", "إدارة تقنية المعلومات", "Owns ERP Procurement, Integration Management, Identity Access Management, Data Governance, and platform reliability."),
    ("Vendor Management Office", "مكتب إدارة الموردين", "Coordinates Vendor Registration, Supplier Performance Management, Vendor Risk Management, and supplier master data quality."),
    ("Internal Audit", "المراجعة الداخلية", "Reviews procurement compliance, segregation of duties, contract evidence, and policy adherence."),
    ("Legal Affairs", "الشؤون القانونية", "Reviews contract templates, negotiation clauses, supplier disputes, and legal risk."),
    ("Shared Services Center", "مركز الخدمات المشتركة", "Runs operational procurement helpdesk, requisition support, and invoice exception handling."),
]


SOP_SECTIONS = [
    ("Strategic Sourcing", "Procurement prepares annual sourcing plans, category strategies, market sounding, tender calendars, and framework agreement recommendations."),
    ("Purchase Requisition Management", "Business units raise purchase requisitions in ERP Procurement. Finance validates budget availability and commitment accounting before approvals."),
    ("Tender Management", "Tender Management includes RFP publishing, bid clarification, technical evaluation, commercial evaluation, award recommendation, and audit trail retention."),
    ("Supplier Onboarding / Vendor Registration", "Supplier Portal and Vendor Registration System both collect supplier profile, tax certificate, bank account, classification, and onboarding workflow data."),
    ("Purchase Order Management", "Approved requisitions are converted into purchase orders. ERP Procurement and eProcurement Portal both support PO approvals, change orders, and receiving status."),
    ("Contract Lifecycle Management", "Contract templates, contract approval, digital signature, contract repository, contract renewal alerts, and contract compliance monitoring are handled across Contract Archive and Contract Lifecycle Portal."),
    ("Supplier Performance Management", "Vendor scorecards measure delivery timeliness, quality incidents, contract compliance, and SLA performance. The VMO and Procurement Department both maintain supplier performance records."),
    ("Invoice Matching", "Finance performs three-way match across purchase order, goods receipt, and supplier invoice. Invoice exceptions are routed to Shared Services."),
    ("Spend Analytics", "Spend Analytics consolidates ERP, Supplier Portal, and Contract Archive data to report category spend, supplier concentration, savings, and compliance leakage."),
    ("Procurement Compliance", "Internal Audit reviews procurement policy exceptions, evidence completeness, approval thresholds, segregation of duties, and emergency procurement."),
    ("Data Governance", "IT and Finance govern supplier master data, chart of accounts mapping, cost center mapping, and procurement KPI definitions."),
    ("Integration Management", "ERP Procurement integrates with Supplier Portal, Budget System, Identity Access Management, Contract Archive, and Data Warehouse."),
    ("Service Catalog Management", "Shared Services publishes procurement service catalog entries for vendor onboarding support, requisition support, tender support, PO support, and invoice exception support."),
    ("Orphan Capability", "Demand Forecasting for procurement categories is mentioned as required for future planning, but no department is currently assigned as owner."),
    ("Orphan Capability Arabic", "إدارة توقعات الطلب Demand Forecasting مطلوبة لتحسين التخطيط السنوي للمشتريات، ولا يوجد مالك واضح لها في الهيكل الحالي."),
]


SYSTEMS = [
    ["System Name", "Arabic Name", "Owner", "Primary Functions", "Supported Capabilities", "Overlap Notes", "Data Objects"],
    ["ERP Procurement", "نظام المشتريات في ERP", "IT Department", "Purchase requisitions, purchase orders, receiving, budget commitment, invoice matching", "Purchase Requisition Management; Purchase Order Management; Budget Control; Invoice Matching; Spend Analytics", "Overlaps with eProcurement Portal on requisition approvals and PO workflow", "Requisition; Purchase Order; Goods Receipt; Invoice; Budget Commitment"],
    ["eProcurement Portal", "بوابة المشتريات الإلكترونية", "Procurement Department", "Tender publishing, requisition intake, supplier collaboration, PO status", "Tender Management; Purchase Requisition Management; Purchase Order Management; Supplier Collaboration", "Duplicates ERP Procurement workflow for requisition intake and PO approvals", "Tender; Requisition; Supplier Response; PO Status"],
    ["Supplier Portal", "بوابة الموردين", "Vendor Management Office", "Supplier onboarding, supplier profile update, performance scorecard, supplier communications", "Vendor Registration; Supplier Performance Management; Supplier Relationship Management", "Overlaps with Vendor Registration System for onboarding and profile data", "Supplier Profile; Certificate; Bank Account; Scorecard"],
    ["Vendor Registration System", "نظام تسجيل الموردين", "Shared Services Center", "Supplier registration, document collection, bank details, risk flags", "Vendor Registration; Vendor Risk Management; Supplier Master Data Management", "Duplicates Supplier Portal onboarding forms and supplier master data", "Supplier Profile; Compliance Document; Risk Flag"],
    ["Contract Archive", "أرشيف العقود", "Legal Affairs", "Legacy contract repository, contract metadata, renewal dates", "Contract Repository Management; Contract Lifecycle Management", "Overlaps with Contract Lifecycle Portal on repository and renewal reminders", "Contract; Amendment; Renewal Date"],
    ["Contract Lifecycle Portal", "بوابة دورة حياة العقود", "Procurement Department", "Contract drafting, approval, digital signature, renewal alerts, compliance monitoring", "Contract Lifecycle Management; Contract Compliance Management; Supplier Performance Management", "Duplicates Contract Archive repository and renewal alert functions", "Contract; Approval; Signature; Compliance Evidence"],
    ["Budget System", "نظام الميزانية", "Finance Department", "Budget availability, commitment accounting, cost center control", "Budget Control; Commitment Accounting; Spend Analytics", "Partial overlap with ERP Procurement commitment checks", "Budget Line; Cost Center; Commitment"],
    ["Data Warehouse", "مستودع البيانات", "IT Department", "Procurement reporting, spend analytics, KPI dashboards", "Spend Analytics; KPI Management; Data Governance", "Consumes duplicated source data from ERP, portals, and archive", "KPI; Spend Fact; Supplier Dimension"],
    ["Identity Access Management", "إدارة الهوية والصلاحيات", "IT Department", "User provisioning, role mapping, approval matrix access", "Identity Access Management; Segregation of Duties", "Supports all procurement systems", "User; Role; Permission"],
]


PROJECTS = [
    ["Project / Initiative", "Sponsor", "Owner", "Scope", "Capabilities Targeted", "Systems Impacted", "Overlap / Dependency"],
    ["eProcurement Modernization", "Executive Office", "IT Department", "Modernize requisition workflow, supplier collaboration, tender publishing, and ERP integration.", "Purchase Requisition Management; Tender Management; Purchase Order Management; Integration Management", "ERP Procurement; eProcurement Portal; Supplier Portal", "Overlaps with Vendor Portal Upgrade on supplier collaboration and onboarding workflow."],
    ["Vendor Portal Upgrade", "Vendor Management Office", "Vendor Management Office", "Upgrade supplier onboarding, profile updates, scorecards, and communication workflows.", "Vendor Registration; Supplier Relationship Management; Supplier Performance Management", "Supplier Portal; Vendor Registration System; Data Warehouse", "Overlaps with eProcurement Modernization and duplicates Vendor Registration System functions."],
    ["Contract Digitization", "Legal Affairs", "Procurement Department", "Implement contract drafting, approval, digital signature, repository, renewal alerts, and compliance evidence.", "Contract Lifecycle Management; Contract Repository Management; Contract Compliance Management", "Contract Archive; Contract Lifecycle Portal", "Overlaps with Contract Archive modernization and legal repository activities."],
    ["Spend Visibility Program", "Finance Department", "Finance Department", "Create spend analytics, category dashboards, supplier concentration reports, and savings tracking.", "Spend Analytics; KPI Management; Data Governance", "ERP Procurement; Data Warehouse; Budget System", "Depends on clean supplier master data from Supplier Portal and Vendor Registration System."],
    ["Procurement Shared Services Enablement", "Shared Services Center", "Shared Services Center", "Launch service catalog, helpdesk, invoice exception routing, and requisition support model.", "Service Catalog Management; Invoice Exception Management; Purchase Requisition Support", "ERP Procurement; eProcurement Portal", "Overlaps with Procurement Department operational support responsibilities."],
    ["Procurement Demand Planning Pilot", "Executive Office", "Unassigned", "Pilot demand forecasting for recurring procurement categories and annual sourcing plans.", "Demand Forecasting; Category Planning", "Data Warehouse", "Orphan capability: no clear owning department assigned."],
]


ROLES = [
    ["Role", "Arabic Role", "Department", "Responsibilities", "Capabilities", "Systems Used"],
    ["Chief Procurement Officer", "مدير عام المشتريات", "Procurement Department", "Approves sourcing strategy, award recommendations, and procurement policy exceptions.", "Strategic Sourcing; Tender Management; Procurement Compliance", "eProcurement Portal; ERP Procurement"],
    ["Category Manager", "مدير الفئة", "Procurement Department", "Builds category strategy, market analysis, sourcing calendar, supplier segmentation, and savings pipeline.", "Strategic Sourcing; Category Planning; Spend Analytics", "Data Warehouse; eProcurement Portal"],
    ["Procurement Operations Specialist", "أخصائي عمليات المشتريات", "Shared Services Center", "Supports requisitions, PO follow-up, supplier inquiries, and invoice exceptions.", "Purchase Requisition Support; Purchase Order Management; Invoice Exception Management", "ERP Procurement; eProcurement Portal"],
    ["Vendor Registration Officer", "مسؤول تسجيل الموردين", "Vendor Management Office", "Validates supplier documents, bank details, classification, and onboarding status.", "Vendor Registration; Supplier Master Data Management; Vendor Risk Management", "Supplier Portal; Vendor Registration System"],
    ["Supplier Performance Analyst", "محلل أداء الموردين", "Vendor Management Office", "Maintains vendor scorecards, SLA results, quality incidents, and performance improvement actions.", "Supplier Performance Management; Supplier Relationship Management", "Supplier Portal; Data Warehouse"],
    ["Budget Controller", "مراقب الميزانية", "Finance Department", "Checks budget availability, commitment accounting, and cost center alignment.", "Budget Control; Commitment Accounting", "Budget System; ERP Procurement"],
    ["Accounts Payable Specialist", "أخصائي المدفوعات", "Finance Department", "Performs three-way match, invoice validation, exception routing, and payment readiness checks.", "Invoice Matching; Invoice Exception Management", "ERP Procurement; Budget System"],
    ["Integration Architect", "معماري التكامل", "IT Department", "Owns integration patterns, APIs, identity mapping, monitoring, and data exchange between procurement systems.", "Integration Management; Identity Access Management; Data Governance", "ERP Procurement; Supplier Portal; Data Warehouse; Identity Access Management"],
    ["Contract Manager", "مدير العقود", "Legal Affairs", "Reviews contract templates, amendments, renewals, disputes, and compliance evidence.", "Contract Lifecycle Management; Contract Compliance Management", "Contract Archive; Contract Lifecycle Portal"],
    ["Internal Auditor", "مراجع داخلي", "Internal Audit", "Reviews procurement evidence, approval thresholds, policy exceptions, and segregation of duties.", "Procurement Compliance; Segregation of Duties", "ERP Procurement; eProcurement Portal; Contract Archive"],
]


TXT_CONTENT = """Sovereign AI Platform Procurement Transformation Demo Corpus

This mixed Arabic-English demo package is designed for testing capability extraction, overlap detection, knowledge graph relationships, and AI Copilot reasoning.

Key capabilities included:
Strategic Sourcing, Category Planning, Tender Management, Purchase Requisition Management, Purchase Order Management, Vendor Registration, Supplier Master Data Management, Supplier Performance Management, Supplier Relationship Management, Vendor Risk Management, Contract Lifecycle Management, Contract Repository Management, Contract Compliance Management, Budget Control, Commitment Accounting, Invoice Matching, Invoice Exception Management, Spend Analytics, KPI Management, Data Governance, Integration Management, Identity Access Management, Service Catalog Management, Procurement Compliance, Segregation of Duties, Demand Forecasting.

Key overlaps:
1. ERP Procurement and eProcurement Portal both support requisition intake, approvals, purchase order workflow, and supplier collaboration.
2. Supplier Portal and Vendor Registration System both collect supplier profile, bank details, certificates, onboarding workflow, and risk flags.
3. Contract Archive and Contract Lifecycle Portal both store contract metadata, renewal dates, and compliance evidence.
4. eProcurement Modernization and Vendor Portal Upgrade both target supplier collaboration and onboarding workflow.
5. Procurement Department and Shared Services Center both support purchase requisition assistance and operational procurement service requests.

Orphan capabilities:
- Demand Forecasting / إدارة توقعات الطلب is required for category planning but has no clear owner.
- Category Planning is performed by category managers but is not formally assigned in the organization structure.

Finance relationships:
Finance Department governs Budget Control, Commitment Accounting, Invoice Matching, Spend Analytics, and payment readiness. Budget System supports ERP Procurement checks. Data Warehouse consumes procurement and finance data for KPI reporting.
"""


def write_docx(path: Path, title: str, paragraphs: list[str]) -> None:
    body = [f"<w:p><w:r><w:t>{html.escape(title)}</w:t></w:r></w:p>"]
    for paragraph in paragraphs:
        body.append(f"<w:p><w:r><w:t>{html.escape(paragraph)}</w:t></w:r></w:p>")
    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(body)}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""")
        z.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""")
        z.writestr("word/document.xml", document)


def column_name(index: int) -> str:
    name = ""
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def write_xlsx(path: Path, rows: list[list[str]]) -> None:
    sheet_rows = []
    for r_idx, row in enumerate(rows, start=1):
        cells = []
        for c_idx, value in enumerate(row, start=1):
            ref = f"{column_name(c_idx)}{r_idx}"
            cells.append(f'<c r="{ref}" t="inlineStr"><is><t>{html.escape(str(value))}</t></is></c>')
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')
    sheet = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>{''.join(sheet_rows)}</sheetData>
</worksheet>"""
    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Demo Data" sheetId="1" r:id="rId1"/></sheets>
</workbook>"""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>""")
        z.writestr("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""")
        z.writestr("xl/_rels/workbook.xml.rels", """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>""")
        z.writestr("xl/workbook.xml", workbook)
        z.writestr("xl/worksheets/sheet1.xml", sheet)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    org_paragraphs = [
        "Government Procurement Transformation Program / برنامج تحول المشتريات الحكومية.",
        "The organization structure links departments, mandates, capabilities, systems, roles, KPIs, and governance responsibilities.",
    ]
    org_paragraphs.extend(f"{en} ({ar}): {mandate}" for en, ar, mandate in ORG_STRUCTURE)
    write_docx(OUT / "01_organization_structure_procurement_transformation.docx", "Organization Structure - Procurement Transformation", org_paragraphs)

    sop_paragraphs = [
        "Procurement SOP and Source-to-Pay Process / إجراءات المشتريات وسير العمل من التوريد إلى الدفع.",
        "This SOP intentionally contains duplicated functions and orphan capabilities for MVP testing.",
    ]
    sop_paragraphs.extend(f"{title}: {text}" for title, text in SOP_SECTIONS)
    write_docx(OUT / "02_procurement_sop_source_to_pay.docx", "Procurement SOP - Source to Pay", sop_paragraphs)

    write_xlsx(OUT / "03_systems_inventory_procurement.xlsx", SYSTEMS)
    write_xlsx(OUT / "04_projects_and_initiatives.xlsx", PROJECTS)
    write_xlsx(OUT / "05_roles_responsibilities_matrix.xlsx", ROLES)
    (OUT / "06_procurement_transformation_test_corpus.txt").write_text(TXT_CONTENT, encoding="utf-8")

    print(f"Generated demo data in {OUT}")


if __name__ == "__main__":
    main()
