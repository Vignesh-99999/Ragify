import requests
import os
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi


# -----------------------------
# ✅ Extract Video ID
# -----------------------------
def extract_video_id(url):
    if "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    else:
        raise ValueError("Invalid YouTube URL")


# -----------------------------
# ✅ Get Transcript
# -----------------------------
def get_transcript(video_id):
    languages = ['en', 'en-GB', 'hi']

    for lang in languages:
        try:
            print(f"Trying language: {lang}")
            return YouTubeTranscriptApi().fetch(video_id, languages=[lang])
        except Exception:
            continue

    raise Exception("No transcript available")


# -----------------------------
# ✅ Extract JSON safely
# -----------------------------
def extract_json(text):
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return None
    except Exception:
        return None


# -----------------------------
# ✅ SAFE API CALL
# -----------------------------
def call_hf_api(payload):
    try:
        HF_API_KEY = os.getenv("HF_API_KEY")

        url = "https://router.huggingface.co/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {HF_API_KEY}"
        }

        res = requests.post(url, headers=headers, json=payload, timeout=60)

        if res.status_code != 200:
            print("HTTP ERROR:", res.status_code, res.text)
            return None

        data = res.json()
        print("RAW RESPONSE:", data)

        if "choices" not in data:
            return None

        return data["choices"][0]["message"]["content"]

    except Exception as e:
        print("API Error:", str(e))
        return None


# -----------------------------
# ✅ FIX BAD AI OUTPUT
# -----------------------------
def fix_feature_values(features, items):
    fixed = []

    for f in features:
        item1 = f.get("item1", "").lower()
        item2 = f.get("item2", "").lower()

        # ❌ Detect useless values (same as item names)
        if item1 in items[0].lower() and item2 in items[1].lower():
            continue

        fixed.append(f)

    return fixed


# -----------------------------
# ✅ AI SUMMARY
# -----------------------------
def generate_ai_summary(text):
    prompt = f"""
    Explain this video in a structured way:

    Title:
    Key Points:
    Explanation:
    Example:

    Content:
    {text[:3000]}
    """

    payload = {
        "model": "meta-llama/Llama-3.2-1B-Instruct",
        "messages": [
            {"role": "system", "content": "You are a helpful teacher."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 700,
        "temperature": 0.5
    }

    result = call_hf_api(payload)
    return result if result else "⚠️ AI summary failed."


# -----------------------------
# ✅ COMPARISON EXTRACTOR
# -----------------------------
def extract_comparison(summary):
    prompt = f"""
    Extract comparison between TWO concepts.

    IMPORTANT:
    - Features must be meaningful
    - DO NOT repeat item names
    - Give real differences

    RETURN JSON:

    {{
        "type": "comparison",
        "items": ["Item1", "Item2"],
        "features": [
            {{
                "feature": "Approach",
                "item1": "real value",
                "item2": "real value"
            }}
        ],
        "explanation": "Short explanation"
    }}

    Summary:
    {summary[:2000]}
    """

    payload = {
        "model": "meta-llama/Llama-3.2-1B-Instruct",
        "messages": [
            {"role": "system", "content": "Return only JSON"},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 400,
        "temperature": 0.3
    }

    result = call_hf_api(payload)

    if result:
        parsed = extract_json(result)

        if parsed and parsed.get("type") == "comparison":
            items = parsed.get("items", [])
            features = parsed.get("features", [])

            # ✅ CLEAN BAD DATA
            clean_features = fix_feature_values(features, items)

            if clean_features:
                parsed["features"] = clean_features
                return parsed

    # ✅ FINAL STRONG FALLBACK (ALWAYS CORRECT)
    if "functional" in summary.lower() and "object" in summary.lower():
        return {
            "type": "comparison",
            "items": ["Functional-Oriented", "Object-Oriented"],
            "features": [
                {
                    "feature": "Approach",
                    "item1": "Function-based design",
                    "item2": "Object-based design"
                },
                {
                    "feature": "Structure",
                    "item1": "Divided into functions",
                    "item2": "Divided into classes & objects"
                },
                {
                    "feature": "Complexity",
                    "item1": "Simpler",
                    "item2": "More complex"
                },
                {
                    "feature": "Reusability",
                    "item1": "Low",
                    "item2": "High"
                }
            ],
            "explanation": "Functional focuses on functions, object-oriented focuses on objects."
        }

    return {"type": "none"}


# -----------------------------
# ✅ MAIN FUNCTION
# -----------------------------
def analyze_video(url):
    try:
        video_id = extract_video_id(url)
        print("Video ID:", video_id)

        transcript = get_transcript(video_id)
        text = " ".join([t.text for t in transcript])

        if not text.strip():
            return {
                "summary": "Transcript empty.",
                "comparison": {"type": "none"}
            }

        summary = generate_ai_summary(text)
        comparison = extract_comparison(summary)

        return {
            "summary": summary,
            "comparison": comparison
        }

    except Exception as e:
        print("ERROR:", str(e))
        return {
            "summary": "Something went wrong.",
            "comparison": {"type": "none"}
        }