import os
from dotenv import load_dotenv
from pinecone import Pinecone

# --------------------------------------------------
# Load environment variables
# --------------------------------------------------
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY not found in environment variables")

# --------------------------------------------------
# Initialize Pinecone client
# --------------------------------------------------
pc = Pinecone(api_key=PINECONE_API_KEY)

# --------------------------------------------------
# Index configuration
# --------------------------------------------------
INDEX_NAME = "shared-rag"


DIMENSION = 384

# --------------------------------------------------
# Create index if it does not exist
# --------------------------------------------------
existing_indexes = pc.list_indexes().names()

if INDEX_NAME not in existing_indexes:
    pc.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric="cosine",
        spec={
            "serverless": {
                "cloud": "aws",
                "region": "us-east-1"
            }
        }
    )
    print(f"Index '{INDEX_NAME}' created successfully")
else:
    print(f"Index '{INDEX_NAME}' already exists")

# --------------------------------------------------
# Verify index
# --------------------------------------------------
index = pc.Index(INDEX_NAME)
stats = index.describe_index_stats()

print("Index stats:")
print(stats)
