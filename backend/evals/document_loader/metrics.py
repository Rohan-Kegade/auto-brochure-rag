"""Scoring a loader's per-page output against the gold facts.

For each gold fact we ask, after normalising both sides (evals.common.text):

  on_page      Were all its values extracted on the page they are printed on?
               (A value only found on another page breaks page citations.)
  in_doc       Were they extracted anywhere in the document?
  row_intact   (cells and rows only) Is there one line of output holding the
               row label followed by all the values in order? This is what
               keeps "Power: petrol 88.2 / diesel 84.5" answerable after
               chunking: if the label and its values land on different lines
               (or columns get shuffled), the chunk no longer says which
               value belongs to which spec or engine.

Per loader these roll up into:

  text_recall       share of text facts found on their page
  value_recall      share of cell/row facts whose values are on their page
  row_integrity     share of cell/row facts with row_intact
  column_order      row_integrity restricted to multi-value rows
  page_accuracy     of facts found anywhere, share found on the right page
  score             0.2 text_recall + 0.3 value_recall + 0.5 row_integrity
                    (row integrity weighs most: it is what table answers need)
"""

from evals.common.text import normalize

WEIGHTS = {"text_recall": 0.2, "value_recall": 0.3, "row_integrity": 0.5}


def fact_kind(fact: dict) -> str:
    if not fact.get("label"):
        return "text"
    return "cell" if len(fact["values"]) == 1 else "row"


def _contains_all(text: str, values: list[str]) -> bool:
    return all(v in text for v in values)


def _values_in_order(line: str, values: list[str], contiguous: bool) -> bool:
    if contiguous:
        return "".join(values) in line
    position = 0
    for value in values:
        found = line.find(value, position)
        if found == -1:
            return False
        position = found + len(value)
    return True


def _row_intact(page_text: str, label: str, values: list[str], contiguous: bool) -> bool:
    for raw_line in page_text.splitlines():
        line = normalize(raw_line)
        start = line.find(label)
        # Values are searched after the label, so the label's own digits
        # ("Wheelbase (mm)") never count as a value.
        if start != -1 and _values_in_order(line[start + len(label):], values, contiguous):
            return True
    return False


def score_fact(fact: dict, pages: dict[int, str]) -> dict:
    values = [normalize(v) for v in fact["values"]]
    page_text = pages.get(fact["page"], "")
    on_page = _contains_all(normalize(page_text), values)
    in_doc = on_page or _contains_all(normalize("\n".join(pages.values())), values)
    result = {"id": fact["id"], "kind": fact_kind(fact), "on_page": on_page, "in_doc": in_doc}
    if fact.get("label"):
        result["row_intact"] = _row_intact(
            page_text,
            normalize(fact["label"]),
            values,
            contiguous=fact.get("match") == "contiguous",
        )
    return result


def _share(results: list[dict], key: str) -> float | None:
    return round(sum(r[key] for r in results) / len(results), 3) if results else None


def summarize(fact_results: list[dict]) -> dict:
    text = [r for r in fact_results if r["kind"] == "text"]
    tabular = [r for r in fact_results if r["kind"] != "text"]
    rows = [r for r in fact_results if r["kind"] == "row"]
    found = [r for r in fact_results if r["in_doc"]]
    summary = {
        "facts": len(fact_results),
        "text_recall": _share(text, "on_page"),
        "value_recall": _share(tabular, "on_page"),
        "row_integrity": _share(tabular, "row_intact"),
        "column_order": _share(rows, "row_intact"),
        "page_accuracy": _share(found, "on_page"),
    }
    # Re-weight over the metrics that apply, so a subset with no text facts
    # is not penalised for them.
    weights = {k: w for k, w in WEIGHTS.items() if summary[k] is not None}
    summary["score"] = round(
        sum(w * summary[k] for k, w in weights.items()) / sum(weights.values()), 3
    ) if weights else None
    return summary
