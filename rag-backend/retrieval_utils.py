"""
Shared retrieval utilities for RAG tasks.
Reuses the existing retrieval pipeline from Main_pipeline.py
"""

import numpy as np
from pinecone_client import index
from embedding_chunks import embedded_chunks
from querry_rewrite import query_rewrite


def retrieve_context(
    query: str,
    user_id: str,
    document_id: str,
    top_k: int = 5
) -> str:
    """
    Retrieve relevant context chunks using the existing RAG retrieval pipeline.
    
    This function reuses the exact same retrieval logic as answer_question:
    - Query rewriting
    - Embedding generation
    - Pinecone vector search
    - Filtering by document_id and user_id
    
    Args:
        query: User's query or topic
        user_id: User identifier for multi-tenant isolation
        document_id: Document identifier to filter embeddings
        top_k: Number of chunks to retrieve
    
    Returns:
        Combined context string from retrieved chunks
    """
    # 1. Rewrite query (same as Main_pipeline)
    rewritten_queries = query_rewrite(query)

    # 2. Embed rewritten queries (same as Main_pipeline)
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
        return ""
    
    # 5. Combine into single context string
    context = "\n\n".join(context_chunks)
    
    return context
