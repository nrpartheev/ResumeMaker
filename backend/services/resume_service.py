from __future__ import annotations

import json
import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI

from db import resumes, users

PROMPTS_DIR = Path(__file__).parent / "../prompts"
TEMPLATES_DIR = Path(__file__).parent / "../templates"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return f"res_{secrets.token_urlsafe(6)}"


def _get_client() -> OpenAI:
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
        timeout=240.0,
        max_retries=1,
    )


def _get_profile(user_sub: str) -> dict[str, Any]:
    """Fetch the user's structured profile from MongoDB."""
    doc = users().find_one({"google_sub": user_sub})
    if not doc:
        return {}
    profile = doc.get("profile")
    return profile if isinstance(profile, dict) else {}


def _load_template_html(template_name: str | None) -> str:
    """Load a template .html file by its label name (e.g. 'Basic Resume').
    Falls back to basic.html if the name isn't found or is None.
    """
    template_json_path = TEMPLATES_DIR / "template.json"
    fallback = TEMPLATES_DIR / "basic.html"

    if template_name:
        try:
            entries: list[dict] = json.loads(template_json_path.read_text(encoding="utf-8"))
            for entry in entries:
                if entry.get("name", "").lower() == template_name.lower():
                    html_file = TEMPLATES_DIR / entry["file"]
                    if html_file.exists():
                        return html_file.read_text(encoding="utf-8")
        except Exception:
            pass

    return fallback.read_text(encoding="utf-8")


def _strip_html_fences(text: str) -> str:
    """Remove any markdown code fences the model may have added."""
    text = text.strip()
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\n?```$", "", text)
    return text.strip()


def _call_ai(prompt: str) -> str:
    client = _get_client()
    response = client.chat.completions.create(
        model="openrouter/auto",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return response.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# History / persistence
# ---------------------------------------------------------------------------

def list_history(user_sub: str) -> list[dict[str, Any]]:
    cur = (
        resumes()
        .find({"user_sub": user_sub}, projection={"_id": 0, "html": 0})
        .sort("updated_at", -1)
        .limit(50)
    )
    items: list[dict[str, Any]] = []
    for doc in cur:
        items.append(
            {
                "id": doc["resume_id"],
                "title": doc.get("title"),
                "template": doc.get("template"),
                "updated_at": (
                    doc.get("updated_at").isoformat() if doc.get("updated_at") else None
                ),
            }
        )
    return items


def get_resume(user_sub: str, resume_id: str) -> dict[str, Any] | None:
    return resumes().find_one(
        {"user_sub": user_sub, "resume_id": resume_id}, projection={"_id": 0}
    )


def delete_resume(user_sub: str, resume_id: str) -> bool:
    """Delete a resume. Returns True if a document was deleted, False if not found."""
    result = resumes().delete_one({"user_sub": user_sub, "resume_id": resume_id})
    return result.deleted_count > 0


# ---------------------------------------------------------------------------
# AI: generate a brand-new resume
# ---------------------------------------------------------------------------

def generate_resume(
    user_sub: str,
    template: str | None = None,
    jd: str | None = None,
) -> dict[str, Any]:
    """Generate a full HTML resume using the user's profile + chosen template + optional JD."""

    profile = _get_profile(user_sub)
    template_html = _load_template_html(template)

    prompt_template = (PROMPTS_DIR / "resumegenerator.md").read_text(encoding="utf-8")

    prompt = (
        prompt_template
        .replace("{{USER_PROFILE_JSON}}", json.dumps(profile, indent=2, ensure_ascii=False))
        .replace("{{TEMPLATE_HTML}}", template_html)
        .replace("{{JOB_DESCRIPTION}}", jd or "(none provided)")
    )

    raw = _call_ai(prompt)
    html = _strip_html_fences(raw)

    # Sanity-check: if the AI returned something that doesn't look like HTML, fall back
    if "<html" not in html.lower() and "<body" not in html.lower():
        html = template_html

    resume_id = _new_id()
    doc = {
        "user_sub": user_sub,
        "resume_id": resume_id,
        "title": profile.get("name") or None,
        "template": template,
        "html": html,
        "created_at": _now(),
        "updated_at": _now(),
    }
    resumes().insert_one(doc)
    return {"id": resume_id, "html": html}


# ---------------------------------------------------------------------------
# AI: apply a change to an existing resume
# ---------------------------------------------------------------------------

def apply_change(
    user_sub: str,
    resume_id: str | None,
    html: str,
    instruction: str,
) -> dict[str, Any]:
    """Apply a natural-language change to existing HTML, using the user's profile as context."""

    profile = _get_profile(user_sub)

    prompt_template = (PROMPTS_DIR / "resumechanger.md").read_text(encoding="utf-8")

    prompt = (
        prompt_template
        .replace("{{CURRENT_HTML}}", html)
        .replace("{{USER_PROFILE_JSON}}", json.dumps(profile, indent=2, ensure_ascii=False))
        .replace("{{INSTRUCTION}}", instruction or "Improve the resume.")
    )

    raw = _call_ai(prompt)
    updated_html = _strip_html_fences(raw)

    # Sanity-check: if the AI returned garbage, keep the original
    if "<html" not in updated_html.lower() and "<body" not in updated_html.lower():
        updated_html = html

    if resume_id:
        resumes().update_one(
            {"user_sub": user_sub, "resume_id": resume_id},
            {"$set": {"html": updated_html, "updated_at": _now()}},
            upsert=False,
        )

    return {"html": updated_html}
