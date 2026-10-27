# Completeness evaluation

Generated 2026-10-27 by `python -m evals.completeness.eval_completeness`. 2 cases from `goldens/completeness.yaml`, run through the whole pipeline. The metric is defined in `evals/completeness/metrics.py`.

- **Retriever:** `gemini-embedding-2`, chunks of 1500 chars with 150 overlap, k = 5
- **Search scope:** every brochure in the corpus is attached, as in a chat with all of them open
- **Generator:** `gemini-3.1-flash-lite` with the app's answer prompt (fingerprint `0a8685b5`), no chat history
- **Judge:** `gemini-3.1-flash-lite`, one verdict per key point

## Summary

| Metric | Mean | Pass rate (≥ 0.7) | Refused | Errors |
|---|---|---|---|---|
| Completeness | 1.00 | 100% | 0 | 0 |

**Key points:** 5 covered, 0 partial, 0 missing of 5 judged.

**Completeness:** what share of the ideal answer's key points does the answer cover? Score = (covered + 0.5 × partial) / key points.

## By type

| Type | Cases | Completeness | Pass rate | Missing points | Partial points | Refused |
|---|---|---|---|---|---|---|
| list | 1 | 1.00 | 100% | 0 | 0 | 0 |
| multi | 1 | 1.00 | 100% | 0 | 0 | 0 |

## By brochure

| Brochure | Cases | Completeness | Pass rate | Missing points | Partial points | Refused |
|---|---|---|---|---|---|---|
| sorento | 1 | 1.00 | 100% | 0 | 0 | 0 |
| venue | 1 | 1.00 | 100% | 0 | 0 | 0 |

## Every case

| Case | Type | Completeness | Key points | Partial | Missing | Refused |
|---|---|---|---|---|---|---|
| venue-engines | multi | 1.00 | 3 | 0 | 0 |  |
| sorento-trims | list | 1.00 | 2 | 0 | 0 |  |

## Incomplete answers: what was left out
