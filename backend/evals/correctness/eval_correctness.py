"""Run the correctness eval: is the app's answer right, judged against the
ideal answer?

    cd backend
    python -m evals.correctness.eval_correctness                          # every case
    python -m evals.correctness.eval_correctness --cases venue-boot xpres-price
    python -m evals.correctness.eval_correctness --docs safari            # cases about some brochures
    python -m evals.correctness.eval_correctness --scope own              # search only the case's brochures
    python -m evals.correctness.eval_correctness --rescore                # re-judge saved answers only
    python -m evals.correctness.eval_correctness --rpm 5                  # free-tier Gemini key

Each question in goldens/correctness.yaml goes through the whole pipeline,
exactly as in the RAG Triad eval (`build_search` over the retrieval eval's
local Qdrant store, then `build_answer`, no chat history). GEval then scores
the answer against the case's `expected_answer`, out of 10, on meaning,
accuracy and completeness.

Writes to evals/correctness/results/:
    answers.json   retrieved chunks and answer per case (inspect these!)
    scores.json    per-case scores, judge reasons and summary
    report.md      tables
"""

import argparse
import asyncio
import json
import logging
from datetime import datetime

from app.core.config import GOOGLE_API_KEY, RETRIEVAL_K
from evals.common.dataset import load_cases
from evals.common.gemini import DEFAULT_JUDGE, make_judge
from evals.common.paths import results_dir
from evals.correctness.metrics import THRESHOLD, judge_case, summarize
from evals.correctness.report import write_report
from evals.rag_triad.eval_rag_triad import run_pipeline
from evals.retrieval.eval_retrieval import SCOPES

COMPONENT = "correctness"
RESULTS = results_dir(COMPONENT)
ANSWERS = RESULTS / "answers.json"

log = logging.getLogger("eval.correctness")


def warn_on_drift(cases: list[dict]) -> None:
    """The questions should match goldens/retrieval.yaml so the evals stay
    comparable; say so when they have drifted apart."""
    retrieval = {c["id"]: c["question"] for c in load_cases(component="retrieval")}
    for case in cases:
        if case["id"] not in retrieval:
            log.warning("%s is not in goldens/retrieval.yaml", case["id"])
        elif retrieval[case["id"]] != case["question"]:
            log.warning("%s: question differs from goldens/retrieval.yaml", case["id"])


def load_answers(cases: list[dict]) -> dict:
    if not ANSWERS.exists():
        raise FileNotFoundError(f"{ANSWERS} not found: run without --rescore first.")
    saved = json.loads(ANSWERS.read_text(encoding="utf-8"))
    missing = [c["id"] for c in cases if c["id"] not in saved["cases"]]
    if missing:
        raise ValueError(f"No saved answer for {missing}: run without --rescore.")
    return saved


async def judge_all(cases: list[dict], runs: dict, args) -> list[dict]:
    judge = make_judge(args.judge, GOOGLE_API_KEY, rpm=args.rpm)
    limit = asyncio.Semaphore(args.concurrency)

    async def one(case):
        run = runs[case["id"]]
        result = await judge_case(case, run["answer"], judge, limit)
        score = result["scores"]["correctness"]
        log.info("judged    %-28s correctness=%s", case["id"], "–" if score is None else f"{score:.2f}")
        return {
            "id": case["id"],
            "type": case["type"],
            "sources": case["sources"],
            "question": case["question"],
            "expected_answer": case["expected_answer"],
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
    parser.add_argument("--docs", nargs="+", help="only cases about these brochure ids")
    parser.add_argument("--judge", default=DEFAULT_JUDGE, help="Gemini model DeepEval judges with")
    parser.add_argument("--concurrency", type=int, default=8, help="judge metrics in flight")
    parser.add_argument("--rpm", type=float, help="cap Gemini requests per minute (free tier: 5 on some models)")
    parser.add_argument("--reindex", action="store_true", help="re-chunk and re-embed the corpus")
    parser.add_argument("--rescore", action="store_true", help="re-judge saved answers.json")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    for noisy in ("httpx", "google_genai", "deepeval"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    cases = load_cases(args.cases, args.docs, component=COMPONENT)
    if not cases:
        raise SystemExit("No cases selected.")
    warn_on_drift(cases)

    saved = load_answers(cases) if args.rescore else run_pipeline(cases, args, out=ANSWERS)
    results = asyncio.run(judge_all(cases, saved["cases"], args))

    config = {
        **saved["config"],
        "judge": args.judge,
        "threshold": THRESHOLD,
        "scope_note": SCOPES[saved["config"]["scope"]],
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    summary = summarize(results)
    (RESULTS / "scores.json").write_text(
        json.dumps({"config": config, "summary": summary, "cases": results}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    write_report(RESULTS / "report.md", config, results)
    mean = summary["correctness"]
    log.info(
        "correctness %s  pass %s  refused %d  ->  %s",
        "–" if mean is None else f"{mean:.2f}",
        "–" if summary["correctness_pass"] is None else f"{summary['correctness_pass']:.0%}",
        summary["refused"],
        RESULTS / "report.md",
    )


if __name__ == "__main__":
    main()
