from pydantic import BaseModel


class ExtractedCapabilityUpdate(BaseModel):
    name: str | None = None
    standardized_name: str | None = None
    domain: str | None = None
    area: str | None = None
    capability: str | None = None
    sub_capability: str | None = None
    capability_type: str | None = None
    description: str | None = None
    keywords: list[str] | None = None
    ontology_match_type: str | None = None
    reviewer_notes: str | None = None


class MergeRequest(BaseModel):
    source_ids: list[str]
    standardized_name: str


class ChatRequest(BaseModel):
    question: str
    language: str | None = None


class ChatResponse(BaseModel):
    direct_answer: str
    supporting_evidence: list[dict]
    related_graph_entities: list[dict]
    confidence_score: float
    suggested_follow_up_questions: list[str]
