"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CEFR_LEVELS,
  LEVEL_COPY,
  createCloze,
  createStudyPlan,
  ensureDailyWords,
  getAvailableWordCount,
  getPlanMetrics,
  isSpellingCorrect,
  selectContextWords,
} from "@/lib/learning";
import {
  getDueWords,
  getLogsForDay,
  getReviewCountsForLastSevenDays,
  getStreak,
  reviewWord,
} from "@/lib/srs";
import { exportState, loadState, saveState } from "@/lib/storage";
import type {
  CEFRLevel,
  ReviewRating,
  VocabularyState,
  VocabularyWord,
} from "@/lib/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Tab = "today" | "library" | "plan" | "context";
type LearningPhase = "recognition" | "spelling";
type IconName =
  | "today"
  | "library"
  | "plan"
  | "context"
  | "sound"
  | "plus"
  | "search"
  | "share"
  | "trash"
  | "check"
  | "spell";

const RATING_COPY: Record<
  ReviewRating,
  { label: string; hint: string; className: string }
> = {
  forgot: { label: "忘记", hint: "需要重来", className: "rating-forgot" },
  fuzzy: { label: "模糊", hint: "有点印象", className: "rating-fuzzy" },
  know: { label: "认识", hint: "可以回忆", className: "rating-know" },
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    today: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-5" />
      </>
    ),
    library: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17M9 7h7M9 11h5" />
      </>
    ),
    plan: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" />
      </>
    ),
    context: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z" />
      </>
    ),
    sound: (
      <>
        <path d="M11 5 6.5 9H3v6h3.5l4.5 4z" />
        <path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 5 5" />
      </>
    ),
    share: (
      <>
        <path d="M12 16V3M8 7l4-4 4 4" />
        <path d="M5 11v9h14v-9" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    spell: (
      <>
        <path d="M4 18 9 5l5 13M6 13h6M16 7h4M18 5v4" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function getDateHeading(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function getRelativeReviewLabel(value: string) {
  const difference = new Date(value).getTime() - Date.now();
  if (difference <= 0) return "现在复习";
  const hours = Math.round(difference / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)} 小时后`;
  const days = Math.round(hours / 24);
  return days === 1 ? "明天" : `${days} 天后`;
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-check" aria-hidden="true">
        <Icon name="check" size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

function LevelPicker({
  value,
  onChange,
}: {
  value: CEFRLevel;
  onChange: (level: CEFRLevel) => void;
}) {
  return (
    <div className="level-picker" role="group" aria-label="英语水平">
      {CEFR_LEVELS.map((level) => (
        <button
          aria-pressed={value === level}
          className={value === level ? "is-selected" : ""}
          key={level}
          onClick={() => onChange(level)}
          type="button"
        >
          <strong>{level}</strong>
          <small>{LEVEL_COPY[level].title}</small>
        </button>
      ))}
    </div>
  );
}

export function VocabApp() {
  const [state, setState] = useState<VocabularyState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [queue, setQueue] = useState<string[]>([]);
  const [phase, setPhase] = useState<LearningPhase>("recognition");
  const [revealed, setRevealed] = useState(false);
  const [pendingRating, setPendingRating] = useState<ReviewRating>("fuzzy");
  const [spellingAnswer, setSpellingAnswer] = useState("");
  const [spellingResult, setSpellingResult] = useState<boolean | null>(null);
  const [search, setSearch] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [contextIndex, setContextIndex] = useState(0);
  const [contextAnswer, setContextAnswer] = useState("");
  const [contextResult, setContextResult] = useState<boolean | null>(null);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const initial = ensureDailyWords(loadState());
    setState(initial);
    saveState(initial);
    setQueue(getDueWords(initial).map((word) => word.id));

    const standaloneNavigator = window.navigator as Navigator & {
      standalone?: boolean;
    };
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        standaloneNavigator.standalone === true,
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` })
        .catch(() => undefined);
    }
    navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const wordsById = useMemo(
    () => new Map(state?.words.map((word) => [word.id, word]) ?? []),
    [state?.words],
  );
  const currentWord = queue.length ? wordsById.get(queue[0]) : undefined;
  const todayCompleted = state
    ? getLogsForDay(state.logs).filter((log) => log.mode === "spelling").length
    : 0;
  const todayGoal =
    state?.settings.activePlan?.dailyNewWords ?? state?.settings.dailyGoal ?? 8;
  const todayPercent = Math.min(
    100,
    Math.round((todayCompleted / Math.max(todayGoal, 1)) * 100),
  );
  const currentLevel =
    state?.settings.activePlan?.level ?? state?.settings.selectedLevel ?? "B1";

  const filteredWords = useMemo(() => {
    if (!state) return [];
    const normalized = search.trim().toLocaleLowerCase();
    return state.words.filter(
      (word) =>
        !normalized ||
        word.term.toLocaleLowerCase().includes(normalized) ||
        word.meaning.includes(normalized),
    );
  }, [search, state]);

  const contextWords = useMemo(
    () => (state ? selectContextWords(state, 4) : []),
    [state],
  );
  const contextWord = contextWords[contextIndex % Math.max(contextWords.length, 1)];

  function updateState(nextState: VocabularyState) {
    setState(nextState);
    saveState(nextState);
  }

  function rebuildQueue(nextState: VocabularyState) {
    setQueue(getDueWords(nextState).map((word) => word.id));
    resetCard();
  }

  function resetCard() {
    setPhase("recognition");
    setRevealed(false);
    setSpellingAnswer("");
    setSpellingResult(null);
  }

  function chooseRecognition(rating: ReviewRating) {
    setPendingRating(rating);
    setPhase("spelling");
    setSpellingAnswer("");
    setSpellingResult(null);
  }

  function submitSpelling(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state || !currentWord || spellingResult !== null) return;
    const correct = isSpellingCorrect(spellingAnswer, currentWord.term);
    const finalRating: ReviewRating = correct
      ? pendingRating
      : pendingRating === "know"
        ? "fuzzy"
        : "forgot";
    const result = reviewWord(currentWord, finalRating, new Date(), "spelling");
    const nextWord = {
      ...result.word,
      spellingAttempts: currentWord.spellingAttempts + 1,
      spellingCorrect: currentWord.spellingCorrect + (correct ? 1 : 0),
    };
    updateState({
      ...state,
      words: state.words.map((word) =>
        word.id === currentWord.id ? nextWord : word,
      ),
      logs: [...state.logs, result.log],
    });
    setSpellingResult(correct);
  }

  function continueToNextCard() {
    setQueue((items) => items.slice(1));
    resetCard();
    window.setTimeout(() => cardHeadingRef.current?.focus(), 50);
  }

  function speak(word: VocabularyWord) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.term);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function addWord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state) return;
    const form = new FormData(event.currentTarget);
    const term = String(form.get("term") ?? "").trim();
    const meaning = String(form.get("meaning") ?? "").trim();
    if (!term || !meaning) return;
    const timestamp = new Date().toISOString();
    const newWord: VocabularyWord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `word-${Date.now()}`,
      term,
      phonetic: String(form.get("phonetic") ?? "").trim(),
      meaning,
      example:
        String(form.get("example") ?? "").trim() ||
        `"${term}" is a word I want to remember and use correctly.`,
      exampleTranslation:
        String(form.get("exampleTranslation") ?? "").trim() ||
        `“${term}”是我想要记住并正确使用的单词。`,
      createdAt: timestamp,
      introducedAt: timestamp,
      nextReviewAt: timestamp,
      stage: 0,
      reviewCount: 0,
      level: "custom",
      source: "custom",
      spellingAttempts: 0,
      spellingCorrect: 0,
      contextReviewCount: 0,
    };
    const nextState = { ...state, words: [newWord, ...state.words] };
    updateState(nextState);
    setQueue((items) => [...items, newWord.id]);
    setShowAddSheet(false);
    event.currentTarget.reset();
  }

  function deleteWord(wordId: string) {
    if (!state) return;
    const word = state.words.find((item) => item.id === wordId);
    if (!word || !window.confirm(`删除“${word.term}”及其复习记录？`)) return;
    const nextState = {
      ...state,
      words: state.words.filter((item) => item.id !== wordId),
      logs: state.logs.filter((log) => log.wordId !== wordId),
    };
    updateState(nextState);
    setQueue((items) => items.filter((item) => item !== wordId));
  }

  function chooseLevel(level: CEFRLevel) {
    if (!state || state.settings.activePlan) return;
    const nextState = ensureDailyWords({
      ...state,
      settings: { ...state.settings, selectedLevel: level },
    });
    updateState(nextState);
    rebuildQueue(nextState);
  }

  function updateDailyGoal(dailyGoal: number) {
    if (!state || state.settings.activePlan) return;
    const nextState = ensureDailyWords({
      ...state,
      settings: { ...state.settings, dailyGoal },
    });
    updateState(nextState);
    rebuildQueue(nextState);
  }

  function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state) return;
    const form = new FormData(event.currentTarget);
    const durationDays = Math.min(
      365,
      Math.max(1, Number(form.get("durationDays")) || 30),
    );
    const dailyNewWords = Math.min(
      100,
      Math.max(1, Number(form.get("dailyNewWords")) || 50),
    );
    const level = String(form.get("level") ?? "B1") as CEFRLevel;
    const customName = String(form.get("name") ?? "").trim();
    if (
      state.settings.activePlan &&
      !window.confirm("用新目标替换当前正在进行的目标？")
    ) {
      return;
    }
    const plan = createStudyPlan({
      name: customName || `${durationDays} 天 · 每天 ${dailyNewWords} 词`,
      level,
      durationDays,
      dailyNewWords,
    });
    const nextState = ensureDailyWords({
      ...state,
      settings: {
        ...state.settings,
        activePlan: plan,
        selectedLevel: level,
        dailyGoal: dailyNewWords,
      },
    });
    updateState(nextState);
    rebuildQueue(nextState);
    setTab("today");
  }

  function endPlan() {
    if (!state || !window.confirm("结束当前目标？已学单词和记录会继续保留。")) {
      return;
    }
    updateState({
      ...state,
      settings: { ...state.settings, activePlan: null },
    });
  }

  function submitContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state || !contextWord || contextResult !== null) return;
    const correct = isSpellingCorrect(contextAnswer, contextWord.term);
    const now = new Date();
    updateState({
      ...state,
      words: state.words.map((word) =>
        word.id === contextWord.id
          ? { ...word, contextReviewCount: word.contextReviewCount + 1 }
          : word,
      ),
      logs: [
        ...state.logs,
        {
          id: `${contextWord.id}-${now.getTime()}-context`,
          wordId: contextWord.id,
          rating: correct ? "know" : "fuzzy",
          reviewedAt: now.toISOString(),
          mode: "context",
        },
      ],
    });
    setContextResult(correct);
  }

  function nextContext() {
    setContextIndex((index) => (index + 1) % Math.max(contextWords.length, 1));
    setContextAnswer("");
    setContextResult(null);
  }

  if (!state) {
    return (
      <main className="app-shell loading-shell" aria-busy="true">
        <div className="loading-mark">词</div>
        <p>正在准备今天的单词…</p>
      </main>
    );
  }

  const activePlan = state.settings.activePlan;
  const planMetrics = activePlan ? getPlanMetrics(activePlan, state) : null;
  const availableForPlan = getAvailableWordCount(
    activePlan?.level ?? state.settings.selectedLevel,
    state,
  );

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === "today" && (
          <section className="screen today-screen" aria-labelledby="today-title">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{getDateHeading()}</p>
                <h1 id="today-title">今日学习</h1>
              </div>
              <button
                aria-label="添加单词"
                className="icon-button"
                onClick={() => setShowAddSheet(true)}
                type="button"
              >
                <Icon name="plus" />
              </button>
            </header>

            <div className="learning-route" aria-label="学习步骤">
              <span className={phase === "recognition" ? "is-current" : "is-done"}>
                1 认识
              </span>
              <i aria-hidden="true" />
              <span className={phase === "spelling" ? "is-current" : ""}>
                2 拼写
              </span>
              <i aria-hidden="true" />
              <button onClick={() => setTab("context")} type="button">
                3 语境
              </button>
            </div>

            <div className="daily-progress" aria-label={`今日进度 ${todayPercent}%`}>
              <div className="progress-copy">
                <span>
                  {currentLevel} · {activePlan ? activePlan.name : "日常目标"}
                </span>
                <strong>
                  {Math.min(todayCompleted, todayGoal)}
                  <small> / {todayGoal}</small>
                </strong>
              </div>
              <div
                aria-hidden="true"
                className="progress-track"
                style={{ "--progress": `${todayPercent}%` } as React.CSSProperties}
              >
                <span />
              </div>
            </div>

            {!isStandalone && isIOS && (
              <button
                className="install-note interactive"
                onClick={() => setShowInstallSheet(true)}
                type="button"
              >
                <span className="install-note-icon">
                  <Icon name="share" />
                </span>
                <span>
                  <strong>把词迹放到主屏幕</strong>
                  <small>像普通 App 一样打开，也能离线复习</small>
                </span>
                <span aria-hidden="true" className="disclosure">
                  ›
                </span>
              </button>
            )}

            {currentWord ? (
              <div className="card-stage">
                <article className="word-card" aria-live="polite">
                  <div className="card-index">
                    <span>
                      {currentWord.level === "custom" ? "自定义" : currentWord.level}
                    </span>
                    <span>{queue.length} 词待完成</span>
                  </div>

                  {phase === "recognition" ? (
                    <>
                      <div className="word-heading">
                        <div>
                          <h2 ref={cardHeadingRef} tabIndex={-1}>
                            {currentWord.term}
                          </h2>
                          {currentWord.phonetic && <p>{currentWord.phonetic}</p>}
                        </div>
                        <button
                          aria-label={`朗读 ${currentWord.term}`}
                          className="sound-button"
                          onClick={() => speak(currentWord)}
                          type="button"
                        >
                          <Icon name="sound" />
                        </button>
                      </div>
                      {!revealed ? (
                        <button
                          className="reveal-button interactive"
                          onClick={() => setRevealed(true)}
                          type="button"
                        >
                          想一想，再显示释义
                        </button>
                      ) : (
                        <div className="answer-area">
                          <div className="meaning-block">
                            <span>释义</span>
                            <p>{currentWord.meaning}</p>
                          </div>
                          <blockquote>
                            <p>{currentWord.example}</p>
                            <footer>{currentWord.exampleTranslation}</footer>
                          </blockquote>
                          <div className="rating-row" aria-label="选择掌握程度">
                            {(Object.keys(RATING_COPY) as ReviewRating[]).map(
                              (rating) => {
                                const copy = RATING_COPY[rating];
                                return (
                                  <button
                                    className={`rating-button ${copy.className} interactive`}
                                    key={rating}
                                    onClick={() => chooseRecognition(rating)}
                                    type="button"
                                  >
                                    <strong>{copy.label}</strong>
                                    <small>{copy.hint}</small>
                                  </button>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="spelling-stage">
                      <span className="phase-icon" aria-hidden="true">
                        <Icon name="spell" />
                      </span>
                      <p className="spelling-kicker">不看单词，凭记忆拼写</p>
                      <h2>{currentWord.meaning}</h2>
                      <button
                        className="listen-link"
                        onClick={() => speak(currentWord)}
                        type="button"
                      >
                        <Icon name="sound" size={19} /> 再听一次发音
                      </button>
                      <form className="spelling-form" onSubmit={submitSpelling}>
                        <label>
                          <span className="sr-only">输入英文拼写</span>
                          <input
                            autoCapitalize="none"
                            autoComplete="off"
                            autoCorrect="off"
                            disabled={spellingResult !== null}
                            onChange={(event) => setSpellingAnswer(event.target.value)}
                            placeholder="输入英文单词"
                            spellCheck={false}
                            value={spellingAnswer}
                          />
                        </label>
                        {spellingResult === null ? (
                          <button
                            className="primary-button interactive"
                            disabled={!spellingAnswer.trim()}
                            type="submit"
                          >
                            检查拼写
                          </button>
                        ) : (
                          <div
                            className={`spelling-feedback ${
                              spellingResult ? "is-correct" : "is-wrong"
                            }`}
                          >
                            <strong>
                              {spellingResult ? "拼对了" : `正确拼写：${currentWord.term}`}
                            </strong>
                            <small>
                              {spellingResult
                                ? "这次回忆会让记忆更牢。"
                                : "看清字母顺序，稍后它会再次出现。"}
                            </small>
                            <button
                              className="primary-button interactive"
                              onClick={continueToNextCard}
                              type="button"
                            >
                              继续下一个
                            </button>
                          </div>
                        )}
                      </form>
                    </div>
                  )}
                </article>
              </div>
            ) : (
              <EmptyState
                action={
                  <button
                    className="secondary-button"
                    onClick={() => setTab("context")}
                    type="button"
                  >
                    进入语境复习
                  </button>
                }
                description="今天到期的认识与拼写已经完成。接下来把这些词放回句子和段落里。"
                title="今日学习完成"
              />
            )}
          </section>
        )}

        {tab === "library" && (
          <section className="screen library-screen" aria-labelledby="library-title">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{state.words.length} 个本地单词</p>
                <h1 id="library-title">我的词库</h1>
              </div>
              <button
                aria-label="添加单词"
                className="icon-button"
                onClick={() => setShowAddSheet(true)}
                type="button"
              >
                <Icon name="plus" />
              </button>
            </header>
            <label className="search-field">
              <Icon name="search" size={20} />
              <span className="sr-only">搜索单词或释义</span>
              <input
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索单词或释义"
                type="search"
                value={search}
              />
            </label>
            <div className="word-list">
              {filteredWords.map((word) => (
                <article className="word-row" key={word.id}>
                  <button
                    className="word-row-main"
                    onClick={() => speak(word)}
                    type="button"
                  >
                    <span>
                      <strong>{word.term}</strong>
                      <small>{word.meaning}</small>
                    </span>
                    <span className="word-row-meta">
                      <b>{word.level === "custom" ? "自定义" : word.level}</b>
                      {getRelativeReviewLabel(word.nextReviewAt)}
                    </span>
                  </button>
                  <button
                    aria-label={`删除 ${word.term}`}
                    className="row-action"
                    onClick={() => deleteWord(word.id)}
                    type="button"
                  >
                    <Icon name="trash" size={19} />
                  </button>
                </article>
              ))}
              {filteredWords.length === 0 && (
                <p className="no-results">没有找到相符的单词。</p>
              )}
            </div>
          </section>
        )}

        {tab === "plan" && (
          <section className="screen plan-screen" aria-labelledby="plan-title">
            <header className="screen-header">
              <div>
                <p className="eyebrow">选择水平，也定义自己的节奏</p>
                <h1 id="plan-title">学习计划</h1>
              </div>
            </header>

            {activePlan && planMetrics ? (
              <section className="active-plan-card">
                <div className="plan-card-heading">
                  <span>{activePlan.level}</span>
                  <div>
                    <p>正在进行</p>
                    <h2>{activePlan.name}</h2>
                  </div>
                </div>
                <div className="plan-numbers">
                  <div>
                    <strong>{planMetrics.day}</strong>
                    <small>当前天数</small>
                  </div>
                  <div>
                    <strong>{planMetrics.introduced}</strong>
                    <small>已加入学习</small>
                  </div>
                  <div>
                    <strong>{planMetrics.target}</strong>
                    <small>目标单词</small>
                  </div>
                </div>
                <div
                  className="progress-track plan-track"
                  style={
                    { "--progress": `${planMetrics.percent}%` } as React.CSSProperties
                  }
                >
                  <span />
                </div>
                <p className="plan-status">
                  {planMetrics.remainingDays} 天剩余 · 每天 {activePlan.dailyNewWords} 词
                </p>
                <button className="text-danger-button" onClick={endPlan} type="button">
                  结束当前目标
                </button>
              </section>
            ) : (
              <section className="level-section" aria-labelledby="level-title">
                <div className="section-heading">
                  <h2 id="level-title">我的英语水平</h2>
                  <span>学习该等级及以下词汇</span>
                </div>
                <LevelPicker
                  onChange={chooseLevel}
                  value={state.settings.selectedLevel}
                />
                <p className="level-description">
                  <strong>
                    {state.settings.selectedLevel} ·{" "}
                    {LEVEL_COPY[state.settings.selectedLevel].title}
                  </strong>
                  {LEVEL_COPY[state.settings.selectedLevel].description}
                </p>
                <div className="section-heading daily-goal-heading">
                  <h2>日常目标</h2>
                  <span>没有自定义计划时使用</span>
                </div>
                <div className="goal-picker" role="group" aria-label="每日单词目标">
                  {[5, 8, 12, 20].map((goal) => (
                    <button
                      aria-pressed={state.settings.dailyGoal === goal}
                      className={
                        state.settings.dailyGoal === goal ? "is-selected" : ""
                      }
                      key={goal}
                      onClick={() => updateDailyGoal(goal)}
                      type="button"
                    >
                      {goal} 词
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="custom-plan-section" aria-labelledby="custom-title">
              <div className="section-heading">
                <h2 id="custom-title">
                  {activePlan ? "制定新目标" : "自定义目标"}
                </h2>
                <span>例如：30 天，每天 50 词</span>
              </div>
              <form className="plan-form" onSubmit={submitPlan}>
                <label>
                  <span>目标名称（可选）</span>
                  <input name="name" placeholder="例如 一个月词汇冲刺" />
                </label>
                <div className="plan-form-row">
                  <label>
                    <span>持续天数</span>
                    <input
                      defaultValue={30}
                      inputMode="numeric"
                      max={365}
                      min={1}
                      name="durationDays"
                      required
                      type="number"
                    />
                  </label>
                  <label>
                    <span>每天新词</span>
                    <input
                      defaultValue={50}
                      inputMode="numeric"
                      max={100}
                      min={1}
                      name="dailyNewWords"
                      required
                      type="number"
                    />
                  </label>
                </div>
                <label>
                  <span>目标水平</span>
                  <select defaultValue={currentLevel} name="level">
                    {CEFR_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level} · {LEVEL_COPY[level].title}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="capacity-note">
                  当前所选等级及以下，词库还可提供约 {availableForPlan} 个新词。
                </p>
                <button className="primary-button interactive" type="submit">
                  {activePlan ? "替换并开始新目标" : "开始这个目标"}
                </button>
              </form>
            </section>

            <section className="history-section" aria-labelledby="history-title">
              <div className="section-heading">
                <h2 id="history-title">最近七天</h2>
                <span>连续 {getStreak(state.logs)} 天</span>
              </div>
              <div className="week-chart">
                {(() => {
                  const counts = getReviewCountsForLastSevenDays(state.logs);
                  const max = Math.max(...counts.map((item) => item.count), 1);
                  return counts.map((item) => (
                    <div className="day-column" key={item.date.toISOString()}>
                      <span className="day-value">{item.count || ""}</span>
                      <div className="day-bar-track" aria-hidden="true">
                        <span
                          style={{
                            height: `${
                              item.count === 0
                                ? 5
                                : Math.max(
                                    16,
                                    Math.round((item.count / max) * 100),
                                  )
                            }%`,
                          }}
                        />
                      </div>
                      <small>
                        {new Intl.DateTimeFormat("zh-CN", {
                          weekday: "narrow",
                        }).format(item.date)}
                      </small>
                    </div>
                  ));
                })()}
              </div>
            </section>

            <button
              className="backup-button interactive"
              onClick={() => exportState(state)}
              type="button"
            >
              <Icon name="share" />
              <span>
                <strong>导出本地备份</strong>
                <small>保存词库、计划和全部复习记录</small>
              </span>
            </button>
            <p className="privacy-note">所有数据只保存在当前浏览器，不会上传。</p>
          </section>
        )}

        {tab === "context" && (
          <section className="screen context-screen" aria-labelledby="context-title">
            <header className="screen-header">
              <div>
                <p className="eyebrow">把记过的词放回真实表达</p>
                <h1 id="context-title">语境复习</h1>
              </div>
            </header>

            {contextWord ? (
              <>
                <section className="context-card" aria-labelledby="cloze-title">
                  <div className="context-card-topline">
                    <span>句子填空</span>
                    <span>
                      {contextIndex + 1} / {contextWords.length}
                    </span>
                  </div>
                  <h2 id="cloze-title">
                    {createCloze(contextWord.example, contextWord.term)}
                  </h2>
                  <p>{contextWord.exampleTranslation}</p>
                  <form className="context-form" onSubmit={submitContext}>
                    <input
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect="off"
                      disabled={contextResult !== null}
                      onChange={(event) => setContextAnswer(event.target.value)}
                      placeholder="填入缺失的单词"
                      spellCheck={false}
                      value={contextAnswer}
                    />
                    {contextResult === null ? (
                      <button
                        className="primary-button"
                        disabled={!contextAnswer.trim()}
                        type="submit"
                      >
                        检查答案
                      </button>
                    ) : (
                      <div
                        className={`context-feedback ${
                          contextResult ? "is-correct" : "is-wrong"
                        }`}
                      >
                        <strong>
                          {contextResult
                            ? "正确，放回句子里了"
                            : `答案是 ${contextWord.term}`}
                        </strong>
                        <button onClick={nextContext} type="button">
                          下一句
                        </button>
                      </div>
                    )}
                  </form>
                </section>

                <section className="paragraph-card" aria-labelledby="paragraph-title">
                  <div className="section-heading">
                    <h2 id="paragraph-title">今日复习段落</h2>
                    <span>{contextWords.length} 个已学词</span>
                  </div>
                  <div className="paragraph-copy">
                    {contextWords.map((word) => (
                      <p key={word.id}>{word.example}</p>
                    ))}
                  </div>
                  <div className="context-word-chips" aria-label="段落重点词">
                    {contextWords.map((word) => (
                      <button key={word.id} onClick={() => speak(word)} type="button">
                        {word.term}
                        <small>{word.meaning}</small>
                      </button>
                    ))}
                  </div>
                  <p className="paragraph-hint">
                    先通读，再点重点词听发音。句子来自离线中英例句库。
                  </p>
                </section>
              </>
            ) : (
              <EmptyState
                action={
                  <button
                    className="secondary-button"
                    onClick={() => setTab("today")}
                    type="button"
                  >
                    先完成今日单词
                  </button>
                }
                description="至少完成一个单词的认识与拼写后，这里会自动生成句子填空和复习段落。"
                title="语境正在等单词"
              />
            )}
          </section>
        )}
      </main>

      <nav className="tab-bar" aria-label="主要导航">
        {(
          [
            ["today", "today", "今日"],
            ["library", "library", "词库"],
            ["plan", "plan", "计划"],
            ["context", "context", "语境"],
          ] as Array<[Tab, IconName, string]>
        ).map(([value, icon, label]) => (
          <button
            aria-current={tab === value ? "page" : undefined}
            className={tab === value ? "is-active" : ""}
            key={value}
            onClick={() => setTab(value)}
            type="button"
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {showAddSheet && (
        <div
          aria-modal="true"
          className="sheet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAddSheet(false);
          }}
          role="dialog"
        >
          <section className="sheet">
            <span className="sheet-grabber" aria-hidden="true" />
            <header className="sheet-header">
              <button
                className="sheet-text-button"
                onClick={() => setShowAddSheet(false)}
                type="button"
              >
                取消
              </button>
              <h2>添加单词</h2>
              <span aria-hidden="true" className="sheet-header-spacer">
                取消
              </span>
            </header>
            <form className="word-form" onSubmit={addWord}>
              <label>
                <span>英文单词</span>
                <input
                  autoCapitalize="none"
                  autoFocus
                  name="term"
                  placeholder="例如 resilient"
                  required
                />
              </label>
              <label>
                <span>音标（可选）</span>
                <input name="phonetic" placeholder="/rɪˈzɪliənt/" />
              </label>
              <label>
                <span>中文释义</span>
                <input name="meaning" placeholder="有韧性的；能恢复的" required />
              </label>
              <label>
                <span>英文例句（推荐）</span>
                <textarea
                  name="example"
                  placeholder="Small habits make a resilient routine."
                  rows={2}
                />
              </label>
              <label>
                <span>例句翻译（推荐）</span>
                <textarea
                  name="exampleTranslation"
                  placeholder="微小的习惯构成有韧性的节奏。"
                  rows={2}
                />
              </label>
              <button className="primary-button interactive" type="submit">
                放入今日学习
              </button>
            </form>
          </section>
        </div>
      )}

      {showInstallSheet && (
        <div
          aria-modal="true"
          className="sheet-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowInstallSheet(false);
          }}
          role="dialog"
        >
          <section className="sheet install-sheet">
            <span className="sheet-grabber" aria-hidden="true" />
            <header className="sheet-header">
              <span aria-hidden="true" className="sheet-header-spacer">
                完成
              </span>
              <h2>安装词迹</h2>
              <button
                className="sheet-text-button"
                onClick={() => setShowInstallSheet(false)}
                type="button"
              >
                完成
              </button>
            </header>
            <div className="app-icon-preview" aria-hidden="true">
              词
            </div>
            <p className="install-intro">
              添加到主屏幕后，词迹会以独立窗口打开，并保留离线学习能力。
            </p>
            <ol className="install-steps">
              <li>
                <span>1</span>
                <p>
                  点击 Safari 底部工具栏的
                  <strong>
                    <Icon name="share" size={19} /> 分享
                  </strong>
                </p>
              </li>
              <li>
                <span>2</span>
                <p>
                  向下找到并点击<strong>“添加到主屏幕”</strong>
                </p>
              </li>
              <li>
                <span>3</span>
                <p>
                  确认名称后点击右上角<strong>“添加”</strong>
                </p>
              </li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
