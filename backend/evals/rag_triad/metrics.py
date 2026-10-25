"""Score one full pipeline run (question -> retrieved chunks -> answer) on the
RAG Triad with DeepEval. All three legs are LLM-judged and reference-free:
no expected answer is needed.

    context_relevance   Retriever leg (question <-> retrieved chunks). Each
                        chunk is split into statements and each statement
                        judged relevant to the question or not. Score =
                        relevant statements / all statements: signal vs noise.
    groundedness        Generator leg (answer <-> retrieved chunks). The answer
                        is split into claims, each checked against the chunks.
                        Score = supported claims / all claims. Run with
                        penalize_ambiguous_claims, so a claim the chunks do not
                        mention (an invented spec) counts as unsupported.
    answer_relevance    Generator leg (answer <-> question). The answer is
                        split into statements, each checked against the
                        question. Score = on-topic statements / all statements.

Which leg is low says where to look: context relevance -> the retriever;
groundedness -> the generator is making things up; answer relevance -> the
generator drifts off-topic or refuses.
"""

import asyncio

from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
)
from deepeval.test_case import LLMTestCase

from evals.generator.metrics import irrelevant_statements, unsupported_claims

METRICS = ["context_relevance", "groundedness", "answer_relevance"]
LEGS = {
    "context_relevance": "retriever",
    "groundedness": "generator (unsupported claims)",
    "answer_relevance": "generator (off-topic or refused)",
}
THRESHOLD = 0.5
# The app's answer prompt tells the model to reply with this when the context
# falls short.
REFUSAL = "couldn't find enough information"


def _chunk_relevance(metric) -> list[float | None]:
    """Per retrieved chunk, in rank order: share of its statements the judge
    called relevant to the question."""
    out = []
    for chunk in getattr(metric, "verdicts_list", None) or []:
        verdicts = [str(v.verdict).strip().lower() for v in chunk.verdicts]
        out.append(verdicts.count("yes") / len(verdicts) if verdicts else None)
    return out


def weakest_leg(scores: dict) -> str | None:
    """The lowest-scoring metric under THRESHOLD, if any."""
    failing = {m: s for m in METRICS if (s := scores.get(m)) is not None and s < THRESHOLD}
    return min(failing, key=failing.get) if failing else None


async def judge_case(
    case: dict, answer: str, context: list[str], judge, limit: asyncio.Semaphore
) -> dict:
    """All three legs for one run. A metric that fails records its error and
    a None score instead of failing the run."""
    test_case = LLMTestCase(
        input=case["question"], actual_output=answer, retrieval_context=context
    )
    common = {"model": judge, "threshold": THRESHOLD, "include_reason": True, "async_mode": True}
    metrics = {
        "context_relevance": ContextualRelevancyMetric(**common),
        "groundedness": FaithfulnessMetric(**common, penalize_ambiguous_claims=True),
        "answer_relevance": AnswerRelevancyMetric(**common),
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

    return {
        "scores": scores,
        "reasons": reasons,
        "errors": errors,
        "weakest": weakest_leg(scores),
        "refused": REFUSAL in answer.lower().replace("’", "'"),
        "chunk_relevance": _chunk_relevance(metrics["context_relevance"]),
        "unsupported_claims": unsupported_claims(metrics["groundedness"]),
        "irrelevant_statements": irrelevant_statements(metrics["answer_relevance"]),
    }


def summarize(results: list[dict]) -> dict:
    """Mean and pass rate (score >= THRESHOLD) of each leg, refusals, and how
    often each leg was the weakest. A None score (judge failed) is left out
    and counted under `_errors`."""
    out = {"cases": len(results), "refused": sum(r["refused"] for r in results)}
    for name in METRICS:
        values = [r["scores"].get(name) for r in results]
        scored = [v for v in values if v is not None]
        out[name] = sum(scored) / len(scored) if scored else None
        out[f"{name}_pass"] = (
            sum(v >= THRESHOLD for v in scored) / len(scored) if scored else None
        )
        out[f"{name}_errors"] = len(values) - len(scored)
        out[f"{name}_weakest"] = sum(r["weakest"] == name for r in results)
    return out
