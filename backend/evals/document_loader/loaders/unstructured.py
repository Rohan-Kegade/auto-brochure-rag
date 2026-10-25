"""Unstructured hi_res: layout detection + table structure inference. Tables
come back as HTML and are converted to Markdown rows; Image elements are
dropped because image content is out of scope."""

from collections import defaultdict
from pathlib import Path

from unstructured.partition.pdf import partition_pdf

from evals.document_loader.loaders.base import Page, html_table_to_markdown


def load(path: Path) -> list[Page]:
    elements = partition_pdf(
        filename=str(path),
        strategy="hi_res",
        infer_table_structure=True,
        languages=["eng"],
    )
    by_page: dict[int, list[str]] = defaultdict(list)
    for el in elements:
        if el.category == "Image":
            continue
        html = getattr(el.metadata, "text_as_html", None)
        text = html_table_to_markdown(html) if el.category == "Table" and html else el.text
        if text.strip():
            by_page[el.metadata.page_number].append(text)
    return [Page(n, "\n\n".join(parts)) for n, parts in sorted(by_page.items())]
