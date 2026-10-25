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
    retrieval/
      eval_retrieval.py      entry point
      index.py  metrics.py  report.py
      results/               qdrant/, retrievals.json, scores.json, report.md
    generator/
      eval_generator.py      entry point
      metrics.py  report.py
      results/               generations.json, scores.json, report.md
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

| Metric        | Question it answers                                               |
| ------------- | ----------------------------------------------------------------- |
| Text recall   | Is prose / caption text extracted on its page?                    |
| Value recall  | Are table values extracted on their page at all?                  |
| Row integrity | Does one line hold the row label followed by its values?          |
| Column order  | Do multi-column values (petrol / diesel / CNG) stay in order?     |
| Page accuracy | Of the facts found, how many are on the correct page (citations)? |
| Output size   | Characters extracted: what gets chunked and embedded              |

`score = 0.2 × text recall + 0.3 × value recall + 0.5 × row integrity`

**Results** are in `document_loader/results/report.md`, including a
fact-by-fact grid. Raw extraction per loader and brochure is in
`results/outputs/<loader>/<doc>.md`; read these when a number surprises you.
They are gitignored (full brochure text, regenerable), so after a fresh
clone run the eval before using `--rescore`.

**Adding a candidate:** write `document_loader/loaders/<name>.py` with
`load(path) -> list[Page]`, add it to `LOADERS` in `loaders/__init__.py`,
add any dependency to `requirements.txt`, then run it with `--loaders <name>`.

## Retrieval eval

Does the retriever return the chunks needed to answer a question, ranked
first, with little noise? The retriever is tested on its own, with no
generator: each of the 64 cases in `goldens/retrieval.yaml` is a question and
the ideal answer to it, and an LLM judge
([DeepEval](https://deepeval.com), Gemini) compares the retrieved chunks
with that answer. Reference answers stay valid when chunking changes, which
labelled chunk ids would not.

The production code does the work: brochures are chunked and embedded with
`app.rag.indexing`'s own steps, and searched with `app.rag.retrieval`'s
`build_search`. Chunks go to a local Qdrant store in `results/qdrant/`, not
the app's server, so no docker is needed. Each chunking + embedding config
gets its own collection, and brochures are only embedded once.

```powershell
cd backend
python -m evals.retrieval.eval_retrieval                    # all cases, all 5 brochures searched
python -m evals.retrieval.eval_retrieval --scope own        # search only each question's brochures
python -m evals.retrieval.eval_retrieval --k 10             # more chunks per search (app: 5)
python -m evals.retrieval.eval_retrieval --cases venue-boot safari-adas
python -m evals.retrieval.eval_retrieval --rescore          # re-judge saved retrievals only
python -m evals.retrieval.eval_retrieval --relevancy        # add DeepEval relevancy (slow)
python -m evals.retrieval.eval_retrieval --judge gemini-3.1-flash-lite --rpm 5
```

By default every search covers all 5 brochures, as in a chat with all of
them open, so pulling a chunk from the wrong car (Xpres and Punch share an
engine) costs precision and chunk relevance.

**Free-tier Gemini keys** allow as few as 5 requests per minute per model,
and each case costs about 4 judge calls (2 for recall, 2 for precision), so
a full run is about 256 calls: under an hour at `--rpm 5`, minutes on a paid
key. `--relevancy` adds k + 1 calls per case. Pass `--rpm` to stay under the
quota; indexing waits out the embedding quota on its own.

**Metrics** (full definitions in `retrieval/metrics.py`):

| Metric               | Question it answers                                      | Needs     |
| -------------------- | -------------------------------------------------------- | --------- |
| Contextual recall    | Do the chunks contain every fact in the expected answer? | LLM judge |
| Contextual precision | Are the relevant chunks ranked first? (rank-weighted)    | LLM judge |
| Chunk relevance      | What share of the retrieved chunks is relevant? (noise)  | precision's per-chunk verdicts, no extra calls |
| Page hit             | Did a chunk come from a page the answer is printed on?   | –         |
| Contextual relevancy | How much of the retrieved text is on-topic? (`--relevancy`) | LLM judge, one call per chunk |

Precision ignores junk ranked below all relevant chunks; chunk relevance is
the metric that counts it, so it is the one to watch when changing k. Page
hit does not depend on the judge, so a disagreement between it and recall
points at the judge or at a golden. **Results** are in `retrieval/results/report.md`,
with the judge's reasons for the lowest-recall cases. The retrieved chunks
are in `results/retrievals.json` (gitignored), so read these when a score
surprises you.

## Generator eval

Given exactly the right context, does the generator stick to it and answer
the question? The retriever is taken out: each case in
`goldens/generator.yaml` (the same questions as `goldens/retrieval.yaml`)
has a **golden context**, only the passages of its source pages needed to
answer, copied from the text the app's loader extracts. Passages marked
`# rebuilt:` were reassembled where the extracted text interleaves columns,
and are worth checking against the PDF. The answer comes from the app's own
answer step (`app.rag.retrieval.build_answer`): same prompt, model and
context format, no chat history. DeepEval then judges the answer. A run
warns when a question has drifted from `goldens/retrieval.yaml`.

```powershell
cd backend
python -m evals.generator.eval_generator                   # all cases
python -m evals.generator.eval_generator --cases venue-boot safari-adas
python -m evals.generator.eval_generator --docs xpres      # cases about some brochures
python -m evals.generator.eval_generator --rescore         # re-judge saved answers only
python -m evals.generator.eval_generator --rpm 5           # free-tier Gemini key
```

Each case costs 1 generation and about 7 judge calls, so a full run is about
510 calls. `--rpm` caps generation and judging alike.

**Metrics** (full definitions in `generator/metrics.py`):

| Metric | Question it answers |
|---|---|
| Faithfulness | What share of the answer's claims does the golden context support? |
| Answer relevancy | What share of the answer's statements address the question? |

Faithfulness runs with `penalize_ambiguous_claims`: a claim the context
neither supports nor contradicts, such as an invented spec, counts as
unsupported. DeepEval's default would count it as faithful. Neither metric
checks completeness: a correct one-fact answer to a two-part question
scores 1.0 on both.

The judge defaults to the app's own generator model (gemini-3.1-flash-lite),
so the model grades its own answers; `--judge` swaps in a stronger one.
**Results** are in `generator/results/report.md`, with every unsupported
claim and off-topic statement of the lowest-scoring answers.

## Adding an eval for another component

Follow the same shape, e.g. for retrieval:

1. `goldens/retrieval.yaml`: gold data referring to brochures by their
   `data/corpus.yaml` id.
2. `evals/retrieval/eval_retrieval.py`: loads it with
   `evals.common.dataset.load_gold("retrieval")`, writes to
   `evals.common.paths.results_dir("retrieval")`.
3. Import production code from `app` (the `evals` package puts `src/` on the
   import path).
