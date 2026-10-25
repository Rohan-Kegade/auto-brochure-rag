"""PyMuPDF4LLM: Markdown per page with PyMuPDF's table finder.
Note: PyMuPDF is AGPL-3.0 licensed (commercial licence from Artifex)."""

from pathlib import Path

import pymupdf4llm

from evals.document_loader.loaders.base import Page


def load(path: Path) -> list[Page]:
    chunks = pymupdf4llm.to_markdown(str(path), page_chunks=True, use_ocr=False)
    return [Page(c["metadata"]["page_number"], c["text"]) for c in chunks]
