from typing import TypedDict


class CopilotState(TypedDict):
    question: str
    intent: str


def _infer_intent(state: CopilotState) -> CopilotState:
    question = state["question"].lower()
    if "not owned" in question or "لا يملك" in question or "غير مملوكة" in question:
        intent = "missing_owners"
    elif "systems support" in question or "support procurement" in question or "الأنظمة" in question:
        intent = "supporting_systems"
    elif "projects overlap" in question or "overlap with each other" in question or "تداخل" in question:
        intent = "project_overlaps"
    elif "retiring" in question or "retire" in question or "إيقاف" in question:
        intent = "retirement_impact"
    elif "departments" in question or "department" in question or "إدارات" in question:
        intent = "department_involvement"
    else:
        intent = "corpus_summary"
    return {"question": state["question"], "intent": intent}


def run_grounding_workflow(question: str) -> str:
    try:
        from langgraph.graph import END, StateGraph

        graph = StateGraph(CopilotState)
        graph.add_node("infer_intent", _infer_intent)
        graph.set_entry_point("infer_intent")
        graph.add_edge("infer_intent", END)
        result = graph.compile().invoke({"question": question, "intent": "unknown"})
        return result["intent"]
    except Exception:
        return _infer_intent({"question": question, "intent": "unknown"})["intent"]
