import subprocess

def compile_typst(typst_path):

    pdf_path = typst_path.replace(".typ", ".pdf")

    subprocess.run(
        [
            "typst",
            "compile",
            typst_path,
            pdf_path
        ],
        check=True
    )

    return pdf_path