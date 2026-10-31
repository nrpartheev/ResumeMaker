from __future__ import annotations

import subprocess
import tempfile
import os
import shutil
from pathlib import Path


# Tectonic is a self-contained LaTeX engine that ships as a single binary.
# It downloads packages on demand, so we don't need a full TeX Live install.
# We look for it in the project directory first (downloaded during build),
# then fall back to the system PATH (for local dev where pdflatex/tectonic is installed).

def _find_latex_engine() -> tuple[str, list[str]]:
    """Find the available LaTeX engine and return its path + base args."""
    # Check for tectonic in the project bin directory (installed during build)
    project_bin = Path(__file__).parent.parent / "bin" / "tectonic"
    if project_bin.exists() and os.access(project_bin, os.X_OK):
        return str(project_bin), ["-X", "latex"]

    # Check for tectonic in PATH
    if shutil.which("tectonic"):
        return "tectonic", ["-X", "latex"]

    # Fall back to pdflatex (local dev)
    if shutil.which("pdflatex"):
        return "pdflatex", [
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-no-shell-escape",
        ]

    raise CompileError(
        "No LaTeX engine found. Install tectonic or pdflatex.",
        log="Neither tectonic nor pdflatex were found on the server.",
    )


class CompileError(Exception):
    """Raised when the LaTeX engine exits with a non-zero status."""

    def __init__(self, message: str, log: str = "") -> None:
        super().__init__(message)
        self.log = log


COMPILE_TIMEOUT = 120  # seconds


def compile_latex(latex_source: str) -> bytes:
    """Compile *latex_source* with the available LaTeX engine and return PDF bytes.

    Raises
    ------
    CompileError
        If compilation exits with a non-zero status or the PDF is not produced.
    """
    engine_path, engine_args = _find_latex_engine()

    with tempfile.TemporaryDirectory(prefix="resume_compile_") as tmpdir:
        tex_path = Path(tmpdir) / "main.tex"
        pdf_path = Path(tmpdir) / "main.pdf"

        tex_path.write_text(latex_source, encoding="utf-8")

        # Build the command — tectonic and pdflatex have different argument styles
        if engine_path.endswith("tectonic") or "tectonic" in engine_path:
            # tectonic -X latex main.tex --outdir <tmpdir> --keep-logs
            cmd = [engine_path] + engine_args + [
                str(tex_path),
                "--outdir", tmpdir,
                "--keep-logs",
                "--pass", "-interaction=nonstopmode",  # pass-through to underlying engine
            ]
        else:
            # pdflatex
            cmd = [engine_path] + engine_args + ["main.tex"]

        try:
            result = subprocess.run(
                cmd,
                cwd=tmpdir,
                capture_output=True,
                timeout=COMPILE_TIMEOUT,
            )
        except subprocess.TimeoutExpired:
            raise CompileError("LaTeX compilation timed out", log="Timeout after 120 s")

        stdout = result.stdout.decode("utf-8", errors="replace")
        stderr = result.stderr.decode("utf-8", errors="replace")
        log_text = stdout + "\n" + stderr

        if result.returncode != 0 or not pdf_path.exists():
            # Try to read the .log file for more detail
            log_file = Path(tmpdir) / "main.log"
            if log_file.exists():
                log_text += "\n\n--- main.log ---\n" + log_file.read_text(errors="replace")[-3000:]

            error_lines = [
                line for line in log_text.splitlines()
                if line.startswith("!") or "Error" in line or "error" in line
            ]
            short_log = "\n".join(error_lines) if error_lines else log_text[-3000:]
            raise CompileError("LaTeX compilation failed", log=short_log)

        return pdf_path.read_bytes()
