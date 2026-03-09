import os
import numpy as np
from dotenv import load_dotenv
from pinecone import Pinecone
import google.genai as genai

from embedding_chunks import embedded_chunks
from querry_rewrite import query_rewrite

# --------------------------------------------------
# Setup
# --------------------------------------------------
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("shared-rag")

client = genai.Client(
    api_key=os.getenv("GOOGLE_API_KEY")
)

def answer_question(question: str, user_id: str, document_id: str, top_k: int = 15):
    """
    Run RAG pipeline and return answer
    
    Args:
        question: User's question
        user_id: User identifier
        document_id: Document identifier to filter embeddings
        top_k: Number of chunks to retrieve
    """

    # 1. Rewrite query
    rewritten_queries = query_rewrite(question)

    # 2. Embed rewritten queries
    query_embeddings = embedded_chunks(rewritten_queries)
    
    # Ensure query_embeddings is a numpy array
    if not isinstance(query_embeddings, np.ndarray):
        query_embeddings = np.array(query_embeddings)

    # 3. Pinecone retrieval - filter by document_id in metadata
    retrieved_chunks = []
    namespace = f"user-{user_id}"

    # Iterate over each query embedding
    for i, q_emb in enumerate(query_embeddings):
        # Convert numpy array to list
        query_vector = q_emb.tolist() if hasattr(q_emb, 'tolist') else list(q_emb)
        
        # Query without filter first (more reliable), then filter by document_id
        try:
            res = index.query(
                vector=query_vector,
                top_k=top_k * 5,  # Get more results to filter by document_id
                include_metadata=True,
                namespace=namespace
            )
        except Exception as e:
            print(f"Error querying Pinecone: {e}")
            continue

        for match in res.get("matches", []):
            # Filter by document_id in metadata
            metadata = match.get("metadata", {})
            if metadata.get("document_id") == document_id:
                chunk_text = metadata.get("text")
                if chunk_text:
                    retrieved_chunks.append(chunk_text)

    # Deduplicate while preserving order
    seen = set()
    unique_chunks = []
    for chunk in retrieved_chunks:
        if chunk not in seen:
            seen.add(chunk)
            unique_chunks.append(chunk)
    
    retrieved_chunks = unique_chunks

    # 4. Limit context
    context_chunks = retrieved_chunks[:top_k]
    
    if not context_chunks:
        return {
            "answer": "I don't know. No relevant information found in the document for this question.",
            "context_used": []
        }
    
    context = "\n\n".join(context_chunks)

    # 5. Prompt
    final_prompt = f"""
You are an expert reading-comprehension assistant.

Answer the question using ONLY the information in the provided context.
You MUST analyze the context carefully and infer the answer if the information
is present, even if it is spread across multiple parts of the context.

Instructions:
- Use only the given context.
- Do NOT use outside knowledge.
- Do NOT invent facts.
- If the answer is explicitly stated or can be logically inferred from the context,
  provide a clear, confident, and complete explanation.
- After answering, assign a confidence score (0-100%) based solely on how strongly
  the provided context supports the answer.
- Use high confidence (80-100%) only when the context directly and clearly supports
  the answer.
- Use medium confidence (40-79%) when the answer is inferred but not explicitly stated.
- Use low confidence (1-39%) when the context provides weak or partial support.
- Respond with "I don't know" and confidence 0% only if the context contains no
  relevant information at all.

Context:
{context}

Question:
{question}

Answer (with explanation and confidence %):

"""

    # 6. LLM call
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=final_prompt
        )
        
        # Handle response - check if it has text attribute
        if hasattr(response, 'text'):
            answer_text = response.text.strip()
        elif hasattr(response, 'candidates') and response.candidates:
            answer_text = response.candidates[0].content.parts[0].text.strip()
        else:
            answer_text = str(response).strip()
            
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
