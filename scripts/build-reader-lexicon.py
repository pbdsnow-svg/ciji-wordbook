#!/usr/bin/env python3
"""Create a compact Chinese lookup lexicon for tap-to-define reading."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

CJK_RE = re.compile(r"[\u3400-\u9fff]")
WORD_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")


def clean_translation(value: str) -> str:
    for part in re.split(r"\\n|\n", value):
        cleaned = re.sub(r"^\[[^\]]+\]\s*", "", part).strip(" ;；")
        if cleaned and CJK_RE.search(cleaned):
            return cleaned[:96]
    return ""


def rank(row: dict[str, str]) -> tuple[int, int, str]:
    bnc = int(row.get("bnc") or 0)
    frq = int(row.get("frq") or 0)
    available = [value for value in (bnc, frq) if value > 0]
    return (min(available) if available else 10**9, len(row["word"]), row["word"])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ecdict", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=25000)
    args = parser.parse_args()

    rows: list[dict[str, str]] = []
    with args.ecdict.open(encoding="utf-8", errors="replace", newline="") as handle:
        for row in csv.DictReader(handle):
            term = (row.get("word") or "").strip().lower()
            if not WORD_RE.fullmatch(term):
                continue
            meaning = clean_translation(row.get("translation") or "")
            if not meaning:
                continue
            rows.append(
                {
                    "word": term,
                    "phonetic": (row.get("phonetic") or "").strip(),
                    "meaning": meaning,
                    "bnc": row.get("bnc") or "0",
                    "frq": row.get("frq") or "0",
                }
            )

    rows.sort(key=rank)
    lexicon: dict[str, list[str]] = {}
    for row in rows:
        if row["word"] in lexicon:
            continue
        phonetic = f"/{row['phonetic']}/" if row["phonetic"] else ""
        lexicon[row["word"]] = [phonetic, row["meaning"]]
        if len(lexicon) >= args.limit:
            break

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(lexicon, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"entries": len(lexicon)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
