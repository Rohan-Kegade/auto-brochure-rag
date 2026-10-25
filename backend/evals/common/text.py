"""Text normalisation for comparing extracted text against gold strings.

Loaders disagree on whitespace (brochures print "3 995" with thin spaces),
dashes, Markdown/HTML markup and Unicode forms. `normalize` erases all of
that so a gold value matches however a loader happened to spell it.
"""

import re
import unicodedata

_CHAR_MAP = str.maketrans(
    {
        "–": "-", "—": "-", "−": "-", "‐": "-", "‑": "-",
        "×": "x",
        "∼": "~", "～": "~",
        "‘": "'", "’": "'", "“": '"', "”": '"', "″": '"',
        "✓": "√", "✔": "√",
    }
)
_HTML_TAG = re.compile(r"<[^>]+>")
_MARKUP = re.compile(r"\*\*|__|\\|\|")  # bold, escapes, table pipes
_WHITESPACE = re.compile(r"\s+")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).translate(_CHAR_MAP).lower()
    text = _HTML_TAG.sub(" ", text)
    text = _MARKUP.sub(" ", text)
    return _WHITESPACE.sub("", text)
