import re
from typing import List, Dict
import requests

# -----------------------------
# Ollama helper
# -----------------------------
def ask_ollama(prompt: str, model: str = "mistral") -> str:
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
        )
        return response.json().get("response", "").strip()
    except Exception as e:
        return f"Error calling Ollama: {str(e)}"


# -----------------------------
# 1. Front-matter filtering
# -----------------------------
FRONT_MATTER_PATTERNS = [
    r"isbn", r"copyright", r"all rights reserved", r"published by",
    r"edition", r"printing", r"acknowledg(e)?ments?", r"preface",
    r"how to use", r"license", r"distribution", r"publisher",
    r"typeset", r"impression"
]

def is_front_matter(text: str) -> bool:
    text = text.lower()
    return any(re.search(p, text) for p in FRONT_MATTER_PATTERNS)


# -----------------------------
# 2. Level instructions
# -----------------------------
LEVEL_INSTRUCTIONS = {
    0: "Write a single-paragraph high-level narrative summary of this section.",
    1: "Write a concise narrative summary covering key ideas and events.",
    2: "Write a detailed narrative summary explaining the flow of ideas, events, and themes."
}


# -----------------------------
# 3. Split chunks into chapters
# -----------------------------
def split_by_chapters(chunks: List[str]) -> Dict[str, List[str]]:
    chapters = {}
    current_chapter = "Introduction"
    chapters[current_chapter] = []

    for chunk in chunks:
        if is_front_matter(chunk):
            continue

        heading_match = re.search(r"^(CHAPTER|UNIT|SECTION)\s*\d*[:.-]?\s*(.*)", chunk, re.I)
        if heading_match:
            current_chapter = heading_match.group(0).strip()
            if current_chapter not in chapters:
                chapters[current_chapter] = []
            continue

        lines = chunk.splitlines()
        if lines and len(lines[0].strip()) < 60 and lines[0].isupper():
            current_chapter = lines[0].strip()
            if current_chapter not in chapters:
                chapters[current_chapter] = []
            chapters[current_chapter].append("\n".join(lines[1:]))
        else:
            chapters[current_chapter].append(chunk)

    return chapters


# -----------------------------
# 4. Summarize each unit
# -----------------------------
def summarize_unit(chunks: List[str], level: int) -> str:

    if not chunks:
        return ""

    content = "\n\n".join(chunks[:8])

    # ⚠️ Important for local models
    content = content[:4000]

    prompt = f"""
You are an expert academic book summarizer.

TASK:
{LEVEL_INSTRUCTIONS[level]}

STRICT RULES:
- Only paragraph format
- No bullets, no lists, no headings
- No JSON or structured output
- No definitions list
- Keep it narrative and flowing

CONTENT:
{content}

FINAL OUTPUT:
Only the summary paragraph.
"""

    return ask_ollama(prompt)


# -----------------------------
# 5. Full book summarization
# -----------------------------
def summarize_book(chunks: List[str], level: int = 2) -> Dict[str, Dict]:

    chapters = split_by_chapters(chunks)
    summaries = {}

    for chapter_title, chapter_chunks in chapters.items():
        summary_text = summarize_unit(chapter_chunks, level)

        summaries[chapter_title] = {
            "level": level,
            "summary": summary_text
        }

    return summaries