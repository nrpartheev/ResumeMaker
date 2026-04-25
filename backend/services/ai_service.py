import os
import re
import json
import subprocess
import tempfile
import time
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = BACKEND_DIR / "templates"
PROMPTS_DIR = BACKEND_DIR / "prompts"

load_dotenv()

# ----------------------------
# Load OpenRouter API key
# ----------------------------
def get_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY"),
    )

# ----------------------------
# Typst validation
# ----------------------------
def _strip_code_fences(text: str) -> str:
    if not text:
        return ""
    stripped = text.strip()
    stripped = re.sub(r"^```(?:typst)?\s*", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"\s*```$", "", stripped)
    return stripped.strip()


def _compile_typst_for_validation(typst_source: str, timeout_s: int = 20) -> tuple[bool, str]:
    """
    Returns (is_valid, error_text). error_text is empty when valid.
    """
    typst_source = _strip_code_fences(typst_source)

    with tempfile.TemporaryDirectory(prefix="typst-validate-") as tmpdir:
        tmp_path = Path(tmpdir)
        typ_path = tmp_path / "resume.typ"
        pdf_path = tmp_path / "resume.pdf"
        typ_path.write_text(typst_source, encoding="utf-8")

        try:
            proc = subprocess.run(
                ["typst", "compile", str(typ_path), str(pdf_path)],
                capture_output=True,
                text=True,
                timeout=timeout_s,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "Typst compiler not found (missing `typst` on PATH). "
                "Install Typst and ensure the `typst` command is available."
            )
        except subprocess.TimeoutExpired:
            return False, f"Typst compilation timed out after {timeout_s}s."

        if proc.returncode == 0:
            return True, ""

        err = (proc.stderr or "").strip()
        out = (proc.stdout or "").strip()
        combined = "\n".join([part for part in [out, err] if part])
        if not combined:
            combined = f"Typst compilation failed with exit code {proc.returncode}."

        # Keep the error bounded so we don't explode tokens.
        max_chars = 4000
        if len(combined) > max_chars:
            combined = combined[:max_chars] + "\n...(truncated)..."

        return False, combined


def _extract_error_hints(compiler_error: str, typst_source: str) -> str:
    hints: list[str] = []

    m_arg = re.search(r"unexpected argument:\s*([A-Za-z_][A-Za-z0-9_]*)", compiler_error)
    if m_arg:
        bad_arg = m_arg.group(1)
        hints.append(
            f"- The compiler says `unexpected argument: {bad_arg}`. Remove that named argument, "
            "or rename it to an argument name that already exists in the template/function call."
        )

    m_line = re.search(r"resume\.typ:(\d+):(\d+)", compiler_error)
    if m_line:
        line_no = int(m_line.group(1))
        lines = typst_source.splitlines()
        start = max(1, line_no - 3)
        end = min(len(lines), line_no + 3)
        snippet_lines = []
        for idx in range(start, end + 1):
            prefix = ">>" if idx == line_no else "  "
            snippet_lines.append(f"{prefix} {idx}: {lines[idx - 1]}")
        snippet = "\n".join(snippet_lines)
        hints.append(f"- Here is the area around the failing line:\n{snippet}")

    if not hints:
        return ""
    return "\n".join(hints)


def _auto_fix_unexpected_argument(typst_source: str, arg_name: str) -> str:
    """
    Best-effort fixer for Typst errors like: `unexpected argument: foo`.
    Commonly occurs when the model invents a named argument in a function call.
    We remove lines that look like `foo: ...` (often with a trailing comma).
    """
    lines = typst_source.splitlines()
    pattern = re.compile(rf"^\s*{re.escape(arg_name)}\s*:\s*.*?,?\s*$")
    new_lines = [line for line in lines if not pattern.match(line)]
    return "\n".join(new_lines)


def _generate_valid_typst_with_fixes(
    client: OpenAI,
    initial_user_prompt: str,
    temperature: float,
    max_fix_rounds: int = 3,
    max_total_seconds: int | None = None,
) -> str:
    messages = [{"role": "user", "content": initial_user_prompt}]
    last_error = ""
    start_t = time.time()

    round_idx = 0
    while True:
        if max_fix_rounds is not None and max_fix_rounds >= 0 and round_idx >= max_fix_rounds:
            break
        if max_total_seconds is not None and (time.time() - start_t) > max_total_seconds:
            break

        response = client.chat.completions.create(
            model="openrouter/auto",
            messages=messages,
            temperature=temperature,
        )
        typst_output = _strip_code_fences(response.choices[0].message.content or "")

        is_valid, error_text = _compile_typst_for_validation(typst_output)
        if is_valid:
            return typst_output

        # Deterministic quick-fix: remove invented named args that Typst rejects.
        m_arg = re.search(r"unexpected argument:\s*([A-Za-z_][A-Za-z0-9_]*)", error_text)
        if m_arg:
            fixed = _auto_fix_unexpected_argument(typst_output, m_arg.group(1))
            if fixed != typst_output:
                fixed_ok, fixed_err = _compile_typst_for_validation(fixed)
                if fixed_ok:
                    return fixed
                typst_output = fixed
                error_text = fixed_err

        last_error = error_text
        hints = _extract_error_hints(error_text, typst_output)
        messages.append({"role": "assistant", "content": typst_output})
        messages.append(
            {
                "role": "user",
                "content": (
                    "The Typst compiler failed to compile your output. "
                    "Fix the Typst so it compiles successfully.\n\n"
                    "Compiler error:\n"
                    f"{error_text}\n\n"
                    f"{('Hints:\n' + hints + '\n\n') if hints else ''}"
                    "Rules for the fix:\n"
                    "- Do NOT introduce new keys, fields, function arguments, or attributes.\n"
                    "- Only edit existing text/content in the provided template/output.\n"
                    "- Keep the template structure and styling unchanged.\n\n"
                    "Return ONLY the complete corrected Typst (.typ)."
                ),
            }
        )

        round_idx += 1

    elapsed = int(time.time() - start_t)
    limit_desc = []
    if max_fix_rounds is not None and max_fix_rounds >= 0:
        limit_desc.append(f"{max_fix_rounds} attempts")
    if max_total_seconds is not None:
        limit_desc.append(f"{max_total_seconds}s")
    limit_text = " / ".join(limit_desc) if limit_desc else "limits"
    raise RuntimeError(
        "Unable to generate valid Typst within "
        f"{limit_text} (used {round_idx} attempt(s), {elapsed}s elapsed). "
        f"Last error:\n{last_error}"
    )


# ----------------------------
# Main function
# ----------------------------
def generate_typst(about, template_id, jd):

    template_file = TEMPLATE_DIR / f"{template_id}.typ"

    with open(template_file) as f:
        template = f.read()

    client = get_client()

    with open(PROMPTS_DIR / "generator.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    if jd == None:
        prompt = prompt + "About: " + about + "Template: " + template
    
    else:
        prompt = prompt + "About: " + about + "Template: " + template + "JD: " + jd

    return _generate_valid_typst_with_fixes(
        client=client,
        initial_user_prompt=prompt,
        temperature=0.7,
        max_fix_rounds=int(os.getenv("TYPST_FIX_MAX_ROUNDS", "10")),
        max_total_seconds=int(os.getenv("TYPST_FIX_MAX_SECONDS", "120")),
    )


# ----------------------------
# Resume structuring
# ----------------------------
def structure_resume_data(raw_text):

    client = get_client()

    with open(PROMPTS_DIR / "text_extractor.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    
    prompt = prompt + "raw_text: " + raw_text

    response = client.chat.completions.create(
        model="openrouter/auto",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )

    try:
        text = response.choices[0].message.content

        text = re.sub(r"^```json", "", text.strip(), flags=re.IGNORECASE)
        text = re.sub(r"^```", "", text.strip())
        text = re.sub(r"```$", "", text.strip())

        return json.loads(text)

    except Exception as e:
        print("AI parsing failed:", e)

        return {
            "is_resume": False,
            "structured_data": {},
            "warnings": [f"AI parsing failed: {str(e)}"]
        }

def change_typst(change, typst ):
    client = get_client()

    with open(PROMPTS_DIR / "changer.txt", "r", encoding="utf-8") as f:
        prompt = f.read()

    
    prompt = prompt + "Change: " + change + "typst: " +  typst

    return _generate_valid_typst_with_fixes(
        client=client,
        initial_user_prompt=prompt,
        temperature=0.7,
        max_fix_rounds=int(os.getenv("TYPST_FIX_MAX_ROUNDS", "10")),
        max_total_seconds=int(os.getenv("TYPST_FIX_MAX_SECONDS", "120")),
    )
