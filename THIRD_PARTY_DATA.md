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
