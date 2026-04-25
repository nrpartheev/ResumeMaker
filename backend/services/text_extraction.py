import fitz 
from pdf2image import convert_from_bytes
import pytesseract


def extract_text_from_file(file):

    filename = file.filename.lower()
    text = ""

    # ---- PDF ----
    if filename.endswith(".pdf"):

        pdf_bytes = file.read()

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        for page in doc:

            # ---- Extract text ----
            page_text = page.get_text()

            # ---- Extract hyperlinks ----
            page_links = page.get_links()

            # Append links into text
            link_texts = []

            for link in page_links:
                if "uri" in link:
                    link_texts.append(link["uri"])

            # Add links under the page text
            if link_texts:
                page_text += "\n\nLinks Found:\n"
                page_text += "\n".join(link_texts)

            text += page_text

        # ---- OCR fallback (for scanned PDFs) ----
        if not text.strip():

            images = convert_from_bytes(pdf_bytes)

            for img in images:
                text += pytesseract.image_to_string(img)

    # ---- TXT / OTHER ----
    else:

        text = file.read().decode(
            "utf-8",
            errors="ignore"
        )

    return text