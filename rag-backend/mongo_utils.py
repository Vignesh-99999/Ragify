import uuid
from datetime import datetime
from mongo_client import pdf_collection, conversation_collection

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
def _ensure_conversation(conversation_id, user_id, document_id=None):
    existing = conversation_collection.find_one(
        {"conversation_id": conversation_id, "user_id": user_id}
    )
    if existing:
        return existing

    conversation = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "document_id": document_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    conversation_collection.insert_one(conversation)
    return conversation


def append_message(conversation_id, user_id, role, content, document_id=None, context=None):
    """
    Append a message to a conversation; auto-creates if missing.
    """
    _ensure_conversation(conversation_id, user_id, document_id)
    conversation_collection.update_one(
        {"conversation_id": conversation_id, "user_id": user_id},
        {
            "$push": {
                "messages": {
                    "role": role,
                    "content": content,
                    "context": context,
                    "created_at": datetime.utcnow(),
                }
            },
            "$set": {
                "updated_at": datetime.utcnow(),
                "document_id": document_id or None,
            },
        },
    )


def get_conversation(conversation_id, user_id):
    return conversation_collection.find_one(
        {"conversation_id": conversation_id, "user_id": user_id},
        {"_id": 0},
    )


def list_conversations(user_id, document_id=None):
    """
    List conversations for a user, optionally filtered by document_id.
    """
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


def get_or_create_conversation_for_document(user_id: str, document_id: str):
    """
    Get existing conversation for a document, or create a new one.
    Returns conversation_id.
    """
    # Try to find existing conversation for this document
    existing = conversation_collection.find_one(
        {"user_id": user_id, "document_id": document_id}
    )
    
    if existing:
        return existing["conversation_id"]
    
    # Create new conversation
    conversation_id = str(uuid.uuid4())
    conversation = {
        "conversation_id": conversation_id,
        "user_id": user_id,
        "document_id": document_id,
        "messages": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    conversation_collection.insert_one(conversation)
    return conversation_id
