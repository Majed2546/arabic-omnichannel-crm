import httpx

from app.config import settings


def synthesize_with_ollama(question: str, draft_answer: str, evidence: list[dict], related: list[dict]) -> str:
    prompt = f"""
You are an offline sovereign enterprise architecture copilot.
Answer only from the provided draft, evidence, and graph entities.
Do not invent capabilities, owners, systems, or projects.

Question:
{question}

Draft answer:
{draft_answer}

Evidence:
{evidence}

Related graph entities:
{related}
"""
    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": settings.ollama_model, "prompt": prompt, "stream": False},
            timeout=8,
        )
        response.raise_for_status()
        text = response.json().get("response", "").strip()
        return text or draft_answer
    except Exception:
        return draft_answer
