import re

def MakeChunks(
    RawText,
    max_words=180,
    overlap_words=50
):
    """
    Create overlapping text chunks suitable for RAG.
    """

    # Clean text
    RawText = re.sub(r"\s+", " ", RawText).strip()
    if not RawText:
        return []

    words = RawText.split()
    chunks = []

    start = 0
    while start < len(words):
        end = start + max_words
        chunk_words = words[start:end]
        chunk_text = " ".join(chunk_words).strip()
        if chunk_text:
            chunks.append(chunk_text)
        start = end - overlap_words  # <-- OVERLAP (CRITICAL)

        if start < 0:
            start = 0

    return chunks
