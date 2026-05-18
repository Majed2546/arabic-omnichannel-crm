from __future__ import annotations

from dataclasses import dataclass
import re


ARABIC_OPERATIONAL_VERBS = [
    "إعداد",
    "تخطيط",
    "تطوير",
    "تحليل",
    "إدارة",
    "متابعة",
    "تقييم",
    "تشغيل",
    "تنسيق",
    "دعم",
    "مراقبة",
    "تنفيذ",
    "رصد",
    "تحسين",
    "حوكمة",
    "اعتماد",
    "مراجعة",
]

VERB_TO_ENGLISH = {
    "إعداد": "Preparation",
    "تخطيط": "Planning",
    "تطوير": "Development",
    "تحليل": "Analysis",
    "إدارة": "Management",
    "متابعة": "Monitoring",
    "تقييم": "Evaluation",
    "تشغيل": "Operations",
    "تنسيق": "Coordination",
    "دعم": "Support",
    "مراقبة": "Monitoring",
    "تنفيذ": "Execution",
    "رصد": "Monitoring",
    "تحسين": "Improvement",
    "حوكمة": "Governance",
    "اعتماد": "Approval",
    "مراجعة": "Review",
}


@dataclass(frozen=True)
class OntologyCapability:
    domain_ar: str
    domain_en: str
    area_ar: str
    area_en: str
    name_ar: str
    name_en: str
    keywords: tuple[str, ...]
    verbs: tuple[str, ...]
    synonyms: tuple[str, ...] = ()

    def terms(self) -> tuple[str, ...]:
        return self.keywords + self.synonyms + (self.name_ar, self.name_en)


ONTOLOGY_CAPABILITIES: tuple[OntologyCapability, ...] = (
    OntologyCapability("الموارد البشرية", "Human Resources", "استراتيجية وحوكمة الموارد البشرية", "HR Strategy and Governance", "إدارة سياسات الموارد البشرية", "HR Policy Management", ("سياسات الموارد البشرية", "سياسة الموارد البشرية", "hr policy", "employee policy"), ("إعداد", "إدارة", "مراجعة", "حوكمة"), ("لوائح الموارد البشرية", "إجراءات الموارد البشرية")),
    OntologyCapability("الموارد البشرية", "Human Resources", "تخطيط القوى العاملة", "Workforce Planning", "تخطيط القوى العاملة", "Workforce Planning", ("تخطيط القوى العاملة", "تخطيط الموارد البشرية", "manpower planning", "workforce planning", "headcount planning"), ("تخطيط", "تحليل", "إعداد"), ("الاحتياج الوظيفي", "القوى العاملة")),
    OntologyCapability("الموارد البشرية", "Human Resources", "خدمات الموظفين", "Employee Experience", "إدارة خدمات الموظفين", "Employee Services Management", ("خدمات الموظفين", "الخدمات الذاتية", "employee services", "self service", "hr services"), ("إدارة", "تقديم", "دعم", "تشغيل"), ("شؤون الموظفين", "طلبات الموظفين")),
    OntologyCapability("الموارد البشرية", "Human Resources", "التعلم والتطوير", "Learning and Development", "إدارة التدريب", "Training Management", ("التدريب", "خطة التدريب", "training plan", "learning management", "training management"), ("إدارة", "تخطيط", "تنفيذ", "تقييم"), ("التطوير الوظيفي", "برامج التدريب")),
    OntologyCapability("الموارد البشرية", "Human Resources", "علاقات الموظفين", "Employee Relations", "إدارة الشكاوى والتظلمات", "Complaints and Grievances Management", ("الشكاوى", "التظلمات", "grievances", "complaints"), ("إدارة", "متابعة", "مراجعة", "معالجة"), ("تظلمات الموظفين", "شكاوى الموظفين")),
    OntologyCapability("الموارد البشرية", "Human Resources", "التحول الرقمي للموارد البشرية", "HR Digital Transformation", "دعم التطبيقات الرقمية للموارد البشرية", "HR Digital Transformation Support", ("أتمتة الموارد البشرية", "تحول الموارد البشرية الرقمي", "digital hr", "hr automation"), ("دعم", "تطوير", "تحسين", "تشغيل"), ("أنظمة الموارد البشرية", "منصة الموارد البشرية")),
    OntologyCapability("المشتريات", "Procurement", "التوريد وإدارة الموردين", "Sourcing and Supplier Management", "إدارة التوريد الاستراتيجي", "Strategic Sourcing", ("التوريد الاستراتيجي", "تخطيط التوريد", "strategic sourcing", "source-to-contract"), ("تخطيط", "إدارة", "تحليل"), ("استراتيجية التوريد", "sourcing strategy")),
    OntologyCapability("المشتريات", "Procurement", "التوريد وإدارة الموردين", "Sourcing and Supplier Management", "إدارة أداء الموردين", "Supplier Performance Management", ("أداء الموردين", "تقييم الموردين", "supplier performance", "vendor scorecard"), ("تقييم", "متابعة", "تحليل", "رصد"), ("بطاقة أداء المورد", "تصنيف الموردين")),
    OntologyCapability("المشتريات", "Procurement", "التوريد وإدارة الموردين", "Sourcing and Supplier Management", "إدارة تسجيل الموردين", "Vendor Registration", ("تسجيل الموردين", "تأهيل الموردين", "vendor registration", "supplier onboarding"), ("إدارة", "اعتماد", "مراجعة"), ("اعتماد الموردين", "بيانات الموردين")),
    OntologyCapability("المشتريات", "Procurement", "عمليات الشراء", "Purchasing Operations", "إدارة طلبات الشراء", "Purchase Requisition Management", ("طلبات الشراء", "طلب شراء", "purchase requisition", "requisition"), ("إدارة", "اعتماد", "متابعة"), ("احتياجات الشراء", "طلبات التوريد")),
    OntologyCapability("المشتريات", "Procurement", "عمليات الشراء", "Purchasing Operations", "إدارة أوامر الشراء", "Purchase Order Management", ("أوامر الشراء", "أمر شراء", "purchase order", "po approval"), ("إدارة", "اعتماد", "متابعة"), ("إصدار أوامر الشراء", "أمر التوريد")),
    OntologyCapability("المشتريات", "Procurement", "العقود", "Contracting", "إدارة دورة حياة العقود", "Contract Lifecycle Management", ("العقود", "دورة حياة العقود", "contract lifecycle", "contract compliance", "contract archive"), ("إدارة", "متابعة", "حوكمة", "مراجعة"), ("أرشفة العقود", "اعتماد العقود")),
    OntologyCapability("المالية", "Finance", "الرقابة المالية", "Financial Control", "ضبط الميزانية", "Budget Control", ("الميزانية", "اعتماد الميزانية", "budget control", "budget availability"), ("مراقبة", "اعتماد", "إدارة", "تحليل"), ("البنود المالية", "الاعتمادات")),
    OntologyCapability("المالية", "Finance", "الحسابات الدائنة", "Accounts Payable", "مطابقة الفواتير", "Invoice Matching", ("مطابقة الفواتير", "الفواتير", "invoice matching", "three-way match"), ("مراجعة", "مطابقة", "اعتماد"), ("فواتير الموردين", "الصرف")),
    OntologyCapability("المالية", "Finance", "تحليل الإنفاق", "Spend Management", "تحليل الإنفاق", "Spend Analytics", ("تحليل الإنفاق", "spend analytics", "spend visibility"), ("تحليل", "رصد", "متابعة"), ("بيانات الإنفاق", "مصروفات")),
    OntologyCapability("تقنية المعلومات", "Information Technology", "إدارة المنصات", "Enterprise Platforms", "إدارة أنظمة تخطيط الموارد", "ERP Management", ("نظام تخطيط الموارد", "erp", "enterprise resource planning"), ("إدارة", "تشغيل", "دعم"), ("نظام الموارد", "منصة erp")),
    OntologyCapability("تقنية المعلومات", "Information Technology", "التكامل", "Integration Management", "إدارة التكامل", "Integration Management", ("التكامل", "واجهات الربط", "api", "integration"), ("إدارة", "تطوير", "تشغيل", "دعم"), ("تكامل الأنظمة", "خدمات التكامل")),
    OntologyCapability("تقنية المعلومات", "Information Technology", "الأمن والصلاحيات", "Identity and Access", "إدارة الهوية والصلاحيات", "Identity Access Management", ("الصلاحيات", "الهوية", "access management", "identity management"), ("إدارة", "حوكمة", "مراجعة"), ("إدارة المستخدمين", "صلاحيات المستخدمين")),
    OntologyCapability("الإعلام والاتصال", "Media and Communications", "الاتصال المؤسسي", "Corporate Communications", "إدارة الاتصال المؤسسي", "Corporate Communications Management", ("الاتصال المؤسسي", "corporate communications", "communication plan"), ("إدارة", "تنسيق", "إعداد"), ("التواصل المؤسسي", "رسائل الجهة")),
    OntologyCapability("الإعلام والاتصال", "Media and Communications", "المحتوى الإعلامي", "Media Content", "إدارة المحتوى الإعلامي", "Media Content Management", ("المحتوى الإعلامي", "النشر", "media content", "publishing"), ("إعداد", "تطوير", "مراجعة", "نشر"), ("المواد الإعلامية", "المحتوى الرقمي")),
    OntologyCapability("الإعلام والاتصال", "Media and Communications", "الرصد الإعلامي", "Media Monitoring", "رصد وتحليل الإعلام", "Media Monitoring and Analysis", ("الرصد الإعلامي", "تحليل الإعلام", "media monitoring", "sentiment analysis"), ("رصد", "تحليل", "متابعة"), ("متابعة التغطيات", "قياس الأثر الإعلامي")),
    OntologyCapability("التخطيط والاستراتيجية", "Strategy and Planning", "التخطيط المؤسسي", "Enterprise Planning", "إدارة التخطيط الاستراتيجي", "Strategic Planning Management", ("التخطيط الاستراتيجي", "الخطة الاستراتيجية", "strategic planning"), ("تخطيط", "إعداد", "متابعة"), ("الأهداف الاستراتيجية", "مبادرات الخطة")),
    OntologyCapability("التخطيط والاستراتيجية", "Strategy and Planning", "قياس الأداء", "Performance Management", "إدارة قياس الأداء", "Performance Management", ("مؤشرات الأداء", "قياس الأداء", "performance management", "kpi"), ("رصد", "متابعة", "تقييم", "تحليل"), ("لوحات الأداء", "تقارير الأداء")),
    OntologyCapability("القانونية والالتزام", "Legal and Compliance", "الالتزام", "Compliance", "إدارة الالتزام", "Compliance Management", ("الالتزام", "compliance", "regulatory compliance"), ("حوكمة", "مراجعة", "متابعة", "تقييم"), ("الامتثال", "المتطلبات النظامية")),
    OntologyCapability("القانونية والالتزام", "Legal and Compliance", "الشؤون القانونية", "Legal Affairs", "إدارة الاستشارات القانونية", "Legal Advisory Management", ("الاستشارات القانونية", "العقود القانونية", "legal advisory", "legal review"), ("مراجعة", "إعداد", "دعم"), ("الرأي القانوني", "المذكرات القانونية")),
    OntologyCapability("العمليات", "Operations", "تشغيل الخدمات", "Service Operations", "إدارة تشغيل الخدمات", "Service Operations Management", ("تشغيل الخدمات", "service operations", "operations management"), ("تشغيل", "متابعة", "تحسين", "إدارة"), ("استمرارية الخدمة", "العمليات اليومية")),
    OntologyCapability("إدارة الأصول", "Asset Management", "دورة حياة الأصول", "Asset Lifecycle", "إدارة الأصول", "Asset Management", ("الأصول", "asset management", "asset lifecycle"), ("إدارة", "رصد", "متابعة", "صيانة"), ("جرد الأصول", "سجل الأصول")),
    OntologyCapability("سلاسل الإمداد", "Supply Chain", "المخزون والإمداد", "Inventory and Supply", "إدارة المخزون", "Inventory Management", ("المخزون", "inventory management", "stock control"), ("إدارة", "مراقبة", "تحليل"), ("المستودعات", "توفر المواد")),
    OntologyCapability("الصيانة", "Maintenance", "تخطيط الصيانة", "Maintenance Planning", "إدارة الصيانة", "Maintenance Management", ("الصيانة", "maintenance management", "maintenance planning"), ("تخطيط", "تنفيذ", "متابعة", "تحسين"), ("أوامر الصيانة", "الصيانة الوقائية")),
)


def normalize_text(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"[\u064B-\u065F\u0670]", "", value)
    value = value.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    value = value.replace("ى", "ي").replace("ة", "ه")
    return " ".join(value.casefold().strip().split())


def ontology_domains() -> list[dict]:
    domains: dict[str, dict] = {}
    for item in ONTOLOGY_CAPABILITIES:
        domain = domains.setdefault(
            item.domain_en,
            {
                "arabic_name": item.domain_ar,
                "english_name": item.domain_en,
                "areas": {},
            },
        )
        area = domain["areas"].setdefault(
            item.area_en,
            {
                "arabic_name": item.area_ar,
                "english_name": item.area_en,
                "capabilities": [],
            },
        )
        area["capabilities"].append(capability_payload(item))
    return [
        {
            **domain,
            "areas": list(domain["areas"].values()),
        }
        for domain in domains.values()
    ]


def capability_payload(item: OntologyCapability) -> dict:
    return {
        "arabic_name": item.name_ar,
        "english_name": item.name_en,
        "domain_arabic": item.domain_ar,
        "domain_english": item.domain_en,
        "area_arabic": item.area_ar,
        "area_english": item.area_en,
        "keywords": list(item.keywords),
        "typical_verbs": list(item.verbs),
        "synonyms": list(item.synonyms),
    }


def find_capability_by_standard_name(name: str, domain: str | None = None, area: str | None = None) -> OntologyCapability | None:
    incoming = normalize_text(name)
    incoming_domain = normalize_text(domain)
    incoming_area = normalize_text(area)
    for item in ONTOLOGY_CAPABILITIES:
        if normalize_text(item.name_en) != incoming and normalize_text(item.name_ar) != incoming:
            continue
        if incoming_domain and incoming_domain not in {normalize_text(item.domain_en), normalize_text(item.domain_ar)}:
            continue
        if incoming_area and incoming_area not in {normalize_text(item.area_en), normalize_text(item.area_ar)}:
            continue
        return item
    return None
