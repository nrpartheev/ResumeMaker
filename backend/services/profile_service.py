from __future__ import annotations

from typing import Any
import os
import json
import re

from pathlib import Path
from openai import OpenAI
from db import users
import fitz 
from pdf2image import convert_from_bytes
import pytesseract


MAX_PAGES_OCR = 10  
PROMPTS_DIR = Path(__file__).parent / "../prompts"

# DB UPDATE FUNCTIONS

def get_profile(user_sub: str) -> dict:
    doc = users().find_one({"google_sub": user_sub})
    if not doc:
        return {}
    profile = doc.get("profile")
    if isinstance(profile, dict):
        return profile
    return {}


def save_profile(user_sub: str, profile: dict[str, Any]) -> dict:
    users().update_one({"google_sub": user_sub}, {"$set": {"profile": profile}}, upsert=False)
    return get_profile(user_sub)

# AI GENERATION FUNCTIONS

def get_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )


def apply_ai_profile_edit(instruction: str, profile: dict[str, Any]) -> dict[str, Any]:
    client = get_client()

    with open( PROMPTS_DIR / "profilechanger.md", "r", encoding="utf-8") as f:
        prompt = f.read()

    full_prompt = prompt + "\n\nprofile:\n" + str(profile) + "\n\nchanges:\n" + instruction

    response = client.chat.completions.create(
        model="openrouter/auto",
        messages=[
            {
                "role": "user",
                "content": full_prompt
            }
        ],
        temperature=0
    )

    try:
        text = response.choices[0].message.content
        text = re.sub( r"^```json", "", text.strip(),flags=re.IGNORECASE)
        text = re.sub(r"^```", "", text.strip())
        text = re.sub(r"```$", "", text.strip())

        return json.loads(text)

    except Exception as e:
        print("AI parsing failed:", e)
        return {"error":True}



def structure_resume_data(raw_text: str):
    client = get_client()
    with open(PROMPTS_DIR / "profilegenerator.md","r",encoding="utf-8") as f:
        prompt = f.read()

    full_prompt = prompt + "\n\nraw_text:\n" + raw_text

    response = client.chat.completions.create(
        model="openrouter/auto",
        messages=[
            {
                "role": "user",
                "content": full_prompt
            }
        ],
        temperature=0
    )

    try:
        text = response.choices[0].message.content
        text = re.sub(
            r"^```json",
            "",
            text.strip(),
            flags=re.IGNORECASE
        )

        text = re.sub(r"^```", "", text.strip())
        text = re.sub(r"```$", "", text.strip())

        return json.loads(text)

    except Exception as e:

        print("AI parsing failed:", e)

        return {
            "is_resume": False,
            "structured_data": {},
            "warnings": [
                f"AI parsing failed: {str(e)}"
            ]
        }





def extract_text_from_file(file):

    filename = file.filename.lower()

    text = ""

    try:

        # Reset pointer (important if file reused)
        file.seek(0)

        # ----------------------------
        # PDF Handling
        # ----------------------------
        if filename.endswith(".pdf"):

            pdf_bytes = file.read()

            doc = fitz.open(
                stream=pdf_bytes,
                filetype="pdf"
            )

            for page in doc:

                page_text = page.get_text()

                # ---- Extract hyperlinks ----
                links = page.get_links()

                link_texts = []

                for link in links:

                    uri = link.get("uri")

                    if uri:
                        link_texts.append(uri)

                # Append links clearly
                if link_texts:

                    page_text += "\n\nLinks Found:\n"
                    page_text += "\n".join(link_texts)

                text += page_text

            # ----------------------------
            # OCR fallback (scanned PDFs)
            # ----------------------------
            if not text.strip():

                print("No text detected — using OCR fallback")

                images = convert_from_bytes(
                    pdf_bytes,
                    dpi=200
                )

                # Limit OCR pages
                for img in images[:MAX_PAGES_OCR]:

                    text += pytesseract.image_to_string(img)

        # ----------------------------
        # TXT / OTHER FILES
        # ----------------------------
        else:

            file.seek(0)

            text = file.read().decode(
                "utf-8",
                errors="ignore"
            )

        # ----------------------------
        # Final cleanup
        # ----------------------------
        text = normalize_text(text)

        return text

    except Exception as e:

        print("File extraction failed:", e)

        return ""


# ----------------------------
# Text Normalization
# ----------------------------
def normalize_text(text):

    # Remove excessive whitespace
    text = " ".join(text.split())

    # Optional: limit max length
    MAX_CHARS = 15000

    return text[:MAX_CHARS]