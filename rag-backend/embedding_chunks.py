import os
from sentence_transformers import SentenceTransformer

# Cache the model globally to avoid reloading
_model_cache = None

def embedded_chunks(Chunks):
    global _model_cache
    
    if _model_cache is None:
        # Try multiple possible paths for the model
        possible_paths = [
            "../Quora_stsb_finetune",
            "Quora_stsb_finetune",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "Quora_stsb_finetune"),
        ]
        
        model_path = None
        for path in possible_paths:
            if os.path.exists(path):
                model_path = path
                break
        
        if model_path is None:
            raise FileNotFoundError(f"Model not found. Tried: {possible_paths}")
        
        _model_cache = SentenceTransformer(model_path)
    
    model = _model_cache

    embeddings = model.encode(
        Chunks,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True
    )
    return embeddings