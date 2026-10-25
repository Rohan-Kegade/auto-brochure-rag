"""Score a generated answer with DeepEval, given the golden context it was
generated from. Both metrics are LLM-judged:

    faithfulness      The answer is split into atomic claims, and each claim is
                      checked against the golden context. Score = supported
                      claims / all claims. Run with penalize_ambiguous_claims,
                      so a claim the context neither supports nor contradicts
                      (an invented spec) counts as unsupported; DeepEval's
                      default would count it as faithful.
    answer_relevancy  The answer is split into statements, and each statement
                      is checked against the question (not the context).
                      Score = relevant statements / all statements.

Neither checks that the answer is complete: a correct one-fact answer to a
two-part question scores 1.0 on both.
"""

import asyncio

from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

METRICS = ["faithfulness", "answer_relevancy"]
THRESHOLD = 0.5


def _verdict(v) -> str:
    return str(v.verdict).strip().lower()


def _unsupported_claims(metric) -> list[dict]:
    claims = getattr(metric, "claims", None) or []
    verdicts = getattr(metric, "verdicts", None) or []
    return [
        {"claim": claim, "verdict": _verdict(v), "reason": v.reason}
        for claim, v in zip(claims, verdicts)
        if _verdict(v) != "yes"
    ]


def _irrelevant_statements(metric) -> list[dict]:
    statements = getattr(metric, "statements", None) or []
    verdicts = getattr(metric, "verdicts", None) or []
    return [
        {"statement": statement, "reason": v.reason}
        for statement, v in zip(statements, verdicts)
        if _verdict(v) == "no"
    ]


async def judge_case(
    case: dict, answer: str, context: list[str], judge, limit: asyncio.Semaphore
) -> dict:
    """Both metrics for one answer. A metric that fails records its error and
    a None score instead of failing the run."""
    test_case = LLMTestCase(
        input=case["question"], actual_output=answer, retrieval_context=context
    )
    metrics = {
        "faithfulness": FaithfulnessMetric(
            model=judge,
            threshold=THRESHOLD,
            include_reason=True,
            async_mode=True,
            penalize_ambiguous_claims=True,
        ),
        "answer_relevancy": AnswerRelevancyMetric(
            model=judge, threshold=THRESHOLD, include_reason=True, async_mode=True
        ),
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

    faithfulness = metrics["faithfulness"]
    return {
        "scores": scores,
        "reasons": reasons,
        "errors": errors,
        "claims": len(getattr(faithfulness, "claims", None) or []),
        "unsupported_claims": _unsupported_claims(faithfulness),
        "irrelevant_statements": _irrelevant_statements(metrics["answer_relevancy"]),
    }


def summarize(results: list[dict]) -> dict:
    """Mean and pass rate (score >= THRESHOLD) of each metric. A None score
    (judge failed) is left out and counted under `_errors`."""
    out = {"cases": len(results)}
    for name in METRICS:
        values = [r["scores"].get(name) for r in results]
        scored = [v for v in values if v is not None]
        out[name] = sum(scored) / len(scored) if scored else None
        out[f"{name}_pass"] = (
            sum(v >= THRESHOLD for v in scored) / len(scored) if scored else None
        )
        out[f"{name}_errors"] = len(values) - len(scored)
    return out
