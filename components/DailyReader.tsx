"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchDailyNews,
  getDailyClassic,
  getOfflineNews,
  lookupReadingWord,
  sentenceForWord,
  tokenizeReading,
  type DailyReading,
  type ReaderDefinition,
  type ReadingKind,
} from "@/lib/readings";
import { normalizeSpelling } from "@/lib/learning";
import type { VocabularyState, VocabularyWord } from "@/lib/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface SelectedWord {
  surface: string;
  definition: ReaderDefinition | null;
  status: "loading" | "ready" | "missing";
}

function formatPublishedAt(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function TappableText({
  text,
  className,
  onWord,
}: {
  text: string;
  className: string;
  onWord: (word: string) => void;
}) {
  return (
    <div className={className}>
      {tokenizeReading(text).map((token, index) =>
        token.isWord ? (
          <button
            aria-label={`查看 ${token.value} 的释义`}
            className="reading-word"
            key={`${token.value}-${index}`}
            onClick={() => onWord(token.value)}
            type="button"
          >
            {token.value}
          </button>
        ) : (
          <span key={`separator-${index}`}>{token.value}</span>
        ),
      )}
    </div>
  );
}

export function DailyReader({
  state,
  onStateChange,
}: {
  state: VocabularyState;
  onStateChange: (state: VocabularyState) => void;
}) {
  const [kind, setKind] = useState<ReadingKind>("news");
  const [languageMode, setLanguageMode] = useState<"english" | "bilingual">(
    "bilingual",
  );
  const [news, setNews] = useState<DailyReading>(() => getOfflineNews());
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const classic = useMemo(() => getDailyClassic(), []);
  const reading = kind === "news" ? news : classic;

  useEffect(() => {
    let active = true;
    fetchDailyNews()
      .then((nextNews) => {
        if (active) setNews(nextNews);
      })
      .finally(() => {
        if (active) setNewsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function openWord(surface: string) {
    setSelectedWord({ surface, definition: null, status: "loading" });
    const definition = await lookupReadingWord(
      surface,
      `${BASE_PATH}/data/reader-lexicon.json`,
    );
    setSelectedWord({
      surface,
      definition,
      status: definition ? "ready" : "missing",
    });
  }

  function speakTerm(term: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(term);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  const savedWord = selectedWord?.definition
    ? state.words.find(
        (word) =>
          normalizeSpelling(word.term) ===
          normalizeSpelling(selectedWord.definition?.term ?? ""),
      )
    : undefined;

  function addSelectedWord() {
    if (!selectedWord?.definition || savedWord) return;
    const definition = selectedWord.definition;
    const bankEntry = definition.bankEntry;
    const timestamp = new Date().toISOString();
    const newWord: VocabularyWord = {
      id: bankEntry?.id ?? `reader-${definition.term}-${Date.now()}`,
      term: definition.term,
      phonetic: definition.phonetic,
      meaning: definition.meaning,
      example:
        sentenceForWord(reading.content, selectedWord.surface) ||
        `"${definition.term}" appeared in today's reading.`,
      exampleTranslation: "",
      createdAt: timestamp,
      introducedAt: timestamp,
      nextReviewAt: timestamp,
      stage: 0,
      reviewCount: 0,
      level: bankEntry?.level ?? "custom",
      source: bankEntry ? "cefr" : "custom",
      spellingAttempts: 0,
      spellingCorrect: 0,
      contextReviewCount: 0,
    };
    onStateChange({ ...state, words: [newWord, ...state.words] });
  }

  return (
    <>
      <div className="reading-kind-picker" role="group" aria-label="阅读类型">
        <button
          aria-pressed={kind === "news"}
          className={kind === "news" ? "is-selected" : ""}
          onClick={() => setKind("news")}
          type="button"
        >
          今日新闻
        </button>
        <button
          aria-pressed={kind === "classic"}
          className={kind === "classic" ? "is-selected" : ""}
          onClick={() => setKind("classic")}
          type="button"
        >
          名著片段
        </button>
      </div>

      <div className="reading-language-picker" role="group" aria-label="对照语言">
        <button
          aria-pressed={languageMode === "english"}
          className={languageMode === "english" ? "is-selected" : ""}
          onClick={() => setLanguageMode("english")}
          type="button"
        >
          英文原文
        </button>
        <button
          aria-pressed={languageMode === "bilingual"}
          className={languageMode === "bilingual" ? "is-selected" : ""}
          onClick={() => setLanguageMode("bilingual")}
          type="button"
        >
          中英对照
        </button>
      </div>

      <article className="daily-reading-card" aria-busy={newsLoading && kind === "news"}>
        <div className="reading-meta">
          <span>{reading.level}</span>
          <span>
            {newsLoading && kind === "news"
              ? "正在获取今日新闻…"
              : formatPublishedAt(reading.publishedAt)}
          </span>
        </div>
        <TappableText
          className="reading-title"
          onWord={openWord}
          text={reading.title}
        />
        {languageMode === "bilingual" && (
          <p className="reading-title-translation">{reading.titleTranslation}</p>
        )}
        <p className="tap-hint">轻点任意英文单词查看释义</p>
        <TappableText
          className="reading-body"
          onWord={openWord}
          text={reading.content}
        />
        {languageMode === "bilingual" && (
          <section className="reading-translation" aria-label="中文对照">
            <span>中文对照</span>
            <p>{reading.translation}</p>
          </section>
        )}
        <footer className="reading-source">
          <div>
            <strong>{reading.sourceName}</strong>
            <small>{reading.note}</small>
          </div>
          <a href={reading.sourceUrl} rel="noreferrer" target="_blank">
            查看来源
          </a>
        </footer>
      </article>

      <section className="reading-tip">
        <strong>今天怎样读</strong>
        <p>先完整读一遍，再点不认识的词。最后只把真正想复习的词加入词库。</p>
      </section>

      {selectedWord && (
        <div
          aria-modal="true"
          className="sheet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWord(null);
          }}
          role="dialog"
        >
          <section className="sheet definition-sheet">
            <span className="sheet-grabber" aria-hidden="true" />
            <header className="sheet-header">
              <span aria-hidden="true" className="sheet-header-spacer">
                完成
              </span>
              <h2>单词释义</h2>
              <button
                className="sheet-text-button"
                onClick={() => setSelectedWord(null)}
                type="button"
              >
                完成
              </button>
            </header>

            {selectedWord.status === "loading" && (
              <div className="definition-loading" aria-live="polite">
                <span />
                <p>正在查找“{selectedWord.surface}”…</p>
              </div>
            )}

            {selectedWord.status === "missing" && (
              <div className="definition-missing">
                <h3>{selectedWord.surface}</h3>
                <p>离线词典暂未收录这个词，可以尝试点击词形的其他部分。</p>
              </div>
            )}

            {selectedWord.definition && (
              <div className="definition-content">
                <div className="definition-heading">
                  <div>
                    <h3>{selectedWord.definition.term}</h3>
                    {selectedWord.definition.phonetic && (
                      <p>{selectedWord.definition.phonetic}</p>
                    )}
                  </div>
                  <button
                    aria-label={`朗读 ${selectedWord.definition.term}`}
                    className="definition-sound"
                    onClick={() => speakTerm(selectedWord.definition?.term ?? "")}
                    type="button"
                  >
                    朗读
                  </button>
                </div>
                {normalizeSpelling(selectedWord.surface) !==
                  normalizeSpelling(selectedWord.definition.term) && (
                  <p className="word-form-note">
                    原文词形：{selectedWord.surface}
                  </p>
                )}
                <div className="definition-meaning">
                  <span>中文释义</span>
                  <p>{selectedWord.definition.meaning}</p>
                </div>
                <blockquote className="definition-example">
                  {sentenceForWord(reading.content, selectedWord.surface)}
                </blockquote>
                <button
                  className={savedWord ? "saved-word-button" : "primary-button"}
                  disabled={Boolean(savedWord)}
                  onClick={addSelectedWord}
                  type="button"
                >
                  {savedWord ? "已在我的词库" : "加入词库，稍后复习"}
                </button>
                <p className="definition-source-note">
                  {selectedWord.definition.source === "cefr"
                    ? "释义来自离线 CEFR 词库"
                    : "释义来自离线 ECDICT 阅读词典"}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
