"""Write results/report.md from the scored cases."""

from collections import defaultdict

from evals.retrieval.metrics import metrics_run, summarize

LABELS = {
    "contextual_recall": "Recall",
    "contextual_precision": "Precision",
    "chunk_relevance": "Chunk relevance",
    "contextual_relevancy": "Relevancy",
    "page_hit": "Page hit",
}


def _pct(value) -> str:
    return "–" if value is None else f"{value:.0%}"


def _score(value) -> str:
    return "–" if value is None else f"{value:.2f}"


def _first_relevant(verdicts: list[str]) -> str:
    for rank, verdict in enumerate(verdicts, start=1):
        if verdict.strip().lower() == "yes":
            return str(rank)
    return "–" if not verdicts else "none"


def _group_table(title: str, groups: dict[str, list[dict]], metrics: list[str]) -> list[str]:
    lines = [
        f"## By {title}",
        "",
        f"| {title.capitalize()} | Cases | " + " | ".join(LABELS[m] for m in metrics) + " |",
        "|---|---|" + "---|" * len(metrics),
    ]
    for key in sorted(groups):
        s = summarize(groups[key])
        lines.append(
            f"| {key} | {s['cases']} | "
            + " | ".join(_score(s[m]) for m in metrics)
            + " |"
        )
    return lines + [""]


def write_report(path, config: dict, results: list[dict]) -> None:
    s = summarize(results)
    metrics = metrics_run(results)
    lines = [
        "# Retrieval evaluation",
        "",
        f"Generated {config['date']} by `python -m evals.retrieval.eval_retrieval`. "
        f"{s['cases']} cases from `goldens/retrieval.yaml`. Metric definitions are in "
        "`evals/retrieval/metrics.py`.",
        "",
        f"- **Retriever:** `{config['embedding_model']}`, chunks of {config['chunk_size']} "
        f"chars with {config['chunk_overlap']} overlap, k = {config['k']}",
        f"- **Search scope:** {config['scope_note']}",
        f"- **Judge:** `{config['judge']}` via DeepEval",
        "",
        "## Summary",
        "",
        "| Metric | Mean | Pass rate (≥ 0.5) | Errors |",
        "|---|---|---|---|",
    ]
    for m in metrics:
        lines.append(
            f"| {LABELS[m]} | {_score(s[m])} | {_pct(s[m + '_pass'])} | {s[m + '_errors']} |"
        )
    notes = {
        "contextual_recall": "did we retrieve every fact the answer needs?",
        "contextual_precision": "are the relevant chunks ranked first?",
        "chunk_relevance": "what share of the retrieved chunks is relevant? (noise; from precision's verdicts, no extra LLM calls)",
        "contextual_relevancy": "how much of what we retrieved is on-topic? (DeepEval, one judge call per chunk)",
        "page_hit": "did a chunk come from a page the answer is printed on? (no LLM)",
    }
    lines += ["", *(f"- **{LABELS[m]}:** {notes[m]}" for m in metrics), ""]

    by_type, by_doc = defaultdict(list), defaultdict(list)
    for r in results:
        by_type[r["type"]].append(r)
        docs = list(r["sources"])
        by_doc[docs[0] if len(docs) == 1 else "comparison"].append(r)
    lines += _group_table("type", by_type, metrics)
    lines += _group_table("brochure", by_doc, metrics)

    lines += [
        "## Every case",
        "",
        "First relevant = rank of the first chunk the precision judge called relevant.",
        "",
        "| Case | Type | " + " | ".join(LABELS[m] for m in metrics) + " | First relevant | Retrieved from |",
        "|---|---|" + "---|" * len(metrics) + "---|---|",
    ]
    for r in results:
        retrieved = ", ".join(f"{c['doc']} p{c['page']}" for c in r["retrieved"])
        lines.append(
            f"| {r['id']} | {r['type']} | "
            + " | ".join(_score(r["scores"].get(m)) for m in metrics)
            + f" | {_first_relevant(r['precision_verdicts'])} | {retrieved} |"
        )

    worst = sorted(
        (r for r in results if r["scores"].get("contextual_recall") is not None),
        key=lambda r: r["scores"]["contextual_recall"],
    )[:10]
    lines += ["", "## Lowest recall: judge's reasons", ""]
    for r in worst:
        lines += [
            f"### {r['id']} (recall {_score(r['scores']['contextual_recall'])})",
            "",
            f"**Q:** {r['question']}",
            "",
            f"**Recall:** {r['reasons'].get('contextual_recall', '–')}",
            "",
            f"**Precision:** {r['reasons'].get('contextual_precision', '–')}",
            "",
        ]

    errored = [r for r in results if r["errors"]]
    if errored:
        lines += ["## Errors", ""]
        for r in errored:
            for metric, error in r["errors"].items():
                lines.append(f"- **{r['id']}** {LABELS[metric]}: {error}")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
