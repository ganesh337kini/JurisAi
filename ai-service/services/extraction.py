"""
Text extraction from common legal document formats.

Notes for beginners:
- We branch on file extension for predictable behavior.
- OCR requires Tesseract installed on the host OS.
"""

from __future__ import annotations

import os
from pathlib import Path

import pdfplumber
import pytesseract
from docx import Document as DocxDocument
from PIL import Image
from PyPDF2 import PdfReader


def extract_text_from_txt(path: Path) -> str:
    """Read a plain text file (UTF-8)."""
    return path.read_text(encoding="utf-8", errors="replace")


def extract_text_from_docx(path: Path) -> str:
    """Extract visible paragraph text from a Word document."""
    doc = DocxDocument(str(path))
    parts: list[str] = []
    for p in doc.paragraphs:
        t = (p.text or "").strip()
        if t:
            parts.append(t)
    return "\n".join(parts).strip()


def extract_text_from_pdf(path: Path) -> str:
    """
    PDF text extraction.

    Primary: pdfplumber (good layout fidelity for many legal PDFs).
    Fallback: PyPDF2 (helps when pdfplumber yields empty text for some encodings).
    """
    texts: list[str] = []

    try:
        with pdfplumber.open(str(path)) as pdf:
            for page in pdf.pages:
                t = page.extract_text() or ""
                if t.strip():
                    texts.append(t)
    except Exception:
        # If pdfplumber fails entirely, fall back below.
        texts = []

    joined = "\n".join(texts).strip()
    if joined:
        return joined

    reader = PdfReader(str(path))
    fallback_parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if t.strip():
            fallback_parts.append(t)

    return "\n".join(fallback_parts).strip()


def extract_text_from_image(path: Path) -> str:
    """OCR pipeline for scanned pages (PNG/JPG/etc.)."""
    image = Image.open(path)
    # pytesseract expects a PIL image or path; RGB is safest for OCR.
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")

    # Allow optional custom tesseract cmd via env (macOS/Homebrew paths).
    cmd = os.getenv("TESSERACT_CMD") or None
    if cmd:
        pytesseract.pytesseract.tesseract_cmd = cmd

    return pytesseract.image_to_string(image).strip()


def extract_text(file_path: Path) -> str:
    """
    Route extraction based on extension.

    Returns a single string (may be empty if the document has no extractable text).
    """
    ext = file_path.suffix.lower()

    if ext == ".txt":
        return extract_text_from_txt(file_path)
    if ext == ".docx":
        return extract_text_from_docx(file_path)
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    if ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}:
        return extract_text_from_image(file_path)

    raise ValueError(f"Unsupported file extension for extraction: {ext}")
