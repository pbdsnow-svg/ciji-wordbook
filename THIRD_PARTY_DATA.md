# Third-party data

The generated offline word bank in `lib/cefr-bank.generated.json` combines:

- **Words CEFR Dataset** by Maximax67, licensed under the MIT License. The
  project supplies the CEFR level, part of speech, and frequency ranking.
  <https://github.com/Maximax67/Words-CEFR-Dataset>
- **ECDICT**, maintained by skywind3000, licensed under the MIT License. It
  supplies phonetics and Chinese definitions.
  <https://github.com/skywind3000/ECDICT>
- **Tatoeba Mandarin–English sentence pairs**, redistributed by ManyThings
  under CC BY 2.0 France. Sentence-level attribution remains in the source
  archive; this project identifies Tatoeba and ManyThings in accordance with
  the dataset terms.
  <https://www.manythings.org/anki/>

The generated file is intended for this personal learning application. Source
datasets are not committed because they are large; rerun
`scripts/build-word-bank.py` with the three downloaded datasets to regenerate
the bank deterministically.

The Daily Reading module additionally uses:

- **The New York Times World RSS** at runtime for a headline, short feed
  description, publication date, and source link. Full articles are not copied
  into the application.
- **Wikinews** shortened offline fallbacks with source links. Wikinews text
  published after December 16, 2024 is available under CC BY 4.0.
- Public-domain English novels as the basis for original graded adaptations.
  Each reading links to the corresponding work page.

`public/data/reader-lexicon.json` is a compact 25,000-entry derivative lookup
index built from ECDICT by `scripts/build-reader-lexicon.py`.
