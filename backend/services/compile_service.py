from __future__ import annotations

import subprocess
import tempfile
import os
from pathlib import Path


# pdflatex is run with -interaction=nonstopmode so it never blocks waiting for
# user input, and -halt-on-error so we get a non-zero exit code on failure.
PDFLATEX_ARGS = [
    "pdflatex",
    "-interaction=nonstopmode",
    "-halt-on-error",
    "-file-line-error",
    "-no-shell-escape",   # disables \write18 — prevents shell injection via LaTeX source
    "main.tex",
]

# Seconds before we kill a runaway compile (e.g. infinite loop in LaTeX code)
COMPILE_TIMEOUT = 30


class CompileError(Exception):
    """Raised when pdflatex exits with a non-zero status."""

    def __init__(self, message: str, log: str = "") -> None:
        super().__init__(message)
        self.log = log


def compile_latex(latex_source: str) -> bytes:
    """Compile *latex_source* with pdflatex and return the PDF bytes.

    Raises
    ------
    CompileError
        If pdflatex exits with a non-zero status or the PDF is not produced.
    """
    with tempfile.TemporaryDirectory(prefix="resume_compile_") as tmpdir:
        tex_path = Path(tmpdir) / "main.tex"
        pdf_path = Path(tmpdir) / "main.pdf"

        tex_path.write_text(latex_source, encoding="utf-8")

        try:
            result = subprocess.run(
                PDFLATEX_ARGS,
                cwd=tmpdir,
                capture_output=True,
                timeout=COMPILE_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            raise CompileError("LaTeX compilation timed out", log="Timeout after 30 s")

        log_text = result.stdout.decode("utf-8", errors="replace")

        if result.returncode != 0 or not pdf_path.exists():
            # Extract just the error lines from the log to keep the response lean
            error_lines = [
                line for line in log_text.splitlines()
                if line.startswith("!") or "Error" in line or "error" in line
            ]
            short_log = "\n".join(error_lines) if error_lines else log_text[-3000:]
            raise CompileError("pdflatex compilation failed", log=short_log)

        return pdf_path.read_bytes()
