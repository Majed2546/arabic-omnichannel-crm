from __future__ import annotations

from dataclasses import dataclass
import re

from app.ontology.library import ARABIC_OPERATIONAL_VERBS, ONTOLOGY_CAPABILITIES, VERB_TO_ENGLISH, OntologyCapability, normalize_text
from app.ontology.naming import CAPABILITY_NAMING_RULES, infer_capability_domain_area, standardize_capability_names


EXTRACTION_PROMPT_GUIDANCE = """
Act as an Enterprise Architect, Business Capability Consultant, and Organizational Design Expert.
Extract enduring business capabilities, not responsibility sentences or literal translations.
Prefer concise Arabic names of two to four words, with a maximum of five words.
Infer the business domain from context instead of using literal labels such as Enterprise Management.
Use professional capability patterns such as إدارة، تخطيط، تحليل، تطوير، تشغيل، تنسيق، مراقبة، دعم.
""" + "\n".join(f"- {rule}" for rule in CAPABILITY_NAMING_RULES)



@dataclass
class CapabilityCandidate:
    name: str
    standardized_name: str
    original_name: str
    domain: str
    area: str
    capability: str
    sub_capability: str | None
    evidence_quote: str
    confidence: float
    ontology_match: bool
    match_score: int
    extraction_type: str


@dataclass
class ExtractionDebug:
    sections: list[str]
    organization_units: list[str]
    tasks: list[str]
    candidate_capabilities: list[dict]
    ontology_matches: list[dict]
    unmatched_candidates: list[dict]
    saved_capabilities_count: int = 0


def extract_with_debug(text: str) -> tuple[list[CapabilityCandidate], ExtractionDebug]:
    sections = detect_sections(text)
    organization_units = detect_organization_units(text)
    tasks = detect_tasks(text)
    candidates: list[CapabilityCandidate] = []

    for sentence in tasks:
        candidates.extend(_candidates_from_sentence(sentence))

    for item in ONTOLOGY_CAPABILITIES:
        if any(_contains_term(text, term) for term in item.terms()):
            evidence = _best_evidence_sentence(text, item)
            candidates.append(_matched_candidate(item, evidence, _score_match(evidence, item), "ontology_keyword"))

    deduped = _dedupe_candidates(candidates)
    matches = [candidate for candidate in deduped if candidate.ontology_match]
    unmatched = [candidate for candidate in deduped if not candidate.ontology_match]
    debug = ExtractionDebug(
        sections=sections,
        organization_units=organization_units,
        tasks=tasks,
        candidate_capabilities=[
            {
                "name": item.name,
                "standardized_name": item.standardized_name,
                "original_name": item.original_name,
                "domain": item.domain,
                "area": item.area,
                "evidence": item.evidence_quote,
                "extraction_type": item.extraction_type,
            }
            for item in deduped
        ],
        ontology_matches=[
            {
                "candidate": item.name,
                "standardized_name": item.standardized_name,
                "domain": item.domain,
                "area": item.area,
                "score": item.match_score,
            }
            for item in matches
        ],
        unmatched_candidates=[
            {
                "candidate": item.name,
                "standardized_name": item.standardized_name,
                "evidence": item.evidence_quote,
            }
            for item in unmatched
        ],
    )
    return deduped, debug


def extract_capabilities(text: str) -> list[CapabilityCandidate]:
    candidates, _debug = extract_with_debug(text)
    return candidates


def detect_sections(text: str) -> list[str]:
    sections: list[str] = []
    for raw_line in text.splitlines():
        line = " ".join(raw_line.strip().split())
        if not line or len(line) > 90:
            continue
        if line.endswith(":") or re.search(r"(الإدارة|القسم|الوحدة|المهام|المسؤوليات|الخدمات|العمليات|المبادرات|systems|services|responsibilities)", line, re.IGNORECASE):
            sections.append(line.rstrip(":"))
    return _unique(sections)[:30]


def detect_organization_units(text: str) -> list[str]:
    pattern = r"(?:إدارة|قسم|وحدة|مكتب|وكالة|إدارة عامة)\s+[\u0600-\u06FF\w\s]{2,55}"
    stop_words = "|".join(re.escape(verb) for verb in ARABIC_OPERATIONAL_VERBS)
    units = [clean_phrase(re.split(rf"\s+(?:{stop_words})\s+", match.group(0))[0]) for match in re.finditer(pattern, text)]
    return _unique([unit for unit in units if len(unit.split()) <= 8])[:30]


def detect_tasks(text: str) -> list[str]:
    sentences = split_sentences(text)
    task_sentences = []
    for sentence in sentences:
        normalized = normalize_text(sentence)
        if any(normalize_text(verb) in normalized.split() or normalized.startswith(normalize_text(verb)) for verb in ARABIC_OPERATIONAL_VERBS):
            task_sentences.append(sentence)
            continue
        if re.search(r"(responsible for|manage|monitor|evaluate|plan|operate|support|develop|analyze)", sentence, re.IGNORECASE):
            task_sentences.append(sentence)
    return _unique(task_sentences)[:80]


def split_sentences(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!؟؛:])\s+|\n+|[\u2022\-]\s+", text)
    return [clean_phrase(chunk) for chunk in chunks if 18 <= len(clean_phrase(chunk)) <= 420]


def clean_phrase(value: str) -> str:
    value = re.sub(r"\s+", " ", value.replace("\t", " ")).strip(" .،,:؛-")
    return value


def _candidates_from_sentence(sentence: str) -> list[CapabilityCandidate]:
    candidates: list[CapabilityCandidate] = []
    matched_library = _best_library_match(sentence)
    if matched_library:
        item, score = matched_library
        candidates.append(_matched_candidate(item, sentence, score, "ontology_rule"))

    for match in re.finditer(r"تقديم\s+خدمات\s+([\u0600-\u06FF\w\s]{3,70})", sentence):
        noun = _trim_candidate_noun(match.group(1))
        if not noun:
            continue
        library_match = _best_library_match(f"خدمات {noun}. {sentence}")
        if library_match:
            item, score = library_match
            candidates.append(_matched_candidate(item, sentence, score, "business_service_pattern"))
        else:
            candidates.append(_proposed_candidate("دعم", f"خدمات {noun}", sentence))

    for verb in ARABIC_OPERATIONAL_VERBS:
        pattern = rf"{re.escape(verb)}\s+([\u0600-\u06FF\w\s]{{3,70}})"
        for match in re.finditer(pattern, sentence):
            noun = _trim_candidate_noun(match.group(1))
            if not noun:
                continue
            phrase = clean_phrase(f"{verb} {noun}")
            library_match = _best_library_match(f"{phrase}. {sentence}")
            if library_match:
                item, score = library_match
                candidates.append(_matched_candidate(item, sentence, score, "ontology_pattern"))
            else:
                candidates.append(_proposed_candidate(verb, noun, sentence))
    return candidates


def _matched_candidate(item: OntologyCapability, evidence: str, score: int, extraction_type: str) -> CapabilityCandidate:
    return CapabilityCandidate(
        name=item.name_ar,
        standardized_name=item.name_en,
        original_name=item.name_ar,
        domain=item.domain_en,
        area=item.area_en,
        capability=item.name_en,
        sub_capability=None,
        evidence_quote=clean_phrase(evidence),
        confidence=0.84 if score >= 4 else 0.76,
        ontology_match=True,
        match_score=score,
        extraction_type=extraction_type,
    )


def _proposed_candidate(verb: str, noun: str, evidence: str) -> CapabilityCandidate:
    original_name = clean_phrase(f"{verb} {noun}")
    arabic_name, standardized = standardize_capability_names(original_name, None)
    domain, domain_area = infer_capability_domain_area(f"{original_name} {standardized} {evidence}")
    area = domain_area if domain_area else _area_for_verb(verb)
    return CapabilityCandidate(
        name=arabic_name,
        standardized_name=standardized,
        original_name=original_name,
        domain=domain,
        area=area,
        capability=standardized,
        sub_capability=None,
        evidence_quote=clean_phrase(evidence),
        confidence=0.62,
        ontology_match=False,
        match_score=0,
        extraction_type="proposed_new",
    )


def _best_library_match(text: str) -> tuple[OntologyCapability, int] | None:
    scored = [(_score_match(text, item), item) for item in ONTOLOGY_CAPABILITIES]
    score, item = max(scored, key=lambda value: value[0])
    return (item, score) if score >= 2 else None


def _score_match(text: str, item: OntologyCapability) -> int:
    normalized = normalize_text(text)
    score = 0
    for term in item.keywords:
        if normalize_text(term) and normalize_text(term) in normalized:
            score += 3
    for term in item.synonyms:
        if normalize_text(term) and normalize_text(term) in normalized:
            score += 2
    for verb in item.verbs:
        if normalize_text(verb) in normalized:
            score += 1
    if normalize_text(item.name_ar) in normalized or normalize_text(item.name_en) in normalized:
        score += 4
    return score


def _contains_term(text: str, term: str) -> bool:
    return normalize_text(term) in normalize_text(text)


def _best_evidence_sentence(text: str, item: OntologyCapability) -> str:
    sentences = split_sentences(text)
    if not sentences:
        return clean_phrase(text[:260])
    return max(sentences, key=lambda sentence: _score_match(sentence, item))


def _trim_candidate_noun(noun: str) -> str:
    noun = re.split(r"(?:،|\.|؛| و(?:إعداد|تخطيط|تطوير|تحليل|إدارة|متابعة|تقييم|تشغيل|تنسيق|دعم|مراقبة|تنفيذ|رصد|تحسين|حوكمة|اعتماد|مراجعة)\s+)", noun)[0]
    noun = re.sub(r"\b(?:من خلال|بما يشمل|وفق|حسب|بالتنسيق مع|بناء على)\b.*", "", noun)
    words = clean_phrase(noun).split()
    return " ".join(words[:6]).strip()


def _area_for_verb(verb: str) -> str:
    if verb == "تخطيط":
        return "Planning"
    if verb == "تحليل":
        return "Analysis"
    if verb in {"متابعة", "مراقبة", "رصد"}:
        return "Monitoring"
    if verb == "تقييم":
        return "Evaluation"
    if verb in {"تطوير", "تحسين"}:
        return "Development and Improvement"
    if verb == "تشغيل":
        return "Operations"
    if verb == "حوكمة":
        return "Governance"
    return "General Management"




def _dedupe_candidates(candidates: list[CapabilityCandidate]) -> list[CapabilityCandidate]:
    unique: dict[tuple[str, str, str], CapabilityCandidate] = {}
    for candidate in candidates:
        key = (normalize_text(candidate.standardized_name), normalize_text(candidate.domain), normalize_text(candidate.area))
        current = unique.get(key)
        if current is None or _rank_candidate(candidate) > _rank_candidate(current):
            unique[key] = candidate
    return list(unique.values())


def _rank_candidate(candidate: CapabilityCandidate) -> tuple[int, int, int]:
    return (1 if candidate.ontology_match else 0, candidate.match_score, len(candidate.evidence_quote))


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        key = normalize_text(value)
        if key and key not in seen:
            seen.add(key)
            output.append(value)
    return output
