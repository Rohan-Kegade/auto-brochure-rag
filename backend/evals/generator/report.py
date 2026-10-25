"""Write results/report.md from the scored answers."""

from collections import defaultdict

from evals.generator.metrics import METRICS, summarize

LABELS = {"faithfulness": "Faithfulness", "answer_relevancy": "Answer relevancy"}


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
        f"| {title.capitalize()} | Cases | " + " | ".join(LABELS[m] for m in METRICS) + " |",
        "|---|---|" + "---|" * len(METRICS),
    ]
    for key in sorted(groups):
        s = summarize(groups[key])
        lines.append(
            f"| {key} | {s['cases']} | " + " | ".join(_score(s[m]) for m in METRICS) + " |"
        )
    return lines + [""]


def write_report(path, config: dict, results: list[dict]) -> None:
    s = summarize(results)
    lines = [
        "# Generator evaluation",
        "",
        f"Generated {config['date']} by `python -m evals.generator.eval_generator`. "
        f"{s['cases']} cases from `goldens/generator.yaml`. Metric definitions are in "
        "`evals/generator/metrics.py`.",
        "",
        f"- **Generator:** `{config['generator']}` with the app's answer prompt, no chat history",
        "- **Golden context:** per case, only the passages of the source pages needed "
        "to answer (`goldens/generator.yaml`)",
        f"- **Judge:** `{config['judge']}` via DeepEval; ambiguous claims count as unsupported",
        "",
        "## Summary",
        "",
        "| Metric | Mean | Pass rate (≥ 0.5) | Errors |",
        "|---|---|---|---|",
    ]
    for m in METRICS:
        lines.append(
            f"| {LABELS[m]} | {_score(s[m])} | {_pct(s[m + '_pass'])} | {s[m + '_errors']} |"
        )
    lines += [
        "",
        "- **Faithfulness:** what share of the answer's claims the golden context supports?",
        "- **Answer relevancy:** what share of the answer's statements address the question?",
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
        "| Case | Type | Faithfulness | Answer relevancy | Claims | Unsupported | Off-topic statements |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r['id']} | {r['type']} | {_score(r['scores'].get('faithfulness'))} | "
            f"{_score(r['scores'].get('answer_relevancy'))} | {r['claims']} | "
            f"{len(r['unsupported_claims'])} | {len(r['irrelevant_statements'])} |"
        )

    def lowest(metric: str, n: int) -> list[dict]:
        scored = [r for r in results if r["scores"].get(metric) is not None]
        return [r for r in sorted(scored, key=lambda r: r["scores"][metric]) if r["scores"][metric] < 1][:n]

    lines += ["", "## Lowest faithfulness: unsupported claims", ""]
    for r in lowest("faithfulness", 10):
        lines += [f"### {r['id']} (faithfulness {_score(r['scores']['faithfulness'])})", ""]
        lines += [f"**Q:** {r['question']}", "", *_quote(r["answer"]), ""]
        for c in r["unsupported_claims"]:
            lines.append(f"- **{c['verdict']}:** {c['claim']} — {c['reason'] or ''}")
        lines.append("")

    lines += ["## Lowest answer relevancy: off-topic statements", ""]
    for r in lowest("answer_relevancy", 5):
        lines += [f"### {r['id']} (answer relevancy {_score(r['scores']['answer_relevancy'])})", ""]
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
