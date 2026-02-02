"""
Prompt templates for different RAG tasks.
All prompts enforce context-only responses and JSON output.
"""


def get_summarization_prompt(context: str, query: str, summary_length: str = "medium") -> str:
    length_instruction = {
        "short": "2-3 sentences.",
        "medium": "1-2 paragraphs.",
        "long": "3-5 paragraphs."
    }.get(summary_length, "1-2 paragraphs.")

    return f"""
You are an expert summarization assistant.

CRITICAL OUTPUT RULES (MANDATORY):
- Output MUST be valid JSON
- Escape all quotation marks inside strings using \\\"
- Do NOT include markdown, explanations, or text outside JSON
- If the context is insufficient, return empty strings and empty arrays
- NEVER invent information

TASK:
Summarize the content strictly using ONLY the provided context.
Focus on the topic: "{query}"
Length guideline: {length_instruction}

Return ONLY this JSON object:
{{
  "summary": "paragraph-style narrative summary",
  "key_points": ["point 1", "point 2"],
  "definitions": {{
    "term": "definition"
  }}
}}

Context:
{context}

JSON RESPONSE:
""".strip()



def get_flashcard_prompt(context: str, query: str, num_flashcards: int = 5) -> str:
    num_flashcards = min(num_flashcards, 5)  # Gemini safety cap

    return f"""
You are a study assistant.

CRITICAL OUTPUT RULES (MANDATORY):
- Output MUST be valid JSON
- Escape all quotation marks using \\\"
- Do NOT include markdown or commentary
- Do NOT truncate output
- If unable to generate, return an empty JSON array: []

TASK:
Generate exactly {num_flashcards} flashcards using ONLY the provided context.
Each flashcard must cover ONE concept.
Focus on the topic: "{query}"

Return ONLY a JSON array in this format:
[
  {{
    "front": "question or term",
    "back": "short factual explanation"
  }}
]

Context:
{context}

JSON RESPONSE:
""".strip()

def get_mcq_prompt(context: str, query: str, num_mcqs: int = 5, difficulty: str = "medium") -> str:
    num_mcqs = min(num_mcqs, 5)

    difficulty_instruction = {
        "easy": "Questions should be direct and factual.",
        "medium": "Questions should require understanding.",
        "hard": "Questions should require careful reasoning."
    }.get(difficulty, "Questions should require understanding.")

    return f"""
You are an exam question generator.

CRITICAL OUTPUT RULES (MANDATORY):
- Output MUST be valid JSON
- Escape all quotation marks using \\\"
- Do NOT include markdown or commentary
- Do NOT truncate output
- If generation fails, return an empty JSON array: []

TASK:
Generate exactly {num_mcqs} multiple-choice questions.
Focus on the topic: "{query}"
Difficulty: {difficulty_instruction}

RULES:
- Use ONLY the provided context
- Exactly 4 options (A, B, C, D)
- Only ONE correct answer
- Explanation must be brief and factual

Return ONLY a JSON array in this format:
[
  {{
    "question": "question text",
    "options": {{
      "A": "option text",
      "B": "option text",
      "C": "option text",
      "D": "option text"
    }},
    "correct": "A",
    "explanation": "why this option is correct"
  }}
]

Context:
{context}

JSON RESPONSE:
""".strip()

