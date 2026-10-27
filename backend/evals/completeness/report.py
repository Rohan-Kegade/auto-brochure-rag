"""Write results/report.md from the scored answers."""

from collections import defaultdict

from evals.completeness.metrics import THRESHOLD, summarize


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
        f"| {title.capitalize()} | Cases | Completeness | Pass rate | Missing points | Partial points | Refused |",
        "|---|---|---|---|---|---|---|",
    ]
    for key in sorted(groups):
        s = summarize(groups[key])
        lines.append(
            f"| {key} | {s['cases']} | {_score(s['completeness'])} | {_pct(s['completeness_pass'])} | "
            f"{s['missing']} | {s['partial']} | {s['refused']} |"
        )
    return lines + [""]


def write_report(path, config: dict, results: list[dict]) -> None:
    s = summarize(results)
    points = s["covered"] + s["partial"] + s["missing"]
    lines = [
        "# Completeness evaluation",
        "",
        f"Generated {config['date']} by `python -m evals.completeness.eval_completeness`. "
        f"{s['cases']} cases from `goldens/completeness.yaml`, run through the whole "
        "pipeline. The metric is defined in `evals/completeness/metrics.py`.",
        "",
        f"- **Retriever:** `{config['embedding_model']}`, chunks of {config['chunk_size']} "
        f"chars with {config['chunk_overlap']} overlap, k = {config['k']}",
        f"- **Search scope:** {config['scope_note']}",
        f"- **Generator:** `{config['generator']}` with the app's answer prompt "
        f"(fingerprint `{config.get('answer_prompt', '?')}`), no chat history",
        f"- **Judge:** `{config['judge']}`, one verdict per key point",
        "",
        "## Summary",
        "",
        f"| Metric | Mean | Pass rate (≥ {THRESHOLD}) | Refused | Errors |",
        "|---|---|---|---|---|",
        f"| Completeness | {_score(s['completeness'])} | {_pct(s['completeness_pass'])} | "
        f"{s['refused']} | {s['completeness_errors']} |",
        "",
        f"**Key points:** {s['covered']} covered, {s['partial']} partial, {s['missing']} missing "
        f"of {points} judged.",
        "",
        "**Completeness:** what share of the ideal answer's key points does the answer "
        "cover? Score = (covered + 0.5 × partial) / key points.",
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
        "| Case | Type | Completeness | Key points | Partial | Missing | Refused |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        counts = defaultdict(int)
        for v in r["verdicts"]:
            counts[v["verdict"]] += 1
        lines.append(
            f"| {r['id']} | {r['type']} | {_score(r['scores'].get('completeness'))} | "
            f"{r['key_points']} | {counts['partial']} | {counts['missing']} | "
            f"{'yes' if r['refused'] else ''} |"
        )

    incomplete = sorted(
        (r for r in results if (v := r["scores"].get("completeness")) is not None and v < 1),
        key=lambda r: r["scores"]["completeness"],
    )
    lines += ["", "## Incomplete answers: what was left out", ""]
    for r in incomplete[:20]:
        lines += [f"### {r['id']} (completeness {_score(r['scores']['completeness'])})", ""]
        lines += [f"**Q:** {r['question']}", "", *_quote(r["answer"]), ""]
        for v in r["verdicts"]:
            if v["verdict"] != "covered":
                lines.append(f"- **{v['verdict']}:** {v['key_point']} — {v['reason']}")
        lines.append("")

    errored = [r for r in results if r["errors"]]
    if errored:
        lines += ["## Errors", ""]
        for r in errored:
            for error in r["errors"].values():
                lines.append(f"- **{r['id']}**: {error}")
        lines.append("")

    path.write_text("\n".join(lines), encoding="utf-8")
