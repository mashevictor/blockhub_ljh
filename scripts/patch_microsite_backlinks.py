# -*- coding: utf-8 -*-
"""Fix industry microsite preview back-links to home product section."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "home" / "public" / "industry-microsites"
OLD = 'href="../../index.html"'
NEW = 'href="/#product"'


def main() -> None:
    n = 0
    for html in ROOT.glob("*/index.html"):
        text = html.read_text(encoding="utf-8")
        if OLD not in text:
            continue
        html.write_text(text.replace(OLD, NEW), encoding="utf-8")
        n += 1
    print(f"patched {n} microsite pages under {ROOT}")


if __name__ == "__main__":
    main()
