"""Run the completeness eval: does the app's answer cover every key point of
the ideal answer?

    cd backend
    python -m evals.completeness.eval_completeness                          # every case
    python -m evals.completeness.eval_completeness --cases venue-boot xpres-price
    python -m evals.completeness.eval_completeness --docs safari            # cases about some brochures
    python -m evals.completeness.eval_completeness --scope own              # search only the case's brochures
    python -m evals.completeness.eval_completeness --rescore                # re-judge saved answers only
    python -m evals.completeness.eval_completeness --rpm 5                  # free-tier Gemini key

Each question in goldens/completeness.yaml goes through the whole pipeline,
exactly as in the RAG Triad eval (`build_search` over the retrieval eval's
local Qdrant store, then `build_answer`, no chat history). The judge then
marks each of the case's key points covered, partial or missing.

The config records a fingerprint of the app's answer prompt, so reports from
before and after a prompt change are easy to tell apart.

Writes to evals/completeness/results/:
    answers.json   retrieved chunks and answer per case (inspect these!)
    scores.json    per-case scores, per-point verdicts and summary
    report.md      tables
"""

import argparse
import asyncio
import hashlib
import json
import logging
from datetime import datetime

from app.core.config import GOOGLE_API_KEY, RETRIEVAL_K
from app.rag.retrieval import ANSWER_SYSTEM_PROMPT
from evals.common.dataset import load_cases
from evals.common.gemini import DEFAULT_JUDGE, make_judge
from evals.common.paths import results_dir
from evals.completeness.metrics import THRESHOLD, judge_case, summarize
from evals.completeness.report import write_report
from evals.correctness.eval_correctness import warn_on_drift
from evals.rag_triad.eval_rag_triad import run_pipeline
from evals.retrieval.eval_retrieval import SCOPES

COMPONENT = "completeness"
RESULTS = results_dir(COMPONENT)
ANSWERS = RESULTS / "answers.json"

log = logging.getLogger("eval.completeness")


def prompt_fingerprint() -> str:
    return hashlib.sha256(ANSWER_SYSTEM_PROMPT.encode("utf-8")).hexdigest()[:8]


def generate(cases: list[dict], args) -> dict:
    saved = run_pipeline(cases, args, out=ANSWERS)
    saved["config"]["answer_prompt"] = prompt_fingerprint()
    ANSWERS.write_text(json.dumps(saved, indent=2, ensure_ascii=False), encoding="utf-8")
    return saved


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
        score = result["scores"]["completeness"]
        log.info("judged    %-28s completeness=%s", case["id"], "–" if score is None else f"{score:.2f}")
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
    parser.add_argument("--docs", nargs="+", help="only cases about these brochure ids")
    parser.add_argument("--judge", default=DEFAULT_JUDGE, help="Gemini model to judge with")
    parser.add_argument("--concurrency", type=int, default=8, help="judge calls in flight")
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

    saved = load_answers(cases) if args.rescore else generate(cases, args)
    if saved["config"].get("answer_prompt") != prompt_fingerprint():
        log.warning("saved answers were generated with a different answer prompt")
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
    mean = summary["completeness"]
    log.info(
        "completeness %s  pass %s  points %d covered / %d partial / %d missing  refused %d  ->  %s",
        "–" if mean is None else f"{mean:.2f}",
        "–" if summary["completeness_pass"] is None else f"{summary['completeness_pass']:.0%}",
        summary["covered"], summary["partial"], summary["missing"], summary["refused"],
        RESULTS / "report.md",
    )


if __name__ == "__main__":
    main()
