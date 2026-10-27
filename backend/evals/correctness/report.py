"""Write results/report.md from the scored answers."""

from collections import defaultdict

from evals.correctness.metrics import THRESHOLD, summarize


def _pct(value) -> str:
    return "–" if value is None else f"{value:.0%}"


def _score(value) -> str:
    return "–" if value is None else f"{value:.2f}"


def _out_of_10(value) -> str:
    return "–" if value is None else f"{value * 10:.1f}"


def _quote(text: str) -> list[str]:
    return [f"> {line}" if line.strip() else ">" for line in text.strip().splitlines()]


def _group_table(title: str, groups: dict[str, list[dict]]) -> list[str]:
    lines = [
        f"## By {title}",
        "",
        f"| {title.capitalize()} | Cases | Correctness | Pass rate | Refused |",
        "|---|---|---|---|---|",
    ]
    for key in sorted(groups):
        s = summarize(groups[key])
        lines.append(
            f"| {key} | {s['cases']} | {_score(s['correctness'])} | "
            f"{_pct(s['correctness_pass'])} | {s['refused']} |"
        )
    return lines + [""]


def write_report(path, config: dict, results: list[dict]) -> None:
    s = summarize(results)
    lines = [
        "# Correctness evaluation",
        "",
        f"Generated {config['date']} by `python -m evals.correctness.eval_correctness`. "
        f"{s['cases']} cases from `goldens/correctness.yaml`, run through the whole "
        "pipeline. The metric is defined in `evals/correctness/metrics.py`.",
        "",
        f"- **Retriever:** `{config['embedding_model']}`, chunks of {config['chunk_size']} "
        f"chars with {config['chunk_overlap']} overlap, k = {config['k']}",
        f"- **Search scope:** {config['scope_note']}",
        f"- **Generator:** `{config['generator']}` with the app's answer prompt, no chat history",
        f"- **Judge:** `{config['judge']}` via DeepEval GEval, comparing each answer "
        "with the case's expected answer",
        "",
        "## Summary",
        "",
        f"| Metric | Mean | Out of 10 | Pass rate (≥ {THRESHOLD}) | Refused | Errors |",
        "|---|---|---|---|---|---|",
        f"| Correctness | {_score(s['correctness'])} | {_out_of_10(s['correctness'])} | "
        f"{_pct(s['correctness_pass'])} | {s['refused']} | {s['correctness_errors']} |",
        "",
        "**Correctness:** does the answer say the same as the ideal answer, with no "
        "wrong facts and nothing left out? A refusal scores lowest.",
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
        "| Case | Type | Correctness | Refused | Retrieved from |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        retrieved = ", ".join(f"{c['doc']} p{c['page']}" for c in r["retrieved"])
        lines.append(
            f"| {r['id']} | {r['type']} | {_score(r['scores'].get('correctness'))} | "
            f"{'yes' if r['refused'] else ''} | {retrieved} |"
        )

    failing = sorted(
        (r for r in results if (v := r["scores"].get("correctness")) is not None and v < THRESHOLD),
        key=lambda r: r["scores"]["correctness"],
    )
    lines += ["", f"## Below {THRESHOLD}: answer vs expected", ""]
    for r in failing[:15]:
        lines += [f"### {r['id']} (correctness {_score(r['scores']['correctness'])})", ""]
        lines += [f"**Q:** {r['question']}", "", "**Expected:**", "", *_quote(r["expected_answer"]), ""]
        lines += ["**Answer:**", "", *_quote(r["answer"]), ""]
        lines += [f"**Judge:** {r['reasons'].get('correctness', '–')}", ""]

    errored = [r for r in results if r["errors"]]
    if errored:
        lines += ["## Errors", ""]
        for r in errored:
            for error in r["errors"].values():
                lines.append(f"- **{r['id']}**: {error}")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
