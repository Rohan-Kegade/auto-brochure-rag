from dataclasses import dataclass


@dataclass
class Page:
    number: int  # 1-based PDF page
    text: str


def html_table_to_markdown(html: str) -> str:
    """One Markdown row per <tr>; a cell spanning N columns is repeated N
    times so every row keeps its column positions."""
    from bs4 import BeautifulSoup

    lines = []
    for tr in BeautifulSoup(html, "html.parser").find_all("tr"):
        cells = []
        for cell in tr.find_all(["td", "th"]):
            text = " ".join(cell.get_text(" ").split())
            cells += [text] * int(cell.get("colspan", 1))
        lines.append("| " + " | ".join(cells) + " |")
        if len(lines) == 1:
            lines.append("|" + " --- |" * len(cells))
    return "\n".join(lines)
