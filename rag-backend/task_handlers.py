"""
Task handlers for different RAG tasks: summarize, flashcards, MCQ.
All handlers use the shared retrieval pipeline and enforce JSON output.
"""

import json
import os
import google.genai as genai
from dotenv import load_dotenv
from retrieval_utils import retrieve_context
from prompt_templates import (
    get_summarization_prompt,
    get_flashcard_prompt,
    get_mcq_prompt
)

load_dotenv()

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))


def _call_llm(prompt: str, model: str = "gemini-2.5-flash") -> str:
    """
    Helper function to call the LLM and extract text response.
    
    Args:
        prompt: The prompt to send to the LLM
        model: Model name (default: gemini-2.5-flash)
    
    Returns:
        Text response from the LLM
    """
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt
        )
        
        # Handle response - check if it has text attribute
        if hasattr(response, 'text'):
            return response.text.strip()
        elif hasattr(response, 'candidates') and response.candidates:
            return response.candidates[0].content.parts[0].text.strip()
        else:
            return str(response).strip()
    except Exception as e:
        raise Exception(f"Error calling LLM: {str(e)}")


import re

def _parse_json_response(text: str):
    """
    Parse JSON from LLM response, handling markdown code blocks and fixing common issues:
    - Removes ```json``` or ``` blocks
    - Removes trailing commas
    - Supports both objects {} and arrays []
    """
    # Remove markdown code blocks
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Remove trailing commas before closing } or ]
    text = re.sub(r",\s*(\}|\])", r"\1", text)

    # Try to parse
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # If parsing fails, try to extract JSON-like text including arrays
        match = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
        raise Exception(f"Failed to parse JSON response: {str(e)}\nResponse: {text[:500]}")


def handle_summarize(
    query: str,
    user_id: str,
    document_id: str,
    summary_length: str = "medium",
    top_k: int = 5
) -> dict:
    """
    Handle summarization task.
    
    Args:
        query: User's topic or instruction
        user_id: User identifier
        document_id: Document identifier
        summary_length: short | medium | long
        top_k: Number of chunks to retrieve
    
    Returns:
        Dictionary with summary structure: {overview, key_points, definitions}
    """
    # Retrieve context using shared pipeline
    context = retrieve_context(query, user_id, document_id, top_k=top_k)
    
    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "overview": "",
            "key_points": [],
            "definitions": {}
        }
    
    # Get prompt
    prompt = get_summarization_prompt(context, query, summary_length)
    
    # Call LLM
    response_text = _call_llm(prompt)
    
    # Parse JSON response
    result = _parse_json_response(response_text)
    
    # Ensure required fields exist
    return {
        "overview": result.get("overview", ""),
        "key_points": result.get("key_points", []),
        "definitions": result.get("definitions", {})
    }


def handle_flashcards(
    query: str,
    user_id: str,
    document_id: str,
    num_flashcards: int = 5,
    top_k: int = 5
) -> dict:
    """
    Handle flashcard generation task.
    
    Args:
        query: User's topic or instruction
        user_id: User identifier
        document_id: Document identifier
        num_flashcards: Number of flashcards to generate
        top_k: Number of chunks to retrieve
    
    Returns:
        Dictionary with flashcards array: {flashcards: [{front, back}, ...]}
    """
    # Retrieve context using shared pipeline
    context = retrieve_context(query, user_id, document_id, top_k=top_k)
    
    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "flashcards": []
        }
    
    # Get prompt
    prompt = get_flashcard_prompt(context, query, num_flashcards)
    
    # Call LLM
    response_text = _call_llm(prompt)
    
    # Parse JSON response
    result = _parse_json_response(response_text)
    
    # Ensure it's a list
    flashcards = result if isinstance(result, list) else result.get("flashcards", [])
    
    # Validate structure
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


def handle_mcq(
    query: str,
    user_id: str,
    document_id: str,
    num_mcqs: int = 5,
    difficulty: str = "medium",
    top_k: int = 5
) -> dict:
    """
    Handle MCQ generation task.
    
    Args:
        query: User's topic or instruction
        user_id: User identifier
        document_id: Document identifier
        num_mcqs: Number of MCQs to generate
        difficulty: easy | medium | hard
        top_k: Number of chunks to retrieve
    
    Returns:
        Dictionary with MCQs array: {mcqs: [{question, options, correct, explanation}, ...]}
    """
    # Retrieve context using shared pipeline
    context = retrieve_context(query, user_id, document_id, top_k=top_k)
    
    if not context:
        return {
            "error": "No relevant information found in the document for this topic.",
            "mcqs": []
        }
    
    # Get prompt
    prompt = get_mcq_prompt(context, query, num_mcqs, difficulty)
    
    # Call LLM
    response_text = _call_llm(prompt)
    
    # Parse JSON response
    result = _parse_json_response(response_text)
    
    # Ensure it's a list
    mcqs = result if isinstance(result, list) else result.get("mcqs", [])
    
    # Validate structure
    validated_mcqs = []
    for mcq in mcqs[:num_mcqs]:
        if isinstance(mcq, dict) and "question" in mcq and "options" in mcq and "correct" in mcq:
            # Ensure options is a dict with A, B, C, D
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
