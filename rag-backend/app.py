import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from ingestion import ingest_pdf  # your existing ingestion module
from summarization import summarize_book  # the code we wrote above
from mongo_utils import (
    get_pdf,
    append_message,
    get_conversation,
    list_conversations,
    get_or_create_conversation_for_document,
)
from Main_pipeline import answer_question
from task_handlers import handle_summarize, handle_flashcards, handle_mcq
import uuid
from flask_cors import CORS

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# -----------------------------
# Helper
# -----------------------------
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_user_access(user_id: str, document_id: str):
    """
    Validate that user_id is present and user has access to the document.
    
    Args:
        user_id: User identifier
        document_id: Document identifier
    
    Returns:
        tuple: (is_valid: bool, error_message: str or None, pdf_doc: dict or None)
    """
    if not user_id:
        return False, "user_id is required", None
    
    if not document_id:
        return False, "document_id is required", None
    
    # Verify document exists and belongs to user
    pdf_doc = get_pdf(document_id, user_id)
    if not pdf_doc:
        return False, "Document not found or access denied", None
    
    return True, None, pdf_doc

@app.route("/guest/upload-pdf", methods=["POST"])
def guest_upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "PDF file missing"}), 400

    file = request.files["file"]
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)
    guest_doc_id = str(uuid.uuid4())

    file_path = os.path.join(
        app.config["UPLOAD_FOLDER"],
        f"{guest_doc_id}_{filename}"
    )
    file.save(file_path)

    # IMPORTANT: reuse your SAME ingestion logic
    ingest_pdf(file_path, user_id="guest", document_id=guest_doc_id)

    return jsonify({
        "document_id": guest_doc_id,
        "message": "Guest PDF uploaded successfully"
    })


@app.route("/guest/rag", methods=["POST"])
def guest_rag():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    task = data.get("task", "qa")
    query = data.get("query")
    document_id = data.get("document_id")
    options = data.get("options", {})

    if not query or not document_id:
        return jsonify({"error": "query and document_id required"}), 400

    top_k = int(options.get("top_k", 5))

    # 🔒 RAG CORE UNCHANGED
    if task == "qa":
        return jsonify(
            answer_question(
                question=query,
                user_id="guest",
                document_id=document_id,
                top_k=top_k
            )
        )

    if task == "summary":
        return jsonify(
            handle_summarize(
                query=query,
                user_id="guest",
                document_id=document_id,
                summary_length=options.get("summary_length", "medium"),
                top_k=top_k
            )
        )

    if task == "flashcards":
        return jsonify(
            handle_flashcards(
                query=query,
                user_id="guest",
                document_id=document_id,
                num_flashcards=int(options.get("num_flashcards", 5)),
                top_k=top_k
            )
        )

    if task == "mcq":
        return jsonify(
            handle_mcq(
                query=query,
                user_id="guest",
                document_id=document_id,
                num_mcqs=int(options.get("num_mcqs", 5)),
                difficulty=options.get("difficulty", "medium"),
                top_k=top_k
            )
        )

    return jsonify({"error": "Invalid task"}), 400

# -----------------------------
# 1. Unified RAG endpoint with task routing
# -----------------------------
@app.route("/rag", methods=["POST"])
def unified_rag():
    """
    Unified RAG endpoint that handles QA, summarization, flashcards, and MCQ generation.
    
    Expected input structure:
    {
        "user_id": "string (required)",
        "task": "qa | summarize | flashcards | mcq (default: qa)",
        "source": {
            "type": "pdf",
            "id": "document_id_or_filename"
        },
        "query": "user topic or instruction",
        "options": {
            "summary_length": "short | medium | long",
            "num_flashcards": integer,
            "num_mcqs": integer,
            "difficulty": "easy | medium | hard",
            "top_k": integer (default: 5)
        }
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400
    
    # Extract and validate user_id
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    # Extract task (default to qa)
    task = data.get("task", "qa").lower()
    valid_tasks = ["qa", "summarize", "flashcards", "mcq"]
    if task not in valid_tasks:
        return jsonify({
            "error": f"Invalid task. Must be one of: {', '.join(valid_tasks)}"
        }), 400
    
    # Extract source
    source = data.get("source", {})
    source_type = source.get("type", "pdf")
    document_id = source.get("id")
    
    if source_type != "pdf":
        return jsonify({"error": "Only 'pdf' source type is currently supported"}), 400
    
    if not document_id:
        return jsonify({"error": "source.id (document_id) is required"}), 400
    
    # Validate user access
    is_valid, error_msg, pdf_doc = validate_user_access(user_id, document_id)
    if not is_valid:
        return jsonify({"error": error_msg}), 404
    
    # Extract query
    query = data.get("query", "")
    if not query:
        return jsonify({"error": "query is required"}), 400
    
    # Extract options
    options = data.get("options", {})
    top_k = int(options.get("top_k", 5))
    
    try:
        # Route based on task
        if task == "qa":
            # Use existing QA pipeline
            result = answer_question(query, user_id, document_id, top_k=top_k)
            
            # Get or create conversation for this document
            conversation_id = get_or_create_conversation_for_document(user_id, document_id)
            
            # Persist conversation turns
            append_message(conversation_id, user_id, "user", query, document_id=document_id)
            append_message(
                conversation_id,
                user_id,
                "assistant",
                result["answer"],
                document_id=document_id,
                context=result.get("context_used"),
            )
            
            return jsonify({
                "task": "qa",
                "conversation_id": conversation_id,
                "document_id": document_id,
                "answer": result["answer"],
                "context_used": result.get("context_used", []),
            })
        
        elif task == "summarize":
            summary_length = options.get("summary_length", "medium")
            if summary_length not in ["short", "medium", "long"]:
                summary_length = "medium"
            
            result = handle_summarize(
                query=query,
                user_id=user_id,
                document_id=document_id,
                summary_length=summary_length,
                top_k=top_k
            )
            
            return jsonify({
                "task": "summarize",
                "document_id": document_id,
                "query": query,
                "summary_length": summary_length,
                **result
            })
        
        elif task == "flashcards":
            num_flashcards = int(options.get("num_flashcards", 5))
            if num_flashcards < 1 or num_flashcards > 50:
                num_flashcards = 5
            
            result = handle_flashcards(
                query=query,
                user_id=user_id,
                document_id=document_id,
                num_flashcards=num_flashcards,
                top_k=top_k
            )
            
            return jsonify({
                "task": "flashcards",
                "document_id": document_id,
                "query": query,
                "num_flashcards": num_flashcards,
                **result
            })
        
        elif task == "mcq":
            num_mcqs = int(options.get("num_mcqs", 5))
            if num_mcqs < 1 or num_mcqs > 50:
                num_mcqs = 5
            
            difficulty = options.get("difficulty", "medium")
            if difficulty not in ["easy", "medium", "hard"]:
                difficulty = "medium"
            
            result = handle_mcq(
                query=query,
                user_id=user_id,
                document_id=document_id,
                num_mcqs=num_mcqs,
                difficulty=difficulty,
                top_k=top_k
            )
            
            return jsonify({
                "task": "mcq",
                "document_id": document_id,
                "query": query,
                "num_mcqs": num_mcqs,
                "difficulty": difficulty,
                **result
            })
    
    except Exception as exc:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in unified_rag ({task}): {error_details}")
        return jsonify({
            "error": str(exc),
            "details": error_details if app.debug else None
        }), 500


# -----------------------------
# 2. Debug route
# -----------------------------
@app.route("/debug-routes", methods=["GET"])
def debug_routes():
    return {
        "routes": [str(rule) for rule in app.url_map.iter_rules()]
    }


# -----------------------------
# 2. Upload PDF and ingest
# -----------------------------
@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "PDF file missing"}), 400

    file = request.files["file"]
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    user_id = request.form.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)

    result = ingest_pdf(file_path, user_id)
    document_id = result.get("document_id")
    
    # Create a conversation for this document automatically
    conversation_id = get_or_create_conversation_for_document(user_id, document_id)

    return jsonify({
        "message": "PDF ingested successfully",
        "details": result,
        "conversation_id": conversation_id
    })


# -----------------------------
# 3. Chapter-wise summarization
# -----------------------------
@app.route("/summarize", methods=["POST"])
def summarize_pdf():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    document_id = data.get("document_id")
    user_id = data.get("user_id")
    level = data.get("level", 2)  # default detailed summary

    if not document_id or not user_id:
        return jsonify({"error": "document_id and user_id required"}), 400

    pdf_doc = get_pdf(document_id, user_id)
    if not pdf_doc:
        return jsonify({"error": "PDF not found"}), 404

    # Extract text chunks
    chunks = [c["text"] for c in pdf_doc["chunks"]]

    # Chapter-wise summaries
    summaries = summarize_book(chunks, level)

    return jsonify({
        "document_id": document_id,
        "file_name": pdf_doc["file_name"],
        "level": level,
        "chapter_summaries": summaries
    })


# -----------------------------
# 4. RAG query with conversation tracking
# -----------------------------
@app.route("/rag-query", methods=["POST"])
def rag_query():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON body required"}), 400

    question = data.get("question")
    user_id = data.get("user_id")
    document_id = data.get("document_id")
    top_k = int(data.get("top_k", 5))

    if not question or not user_id or not document_id:
        return jsonify({"error": "question, user_id, and document_id are required"}), 400

    # Verify document exists and belongs to user
    pdf_doc = get_pdf(document_id, user_id)
    if not pdf_doc:
        return jsonify({"error": "Document not found or access denied"}), 404

    # Get or create conversation for this document
    conversation_id = get_or_create_conversation_for_document(user_id, document_id)

    try:
        result = answer_question(question, user_id, document_id, top_k=top_k)
    except Exception as exc:  # pragma: no cover - runtime safety
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in rag_query: {error_details}")  # Log for debugging
        return jsonify({
            "error": str(exc),
            "details": error_details if app.debug else None
        }), 500

    # Persist conversation turns
    append_message(conversation_id, user_id, "user", question, document_id=document_id)
    append_message(
        conversation_id,
        user_id,
        "assistant",
        result["answer"],
        document_id=document_id,
        context=result.get("context_used"),
    )

    convo = get_conversation(conversation_id, user_id)
    return jsonify({
        "conversation_id": conversation_id,
        "document_id": document_id,
        "answer": result["answer"],
        "context_used": result.get("context_used", []),
        "messages": convo.get("messages", []) if convo else [],
    })


# -----------------------------
# 5. Conversation listing
# -----------------------------
@app.route("/conversations", methods=["GET"])
def conversations():
    user_id = request.args.get("user_id")
    document_id = request.args.get("document_id")  # Optional filter
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    return jsonify(list_conversations(user_id, document_id=document_id))


# -----------------------------
# 6. Single conversation fetch
# -----------------------------
@app.route("/conversations/<conversation_id>", methods=["GET"])
def get_conversation_route(conversation_id):
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    convo = get_conversation(conversation_id, user_id)
    if not convo:
        return jsonify({"error": "conversation not found"}), 404
    return jsonify(convo)


@app.route("/documents", methods=["GET"])
def list_documents():
    """List all documents for a user."""
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    from mongo_client import pdf_collection
    cursor = pdf_collection.find(
        {"user_id": user_id},
        {
            "_id": 0,
            "document_id": 1,
            "file_name": 1,
            "uploaded_at": 1,
        },
    ).sort("uploaded_at", -1)
    
    documents = list(cursor)
    return jsonify(documents)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

