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


def load_corpus(only: list[str] | None = None) -> list[Brochure]:
    """Every brochure in the corpus, or just the ids in `only`.
    Fails loudly if a PDF is missing so a run never silently skips one."""
    with open(CORPUS_FILE, encoding="utf-8") as f:
        brochures = [Brochure(**doc) for doc in yaml.safe_load(f)["documents"]]
    if only:
        unknown = set(only) - {b.id for b in brochures}
        if unknown:
            raise ValueError(f"Unknown brochure ids: {sorted(unknown)}")
        brochures = [b for b in brochures if b.id in only]
    missing = [b.file for b in brochures if not b.path.exists()]
    if missing:
        raise FileNotFoundError(
            f"Missing PDFs in {PDF_DIR}: {missing}. See backend/data/corpus.yaml."
        )
    return brochures


def load_gold(component: str) -> list[dict]:
    with open(GOLDENS_DIR / f"{component}.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["facts"]
