"""Score an answer for completeness against the key points of the ideal
answer. One LLM-judge call per answer:

    completeness   The judge gets the question, the case's `key_points` and
                   the app's answer, and marks each point
                       covered   the answer gives this information
                       partial   it gives some of it (one of two transmissions,
                                 power but not torque)
                       missing   it leaves it out, or gives a different value
                   Score = (covered + 0.5 x partial) / key points.

Only coverage counts: extra detail, wording and formatting are ignored, and
whether the rest of the answer is right is the correctness eval's job. A
refusal ("I couldn't find enough information…") misses every point.
"""

import asyncio
from typing import Literal

from pydantic import BaseModel

from evals.rag_triad.metrics import REFUSAL

METRICS = ["completeness"]
THRESHOLD = 0.7
CREDIT = {"covered": 1.0, "partial": 0.5, "missing": 0.0}

PROMPT = """You are checking whether an answer from a car-brochure assistant is complete.

You are given a user's question, the key points a complete answer must cover,
and the assistant's answer. For EACH key point, in order, decide:
- "covered": the answer gives this information. Wording, order, formatting,
  number formats (3 995 mm vs 3,995 mm) and unit spelling (litres vs L) do not
  matter.
- "partial": the answer gives only some of the information in the point
  (for example one of two transmissions, or power but not torque).
- "missing": the answer leaves the information out, gives a different value,
  or says it could not find the information.

Judge only whether each key point is covered. Ignore anything else in the
answer, whether extra detail or citations. Give a one-sentence reason per
point that names what is missing, if anything.

Question:
{question}

Key points:
{key_points}

Answer:
{answer}

Return one verdict per key point ({n} in total), in the same order."""


class PointVerdict(BaseModel):
    verdict: Literal["covered", "partial", "missing"]
    reason: str


class Verdicts(BaseModel):
    verdicts: list[PointVerdict]


async def judge_case(case: dict, answer: str, judge, limit: asyncio.Semaphore) -> dict:
    """Completeness for one answer. A judge failure records its error and a
    None score instead of failing the run."""
    points = case["key_points"]
    prompt = PROMPT.format(
        question=case["question"],
        key_points="\n".join(f"{i}. {p}" for i, p in enumerate(points, 1)),
        answer=answer,
        n=len(points),
    )
    scores, errors, verdicts = {}, {}, []
    try:
        async with limit:
            result, _cost = await judge.a_generate(prompt, schema=Verdicts)
        if len(result.verdicts) != len(points):
            raise ValueError(f"judge returned {len(result.verdicts)} verdicts for {len(points)} key points")
        verdicts = [
            {"key_point": p, "verdict": v.verdict, "reason": v.reason}
            for p, v in zip(points, result.verdicts)
        ]
        scores["completeness"] = sum(CREDIT[v["verdict"]] for v in verdicts) / len(points)
    except Exception as exc:
        scores["completeness"] = None
        errors["completeness"] = f"{type(exc).__name__}: {exc}"

    return {
        "scores": scores,
        "errors": errors,
        "key_points": len(points),
        "verdicts": verdicts,
        "refused": REFUSAL in answer.lower().replace("’", "'"),
    }


def summarize(results: list[dict]) -> dict:
    """Mean and pass rate (score >= THRESHOLD), key points by verdict, and
    refusals. A None score (judge failed) is left out and counted under
    `_errors`."""
    out = {"cases": len(results), "refused": sum(r["refused"] for r in results)}
    for name in METRICS:
        values = [r["scores"].get(name) for r in results]
        scored = [v for v in values if v is not None]
        out[name] = sum(scored) / len(scored) if scored else None
        out[f"{name}_pass"] = (
            sum(v >= THRESHOLD for v in scored) / len(scored) if scored else None
        )
        out[f"{name}_errors"] = len(values) - len(scored)
    for verdict in CREDIT:
        out[verdict] = sum(v["verdict"] == verdict for r in results for v in r["verdicts"])
    return out
