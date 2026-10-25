import sys

from evals.common.paths import SRC_DIR

# The app lives in backend/src as the `app` package; make it importable so
# evals can call production code (e.g. app.rag.indexing) directly.
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
