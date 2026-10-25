# Retrieval evaluation

Generated 2026-10-25 by `python -m evals.retrieval.eval_retrieval`. 2 cases from `goldens/retrieval.yaml`. Metric definitions are in `evals/retrieval/metrics.py`.

- **Retriever:** `gemini-embedding-2`, chunks of 1500 chars with 150 overlap, k = 10
- **Search scope:** every brochure in the corpus is attached, as in a chat with all of them open
- **Judge:** `gemini-3.1-flash-lite` via DeepEval

## Summary

| Metric | Mean | Pass rate (≥ 0.5) | Errors |
|---|---|---|---|
| Recall | 1.00 | 100% | 0 |
| Precision | 0.93 | 100% | 0 |
| Relevancy | 0.16 | 0% | 0 |
| Page hit | 1.00 | 100% | 0 |

- **Recall:** did we retrieve every fact the answer needs?
- **Precision:** are the relevant chunks ranked first?
- **Relevancy:** how much of what we retrieved is on-topic (noise)?
- **Page hit:** did a chunk come from a page the answer is printed on? (no LLM)

## By type

| Type | Cases | Recall | Precision | Relevancy | Page hit |
|---|---|---|---|---|---|
| comparison | 1 | 1.00 | 0.86 | 0.28 | 1.00 |
| spec | 1 | 1.00 | 1.00 | 0.04 | 1.00 |

## By brochure

| Brochure | Cases | Recall | Precision | Relevancy | Page hit |
|---|---|---|---|---|---|
| comparison | 1 | 1.00 | 0.86 | 0.28 | 1.00 |
| venue | 1 | 1.00 | 1.00 | 0.04 | 1.00 |

## Every case

First relevant = rank of the first chunk the precision judge called relevant.

| Case | Type | Recall | Precision | Relevancy | Page hit | First relevant | Retrieved from |
|---|---|---|---|---|---|---|---|
| venue-boot | spec | 1.00 | 1.00 | 0.04 | 1.00 | 1 | venue p8, venue p19, venue p17, venue p15, venue p13, venue p14, venue p19, venue p3, venue p9, venue p11 |
| cmp-xpres-punch-petrol | comparison | 1.00 | 0.86 | 0.28 | 1.00 | 1 | xpres p4, xpres p4, xpres p4, punch p19, xpres p3, punch p29, punch p29, xpres p2, punch p27, xpres p1 |

## Lowest recall: judge's reasons

### venue-boot (recall 1.00)

**Q:** How much boot space does the Hyundai Venue have?

**Recall:** The score is 1.00 because the first node in the retrieval context perfectly captures the boot space capacity and measurement method mentioned in the expected output.

**Precision:** The score is 1.00 because the first node perfectly identifies the boot space as '375 litres', and all subsequent irrelevant nodes are correctly ranked lower.

### cmp-xpres-punch-petrol (recall 1.00)

**Q:** Compare the power and torque of the Tata Xpres petrol with the Tata Punch 1.2L Revotron petrol.

**Recall:** The score is 1.00 because the nodes in retrieval context perfectly provide all the technical specifications for both vehicles mentioned in the expected output.

**Precision:** The score is 0.86 because while the first three nodes correctly provide the Tata Xpres specifications, the fourth and fifth nodes are irrelevant as they discuss incorrect engine variants or lack technical data, which lowers the precision before the relevant Tata Punch data appears at the sixth node.
