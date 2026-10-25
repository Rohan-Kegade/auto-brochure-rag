# Document loader evaluation

Generated 2026-10-25 by `python -m evals.document_loader.eval_document_loader`. 65 hand-labelled facts from 5 brochures (see `goldens/document_loader.yaml`). Metric definitions are in `evals/document_loader/metrics.py`.

score = 0.2 × text_recall + 0.3 × value_recall + 0.5 × row_integrity

## Summary

| Loader | Score | Text recall | Value recall | Row integrity | Column order | Page accuracy | Output size | s / page | Total s | Failed docs |
|---|---|---|---|---|---|---|---|---|---|---|
| **pdfplumber** | **0.98** | 100% | 100% | 96% | 94% | 100% | 102k chars | 0.05 | 5.2 | – |
| **pdfplumber_dedup** | **0.96** | 100% | 100% | 93% | 91% | 100% | 77k chars | 0.05 | 5.1 | – |
| **pdfplumber_text** | **0.93** | 91% | 100% | 89% | 85% | 100% | 74k chars | 0.05 | 4.8 | – |
| **pymupdf4llm** | **0.92** | 91% | 98% | 89% | 82% | 100% | 86k chars | 0.43 | 42.5 | – |
| **docling** | **0.85** | 91% | 100% | 74% | 73% | 100% | 159k chars | 2.65 | 262.1 | – |
| **unstructured** | **0.59** | 73% | 85% | 37% | 21% | 98% | 89k chars | 4.66 | 461.1 | – |

Output size = characters extracted across all brochures (what gets chunked and embedded). Only comparable between loaders that ran the same brochures.

- **pdfplumber**: Current production loader (app.rag.indexing.load_pdf_pages)
- **pdfplumber_dedup**: pdfplumber, each table once: Markdown if well-formed, else plain text
- **pdfplumber_text**: pdfplumber extract_text() only, no table extraction
- **pymupdf4llm**: PyMuPDF4LLM Markdown export with table detection, OCR off
- **docling**: IBM Docling with TableFormer (accurate mode), OCR off
- **unstructured**: Unstructured hi_res partitioning with table structure inference

## Row integrity by brochure

| Loader | punch | safari | sorento | venue | xpres |
|---|---|---|---|---|---|
| pdfplumber | 100% | 100% | 100% | 90% | 100% |
| pdfplumber_dedup | 75% | 100% | 100% | 90% | 100% |
| pdfplumber_text | 50% | 100% | 100% | 90% | 100% |
| pymupdf4llm | 100% | 100% | 90% | 75% | 100% |
| docling | 100% | 0% | 100% | 65% | 100% |
| unstructured | 62% | 71% | 0% | 25% | 56% |

## Every fact

✓ extracted intact · ~ values on the page but row/columns broken · p found only on another page · ✗ missing

| Fact | Page | Kind | pdfplumber | pdfplumber_dedup | pdfplumber_text | pymupdf4llm | docling | unstructured |
|---|---|---|---|---|---|---|---|---|
| venue-length | 17 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-width | 17 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| venue-wheelbase | 17 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| venue-fuel-tank | 17 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| venue-displacement | 17 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| venue-power | 17 | row | ~ | ~ | ~ | ~ | ✓ | ✓ |
| venue-torque | 17 | row | ~ | ~ | ~ | ~ | ✓ | ~ |
| venue-spare | 17 | cell | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| venue-rear-suspension | 17 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| venue-turbo-trims | 18 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-diesel-trims | 18 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-tpms | 18 | row | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| venue-auto-headlamps | 18 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-lka | 18 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-horizon-lamp | 18 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-bose | 19 | row | ✓ | ✓ | ✓ | ~ | ~ | ~ |
| venue-bluelink | 19 | row | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| venue-ventilated-seats | 19 | row | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| venue-front-tweeters | 19 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| venue-remote-start | 19 | row | ✓ | ✓ | ✓ | ~ | ~ | ~ |
| venue-isg | 19 | row | ✓ | ✓ | ✓ | ~ | ~ | ~ |
| venue-boot-caption | 8 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| venue-prose | 8 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| venue-other-features | 8 | text | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| sorento-displacement | 8 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-power | 8 | row | ✓ | ✓ | ✓ | ✗ | ✓ | ~ |
| sorento-torque | 8 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-transmission | 8 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-fuel-system | 8 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-fuel-tank | 8 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-spare | 8 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-boot | 8 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-front-suspension | 8 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| sorento-brakes | 8 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| punch-power | 29 | row | ✓ | ✓ | ~ | ✓ | ✓ | ✗ |
| punch-torque | 29 | row | ✓ | ✓ | ~ | ✓ | ✓ | ✗ |
| punch-type | 29 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| punch-wheelbase | 29 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| punch-lwh | 29 | cell | ✓ | ~ | ~ | ✓ | ✓ | ✓ |
| punch-boot | 29 | row | ✓ | ~ | ~ | ✓ | ✓ | ✓ |
| punch-fuel-tank | 29 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| punch-spare | 29 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| punch-tyre-accomplished | 29 | text | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| punch-harman | 30 | text | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| punch-svc | 30 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| punch-alloys | 30 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| punch-charger | 30 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| xpres-power | 4 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| xpres-torque | 4 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| xpres-ground-clearance | 4 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| xpres-boot | 4 | row | ✓ | ✓ | ✓ | ✓ | ✓ | p |
| xpres-fuel-tank | 4 | row | ✓ | ✓ | ✓ | ✓ | ✓ | ~ |
| xpres-wheelbase | 4 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| xpres-tyre | 4 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| xpres-spare | 4 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| xpres-engine | 4 | cell | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| safari-capacity | 36 | row | ✓ | ✓ | ✓ | ✓ | ~ | ✗ |
| safari-power | 36 | row | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| safari-torque | 36 | row | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| safari-lwh | 36 | cell | ✓ | ✓ | ✓ | ✓ | ~ | ✗ |
| safari-wheelbase | 36 | cell | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| safari-fuel-tank | 36 | cell | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| safari-spare | 36 | cell | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| safari-wheels-r18 | 36 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| safari-boot-folded | 36 | text | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
