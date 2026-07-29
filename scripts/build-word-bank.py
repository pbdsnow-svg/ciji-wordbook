#!/usr/bin/env python3
"""Build the offline CEFR word bank from locally downloaded source datasets."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import defaultdict
from pathlib import Path

LEVELS = {"1": "A1", "2": "A2", "3": "B1", "4": "B2", "5": "C1", "6": "C2"}
POS_IDS = {"7": "adjective", "12": "noun", "20": "adverb", "27": "verb"}
WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
CJK_RE = re.compile(r"[\u3400-\u9fff]")


def normalize_translation(value: str) -> str:
    parts = re.split(r"\\n|\n", value)
    for part in parts:
        cleaned = re.sub(r"^\[[^\]]+\]\s*", "", part).strip(" ;；")
        if cleaned and CJK_RE.search(cleaned):
            return cleaned[:88]
    return ""


def fallback_example(term: str) -> tuple[str, str]:
    escaped = term.replace('"', "")
    return (
        f'"{escaped}" is a word I want to remember and use correctly.',
        f"“{escaped}”是我想要记住并正确使用的单词。",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--per-level", type=int, default=520)
    args = parser.parse_args()

    source = args.source_dir
    words_by_id: dict[str, str] = {}
    with (source / "words.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            words_by_id[row["word_id"]] = row["word"].strip().lower()

    ranked: dict[str, dict[str, tuple[int, str]]] = defaultdict(dict)
    with (source / "word_pos.csv").open(encoding="utf-8", newline="") as handle:
        for row in csv.DictReader(handle):
            try:
                numeric_level = float(row["level"])
            except (TypeError, ValueError):
                continue
            level = LEVELS.get(str(max(1, min(6, math.floor(numeric_level + 0.5)))))
            part_of_speech = POS_IDS.get(row["pos_tag_id"])
            term = words_by_id.get(row["word_id"], "")
            if (
                not level
                or not part_of_speech
                or not term
                or not re.fullmatch(r"[a-z]+(?:'[a-z]+)?", term)
                or not 2 <= len(term) <= 20
            ):
                continue
            frequency = int(row["frequency_count"] or 0)
            previous = ranked[level].get(term)
            if previous is None or frequency > previous[0]:
                ranked[level][term] = (frequency, part_of_speech)

    candidate_terms: set[str] = set()
    ordered_candidates: dict[str, list[tuple[str, int, str]]] = {}
    for level in LEVELS.values():
        items = sorted(
            (
                (term, frequency, part_of_speech)
                for term, (frequency, part_of_speech) in ranked[level].items()
            ),
            key=lambda item: (-item[1], item[0]),
        )[: max(args.per_level * 8, 2400)]
        ordered_candidates[level] = items
        candidate_terms.update(item[0] for item in items)

    dictionary: dict[str, tuple[str, str]] = {}
    with (source / "ecdict.csv").open(
        encoding="utf-8", errors="replace", newline=""
    ) as handle:
        for row in csv.DictReader(handle):
            term = (row.get("word") or "").strip().lower()
            if term not in candidate_terms or term in dictionary:
                continue
            meaning = normalize_translation(row.get("translation") or "")
            if not meaning:
                continue
            phonetic = (row.get("phonetic") or "").strip()
            dictionary[term] = (f"/{phonetic}/" if phonetic else "", meaning)

    examples: dict[str, tuple[str, str]] = {}
    sentence_file = source / "cmn-eng" / "cmn.txt"
    with sentence_file.open(encoding="utf-8", errors="replace") as handle:
        for line in handle:
            fields = line.rstrip("\n").split("\t")
            if len(fields) < 2:
                continue
            english, chinese = fields[0].strip(), fields[1].strip()
            if not (8 <= len(english) <= 120 and CJK_RE.search(chinese)):
                continue
            sentence_terms = set(WORD_RE.findall(english.lower()))
            for term in sentence_terms & candidate_terms:
                existing = examples.get(term)
                if existing is None or len(english) < len(existing[0]):
                    examples[term] = (english, chinese)

    output: list[dict[str, object]] = []
    counts: dict[str, int] = {}
    for level in LEVELS.values():
        selected = 0
        for term, frequency, part_of_speech in ordered_candidates[level]:
            definition = dictionary.get(term)
            if not definition:
                continue
            phonetic, meaning = definition
            example, example_translation = examples.get(
                term, fallback_example(term)
            )
            output.append(
                {
                    "id": f"cefr-{level.lower()}-{term}",
                    "term": term,
                    "phonetic": phonetic,
                    "meaning": meaning,
                    "example": example,
                    "exampleTranslation": example_translation,
                    "level": level,
                    "partOfSpeech": part_of_speech,
                    "frequency": frequency,
                    "hasAuthenticExample": term in examples,
                }
            )
            selected += 1
            if selected >= args.per_level:
                break
        counts[level] = selected

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"total": len(output), "levels": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
