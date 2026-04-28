"""
Task handlers for different RAG tasks: summarize, flashcards, MCQ.
All handlers use the shared retrieval pipeline and enforce JSON output.
"""

import json
import re
import requests
from dotenv import load_dotenv
from retrieval_utils import retrieve_context
from prompt_templates import (
    get_summarization_prompt,
    get_flashcard_prompt,
    get_mcq_prompt
)

load_dotenv()


# --------------------------------------------------
# 🔁 Replace Gemini with Ollama
# --------------------------------------------------
def _call_llm(prompt: str, model: str = "mistral") -> str:
    """
    Call Ollama local LLM and return text response
    """
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
        raise Exception(f"Error calling LLM: {str(e)}")


# --------------------------------------------------
# JSON parser (unchanged)
# --------------------------------------------------
def _parse_json_response(text: str):

    text = text.strip()

    # Remove ```json blocks
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Remove trailing commas
    text = re.sub(r",\s*(\}|\])", r"\1", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
        raise Exception(f"Failed to parse JSON response: {str(e)}\nResponse: {text[:500]}")


# --------------------------------------------------
# Summarization
# --------------------------------------------------
def handle_summarize(
    query: str,
    user_id: str,
    document_id: str,
    summary_length: str = "medium",
    top_k: int = 5
) -> dict:

    context = retrieve_context(query, user_id, document_id, top_k=top_k)

    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "overview": "",
            "key_points": [],
            "definitions": {}
        }

    context = context[:4000]  # ⚠️ important for local models

    prompt = get_summarization_prompt(context, query, summary_length)

    response_text = _call_llm(prompt)

    result = _parse_json_response(response_text)

    return {
        "summary": result.get("summary", result.get("overview", "")),
        "key_points": result.get("key_points", []),
        "definitions": result.get("definitions", {})
    }


# --------------------------------------------------
# Flashcards
# --------------------------------------------------
def handle_flashcards(
    query: str,
    user_id: str,
    document_id: str,
    num_flashcards: int = 5,
    top_k: int = 5
) -> dict:

    context = retrieve_context(query, user_id, document_id, top_k=top_k)

    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "flashcards": []
        }

    context = context[:4000]

    prompt = get_flashcard_prompt(context, query, num_flashcards)

    response_text = _call_llm(prompt)

    result = _parse_json_response(response_text)

    flashcards = result if isinstance(result, list) else result.get("flashcards", [])

    validated_flashcards = []
    for card in flashcards[:num_flashcards]:
        if isinstance(card, dict) and "front" in card and "back" in card:
            validated_flashcards.append({
                "front": card["front"],
                "back": card["back"]
            })

    return {
        "flashcards": validated_flashcards
    }


# --------------------------------------------------
# MCQs
# --------------------------------------------------
def handle_mcq(
    query: str,
    user_id: str,
    document_id: str,
    num_mcqs: int = 5,
    difficulty: str = "medium",
    top_k: int = 5
) -> dict:

    context = retrieve_context(query, user_id, document_id, top_k=top_k)

    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "mcqs": []
        }

    context = context[:4000]

    prompt = get_mcq_prompt(context, query, num_mcqs, difficulty)

    response_text = _call_llm(prompt)

    result = _parse_json_response(response_text)

    mcqs = result if isinstance(result, list) else result.get("mcqs", [])

    validated_mcqs = []
    for mcq in mcqs[:num_mcqs]:
        if isinstance(mcq, dict) and "question" in mcq and "options" in mcq and "correct" in mcq:

            options = mcq["options"]

            if isinstance(options, dict):
                validated_mcqs.append({
                    "question": mcq["question"],
                    "options": {
                        "A": options.get("A", ""),
                        "B": options.get("B", ""),
                        "C": options.get("C", ""),
                        "D": options.get("D", "")
                    },
                    "correct": mcq["correct"],
                    "explanation": mcq.get("explanation", "")
                })

    return {
        "mcqs": validated_mcqs
    }