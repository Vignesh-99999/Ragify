import os
import numpy as np
import requests
from dotenv import load_dotenv
from pinecone import Pinecone

from embedding_chunks import embedded_chunks
from querry_rewrite import query_rewrite

# --------------------------------------------------
# Setup
# --------------------------------------------------
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("shared-rag")


# --------------------------------------------------
# Ollama LLM Function
# --------------------------------------------------
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


# --------------------------------------------------
# Main RAG Function
# --------------------------------------------------
def answer_question(question: str, user_id: str, document_id: str, top_k: int = 15):

    # 1. Rewrite query (safe fallback)
    try:
        rewritten_queries = query_rewrite(question)
    except:
        rewritten_queries = [question]

    if not rewritten_queries:
        rewritten_queries = [question]

    # 2. Embed queries
    query_embeddings = embedded_chunks(rewritten_queries)

    if not isinstance(query_embeddings, np.ndarray):
        query_embeddings = np.array(query_embeddings)

    # 3. Pinecone retrieval
    retrieved_chunks = []
    namespace = f"user-{user_id}" if user_id else "guest"

    for q_emb in query_embeddings:
        query_vector = q_emb.tolist() if hasattr(q_emb, 'tolist') else list(q_emb)

        try:
            res = index.query(
                vector=query_vector,
                top_k=top_k * 5,
                include_metadata=True,
                namespace=namespace
            )
        except Exception as e:
            print(f"Error querying Pinecone: {e}")
            continue

        for match in res.get("matches", []):
            metadata = match.get("metadata", {})

            if metadata.get("document_id") == document_id:
                chunk_text = metadata.get("text")
                if chunk_text:
                    retrieved_chunks.append(chunk_text)

    # 4. Deduplicate
    seen = set()
    unique_chunks = []

    for chunk in retrieved_chunks:
        if chunk not in seen:
            seen.add(chunk)
            unique_chunks.append(chunk)

    retrieved_chunks = unique_chunks

    # 5. Limit context
    context_chunks = retrieved_chunks[:top_k]

    if not context_chunks:
        return {
            "answer": "I don't know. No relevant information found in the document for this question.",
            "context_used": []
        }

    context = "\n\n".join(context_chunks)

    # Important for local models
    context = context[:4000]

    # 6. Prompt
    final_prompt = f"""
You are an expert reading-comprehension assistant.

Answer the question using ONLY the information in the provided context.
Do NOT use outside knowledge.
Do NOT hallucinate.

- If answer is clearly supported → high confidence
- If partially supported → medium confidence
- If weak → low confidence
- If no info → say "I don't know" with 0% confidence

Context:
{context}

Question:
{question}

Answer (with explanation and confidence %):
"""

    # 7. LLM call (Ollama)
    try:
        answer_text = ask_ollama(final_prompt)
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return {
            "answer": f"Error generating answer: {str(e)}",
            "context_used": context_chunks
        }

    return {
        "answer": answer_text,
        "context_used": context_chunks
    }