"""Run the generator eval.

    cd backend
    python -m evals.generator.eval_generator                          # every case
    python -m evals.generator.eval_generator --cases venue-boot xpres-price
    python -m evals.generator.eval_generator --docs safari            # cases about some brochures
    python -m evals.generator.eval_generator --rescore                # re-judge saved answers only
    python -m evals.generator.eval_generator --rpm 5                  # free-tier Gemini key

The generator is tested on its own: the retriever is replaced by each
case's golden context in goldens/generator.yaml, the passages of the source
pages needed to answer the question and nothing more. The answer comes from
the app's own answer step (`app.rag.retrieval.build_answer`): same prompt,
model and context format ("Source: <file> / Page: <n>"), with no chat
history. A bad score is then the generator's fault, not the retriever's.

Writes to evals/generator/results/:
    generations.json   the answer per case (inspect these!)
    scores.json        per-case scores, unsupported claims, judge reasons, summary
    report.md          tables
"""

import argparse
import asyncio
import json
import logging
from datetime import datetime

from langchain_core.documents import Document

from app.core.config import GOOGLE_API_KEY, LLM_MODEL
from app.rag.retrieval import build_answer, format_context
from evals.common.dataset import load_cases, load_corpus
from evals.common.gemini import DEFAULT_JUDGE, RateLimiter, make_judge, with_backoff
from evals.common.paths import results_dir
from evals.generator.metrics import METRICS, judge_case, summarize
from evals.generator.report import write_report

COMPONENT = "generator"
RESULTS = results_dir(COMPONENT)
GENERATIONS = RESULTS / "generations.json"

log = logging.getLogger("eval.generator")


# --- golden context --------------------------------------------------------


def golden_contexts(cases: list[dict]) -> dict[str, list[Document]]:
    """Per case, its golden passages as Documents labelled like the app's
    chunks, so `format_context` renders them exactly as in production."""
    files = {b.id: b.file for b in load_corpus(require_pdfs=False)}
    return {
        case["id"]: [
            Document(
                page_content=p["text"],
                metadata={"source": files[p["doc"]], "page": p["page"], "document_id": p["doc"]},
            )
            for p in case["golden_context"]
        ]
        for case in cases
    }


def warn_on_drift(cases: list[dict]) -> None:
    """The questions should match goldens/retrieval.yaml so the evals stay
    comparable; say so when they have drifted apart."""
    retrieval = {c["id"]: c["question"] for c in load_cases(component="retrieval")}
    for case in cases:
        if case["id"] not in retrieval:
            log.warning("%s is not in goldens/retrieval.yaml", case["id"])
        elif retrieval[case["id"]] != case["question"]:
            log.warning("%s: question differs from goldens/retrieval.yaml", case["id"])


# --- generation ------------------------------------------------------------


def generate(cases: list[dict], contexts: dict, rpm: float | None) -> dict:
    answer = build_answer()
    limit = RateLimiter(rpm)
    answers = {}
    for case in cases:
        limit.wait_sync()
        answers[case["id"]] = with_backoff(
            answer.invoke,
            {
                "input": case["question"],
                "chat_history": [],
                "context": format_context(contexts[case["id"]]),
            },
        )
        log.info("generated %-28s %d chars", case["id"], len(answers[case["id"]]))

    saved = {"config": {"generator": LLM_MODEL}, "answers": answers}
    GENERATIONS.write_text(json.dumps(saved, indent=2, ensure_ascii=False), encoding="utf-8")
    return saved


def load_generations(cases: list[dict]) -> dict:
    if not GENERATIONS.exists():
        raise FileNotFoundError(f"{GENERATIONS} not found: run without --rescore first.")
    saved = json.loads(GENERATIONS.read_text(encoding="utf-8"))
    missing = [c["id"] for c in cases if c["id"] not in saved["answers"]]
    if missing:
        raise ValueError(f"No saved answer for {missing}: run without --rescore.")
    return saved


# --- judging ---------------------------------------------------------------


async def judge_all(cases: list[dict], answers: dict, contexts: dict, args) -> list[dict]:
    judge = make_judge(args.judge, GOOGLE_API_KEY, rpm=args.rpm)
    limit = asyncio.Semaphore(args.concurrency)

    async def one(case):
        chunks = contexts[case["id"]]
        answer = answers[case["id"]]
        result = await judge_case(case, answer, [format_context([c]) for c in chunks], judge, limit)
        scores = "  ".join(
            f"{k}={'–' if v is None else f'{v:.2f}'}" for k, v in result["scores"].items()
        )
        log.info("judged    %-28s %s", case["id"], scores)
        return {
            "id": case["id"],
            "type": case["type"],
            "sources": case["sources"],
            "question": case["question"],
            "answer": answer,
            "context_pages": [{"doc": c.metadata["document_id"], "page": c.metadata["page"]} for c in chunks],
            **result,
        }

    return await asyncio.gather(*(one(c) for c in cases))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--cases", nargs="+", help="case ids to run")
    parser.add_argument("--docs", nargs="+", help="only cases about these brochure ids")
    parser.add_argument("--judge", default=DEFAULT_JUDGE, help="Gemini model DeepEval judges with")
    parser.add_argument("--concurrency", type=int, default=8, help="judge metrics in flight")
    parser.add_argument("--rpm", type=float, help="cap Gemini requests per minute (free tier: 5 on some models)")
    parser.add_argument("--rescore", action="store_true", help="re-judge saved generations.json")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    for noisy in ("httpx", "google_genai", "deepeval"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    cases = load_cases(args.cases, args.docs, component=COMPONENT)
    if not cases:
        raise SystemExit("No cases selected.")
    warn_on_drift(cases)

    contexts = golden_contexts(cases)
    saved = load_generations(cases) if args.rescore else generate(cases, contexts, args.rpm)
    results = asyncio.run(judge_all(cases, saved["answers"], contexts, args))

    config = {
        **saved["config"],
        "judge": args.judge,
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
    log.info("%s  ->  %s", means, RESULTS / "report.md")


if __name__ == "__main__":
    main()
