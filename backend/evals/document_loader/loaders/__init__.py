"""Loader registry. Every candidate turns a PDF into one text block per page,
because page numbers are what the app cites.

Loaders are imported lazily so a missing optional dependency (docling,
unstructured, ...) only disables that one loader instead of the whole eval.
To add a candidate: write `<name>.py` with a `load(path) -> list[Page]`
function and list it in LOADERS.
"""

import importlib
from collections.abc import Callable
from pathlib import Path

from evals.document_loader.loaders.base import Page

LOADERS: dict[str, str] = {
    "pdfplumber": "Current production loader (app.rag.indexing.load_pdf_pages)",
    "pdfplumber_text": "pdfplumber extract_text() only, no table extraction",
    "pdfplumber_dedup":"pdfplumber, each table once: Markdown if well-formed, else plain text",
    "pymupdf4llm": "PyMuPDF4LLM Markdown export with table detection, OCR off",
    "docling": "IBM Docling with TableFormer (accurate mode), OCR off",
    "unstructured": "Unstructured hi_res partitioning with table structure inference",
}


def get_loader(name: str) -> Callable[[Path], list[Page]]:
    if name not in LOADERS:
        raise ValueError(f"Unknown loader {name!r}. Choose from {list(LOADERS)}")
    return importlib.import_module(f"evals.document_loader.loaders.{name}").load
