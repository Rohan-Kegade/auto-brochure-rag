# Evals

Offline evaluations for the RAG pipeline, one folder per component. Each
eval scores candidates against hand-labelled gold data built from real car
brochures, so choices like "which PDF loader?" are made on numbers rather
than by eyeballing output.

## Layout

```
backend/
  src/        the app; evals import it as `app` to test production code
  data/       brochure PDFs (gitignored) + corpus.yaml listing them
  goldens/    <component>.yaml — hand-labelled gold data per component
  evals/
    common/                  shared: paths, corpus/gold loading, text normalisation
    document_loader/
      eval_document_loader.py  entry point
      loaders/               one adapter per candidate
      metrics.py  report.py
      results/               outputs/, scores.json, report.md
```

## Setup

```powershell
cd backend
pip install -r evals/requirements.txt   # app deps + eval-only deps
```

- **Brochures:** put the PDFs listed in `data/corpus.yaml` into `data/`.
  They are gitignored (official manufacturer brochures, 1-15 MB each). A
  run fails with the missing file names if any are absent.
- **Unstructured** needs [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
  on `PATH`.
- **Docling and Unstructured** download their layout/table models from
  Hugging Face on first run. On Windows without Developer Mode you will see
  a harmless "symlinks" warning.

## Document loader eval

Which PDF loader keeps brochure tables intact best? Every candidate turns a
PDF into one text block per page (pages are what the app cites), and is
scored on 65 facts read by hand off the rendered pages of 5 brochures
(`goldens/document_loader.yaml`): spec values, multi-engine rows, S / –
feature matrices and prose.

```powershell
cd backend
python -m evals.document_loader.eval_document_loader                       # all loaders
python -m evals.document_loader.eval_document_loader --loaders pdfplumber  # one loader
python -m evals.document_loader.eval_document_loader --docs venue xpres    # some brochures
python -m evals.document_loader.eval_document_loader --rescore             # re-score saved outputs
```

Run the heavy loaders (docling, unstructured) one at a time: they use a lot
of memory. Each run rewrites `results/report.md` covering every loader that
has outputs; a run that crashes does not write the report, but keeps the
brochures it finished.

**Metrics** (full definitions in `document_loader/metrics.py`):

| Metric | Question it answers |
|---|---|
| Text recall | Is prose / caption text extracted on its page? |
| Value recall | Are table values extracted on their page at all? |
| Row integrity | Does one line hold the row label followed by its values? |
| Column order | Do multi-column values (petrol / diesel / CNG) stay in order? |
| Page accuracy | Of the facts found, how many are on the correct page (citations)? |
| Output size | Characters extracted: what gets chunked and embedded |

`score = 0.2 × text recall + 0.3 × value recall + 0.5 × row integrity`

**Results** are in `document_loader/results/report.md`, including a
fact-by-fact grid. Raw extraction per loader and brochure is in
`results/outputs/<loader>/<doc>.md`; read these when a number surprises you.
They are gitignored (full brochure text, regenerable), so after a fresh
clone run the eval before using `--rescore`.

**Adding a candidate:** write `document_loader/loaders/<name>.py` with
`load(path) -> list[Page]`, add it to `LOADERS` in `loaders/__init__.py`,
add any dependency to `requirements.txt`, then run it with `--loaders <name>`.

## Adding an eval for another component

Follow the same shape, e.g. for retrieval:

1. `goldens/retrieval.yaml`: gold data referring to brochures by their
   `data/corpus.yaml` id.
2. `evals/retrieval/eval_retrieval.py`: loads it with
   `evals.common.dataset.load_gold("retrieval")`, writes to
   `evals.common.paths.results_dir("retrieval")`.
3. Import production code from `app` (the `evals` package puts `src/` on the
   import path).
