"""Baseline: exactly what the app indexes today, so the comparison is against
production behaviour rather than a re-implementation of it."""

from pathlib import Path

from app.rag.indexing import load_pdf_pages
from evals.document_loader.loaders.base import Page


def load(path: Path) -> list[Page]:
    data = load_pdf_pages({"file_bytes": path.read_bytes(), "filename": path.name})
    return [Page(doc.metadata["page"], doc.page_content) for doc in data["pages"]]
