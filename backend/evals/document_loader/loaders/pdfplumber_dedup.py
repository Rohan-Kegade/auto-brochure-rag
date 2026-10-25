"""Production pdfplumber, minus the duplication: every table region appears
once instead of twice (flattened text + Markdown).

pdfplumber's table detection is unreliable on some brochures (Venue: row
labels blank, a whole column dropped) while its flattened text of the same
region is fine. So per table we keep whichever version is trustworthy:
  - well-formed table   -> Markdown table, its text removed from the page
  - broken-looking table -> page text kept, table dropped"""

from pathlib import Path

import pdfplumber

from app.rag.indexing import _table_to_markdown
from evals.document_loader.loaders.base import Page


def _outside(bboxes):
    def keep(obj) -> bool:
        if obj.get("object_type") != "char":
            return True
        x = (obj["x0"] + obj["x1"]) / 2
        y = (obj["top"] + obj["bottom"]) / 2
        return not any(x0 <= x <= x1 and top <= y <= bottom for x0, top, x1, bottom in bboxes)

    return keep


MAX_EMPTY_CELLS = 0.3


def _well_formed(rows: list[list]) -> bool:
    """Every body row has a label, and most cells are filled."""
    body = rows[1:]
    cells = [cell for row in rows for cell in row]
    empty = sum(1 for cell in cells if not (cell or "").strip())
    return all((row[0] or "").strip() for row in body) and empty / len(cells) <= MAX_EMPTY_CELLS


def load(path: Path) -> list[Page]:
    pages = []
    with pdfplumber.open(path) as pdf:
        for number, page in enumerate(pdf.pages, start=1):
            # Same table filter as production (header + one row), plus the
            # quality check above.
            tables = [
                (t.bbox, rows)
                for t in page.find_tables()
                if len(rows := t.extract()) >= 2 and _well_formed(rows)
            ]
            text = page.filter(_outside([bbox for bbox, _ in tables])).extract_text()
            parts = ([text] if text else []) + [_table_to_markdown(rows) for _, rows in tables]
            pages.append(Page(number, "\n\n".join(parts)))
    return pages
