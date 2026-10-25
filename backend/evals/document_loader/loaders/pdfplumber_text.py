"""pdfplumber plain text only: no table extraction, so nothing is duplicated.
Tables come out as lines of "label value value ..." in reading order."""

from pathlib import Path

import pdfplumber

from evals.document_loader.loaders.base import Page


def load(path: Path) -> list[Page]:
    with pdfplumber.open(path) as pdf:
        return [Page(n, page.extract_text() or "") for n, page in enumerate(pdf.pages, start=1)]
