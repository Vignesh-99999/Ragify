import requests

def ask_ollama(prompt: str, model: str = "mistral") -> str:
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3
            }
        }
    )
    return response.json().get("response", "").strip()


def query_rewrite(question: str, max_queries: int = 8) -> list[str]:
    """
    Rewrite a user question into diverse, high-quality
    search queries for RAG retrieval using Ollama.
    """

    prompt = f"""
You are generating search queries for a Retrieval-Augmented Generation (RAG) system.

Your goal is to MAXIMIZE retrieval recall while keeping queries precise.

Generate up to {max_queries} semantically distinct search queries.

Guidelines:
- Each query must be grammatically correct
- Avoid minor paraphrases (change structure, not just wording)
- Include both:
  • keyword-style queries
  • natural-language questions
- Include variations and perspectives
- Prefer specific, entity-focused queries
- One query per line
- Do not number the queries
- Do not include any extra text

Question:
{question}
"""

    try:
        response_text = ask_ollama(prompt)
    except Exception:
        return [question]

    # Clean + deduplicate
    queries = []
    seen = set()

    for line in response_text.split("\n"):
        q = line.strip()
        if q and q.lower() not in seen:
            queries.append(q)
            seen.add(q.lower())
        if len(queries) >= max_queries:
            break

    # Fallback safety
    if not queries:
        queries = [question]

    return queries