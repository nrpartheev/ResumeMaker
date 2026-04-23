from pdf2image import convert_from_bytes
import pytesseract


def extract_text_from_file(file):

    filename = file.filename.lower()

    text = ""

    # ---- PDF ----
    if filename.endswith(".pdf"):

        pdf_bytes = file.read()

        images = convert_from_bytes(
            pdf_bytes
        )

        for img in images:

            text += pytesseract.image_to_string(
                img
            )

    # ---- TXT / OTHER ----
    else:

        text = file.read().decode(
            "utf-8",
            errors="ignore"
        )

    return text