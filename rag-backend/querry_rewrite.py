import os
from dotenv import load_dotenv
import google.genai as genai

# Load env once
load_dotenv()

# Initialize Gemini client once
client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY")
)

def query_rewrite(question: str, max_queries: int = 8) -> list[str]:
    """
    Rewrite a user question into diverse, high-quality
    search queries for RAG retrieval.
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
- If the question is biographical or narrative:
  • include implicit fact queries
  • include third-person and first-person variants
- Prefer entity-centered queries over vague phrases
- One query per line
- Do not number the queries
- Do not include any extra text

Question:
{question}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    # Clean, deduplicate, and enforce max count
    queries = []
    seen = set()

    for line in response.text.split("\n"):
        q = line.strip()
        if q and q.lower() not in seen:
            queries.append(q)
            seen.add(q.lower())
        if len(queries) >= max_queries:
            break

    # Fallback safety (never return empty list)
    if not queries:
        queries = [question]

    return queries
