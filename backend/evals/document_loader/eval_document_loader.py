"""Run the document-loader eval.

    cd backend
    python -m evals.document_loader.eval_document_loader                      # all loaders, all brochures
    python -m evals.document_loader.eval_document_loader --loaders docling unstructured
    python -m evals.document_loader.eval_document_loader --docs xpres venue   # subset of brochures
    python -m evals.document_loader.eval_document_loader --rescore            # re-score saved outputs only

Writes to evals/document_loader/results/:
    outputs/<loader>/<doc>.md   raw per-page extraction (inspect these!)
    outputs/<loader>/run.json   timing + errors per brochure
    scores.json                 per-fact and summary scores
    report.md                   comparison tables
"""

import argparse
import json
import logging
import re
import time
import traceback
from datetime import datetime
from pathlib import Path

from evals.common.dataset import load_corpus, load_gold
from evals.common.paths import results_dir
from evals.document_loader.loaders import LOADERS, get_loader
from evals.document_loader.metrics import score_fact, summarize
from evals.document_loader.report import write_report

COMPONENT = "document_loader"
RESULTS = results_dir(COMPONENT)
OUTPUTS = RESULTS / "outputs"
PAGE_MARKER = re.compile(r"^<!-- page (\d+) -->$", re.MULTILINE)

log = logging.getLogger("eval.document_loader")


# --- saved outputs ---------------------------------------------------------


def _save_pages(path: Path, pages) -> None:
    path.write_text(
        "".join(f"<!-- page {p.number} -->\n{p.text}\n\n" for p in pages),
        encoding="utf-8",
    )


def _read_pages(path: Path) -> dict[int, str]:
    if not path.exists():
        return {}
    parts = PAGE_MARKER.split(path.read_text(encoding="utf-8"))
    # split() gives ["", "1", text1, "2", text2, ...]
    return {int(n): text.strip() for n, text in zip(parts[1::2], parts[2::2])}


def _read_runs(loader: str) -> dict:
    path = OUTPUTS / loader / "run.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


# --- extraction ------------------------------------------------------------


def extract(loader: str, brochures) -> None:
    out_dir = OUTPUTS / loader
    out_dir.mkdir(parents=True, exist_ok=True)
    runs = _read_runs(loader)
    try:
        load = get_loader(loader)
    except ImportError as exc:
        log.error("%s unavailable: %s", loader, exc)
        for b in brochures:
            runs[b.id] = {"error": f"import failed: {exc}"}
        (out_dir / "run.json").write_text(json.dumps(runs, indent=2), encoding="utf-8")
        return

    for b in brochures:
        log.info("%s  <-  %s (%d pages)", loader, b.file, b.pages)
        started = time.perf_counter()
        try:
            pages = load(b.path)
            error = None
        except Exception:  # one bad PDF must not end the run; it is scored as a miss
            pages, error = [], traceback.format_exc(limit=3)
            log.exception("%s failed on %s", loader, b.id)
        seconds = round(time.perf_counter() - started, 2)
        _save_pages(out_dir / f"{b.id}.md", pages)
        runs[b.id] = {
            "seconds": seconds,
            "pdf_pages": b.pages,
            "pages_with_text": sum(1 for p in pages if p.text.strip()),
            "chars": sum(len(p.text) for p in pages),
            "error": error,
            "ran_at": datetime.now().isoformat(timespec="seconds"),
        }
        log.info("%s  ->  %s in %.1fs", loader, b.id, seconds)
        # Save after every brochure so an interrupted run keeps its progress.
        (out_dir / "run.json").write_text(json.dumps(runs, indent=2), encoding="utf-8")


# --- scoring ---------------------------------------------------------------


def score(loaders: list[str], brochures) -> dict:
    gold = load_gold(COMPONENT)
    doc_ids = {b.id for b in brochures}
    scores = {}
    for loader in loaders:
        runs = _read_runs(loader)
        ran = [d for d in doc_ids if d in runs]  # never-run brochures are skipped, failed ones score 0
        if not ran:
            continue
        pages = {d: _read_pages(OUTPUTS / loader / f"{d}.md") for d in ran}
        facts = [
            {**score_fact(f, pages[f["doc"]]), "doc": f["doc"]}
            for f in gold
            if f["doc"] in ran
        ]
        timed = [runs[d] for d in ran if not runs[d].get("error")]
        seconds = sum(r["seconds"] for r in timed)
        pdf_pages = sum(r["pdf_pages"] for r in timed)
        scores[loader] = {
            "description": LOADERS[loader],
            "summary": {
                **summarize(facts),
                "seconds_total": round(seconds, 1),
                "seconds_per_page": round(seconds / pdf_pages, 2) if pdf_pages else None,
                # Output size: what gets chunked and embedded. Lower is better
                # at equal quality (e.g. no duplicated table text).
                "chars_total": sum(runs[d].get("chars", 0) for d in ran),
                "docs_failed": sorted(d for d in ran if runs[d].get("error")),
            },
            "by_doc": {
                d: summarize([f for f in facts if f["doc"] == d]) for d in sorted(ran)
            },
            "facts": facts,
        }
    return scores


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--loaders", nargs="+", default=list(LOADERS), choices=list(LOADERS))
    parser.add_argument("--docs", nargs="+", help="brochure ids from data/corpus.yaml")
    parser.add_argument("--rescore", action="store_true", help="skip extraction, score saved outputs")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

    brochures = load_corpus(args.docs)
    if not args.rescore:
        for loader in args.loaders:
            extract(loader, brochures)

    # Always score every loader that has outputs, so the report compares all.
    scores = score(list(LOADERS), load_corpus())
    (RESULTS / "scores.json").write_text(json.dumps(scores, indent=2), encoding="utf-8")
    write_report(scores, load_gold(COMPONENT), RESULTS / "report.md")
    log.info("Wrote %s", RESULTS / "report.md")


if __name__ == "__main__":
    main()
