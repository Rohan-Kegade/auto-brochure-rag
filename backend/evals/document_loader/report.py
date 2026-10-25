"""Render scores.json as a Markdown report."""

from datetime import date
from pathlib import Path

from evals.document_loader.metrics import WEIGHTS


def _pct(value) -> str:
    return "–" if value is None else f"{value * 100:.0f}%"


def _kchars(chars: int) -> str:
    return f"{chars / 1000:.0f}k chars"


def _symbol(fact: dict) -> str:
    if fact.get("row_intact"):
        return "✓"
    if fact["on_page"]:
        return "✓" if fact["kind"] == "text" else "~"
    return "p" if fact["in_doc"] else "✗"


def write_report(scores: dict, gold: list[dict], path: Path) -> None:
    loaders = sorted(scores, key=lambda name: -scores[name]["summary"]["score"])
    lines = [
        "# Document loader evaluation",
        "",
        f"Generated {date.today().isoformat()} by `python -m evals.document_loader.eval_document_loader`. "
        f"{len(gold)} hand-labelled facts from {len({f['doc'] for f in gold})} brochures "
        "(see `goldens/document_loader.yaml`). Metric definitions are in "
        "`evals/document_loader/metrics.py`.",
        "",
        "score = " + " + ".join(f"{w} × {k}" for k, w in WEIGHTS.items()),
        "",
        "## Summary",
        "",
        "| Loader | Score | Text recall | Value recall | Row integrity | Column order | Page accuracy | Output size | s / page | Total s | Failed docs |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for name in loaders:
        s = scores[name]["summary"]
        lines.append(
            f"| **{name}** | **{s['score']:.2f}** | {_pct(s['text_recall'])} | {_pct(s['value_recall'])} "
            f"| {_pct(s['row_integrity'])} | {_pct(s['column_order'])} | {_pct(s['page_accuracy'])} "
            f"| {_kchars(s['chars_total'])} | {s['seconds_per_page']} | {s['seconds_total']} "
            f"| {', '.join(s['docs_failed']) or '–'} |"
        )
    lines += [
        "",
        "Output size = characters extracted across all brochures (what gets chunked "
        "and embedded). Only comparable between loaders that ran the same brochures.",
    ]
    lines += ["", *[f"- **{n}**: {scores[n]['description']}" for n in loaders]]

    docs = sorted({d for n in loaders for d in scores[n]["by_doc"]})
    lines += [
        "",
        "## Row integrity by brochure",
        "",
        "| Loader | " + " | ".join(docs) + " |",
        "|---|" + "---|" * len(docs),
    ]
    for name in loaders:
        by_doc = scores[name]["by_doc"]
        lines.append(
            f"| {name} | "
            + " | ".join(_pct(by_doc[d]["row_integrity"]) if d in by_doc else "–" for d in docs)
            + " |"
        )

    lines += [
        "",
        "## Every fact",
        "",
        "✓ extracted intact · ~ values on the page but row/columns broken · "
        "p found only on another page · ✗ missing",
        "",
        "| Fact | Page | Kind | " + " | ".join(loaders) + " |",
        "|---|---|---|" + "---|" * len(loaders),
    ]
    by_id = {n: {f["id"]: f for f in scores[n]["facts"]} for n in loaders}
    for fact in gold:
        cells = [
            _symbol(by_id[n][fact["id"]]) if fact["id"] in by_id[n] else "–"
            for n in loaders
        ]
        kind = "text" if not fact.get("label") else ("cell" if len(fact["values"]) == 1 else "row")
        lines.append(f"| {fact['id']} | {fact['page']} | {kind} | " + " | ".join(cells) + " |")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")

