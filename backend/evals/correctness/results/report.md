# Correctness evaluation

Generated 2026-10-27 by `python -m evals.correctness.eval_correctness`. 2 cases from `goldens/correctness.yaml`, run through the whole pipeline. The metric is defined in `evals/correctness/metrics.py`.

- **Retriever:** `gemini-embedding-2`, chunks of 1500 chars with 150 overlap, k = 5
- **Search scope:** every brochure in the corpus is attached, as in a chat with all of them open
- **Generator:** `gemini-3.1-flash-lite` with the app's answer prompt, no chat history
- **Judge:** `gemini-3.1-flash-lite` via DeepEval GEval, comparing each answer with the case's expected answer

## Summary

| Metric | Mean | Out of 10 | Pass rate (≥ 0.7) | Refused | Errors |
|---|---|---|---|---|---|
| Correctness | 0.95 | 9.5 | 100% | 0 | 0 |

**Correctness:** does the answer say the same as the ideal answer, with no wrong facts and nothing left out? A refusal scores lowest.

## By type

| Type | Cases | Correctness | Pass rate | Refused |
|---|---|---|---|---|
| multi | 1 | 0.90 | 100% | 0 |
| spec | 1 | 1.00 | 100% | 0 |

## By brochure

| Brochure | Cases | Correctness | Pass rate | Refused |
|---|---|---|---|---|
| venue | 2 | 0.95 | 100% | 0 |

## Every case

| Case | Type | Correctness | Refused | Retrieved from |
|---|---|---|---|---|
| venue-engines | multi | 0.90 |  | venue p15, venue p17, venue p19, punch p19, venue p19 |
| venue-boot | spec | 1.00 |  | venue p8, venue p19, venue p17, venue p15, venue p13 |

## Below 0.7: answer vs expected
