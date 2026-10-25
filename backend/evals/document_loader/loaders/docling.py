"""Docling: layout model + TableFormer for table structure. OCR is off because
brochures have a text layer and image content is out of scope."""

import gc
from functools import lru_cache
from pathlib import Path

from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode
from docling.datamodel.settings import settings
from docling.document_converter import DocumentConverter, PdfFormatOption
from pypdf import PdfReader

from evals.document_loader.loaders.base import Page

# One page at a time: Altroz and Sierra embed 45-60 MP images per page, and
# the default batch of 4 pages ran a 16 GB machine out of memory.
settings.perf.page_batch_size = 1


@lru_cache(maxsize=1)
def _converter() -> DocumentConverter:
    options = PdfPipelineOptions(
        do_ocr=False, do_table_structure=True, layout_batch_size=1, table_batch_size=1
    )
    options.table_structure_options.mode = TableFormerMode.ACCURATE
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )


PAGES_PER_CONVERT = 6


def load(path: Path) -> list[Page]:
    # Converting a whole image-heavy brochure in one call kept memory growing
    # until it ran out (Sierra, page 9). Converting a few pages at a time
    # releases it between calls.
    page_count = len(PdfReader(path).pages)
    pages = []
    for start in range(1, page_count + 1, PAGES_PER_CONVERT):
        end = min(start + PAGES_PER_CONVERT - 1, page_count)
        doc = _converter().convert(path, page_range=(start, end)).document
        pages += [
            Page(n, doc.export_to_markdown(page_no=n, image_placeholder=""))
            for n in sorted(doc.pages)
        ]
        del doc
        gc.collect()
    return pages
