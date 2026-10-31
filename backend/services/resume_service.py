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
        timeout=240.0,  # 4 minutes — AI generation can be slow
        max_retries=1,
    )


def _get_profile(user_sub: str) -> dict[str, Any]:
    """Fetch the user's structured profile from MongoDB."""
    doc = users().find_one({"google_sub": user_sub})
    if not doc:
        return {}
    profile = doc.get("profile")
    return profile if isinstance(profile, dict) else {}


def _load_template_latex(template_name: str | None) -> str:
    """Load a template .tex file by its label name (e.g. 'Basic Resume').
    Falls back to basic.tex if the name isn't found or is None.
    """
    # template.json maps label names → file names
    template_json_path = TEMPLATES_DIR / "../templates/template.json"
    fallback = TEMPLATES_DIR / "basic.tex"

    if template_name:
        try:
            entries: list[dict] = json.loads(template_json_path.read_text(encoding="utf-8"))
            for entry in entries:
                if entry.get("name", "").lower() == template_name.lower():
                    tex_file = TEMPLATES_DIR / entry["file"]
                    if tex_file.exists():
                        return tex_file.read_text(encoding="utf-8")
        except Exception:
            pass  # fall through to default

    return fallback.read_text(encoding="utf-8")


def _strip_latex_fences(text: str) -> str:
    """Remove any markdown code fences the model may have added."""
    text = text.strip()
    # Remove ```latex or ``` at start
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text, flags=re.IGNORECASE)
    # Remove ``` at end
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
        .find({"user_sub": user_sub}, projection={"_id": 0, "latex": 0})
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
    """Generate a full LaTeX resume using the user's profile + chosen template + optional JD."""

    profile = _get_profile(user_sub)
    template_latex = _load_template_latex(template)

    prompt_template = (PROMPTS_DIR / "resumegenerator.md").read_text(encoding="utf-8")

    prompt = (
        prompt_template
        .replace("{{USER_PROFILE_JSON}}", json.dumps(profile, indent=2, ensure_ascii=False))
        .replace("{{TEMPLATE_LATEX}}", template_latex)
        .replace("{{JOB_DESCRIPTION}}", jd or "(none provided)")
    )

    raw = _call_ai(prompt)
    latex = _strip_latex_fences(raw)

    # Sanity-check: if the AI returned something that doesn't look like LaTeX, fall back
    if "\\documentclass" not in latex:
        latex = template_latex  # return template as-is rather than garbage

    resume_id = _new_id()
    doc = {
        "user_sub": user_sub,
        "resume_id": resume_id,
        "title": profile.get("name") or None,
        "template": template,
        "latex": latex,
        "created_at": _now(),
        "updated_at": _now(),
    }
    resumes().insert_one(doc)
    return {"id": resume_id, "latex": latex}


# ---------------------------------------------------------------------------
# AI: apply a change to an existing resume
# ---------------------------------------------------------------------------

def apply_change(
    user_sub: str,
    resume_id: str | None,
    latex: str,
    instruction: str,
) -> dict[str, Any]:
    """Apply a natural-language change to existing LaTeX, using the user's profile as context."""

    profile = _get_profile(user_sub)

    prompt_template = (PROMPTS_DIR / "resumechanger.md").read_text(encoding="utf-8")

    prompt = (
        prompt_template
        .replace("{{CURRENT_LATEX}}", latex)
        .replace("{{USER_PROFILE_JSON}}", json.dumps(profile, indent=2, ensure_ascii=False))
        .replace("{{INSTRUCTION}}", instruction or "Improve the resume.")
    )

    raw = _call_ai(prompt)
    updated_latex = _strip_latex_fences(raw)

    # Sanity-check: if the AI returned garbage, keep the original
    if "\\documentclass" not in updated_latex:
        updated_latex = latex

    if resume_id:
        resumes().update_one(
            {"user_sub": user_sub, "resume_id": resume_id},
            {"$set": {"latex": updated_latex, "updated_at": _now()}},
            upsert=False,
        )

    return {"latex": updated_latex}
