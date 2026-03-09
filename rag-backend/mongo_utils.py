import uuid
from datetime import datetime
from mongo_client import pdf_collection, conversation_collection


# -----------------------------
# PDF helpers
# -----------------------------
def get_pdf(document_id, user_id):
    return pdf_collection.find_one({
        "document_id": document_id,
        "user_id": user_id
    })


def save_summary(document_id, user_id, level, data):
    pdf_collection.update_one(
        {"document_id": document_id, "user_id": user_id},
        {"$set": {f"summaries.{level}": data}}
    )


# -----------------------------
# Conversation helpers
# -----------------------------
def get_or_create_conversation_for_document(user_id: str, document_id: str) -> str:
    """
    ONE conversation per (user_id, document_id)
    """
    existing = conversation_collection.find_one(
        {"user_id": user_id, "document_id": document_id}
    )

    if existing:
        return existing["conversation_id"]

    conversation_id = str(uuid.uuid4())
    conversation_collection.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "document_id": document_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })

    return conversation_id


def append_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content,
    mode: str,
    document_id: str,
    context=None,
):
    """
    Append message to existing conversation.
    FAILS LOUDLY if conversation does not exist.
    """

    message = {
    "id": str(uuid.uuid4()),
    "role": role,
    "mode": mode,        # ← stored as "mode"
    "content": content,
    "context": context or [],
    "created_at": datetime.utcnow(),
}


    result = conversation_collection.update_one(
        {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "document_id": document_id,
        },
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.utcnow()},
        },
    )

    if result.matched_count == 0:
        raise RuntimeError(
            f"Conversation not found: {conversation_id}"
        )


def get_conversation(conversation_id: str, user_id: str):
    return conversation_collection.find_one(
        {"conversation_id": conversation_id, "user_id": user_id},
        {"_id": 0},
    )


def list_conversations(user_id: str, document_id: str | None = None):
    query = {"user_id": user_id}
    if document_id:
        query["document_id"] = document_id

    cursor = conversation_collection.find(
        query,
        {
            "_id": 0,
            "conversation_id": 1,
            "document_id": 1,
            "created_at": 1,
            "updated_at": 1,
        },
    ).sort("updated_at", -1)

    return list(cursor)
