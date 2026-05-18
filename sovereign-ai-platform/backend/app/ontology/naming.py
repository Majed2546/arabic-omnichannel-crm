from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class CapabilityNameSuggestion:
    original_arabic: str
    suggested_arabic: str
    suggested_english: str


CAPABILITY_NAMING_RULES = (
    "Capability name is not a responsibility sentence.",
    "Capability name represents an enduring business ability.",
    "Arabic names should prefer two to four words and stay under five words unless necessary.",
    "Use enterprise nouns such as management, planning, analysis, governance, support, monitoring, and operations.",
    "Do not translate enterprise labels literally; infer the business domain from context.",
    "Think like an Enterprise Architect, Business Capability Consultant, and Organizational Design Expert.",
)


VERB_PREFIX_EN = {
    "إعداد": "Management",
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
    "تنفيذ": "Management",
    "رصد": "Monitoring",
    "تحسين": "Improvement",
    "حوكمة": "Governance",
    "اعتماد": "Approval",
    "مراجعة": "Review",
}

ARABIC_STOP_PHRASES = [
    "الخاصة ب",
    "الخاصة بال",
    "المتعلقة ب",
    "المتعلقة بال",
    "من خلال",
    "بما يشمل",
    "بالتعاون مع",
    "بالتنسيق مع",
    "حسب",
    "وفق",
    "وذلك",
    "على مستوى",
    "قصيرة وطويلة المدى",
    "داخل الجهة",
    "على مستوى الجهة",
    "بشكل دوري",
    "بشكل مستمر",
]

ARABIC_TRAILING_DETAIL_MARKERS = [
    " عبر ",
    " من أجل ",
    " بهدف ",
    " لضمان ",
    " لتحسين ",
    " بما يضمن ",
    " وبما ",
]

ARABIC_WEAK_PREFIXES = (
    "القيام ب",
    "المساهمة في",
    "العمل على",
    "مسؤولية",
    "المشاركة في",
    "الإشراف على",
)

ENTERPRISE_ARABIC_PREFIXES = {"إدارة", "تخطيط", "تحليل", "تطوير", "تنسيق", "تشغيل", "حوكمة", "دعم", "مراقبة", "تقييم", "رصد", "تمكين", "ضبط", "مطابقة"}

DOMAIN_INFERENCE_RULES: tuple[tuple[str, str, str], ...] = (
    ("Human Resources", "HR Management", "الموارد البشرية|الموظفين|القوى العاملة|الكوادر|الوظيفية|التدريب|التظلمات|الشكاوى|الخدمات الذاتية|hr|employee|workforce|training"),
    ("Media and Communications", "Media and Communications", "الإعلام|الاتصال|التواصل|المحتوى|النشر|التغطيات|الرصد الإعلامي|media|communications|content|publishing"),
    ("Procurement", "Procurement Management", "المشتريات|الشراء|الموردين|التوريد|المناقصات|العقود|procurement|purchase|supplier|vendor|sourcing|tender"),
    ("Finance", "Financial Management", "المالية|الميزانية|الفواتير|الإنفاق|الصرف|المحاسبة|finance|budget|invoice|spend|accounting"),
    ("Information Technology", "Technology Management", "تقنية المعلومات|الأنظمة|النظام|التطبيقات|المنصات|التكامل|الصلاحيات|الهوية|it|system|application|platform|integration|access"),
)

STANDARD_ARABIC_NAMES = [
    (("سياسات الموارد البشرية", "لوائح الموارد البشرية", "إجراءات الموارد البشرية", "السياسات واللوائح", "السياسات والإجراءات"), "إدارة سياسات الموارد البشرية", "HR Policy Management"),
    (("الملفات الوظيفية", "الملف الوظيفي", "ملفات الموظفين", "بيانات الموظفين", "ملفات وظيفية", "الأنظمة الإلكترونية للموارد"), "إدارة الملفات الوظيفية", "Employee Records Management"),
    (("بيانات الموارد البشرية", "بيانات القوى العاملة", "سجلات الموظفين"), "إدارة بيانات الموظفين", "Employee Data Management"),
    (("القوى العاملة", "الموارد البشرية", "الاحتياج الوظيفي"), "تخطيط القوى العاملة", "Workforce Planning"),
    (("خدمات الموظفين", "طلبات الموظفين", "الخدمات الذاتية"), "إدارة خدمات الموظفين", "Employee Services Management"),
    (("التدريب", "برامج تعليمية", "تعليمية تخصصية", "التعليم والتدريب", "التأهيل"), "إدارة التدريب المتخصص", "Specialized Training Management"),
    (("الشكاوى", "التظلمات"), "إدارة الشكاوى والتظلمات", "Complaints and Grievances Management"),
    (("تمكين الكوادر", "الكوادر البشرية"), "تمكين الكوادر", "Workforce Enablement"),
    (("التحول المؤسسي", "مشاريع التحول"), "التحول المؤسسي", "Enterprise Transformation"),
    (("المحتوى الإعلامي", "المواد الإعلامية"), "إدارة المحتوى الإعلامي", "Media Content Management"),
    (("الرصد الإعلامي", "تحليل الإعلام", "التغطيات الإعلامية"), "رصد وتحليل الإعلام", "Media Monitoring and Analysis"),
    (("تحليل المحتوى", "تحليل التغطيات", "قياس الأثر الإعلامي"), "تحليل الإعلام", "Media Analysis"),
    (("الخطط الإعلامية", "التخطيط الإعلامي"), "تخطيط الإعلام", "Media Planning"),
    (("الاتصال المؤسسي", "التواصل المؤسسي"), "إدارة الاتصال المؤسسي", "Corporate Communications Management"),
    (("الموردين", "تسجيل الموردين", "تأهيل الموردين"), "إدارة الموردين", "Supplier Management"),
    (("أوامر الشراء",), "إدارة أوامر الشراء", "Purchase Order Management"),
    (("طلبات الشراء",), "إدارة طلبات الشراء", "Purchase Requisition Management"),
    (("العقود", "دورة حياة العقود"), "إدارة العقود", "Contract Management"),
    (("الفواتير",), "مطابقة الفواتير", "Invoice Matching"),
    (("الميزانية",), "ضبط الميزانية", "Budget Control"),
    (("الإنفاق",), "تحليل الإنفاق", "Spend Analytics"),
    (("التكامل", "واجهات الربط"), "إدارة التكامل", "Integration Management"),
    (("الصلاحيات", "الهوية"), "إدارة الصلاحيات", "Access Management"),
]


def standardize_capability_names(arabic_name: str, english_name: str | None = None) -> tuple[str, str]:
    suggestion = suggest_capability_names(arabic_name, english_name)
    return suggestion.suggested_arabic, suggestion.suggested_english


def infer_capability_domain_area(value: str, fallback_domain: str | None = None, fallback_area: str | None = None) -> tuple[str, str]:
    normalized = _normalize_for_match(value)
    fallback_domain = _clean(fallback_domain)
    fallback_area = _clean(fallback_area)
    if fallback_domain and fallback_domain not in {"Enterprise Management", "الإدارة المؤسسية"}:
        if fallback_area:
            return fallback_domain, fallback_area
    for domain, area, pattern in DOMAIN_INFERENCE_RULES:
        terms = [_normalize_for_match(term) for term in pattern.split("|")]
        if any(term and term in normalized for term in terms):
            return domain, area
    if fallback_domain and fallback_domain not in {"Enterprise Management", "الإدارة المؤسسية"}:
        return fallback_domain, fallback_area or "General Management"
    return "Operations", fallback_area or "Business Operations"


def suggest_capability_names(arabic_name: str, english_name: str | None = None) -> CapabilityNameSuggestion:
    compact_arabic = compact_arabic_capability_name(arabic_name)
    combined = f"{arabic_name} {compact_arabic} {english_name or ''}".casefold()
    for terms, arabic, english in STANDARD_ARABIC_NAMES:
        if any(term.casefold() in combined for term in terms):
            return CapabilityNameSuggestion(_clean(arabic_name), arabic, english)
    return CapabilityNameSuggestion(_clean(arabic_name), compact_arabic, compact_english_capability_name(english_name, compact_arabic))


def compact_arabic_capability_name(value: str) -> str:
    text = _clean(value)
    text = _normalize_arabic_spelling(text)
    for phrase in ARABIC_STOP_PHRASES:
        text = re.split(re.escape(phrase), text)[0].strip()
    for marker in ARABIC_TRAILING_DETAIL_MARKERS:
        text = text.split(marker, 1)[0].strip()
    text = re.sub(rf"^({'|'.join(re.escape(prefix) for prefix in ARABIC_WEAK_PREFIXES)})\s+", "", text)
    text = re.sub(r"\b(الخاصة|المتعلقة|الشاملة|المتكاملة|المختلفة|الدورية|المستمرة)\b", "", text)
    text = re.sub(r"\b(قصيرة|طويلة|المدى|التخصصية|المهنية|المؤسسية|ذات|العلاقة)\b", "", text)
    text = text.replace("إعداد وتحديث", "إدارة").replace("اعداد وتحديث", "إدارة")
    text = text.replace("إعداد ومراجعة", "إدارة").replace("تحديث وتطوير", "تطوير")
    text = text.replace("تنفيذ برامج تعليمية", "إدارة التدريب")
    text = text.replace("دعم مشاريع التحول المؤسسي عبر تمكين الكوادر", "تمكين الكوادر")
    text = text.replace("السياسات واللوائح", "السياسات")
    text = text.replace("السياسات والإجراءات", "السياسات")
    text = text.replace("الملفات الوظيفية والأنظمة الإلكترونية للموارد", "إدارة الملفات الوظيفية")
    text = text.replace("الأنظمة الإلكترونية للموارد البشرية", "أنظمة الموارد البشرية")
    text = text.replace("الموارد البشرية البشرية", "الموارد البشرية")
    text = _clean(text)
    text = _dedupe_adjacent_words(text)

    words = text.split()
    if len(words) > 5:
        words = _shorten_words(words)
    return _clean(" ".join(words))


def compact_english_capability_name(value: str | None, arabic_name: str) -> str:
    if value and " Capability - " not in value and len(value.split()) <= 5:
        return value.strip()
    action = "Management"
    first_word = arabic_name.split()[0] if arabic_name else ""
    action = VERB_PREFIX_EN.get(first_word, action)
    topic = " ".join(arabic_name.split()[1:] or arabic_name.split())
    return f"{_romanize_topic(topic)} {action}".strip()


def _shorten_words(words: list[str]) -> list[str]:
    preferred = []
    for word in words:
        if word in {"و", "أو", "عبر", "مع", "في", "من", "على", "إلى", "عن", "لدى", "الخاصة", "المتعلقة"}:
            continue
        preferred.append(word)
    if preferred and preferred[0] not in ENTERPRISE_ARABIC_PREFIXES:
        if any(word in preferred for word in ["سياسات", "برامج", "خدمات", "طلبات", "أوامر", "محتوى", "الخطط"]):
            preferred.insert(0, "إدارة")
    return preferred[:5]


def _romanize_topic(value: str) -> str:
    mapping = {
        "سياسات الموارد البشرية": "HR Policy",
        "القوى العاملة": "Workforce",
        "خدمات الموظفين": "Employee Services",
        "الملفات الوظيفية": "Employee Records",
        "بيانات الموظفين": "Employee Data",
        "التدريب": "Training",
        "التدريب المتخصص": "Specialized Training",
        "تمكين الكوادر": "Workforce Enablement",
        "التحول المؤسسي": "Enterprise Transformation",
        "المحتوى الإعلامي": "Media Content",
        "الإعلام": "Media",
        "الموردين": "Supplier",
        "العقود": "Contract",
        "الميزانية": "Budget",
        "الإنفاق": "Spend",
        "التكامل": "Integration",
        "الاتصال المؤسسي": "Corporate Communications",
        "المحتوى الإعلامي": "Media Content",
        "تحليل الإعلام": "Media Analysis",
    }
    cleaned = _clean(value)
    return mapping.get(cleaned, "Business")


def _clean(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"[/:|]+", " ", value)
    value = re.sub(r"\s+", " ", value).strip(" .،,:؛-")
    return value


def _normalize_arabic_spelling(value: str) -> str:
    return value.replace("اعداد", "إعداد").replace("ادارة", "إدارة").replace("تخطيط و", "تخطيط ")


def _dedupe_adjacent_words(value: str) -> str:
    words = value.split()
    output: list[str] = []
    for word in words:
        if output and output[-1] == word:
            continue
        output.append(word)
    return " ".join(output)


def _normalize_for_match(value: str | None) -> str:
    if not value:
        return ""
    value = re.sub(r"[\u064B-\u065F\u0670]", "", value)
    value = value.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    value = value.replace("ى", "ي").replace("ة", "ه")
    return " ".join(value.casefold().strip().split())
