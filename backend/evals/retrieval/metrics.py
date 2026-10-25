"""Score retrieved chunks against a reference answer with DeepEval.

LLM-judged (DeepEval, judge = a Gemini model), about 2 calls each per case:

    contextual_recall     Of the sentences in the expected answer, how many can
                          be attributed to the retrieved chunks? Did we fetch
                          enough to answer fully?
    contextual_precision  Is each chunk relevant to the expected answer, and are
                          the relevant ones ranked first? Rank-weighted: junk
                          ranked below every relevant chunk costs nothing.

Free (no extra LLM calls):

    chunk_relevance       Share of retrieved chunks the precision judge called
                          relevant. The noise measure: every off-topic chunk
                          lowers it, wherever it ranks, so it is the one score
                          that drops when k grows too large.
    page_hit              Every brochure in `sources` contributed a chunk from
                          one of the pages the answer is printed on. Does not
                          depend on the judge, so it is a check on it.

Optional (--relevancy), about k + 1 calls per case:

    contextual_relevancy  DeepEval's own noise measure: of the statements in
                          the retrieved chunks, how many are relevant to the
                          question? One judge call per chunk, so it is off by
                          default to stay within free-tier rate limits.
"""

import asyncio

from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase

LLM_METRICS = {
    "contextual_recall": ContextualRecallMetric,
    "contextual_precision": ContextualPrecisionMetric,
}
OPTIONAL_METRICS = {"contextual_relevancy": ContextualRelevancyMetric}
# Report order. A metric that was not run is left out of the report.
METRICS = [
    "contextual_recall",
    "contextual_precision",
    "chunk_relevance",
    "contextual_relevancy",
    "page_hit",
]
THRESHOLD = 0.5


def page_hit(case: dict, chunks: list[dict]) -> float:
    found = {(c["doc"], c["page"]) for c in chunks}
    return float(
        all(
            any((doc, page) in found for page in pages)
            for doc, pages in case["sources"].items()
        )
    )


def _verdicts(metric) -> list[str]:
    """Per-chunk yes/no from contextual precision, in rank order."""
    return [v.verdict.strip().lower() for v in getattr(metric, "verdicts", None) or []]


def chunk_relevance(verdicts: list[str]) -> float | None:
    return verdicts.count("yes") / len(verdicts) if verdicts else None


async def judge_case(
    case: dict,
    chunks: list[dict],
    judge,
    limit: asyncio.Semaphore,
    relevancy: bool = False,
) -> dict:
    """All metrics for one case. A metric that fails records its error and a
    None score instead of failing the run."""
    test_case = LLMTestCase(
        input=case["question"],
        expected_output=case["expected_answer"],
        retrieval_context=[c["context"] for c in chunks],
    )
    to_run = {**LLM_METRICS, **(OPTIONAL_METRICS if relevancy else {})}
    metrics = {
        name: cls(model=judge, threshold=THRESHOLD, include_reason=True, async_mode=True)
        for name, cls in to_run.items()
    }

    async def run(metric):
        async with limit:
            await metric.a_measure(test_case, _show_indicator=False)

    outcomes = await asyncio.gather(*(run(m) for m in metrics.values()), return_exceptions=True)

    scores, reasons, errors = {}, {}, {}
    for (name, metric), outcome in zip(metrics.items(), outcomes):
        if isinstance(outcome, Exception):
            scores[name] = None
            errors[name] = f"{type(outcome).__name__}: {outcome}"
        else:
            scores[name] = metric.score
            reasons[name] = metric.reason
    verdicts = _verdicts(metrics["contextual_precision"])
    scores["chunk_relevance"] = chunk_relevance(verdicts)
    scores["page_hit"] = page_hit(case, chunks)

    return {
        "scores": scores,
        "reasons": reasons,
        "errors": errors,
        "precision_verdicts": verdicts,
    }


def mean(values) -> float | None:
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def metrics_run(results: list[dict]) -> list[str]:
    """The metrics these results were scored on, in report order."""
    return [m for m in METRICS if any(m in r["scores"] for r in results)]


def summarize(results: list[dict]) -> dict:
    """Mean and pass rate (score >= THRESHOLD) of every metric that was run.
    A None score (judge failed) is left out and counted under `_errors`."""
    out = {"cases": len(results)}
    for name in metrics_run(results):
        values = [r["scores"].get(name) for r in results]
        scored = [v for v in values if v is not None]
        out[name] = mean(scored)
        out[f"{name}_pass"] = (
            sum(v >= THRESHOLD for v in scored) / len(scored) if scored else None
        )
        out[f"{name}_errors"] = len(values) - len(scored)
    return out
