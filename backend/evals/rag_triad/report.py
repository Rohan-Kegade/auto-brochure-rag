"""Write results/report.md from the scored pipeline runs."""

from collections import defaultdict

from evals.rag_triad.metrics import LEGS, METRICS, summarize

LABELS = {
    "context_relevance": "Context relevance",
    "groundedness": "Groundedness",
    "answer_relevance": "Answer relevance",
}


def _pct(value) -> str:
    return "–" if value is None else f"{value:.0%}"


def _score(value) -> str:
    return "–" if value is None else f"{value:.2f}"


def _quote(text: str) -> list[str]:
    return [f"> {line}" if line.strip() else ">" for line in text.strip().splitlines()]


def _group_table(title: str, groups: dict[str, list[dict]]) -> list[str]:
    lines = [
        f"## By {title}",
        "",
        f"| {title.capitalize()} | Cases | " + " | ".join(LABELS[m] for m in METRICS) + " | Refused |",
        "|---|---|" + "---|" * len(METRICS) + "---|",
    ]
    for key in sorted(groups):
        s = summarize(groups[key])
        lines.append(
            f"| {key} | {s['cases']} | "
            + " | ".join(_score(s[m]) for m in METRICS)
            + f" | {s['refused']} |"
        )
    return lines + [""]


def _lowest(results: list[dict], metric: str, n: int) -> list[dict]:
    scored = [r for r in results if r["scores"].get(metric) is not None]
    ranked = sorted(scored, key=lambda r: r["scores"][metric])
    return [r for r in ranked if r["scores"][metric] < 1][:n]


def write_report(path, config: dict, results: list[dict]) -> None:
    s = summarize(results)
    lines = [
        "# RAG Triad evaluation",
        "",
        f"Generated {config['date']} by `python -m evals.rag_triad.eval_rag_triad`. "
        f"{s['cases']} questions from `goldens/retrieval.yaml`, run through the whole "
        "pipeline. Metric definitions are in `evals/rag_triad/metrics.py`.",
        "",
        f"- **Retriever:** `{config['embedding_model']}`, chunks of {config['chunk_size']} "
        f"chars with {config['chunk_overlap']} overlap, k = {config['k']}",
        f"- **Search scope:** {config['scope_note']}",
        f"- **Generator:** `{config['generator']}` with the app's answer prompt, no chat history",
        f"- **Judge:** `{config['judge']}` via DeepEval; ambiguous claims count as unsupported",
        "",
        "## Summary",
        "",
        "| Leg | Checks | Mean | Pass rate (≥ 0.5) | Weakest leg in | Errors |",
        "|---|---|---|---|---|---|",
    ]
    checks = {
        "context_relevance": "question ↔ retrieved chunks",
        "groundedness": "answer ↔ retrieved chunks",
        "answer_relevance": "answer ↔ question",
    }
    for m in METRICS:
        lines.append(
            f"| {LABELS[m]} | {checks[m]} | {_score(s[m])} | {_pct(s[m + '_pass'])} | "
            f"{s[m + '_weakest']} cases | {s[m + '_errors']} |"
        )
    lines += [
        "",
        f"**Refused** (\"I couldn't find enough information…\"): {s['refused']} of {s['cases']}. "
        "Every question has an answer in the brochures, so a refusal means the "
        "retriever missed it or the generator did not see it.",
        "",
        "**Weakest leg** is the lowest leg under 0.5 in a case, and says where to look: "
        + "; ".join(f"{LABELS[m].lower()} → {LEGS[m]}" for m in METRICS)
        + ".",
        "",
    ]

    by_type, by_doc = defaultdict(list), defaultdict(list)
    for r in results:
        by_type[r["type"]].append(r)
        docs = list(r["sources"])
        by_doc[docs[0] if len(docs) == 1 else "comparison"].append(r)
    lines += _group_table("type", by_type)
    lines += _group_table("brochure", by_doc)

    lines += [
        "## Every case",
        "",
        "| Case | Type | " + " | ".join(LABELS[m] for m in METRICS)
        + " | Weakest leg | Refused | Retrieved from |",
        "|---|---|" + "---|" * len(METRICS) + "---|---|---|",
    ]
    for r in results:
        retrieved = ", ".join(f"{c['doc']} p{c['page']}" for c in r["retrieved"])
        lines.append(
            f"| {r['id']} | {r['type']} | "
            + " | ".join(_score(r["scores"].get(m)) for m in METRICS)
            + f" | {LABELS.get(r['weakest'], '–')} | {'yes' if r['refused'] else ''} | {retrieved} |"
        )

    lines += ["", "## Lowest context relevance: what was retrieved", ""]
    for r in _lowest(results, "context_relevance", 5):
        lines += [f"### {r['id']} (context relevance {_score(r['scores']['context_relevance'])})", ""]
        lines += [f"**Q:** {r['question']}", ""]
        for c, share in zip(r["retrieved"], r["chunk_relevance"] or [None] * len(r["retrieved"])):
            lines.append(f"- {c['doc']} p{c['page']}: {_pct(share)} of its statements relevant")
        lines += ["", f"**Judge:** {r['reasons'].get('context_relevance', '–')}", ""]

    lines += ["## Lowest groundedness: unsupported claims", ""]
    for r in _lowest(results, "groundedness", 10):
        lines += [f"### {r['id']} (groundedness {_score(r['scores']['groundedness'])})", ""]
        lines += [f"**Q:** {r['question']}", "", *_quote(r["answer"]), ""]
        for c in r["unsupported_claims"]:
            lines.append(f"- **{c['verdict']}:** {c['claim']} — {c['reason'] or ''}")
        lines.append("")

    lines += ["## Lowest answer relevance: off-topic statements", ""]
    for r in _lowest(results, "answer_relevance", 5):
        lines += [f"### {r['id']} (answer relevance {_score(r['scores']['answer_relevance'])})", ""]
        lines += [f"**Q:** {r['question']}", "", *_quote(r["answer"]), ""]
        for st in r["irrelevant_statements"]:
            lines.append(f"- {st['statement']} — {st['reason'] or ''}")
        lines.append("")

    errored = [r for r in results if r["errors"]]
    if errored:
        lines += ["## Errors", ""]
        for r in errored:
            for metric, error in r["errors"].items():
                lines.append(f"- **{r['id']}** {LABELS[metric]}: {error}")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
