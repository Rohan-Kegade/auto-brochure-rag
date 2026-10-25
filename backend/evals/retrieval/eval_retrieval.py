"""Run the retrieval eval.

    cd backend
    python -m evals.retrieval.eval_retrieval                          # every case
    python -m evals.retrieval.eval_retrieval --k 5                    # fewer chunks
    python -m evals.retrieval.eval_retrieval --scope own              # search only the question's brochures
    python -m evals.retrieval.eval_retrieval --cases venue-boot xpres-price
    python -m evals.retrieval.eval_retrieval --docs safari            # cases about some brochures
    python -m evals.retrieval.eval_retrieval --rescore                # re-judge saved retrievals only
    python -m evals.retrieval.eval_retrieval --relevancy              # add DeepEval relevancy (slow)

The retriever is the app's own (`app.rag.retrieval.build_search`) over chunks
made by the app's own indexing steps, so the scores describe production. The
generator is not involved: each case is the question, its expected answer and
the chunks retrieved for it.

Writes to evals/retrieval/results/:
    qdrant/            local vector store, one collection per chunking config
    retrievals.json    the chunks retrieved per case (inspect these!)
    scores.json        per-case scores, judge reasons and summary
    report.md          tables
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
    RETRIEVAL_K,
)
from app.rag.retrieval import build_search, format_context
from evals.common.dataset import load_corpus, load_gold
from evals.common.paths import results_dir
from evals.retrieval.index import build_store, with_backoff
from evals.retrieval.metrics import judge_case, make_judge, metrics_run, summarize
from evals.retrieval.report import write_report

COMPONENT = "retrieval"
RESULTS = results_dir(COMPONENT)
RETRIEVALS = RESULTS / "retrievals.json"
DEFAULT_JUDGE = "gemini-3.1-flash-lite"
SCOPES = {
    "all": "every brochure in the corpus is attached, as in a chat with all of them open",
    "own": "only the brochures each question is about",
}

log = logging.getLogger("eval.retrieval")


def select_cases(args) -> list[dict]:
    cases = load_gold(COMPONENT, key="cases")
    if args.cases:
        unknown = set(args.cases) - {c["id"] for c in cases}
        if unknown:
            raise ValueError(f"Unknown case ids: {sorted(unknown)}")
        cases = [c for c in cases if c["id"] in args.cases]
    if args.docs:
        cases = [c for c in cases if set(c["sources"]) & set(args.docs)]
    return cases


# --- retrieval -------------------------------------------------------------


def retrieve(cases: list[dict], args) -> dict:
    corpus = load_corpus()
    store = build_store(corpus, RESULTS / "qdrant", reindex=args.reindex)
    every_doc = [b.id for b in corpus]

    retrieved = {}
    for case in cases:
        doc_ids = list(case["sources"]) if args.scope == "own" else every_doc
        search = build_search(doc_ids, vector_store=store, k=args.k)
        chunks = with_backoff(search.invoke, case["question"])
        retrieved[case["id"]] = [
            {
                "doc": c.metadata["document_id"],
                "page": c.metadata["page"],
                "context": format_context([c]),
            }
            for c in chunks
        ]
        log.info("retrieved %-28s %d chunks", case["id"], len(chunks))

    saved = {
        "config": {
            "embedding_model": EMBEDDING_MODEL,
            "chunk_size": CHUNK_SIZE,
            "chunk_overlap": CHUNK_OVERLAP,
            "k": args.k,
            "scope": args.scope,
        },
        "cases": retrieved,
    }
    RETRIEVALS.write_text(json.dumps(saved, indent=2, ensure_ascii=False), encoding="utf-8")
    return saved


def load_retrievals(cases: list[dict]) -> dict:
    if not RETRIEVALS.exists():
        raise FileNotFoundError(f"{RETRIEVALS} not found: run without --rescore first.")
    saved = json.loads(RETRIEVALS.read_text(encoding="utf-8"))
    missing = [c["id"] for c in cases if c["id"] not in saved["cases"]]
    if missing:
        raise ValueError(f"No saved retrieval for {missing}: run without --rescore.")
    return saved


# --- judging ---------------------------------------------------------------


async def judge_all(cases: list[dict], retrieved: dict, args):
    judge = make_judge(args.judge, GOOGLE_API_KEY, rpm=args.rpm)
    limit = asyncio.Semaphore(args.concurrency)

    async def one(case):
        chunks = retrieved[case["id"]]
        result = await judge_case(case, chunks, judge, limit, relevancy=args.relevancy)
        scores = "  ".join(
            f"{k.removeprefix('contextual_')}={'–' if v is None else f'{v:.2f}'}"
            for k, v in result["scores"].items()
        )
        log.info("judged    %-28s %s", case["id"], scores)
        return {
            "id": case["id"],
            "type": case["type"],
            "sources": case["sources"],
            "question": case["question"],
            "expected_answer": case["expected_answer"],
            "retrieved": [{"doc": c["doc"], "page": c["page"]} for c in chunks],
            **result,
        }

    return await asyncio.gather(*(one(c) for c in cases))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--k", type=int, default=RETRIEVAL_K, help=f"chunks per search (app: {RETRIEVAL_K})")
    parser.add_argument("--scope", choices=SCOPES, default="all", help="which brochures each search may return")
    parser.add_argument("--cases", nargs="+", help="case ids to run")
    parser.add_argument("--docs", nargs="+", help="only cases about these brochure ids")
    parser.add_argument("--judge", default=DEFAULT_JUDGE, help="Gemini model DeepEval judges with")
    parser.add_argument("--concurrency", type=int, default=8, help="judge metrics in flight")
    parser.add_argument("--rpm", type=float, help="cap judge requests per minute (free tier: 5 on some models)")
    parser.add_argument("--reindex", action="store_true", help="re-chunk and re-embed the corpus")
    parser.add_argument("--rescore", action="store_true", help="re-judge saved retrievals.json")
    parser.add_argument("--relevancy", action="store_true", help="also run DeepEval contextual relevancy (k + 1 judge calls per case)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    for noisy in ("httpx", "google_genai", "deepeval"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    cases = select_cases(args)
    if not cases:
        raise SystemExit("No cases selected.")

    saved = load_retrievals(cases) if args.rescore else retrieve(cases, args)
    results = asyncio.run(judge_all(cases, saved["cases"], args))

    config = {
        **saved["config"],
        "judge": args.judge,
        "scope_note": SCOPES[saved["config"]["scope"]],
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    summary = summarize(results)
    (RESULTS / "scores.json").write_text(
        json.dumps({"config": config, "summary": summary, "cases": results}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    write_report(RESULTS / "report.md", config, results)
    means = "  ".join(
        f"{m} {'–' if summary[m] is None else f'{summary[m]:.2f}'}" for m in metrics_run(results)
    )
    log.info("%s  ->  %s", means, RESULTS / "report.md")


if __name__ == "__main__":
    main()
