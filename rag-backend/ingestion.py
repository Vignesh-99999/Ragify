import uuid
import numpy as np
from pinecone_client import index
from embedding_chunks import embedded_chunks
from text_extraction import PdfTextExtraction
from Chunking import MakeChunks
from mongo_client import pdf_collection
from datetime import datetime

def ingest_pdf(pdf_path: str, user_id: str,document_id=None):
    """
    Ingest a PDF: create embeddings, upload to Pinecone, and store text/chunks in MongoDB.

    Args:
        pdf_path (str): Path to the PDF file.
        user_id (str): User ID for multi-user support.

    Returns:
        dict: Information about ingestion (document_id, chunk count, MongoDB ID)
    """

    # Generate a unique document ID
    document_id = document_id or str(uuid.uuid4())

    # Extract raw text from PDF
    raw_text = PdfTextExtraction(pdf_path)

    # Split text into chunks
    chunks = MakeChunks(raw_text, max_words=220, overlap_words=60)

    # Create embeddings for chunks
    embeddings = embedded_chunks(chunks)
    embeddings = np.array(embeddings, dtype=np.float32)

    # Pinecone namespace for this user
    namespace = f"user-{user_id}"
    vectors = []

    # Upload each chunk embedding to Pinecone
    for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
        vectors.append((
            f"{document_id}-chunk-{i}",  # unique vector ID
            emb.tolist(),                 # vector values
            {
                "text": chunk,            # chunk text
                "source": pdf_path,
                "user_id": user_id,
                "document_id": document_id
            }
        ))
    index.upsert(vectors=vectors, namespace=namespace)

    # Save PDF text and chunks to MongoDB (without embeddings)
    pdf_doc = {
        "user_id": user_id,
        "document_id": document_id,
        "file_name": pdf_path.split("/")[-1],
        "text": raw_text,
        "chunks": [
            {"chunk_id": i, "text": chunk}
            for i, chunk in enumerate(chunks)
        ],
        "uploaded_at": datetime.utcnow(),
        "namespace": namespace
    }
    mongo_result = pdf_collection.insert_one(pdf_doc)

    return {
        "document_id": document_id,
        "chunks": len(chunks),
        "mongo_id": str(mongo_result.inserted_id)
    }
