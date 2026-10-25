"""Filesystem locations shared by every component eval.

    backend/
      src/       the app (evals import it as `app`)
      data/      brochure PDFs (gitignored) + corpus.yaml
      goldens/   one hand-labelled gold file per component
      evals/     <component>/eval_<component>.py + results/
"""

from pathlib import Path

EVALS_ROOT = Path(__file__).resolve().parent.parent
BACKEND_ROOT = EVALS_ROOT.parent
SRC_DIR = BACKEND_ROOT / "src"
DATA_DIR = BACKEND_ROOT / "data"
PDF_DIR = DATA_DIR
CORPUS_FILE = DATA_DIR / "corpus.yaml"
GOLDENS_DIR = BACKEND_ROOT / "goldens"


def results_dir(component: str) -> Path:
    """`evals/<component>/results`, created on first use."""
    path = EVALS_ROOT / component / "results"
    path.mkdir(parents=True, exist_ok=True)
    return path
