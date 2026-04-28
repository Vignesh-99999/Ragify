# import os
# from dotenv import load_dotenv
# import google.genai as genai

# # Load env
# load_dotenv()

# # Init client
# client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# # Simple response
# response = client.models.generate_content(
#     model="models/gemini-2.0-flash-lite",
#     contents="What is AI?"
# )

# print(response.text)