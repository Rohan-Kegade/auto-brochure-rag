"""Run the RAG Triad eval: the whole pipeline, judged end to end.

    cd backend
    python -m evals.rag_triad.eval_rag_triad                          # every question
    python -m evals.rag_triad.eval_rag_triad --cases venue-boot xpres-price
    python -m evals.rag_triad.eval_rag_triad --docs safari            # questions about some brochures
    python -m evals.rag_triad.eval_rag_triad --scope own              # search only the question's brochures
    python -m evals.rag_triad.eval_rag_triad --rescore                # re-judge saved runs only
    python -m evals.rag_triad.eval_rag_triad --rpm 5                  # free-tier Gemini key

Each question from goldens/retrieval.yaml goes through the app's own steps,
as `build_retrieval_chain` runs them for a first message (no chat history,
so no question rewrite): `build_search` over the corpus, indexed by the
app's indexing steps into the retrieval eval's local Qdrant store, then
`build_answer` on the retrieved chunks. The judge then scores the three legs
of the triad; no expected answer is used.

Writes to evals/rag_triad/results/:
    runs.json      retrieved chunks and answer per question (inspect these!)
    scores.json    per-case scores, judge findings and summary
    report.md      tables
"""

import argparse
import asyncio
import json
import logging
from datetime import datetime

from app.core.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_MODEL,
    GOOGLE_API_KEY,
    LLM_MODEL,
    RETRIEVAL_K,
)
from app.rag.retrieval import build_answer, build_search, format_context
from evals.common.dataset import load_cases, load_corpus
from evals.common.gemini import DEFAULT_JUDGE, RateLimiter, make_judge, with_backoff
from evals.common.paths import results_dir
from evals.rag_triad.metrics import METRICS, judge_case, summarize
from evals.rag_triad.report import write_report
from evals.retrieval.eval_retrieval import SCOPES
from evals.retrieval.index import build_store

COMPONENT = "rag_triad"
RESULTS = results_dir(COMPONENT)
RUNS = RESULTS / "runs.json"

log = logging.getLogger("eval.rag_triad")


# --- the pipeline ----------------------------------------------------------


def run_pipeline(cases: list[dict], args, out=RUNS) -> dict:
    """Search + answer per question, as the app does for a first message,
    saved to `out`. The correctness eval runs its questions through this too."""
    corpus = load_corpus()
    store = build_store(corpus, results_dir("retrieval") / "qdrant", reindex=args.reindex)
    every_doc = [b.id for b in corpus]
    answer = build_answer()
    limit = RateLimiter(args.rpm)

    runs = {}
    for case in cases:
        doc_ids = list(case["sources"]) if args.scope == "own" else every_doc
        search = build_search(doc_ids, vector_store=store, k=args.k)
        chunks = with_backoff(search.invoke, case["question"])
        limit.wait_sync()
        text = with_backoff(
            answer.invoke,
            {"input": case["question"], "chat_history": [], "context": format_context(chunks)},
        )
        runs[case["id"]] = {
            "retrieved": [
                {"doc": c.metadata["document_id"], "page": c.metadata["page"], "context": format_context([c])}
                for c in chunks
            ],
            "answer": text,
        }
        log.info("ran       %-28s %d chunks, %d chars", case["id"], len(chunks), len(text))

    saved = {
        "config": {
            "embedding_model": EMBEDDING_MODEL,
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "k": args.k,
            "scope": args.scope,
            "generator": LLM_MODEL,
        },
        "cases": runs,
    }
    out.write_text(json.dumps(saved, indent=2, ensure_ascii=False), encoding="utf-8")
    return saved


def load_runs(cases: list[dict]) -> dict:
    if not RUNS.exists():
        raise FileNotFoundError(f"{RUNS} not found: run without --rescore first.")
    saved = json.loads(RUNS.read_text(encoding="utf-8"))
    missing = [c["id"] for c in cases if c["id"] not in saved["cases"]]
    if missing:
        raise ValueError(f"No saved run for {missing}: run without --rescore.")
    return saved


# --- judging ---------------------------------------------------------------


async def judge_all(cases: list[dict], runs: dict, args) -> list[dict]:
    judge = make_judge(args.judge, GOOGLE_API_KEY, rpm=args.rpm)
    limit = asyncio.Semaphore(args.concurrency)

    async def one(case):
        run = runs[case["id"]]
        context = [c["context"] for c in run["retrieved"]]
        result = await judge_case(case, run["answer"], context, judge, limit)
        scores = "  ".join(
            f"{k}={'–' if v is None else f'{v:.2f}'}" for k, v in result["scores"].items()
        )
        log.info("judged    %-28s %s", case["id"], scores)
        return {
            "id": case["id"],
            "type": case["type"],
            "sources": case["sources"],
            "question": case["question"],
            "answer": run["answer"],
            "retrieved": [{"doc": c["doc"], "page": c["page"]} for c in run["retrieved"]],
            **result,
        }

    return await asyncio.gather(*(one(c) for c in cases))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--k", type=int, default=RETRIEVAL_K, help=f"chunks per search (app: {RETRIEVAL_K})")
    parser.add_argument("--scope", choices=SCOPES, default="all", help="which brochures each search may return")
    parser.add_argument("--cases", nargs="+", help="case ids to run")
    parser.add_argument("--docs", nargs="+", help="only questions about these brochure ids")
    parser.add_argument("--judge", default=DEFAULT_JUDGE, help="Gemini model DeepEval judges with")
    parser.add_argument("--concurrency", type=int, default=8, help="judge metrics in flight")
    parser.add_argument("--rpm", type=float, help="cap Gemini requests per minute (free tier: 5 on some models)")
    parser.add_argument("--reindex", action="store_true", help="re-chunk and re-embed the corpus")
    parser.add_argument("--rescore", action="store_true", help="re-judge saved runs.json")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    for noisy in ("httpx", "google_genai", "deepeval"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    cases = load_cases(args.cases, args.docs)
    if not cases:
        raise SystemExit("No cases selected.")

    saved = load_runs(cases) if args.rescore else run_pipeline(cases, args)
    results = asyncio.run(judge_all(cases, saved["cases"], args))

    config = {
        **saved["config"],
        "judge": args.judge,
        "scope_note": SCOPES[saved["config"]["scope"]],
        "penalize_ambiguous_claims": True,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    summary = summarize(results)
    (RESULTS / "scores.json").write_text(
        json.dumps({"config": config, "summary": summary, "cases": results}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    write_report(RESULTS / "report.md", config, results)
    means = "  ".join(
        f"{m} {'–' if summary[m] is None else f'{summary[m]:.2f}'}" for m in METRICS
    )
    log.info("%s  refused %d  ->  %s", means, summary["refused"], RESULTS / "report.md")


if __name__ == "__main__":
    main()
