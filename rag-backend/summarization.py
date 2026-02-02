import re
from typing import List, Dict
import google.genai as genai
import os

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

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
# 3. Split chunks into chapters/units
# -----------------------------
def split_by_chapters(chunks: List[str]) -> Dict[str, List[str]]:
    """
    Heuristic chapter detection based on headings like "Chapter X", "Unit X", or all-uppercase lines.
    Returns a dict {chapter_title: [chunk1, chunk2, ...]}
    """
    chapters = {}
    current_chapter = "Introduction"
    chapters[current_chapter] = []

    for chunk in chunks:
        # Ignore front-matter
        if is_front_matter(chunk):
            continue

        # Detect heading
        heading_match = re.search(r"^(CHAPTER|UNIT|SECTION)\s*\d*[:.-]?\s*(.*)", chunk, re.I)
        if heading_match:
            chapter_name = heading_match.group(0).strip()
            current_chapter = chapter_name
            if current_chapter not in chapters:
                chapters[current_chapter] = []
            continue

        # Also treat all-uppercase short lines as potential chapter titles
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
# 4. Summarize each chapter/unit
# -----------------------------
def summarize_unit(chunks: List[str], level: int) -> str:
    """
    Summarizes all chunks in one unit into a single summary.
    Uses ONE call per unit to stay quota-safe.
    """
    if not chunks:
        return ""

    # Limit chunks to first 8 for free-tier safety
    content = "\n\n".join(chunks[:8])

    prompt = f"""
You are an expert academic book summarizer.

TASK:
{LEVEL_INSTRUCTIONS[level]}

CRITICAL OUTPUT RULES (MUST FOLLOW STRICTLY):
- Write a continuous narrative summary in paragraph form only
- DO NOT list definitions
- DO NOT explain terms individually
- DO NOT use JSON, key-value pairs, dictionaries, or structured formats
- DO NOT use bullet points, numbering, headings, or subheadings
- DO NOT include glossaries or labeled sections
- DO NOT restate the question or task

CONTENT RULES:
- Use ONLY the provided content
- Do NOT introduce external knowledge
- Ignore authors, publishers, acknowledgements, copyrights, or metadata
- Maintain a neutral, academic, explanatory tone
- Connect ideas logically as a flowing narrative

CONTENT TO SUMMARIZE:
{content}

FINAL OUTPUT:
Return ONLY the narrative summary text.
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text.strip()

# -----------------------------
# 5. Full book summarization
# -----------------------------
def summarize_book(chunks: List[str], level: int = 2) -> Dict[str, Dict]:
    """
    Returns chapter/unit wise summaries with the requested level.
    Example output:
    {
        "Introduction": {"level": 2, "summary": "..."},
        "CHAPTER 1: XYZ": {"level": 2, "summary": "..."},
        ...
    }
    """
    chapters = split_by_chapters(chunks)
    summaries = {}

    for chapter_title, chapter_chunks in chapters.items():
        summary_text = summarize_unit(chapter_chunks, level)
        summaries[chapter_title] = {
            "level": level,
            "summary": summary_text
        }

    return summaries
