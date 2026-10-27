"""Score an answer for correctness against the ideal answer with DeepEval's
GEval, an LLM judge that follows written evaluation steps:

    correctness   The judge compares the app's answer with `expected_answer`
                  as a whole, not claim by claim: same meaning, no wrong facts,
                  nothing left out. It scores out of 10; DeepEval scales that
                  to 0-1. A wrong number or car weighs more than a missing
                  detail, and extra detail costs nothing unless it is wrong.

Unlike the generator and RAG Triad metrics this one needs a reference answer,
so it is the only one that catches an answer that is grounded in the
retrieved chunks and on-topic, but wrong or incomplete.
"""

import asyncio

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from evals.rag_triad.metrics import REFUSAL

METRICS = ["correctness"]
THRESHOLD = 0.7

# Explicit steps rather than a one-line `criteria`: GEval would otherwise
# write its own steps on every run, and the scores would drift with them.
EVALUATION_STEPS = [
    "List every fact in the expected output: spec values, units, engines, "
    "variants or trims, features, colours and which car each belongs to.",
    "For each fact, check whether the actual output states it with the same "
    "meaning. Wording, order, formatting, number formats (3 995 mm vs 3,995 mm) "
    "and unit spelling (litres vs L) do not matter.",
    "Heavily penalize any statement in the actual output that contradicts the "
    "expected output: a wrong number, a feature given to the wrong variant, "
    "or a spec attributed to the wrong car.",
    "Penalize missing facts in proportion to how much of the question they "
    "leave unanswered.",
    "Do not penalize extra details, source or page citations, or explanations "
    "that are not in the expected output, unless they contradict it.",
    "If the actual output says it could not find the information, give the "
    "lowest score.",
]


def make_metric(judge) -> GEval:
    return GEval(
        name="Correctness",
        evaluation_steps=EVALUATION_STEPS,
        evaluation_params=[
            SingleTurnParams.INPUT,
            SingleTurnParams.ACTUAL_OUTPUT,
            SingleTurnParams.EXPECTED_OUTPUT,
        ],
        model=judge,
        threshold=THRESHOLD,
        async_mode=True,
    )


async def judge_case(case: dict, answer: str, judge, limit: asyncio.Semaphore) -> dict:
    """Correctness for one answer. A judge failure records its error and a
    None score instead of failing the run."""
    test_case = LLMTestCase(
        input=case["question"], actual_output=answer, expected_output=case["expected_answer"]
    )
    metric = make_metric(judge)
    scores, reasons, errors = {}, {}, {}
    try:
        async with limit:
            await metric.a_measure(test_case, _show_indicator=False)
        scores["correctness"] = metric.score
        reasons["correctness"] = metric.reason
    except Exception as exc:
        scores["correctness"] = None
        errors["correctness"] = f"{type(exc).__name__}: {exc}"

    return {
        "scores": scores,
        "reasons": reasons,
        "errors": errors,
        "refused": REFUSAL in answer.lower().replace("’", "'"),
    }


def summarize(results: list[dict]) -> dict:
    """Mean and pass rate (score >= THRESHOLD), and refusals. A None score
    (judge failed) is left out and counted under `_errors`."""
    out = {"cases": len(results), "refused": sum(r["refused"] for r in results)}
    for name in METRICS:
        values = [r["scores"].get(name) for r in results]
        scored = [v for v in values if v is not None]
        out[name] = sum(scored) / len(scored) if scored else None
        out[f"{name}_pass"] = (
            sum(v >= THRESHOLD for v in scored) / len(scored) if scored else None
        )
        out[f"{name}_errors"] = len(values) - len(scored)
    return out
