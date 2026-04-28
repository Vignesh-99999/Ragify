import os
import jwt
import requests
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.utils import secure_filename

from ingestion import ingest_pdf
from summarization import summarize_book
from Main_pipeline import answer_question
from task_handlers import handle_summarize, handle_flashcards, handle_mcq
from mongo_utils import (
    get_pdf,
    append_message,
    get_conversation,
    list_conversations,
    get_or_create_conversation_for_document,
)
from mongo_client import pdf_collection, conversation_collection

# Load environment variables
load_dotenv()

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"pdf"}
JWT_SECRET = os.getenv("JWT_SECRET", "")
HF_API_KEY = os.getenv("HF_API_KEY", "")
HF_ASSISTANT_MODEL = os.getenv(
    "HF_ASSISTANT_MODEL", "meta-llama/Llama-3.2-1B-Instruct"
)

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# -----------------------------
# Auth
# -----------------------------
def require_auth(func):
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token missing"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.user_id = str(payload.get("id"))
        g.user_role = payload.get("role")

        return func(*args, **kwargs)

    return wrapper


# -----------------------------
# Helpers
# -----------------------------
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_user_access(user_id, document_id):
    if not document_id:
        return False, "document_id required", None

    pdf_doc = get_pdf(document_id, user_id)

    if not pdf_doc:
        return False, "Document not found or access denied", None

    return True, None, pdf_doc


def is_student() -> bool:
    role = (getattr(g, "user_role", None) or "").lower()
    return role == "user"


# ✅ FIX: replaced deprecated utcnow()
def get_today_bounds():
    now = datetime.now(timezone.utc)
    start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start, end


# -----------------------------
# Unified RAG
# -----------------------------
@app.route("/rag", methods=["POST"])
@require_auth
def unified_rag():
    data = request.get_json()
    print("Incoming RAG request:", data)
    data = request.get_json(force=True) or {}

    user_id = g.user_id
    task = (data.get("task") or "qa").lower()
    query = data.get("query")
    document_id = data.get("document_id")
    options = data.get("options", {})

    top_k = int(options.get("top_k", 5))

    if not query or not document_id:
        return jsonify({"error": "query and document_id required"}), 400

    # ---------------- DAILY LIMIT ----------------
    if is_student():

        start, end = get_today_bounds()

        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$unwind": "$messages"},
            {
                "$match": {
                    "messages.role": "user",
                    "messages.created_at": {"$gte": start, "$lt": end},
                }
            },
            {"$count": "count"},
        ]

        agg = list(conversation_collection.aggregate(pipeline))
        used_queries = agg[0]["count"] if agg else 0

        if used_queries >= 5:
            return (
                jsonify(
                    {
                        "error": "Daily query limit reached for student plan. You can ask up to 5 questions per day. Upgrade to researcher plan for unlimited queries."
                    }
                ),
                403,
            )

    valid, err, _ = validate_user_access(user_id, document_id)

    if not valid:
        return jsonify({"error": err}), 404

    conversation_id = get_or_create_conversation_for_document(user_id, document_id)

    # ---------------- QA ----------------
    if task == "qa":

        result = answer_question(query, user_id, document_id, top_k=top_k)

        # ✅ Safe answer extraction
        answer = result.get("answer", "")

        append_message(
            conversation_id,
            user_id,
            role="user",
            content=query,
            mode="qa",
            document_id=document_id,
        )

        append_message(
            conversation_id,
            user_id,
            role="assistant",
            content=answer,
            mode="qa",
            document_id=document_id,
            context=result.get("context_used"),
        )

        # ✅ FIX: return answer instead of messages
        return jsonify(
            {
                "task": "qa",
                "conversation_id": conversation_id,
                "document_id": document_id,
                "question": query,
                "answer": answer,
            }
        )

    # ---------------- SUMMARY ----------------
    if task == "summarize":

        result = handle_summarize(
            query=query,
            user_id=user_id,
            document_id=document_id,
            summary_length=options.get("summary_length", "medium"),
            top_k=top_k,
        )

        append_message(
            conversation_id,
            user_id,
            role="user",
            content=query,
            mode="summarize",
            document_id=document_id,
        )

        append_message(
            conversation_id,
            user_id,
            role="assistant",
            content=result,
            mode="summarize",
            document_id=document_id,
        )

        if isinstance(result, str):
            return jsonify(
                {
                    "task": "summarize",
                    "document_id": document_id,
                    "summary": result,
                    "conversation_id": conversation_id,
                }
            )

        elif isinstance(result, dict):
            return jsonify(
                {
                    "task": "summarize",
                    "document_id": document_id,
                    "conversation_id": conversation_id,
                    **result,
                }
            )

        else:
            return jsonify(
                {
                    "task": "summarize",
                    "document_id": document_id,
                    "summary": str(result),
                    "conversation_id": conversation_id,
                }
            )

    # ---------------- FLASHCARDS ----------------
    if task == "flashcards":

        result = handle_flashcards(
            query=query,
            user_id=user_id,
            document_id=document_id,
            num_flashcards=int(options.get("num_flashcards", 5)),
            top_k=top_k,
        )

        append_message(
            conversation_id,
            user_id,
            role="user",
            content=query,
            mode="flashcards",
            document_id=document_id,
        )

        append_message(
            conversation_id,
            user_id,
            role="assistant",
            content=result,
            mode="flashcards",
            document_id=document_id,
        )

        if isinstance(result, dict):

            return jsonify(
                {
                    "task": "flashcards",
                    "document_id": document_id,
                    "conversation_id": conversation_id,
                    **result,
                }
            )

        else:

            return jsonify(
                {
                    "task": "flashcards",
                    "document_id": document_id,
                    "conversation_id": conversation_id,
                    "flashcards": result,
                }
            )

    # ---------------- MCQ ----------------
    if task == "mcq":

        result = handle_mcq(
            query=query,
            user_id=user_id,
            document_id=document_id,
            num_mcqs=int(options.get("num_mcqs", 5)),
            difficulty=options.get("difficulty", "medium"),
            top_k=top_k,
        )

        append_message(
            conversation_id,
            user_id,
            role="user",
            content=query,
            mode="mcq",
            document_id=document_id,
        )

        append_message(
            conversation_id,
            user_id,
            role="assistant",
            content=result,
            mode="mcq",
            document_id=document_id,
        )

        if isinstance(result, dict):

            return jsonify(
                {
                    "task": "mcq",
                    "document_id": document_id,
                    "conversation_id": conversation_id,
                    **result,
                }
            )

        else:

            return jsonify(
                {
                    "task": "mcq",
                    "document_id": document_id,
                    "conversation_id": conversation_id,
                    "mcqs": result,
                }
            )

    return jsonify({"error": "Invalid task"}), 400


# -----------------------------
# Hugging Face Research Assistant
# -----------------------------
def call_hf_assistant(mode: str, user_input: str) -> str:

    if not HF_API_KEY:
        raise RuntimeError("HF_API_KEY is not configured")

    system_instruction = {
        "rewrite": "You are an AI Professor who helps researchers rewrite paragraphs in a clear, concise, academically appropriate style. Respond only with rewritten text.",
        "brainstorm": "You are an AI Professor who brainstorms numbered research ideas. Respond with a numbered list of concise ideas.",
        "summarize": "You are an AI Professor who summarizes dense technical text. Produce a concise, well-structured summary.",
    }.get(
        mode,
        "You are an AI Professor helping with research and writing. Respond clearly and concisely.",
    )

    url = "https://router.huggingface.co/v1/chat/completions"

    headers = {"Authorization": f"Bearer {HF_API_KEY}"}

    payload = {
        "model": HF_ASSISTANT_MODEL,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": user_input},
        ],
        "max_tokens": 512,
        "temperature": 0.4,
        "top_p": 0.9,
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()

    data = resp.json()

    if isinstance(data, dict):
        choices = data.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content")
            if content:
                return str(content).strip()

    return str(data)


@app.route("/research-assistant", methods=["POST"])
@require_auth
def research_assistant():

    if is_student():
        return jsonify(
            {"error": "Research assistant available only for researcher accounts."}
        ), 403

    data = request.get_json() or {}

    mode = (data.get("mode") or "rewrite").lower()
    user_input = (data.get("input") or "").strip()

    if not user_input:
        return jsonify({"error": "input is required"}), 400

    if mode not in {"rewrite", "brainstorm", "summarize"}:
        mode = "rewrite"

    try:
        result_text = call_hf_assistant(mode, user_input)
    except Exception as exc:
        return jsonify(
            {"error": "Failed to call Hugging Face assistant", "details": str(exc)}
        ), 500

    return jsonify({"mode": mode, "input": user_input, "result": result_text})


# -----------------------------
# Conversations & Documents
# -----------------------------
@app.route("/conversations", methods=["GET"])
@require_auth
def conversations():
    document_id = request.args.get("document_id")
    return jsonify(list_conversations(g.user_id, document_id))


@app.route("/documents", methods=["GET"])
@require_auth
def list_documents():

    docs = (
        pdf_collection.find(
            {"user_id": g.user_id},
            {"_id": 0, "document_id": 1, "file_name": 1, "uploaded_at": 1},
        )
        .sort("uploaded_at", -1)
    )

    return jsonify(list(docs))


@app.route("/conversations/<conversation_id>", methods=["GET"])
@require_auth
def conversation_detail(conversation_id):

    convo = get_conversation(conversation_id, g.user_id)

    if not convo:
        return jsonify({"error": "Conversation not found"}), 404

    return jsonify(convo)


# -----------------------------
# Upload PDF
# -----------------------------
@app.route("/upload-pdf", methods=["POST"])
@require_auth
def upload_pdf():

    if is_student():

        start, end = get_today_bounds()

        today_uploads = pdf_collection.count_documents(
            {"user_id": g.user_id, "uploaded_at": {"$gte": start, "$lt": end}}
        )

        if today_uploads >= 1:
            return jsonify(
                {
                    "error": "Daily PDF upload limit reached for student plan. Upgrade to researcher plan for unlimited uploads."
                }
            ), 403

    if "file" not in request.files:
        return jsonify({"error": "PDF file missing"}), 400

    file = request.files["file"]

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    file.save(file_path)

    try:
        result = ingest_pdf(file_path, g.user_id)
    except Exception as e:
        return jsonify({"error": "PDF ingestion failed", "details": str(e)}), 500

    if not result or "document_id" not in result:
        return jsonify(
            {"error": "No document_id returned from backend", "raw_result": result}
        ), 500

    conversation_id = get_or_create_conversation_for_document(
        g.user_id, result["document_id"]
    )

    return jsonify(
        {
            "message": "PDF ingested successfully",
            "document_id": result["document_id"],
            "conversation_id": conversation_id,
        }
    )


# -----------------------------
# Guest Endpoints
# -----------------------------
@app.route("/guest/upload-pdf", methods=["POST"])
def guest_upload_pdf():

    if "file" not in request.files:
        return jsonify({"error": "PDF file missing"}), 400

    file = request.files["file"]

    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type"}), 400

    filename = secure_filename(file.filename)

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

    file.save(file_path)

    result = ingest_pdf(file_path, user_id=None)

    if not result or "document_id" not in result:
        return jsonify({"error": "PDF ingestion failed"}), 500

    return jsonify(
        {"message": "PDF ingested successfully", "document_id": result["document_id"]}
    )


@app.route("/guest/rag", methods=["POST"])
def guest_rag():

    data = request.get_json(force=True) or {}

    task = (data.get("task") or "qa").lower()
    query = (data.get("query") or "").strip()
    document_id = data.get("document_id")

    if not query or not document_id:
        return jsonify({"error": "query and document_id required"}), 400

    try:

        # ---------------- QA ----------------
        if task == "qa":

            result = answer_question(
                query,
                user_id=None,
                document_id=document_id,
                top_k=5,
            )

            answer = result.get("answer", "").strip()

            if not answer:
                answer = "⚠️ No answer generated. Try asking differently."

            return jsonify({
                "task": "qa",
                "document_id": document_id,
                "question": query,
                "answer": answer,
            })

        # ---------------- SUMMARY ----------------
        elif task == "summarize":

            result = handle_summarize(
                query=query,
                user_id=None,
                document_id=document_id,
                summary_length="medium",
                top_k=5,
            )

            print("DEBUG SUMMARY RESULT:", result)

            # ✅ FIX: ensure valid summary
            if not result or str(result).strip() == "":
                result = "⚠️ Unable to generate summary. The document may not contain enough readable content."

            if isinstance(result, str):
                return jsonify({
                    "task": "summarize",
                    "document_id": document_id,
                    "summary": result,
                })
            else:
                return jsonify({
                    "task": "summarize",
                    "document_id": document_id,
                    **result,
                })

        # ---------------- FLASHCARDS ----------------
        elif task == "flashcards":

            result = handle_flashcards(
                query=query,
                user_id=None,
                document_id=document_id,
                num_flashcards=5,
                top_k=5,
            )

            return jsonify({
                "task": "flashcards",
                "document_id": document_id,
                "flashcards": result or [],
            })

        # ---------------- MCQ ----------------
        elif task == "mcq":

            result = handle_mcq(
                query=query,
                user_id=None,
                document_id=document_id,
                num_mcqs=5,
                difficulty="medium",
                top_k=5,
            )

            return jsonify({
                "task": "mcq",
                "document_id": document_id,
                "mcqs": result or [],
            })

        return jsonify({"error": "Invalid task"}), 400

    except Exception as e:
        print("ERROR in /guest/rag:", str(e))
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True,
        use_reloader=False
    )