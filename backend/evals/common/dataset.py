"""The brochure corpus and gold files, shared by every component eval.

`data/corpus.yaml` lists the brochures once. Each component keeps its own
gold file in `goldens/<component>.yaml` that refers to brochures by `id`.
"""

from dataclasses import dataclass
from pathlib import Path

import yaml

from evals.common.paths import CORPUS_FILE, GOLDENS_DIR, PDF_DIR


@dataclass(frozen=True)
class Brochure:
    id: str
    file: str
    make: str
    model: str
    pages: int

    @property
    def path(self) -> Path:
        return PDF_DIR / self.file


def load_corpus(only: list[str] | None = None, require_pdfs: bool = True) -> list[Brochure]:
    """Every brochure in the corpus, or just the ids in `only`.
    Fails loudly if a PDF is missing so a run never silently skips one,
    unless `require_pdfs` is off (the caller only needs the metadata)."""
    with open(CORPUS_FILE, encoding="utf-8") as f:
        brochures = [Brochure(**doc) for doc in yaml.safe_load(f)["documents"]]
    if only:
        unknown = set(only) - {b.id for b in brochures}
        if unknown:
            raise ValueError(f"Unknown brochure ids: {sorted(unknown)}")
        brochures = [b for b in brochures if b.id in only]
    missing = [b.file for b in brochures if not b.path.exists()]
    if missing and require_pdfs:
        raise FileNotFoundError(
            f"Missing PDFs in {PDF_DIR}: {missing}. See backend/data/corpus.yaml."
        )
    return brochures


def load_gold(component: str, key: str = "facts") -> list[dict]:
    """The list under `key` in `goldens/<component>.yaml`."""
    with open(GOLDENS_DIR / f"{component}.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)[key]


def load_cases(
    ids: list[str] | None = None,
    docs: list[str] | None = None,
    component: str = "retrieval",
) -> list[dict]:
    """The cases in `goldens/<component>.yaml`: all of them, the ones in
    `ids`, or the ones about any brochure in `docs`. A case without
    `sources` gets them from its `golden_context` passages."""
    cases = load_gold(component, key="cases")
    for case in cases:
        if "sources" not in case:
            sources = {}
            for passage in case.get("golden_context", []):
                sources.setdefault(passage["doc"], []).append(passage["page"])
            case["sources"] = sources
    if ids:
        unknown = set(ids) - {c["id"] for c in cases}
        if unknown:
            raise ValueError(f"Unknown case ids: {sorted(unknown)}")
        cases = [c for c in cases if c["id"] in ids]
    if docs:
        cases = [c for c in cases if set(c["sources"]) & set(docs)]
    return cases
