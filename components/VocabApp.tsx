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
  getDueWords,
  getLogsForDay,
  getReviewCountsForLastSevenDays,
  getStreak,
  reviewWord,
} from "@/lib/srs";
import { exportState, loadState, saveState } from "@/lib/storage";
import type {
  ReviewRating,
  VocabularyState,
  VocabularyWord,
} from "@/lib/types";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Tab = "today" | "library" | "progress";
type IconName =
  | "today"
  | "library"
  | "progress"
  | "sound"
  | "plus"
  | "search"
  | "share"
  | "close"
  | "trash"
  | "check";

const RATING_COPY: Record<
  ReviewRating,
  { label: string; hint: string; className: string }
> = {
  forgot: {
    label: "忘记",
    hint: "4 小时后",
    className: "rating-forgot",
  },
  fuzzy: {
    label: "模糊",
    hint: "稍后再见",
    className: "rating-fuzzy",
  },
  know: {
    label: "认识",
    hint: "延长间隔",
    className: "rating-know",
  },
};

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    today: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 3v4M16 3v4M4 10h16" />
        <path d="m9 15 2 2 4-5" />
      </>
    ),
    library: (
      <>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17M9 7h7M9 11h5" />
      </>
    ),
    progress: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
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
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
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
  const target = new Date(value);
  const now = new Date();
  const difference = target.getTime() - now.getTime();
  if (difference <= 0) return "现在复习";

  const hours = Math.round(difference / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)} 小时后`;

  const days = Math.round(hours / 24);
  if (days === 1) return "明天";
  return `${days} 天后`;
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

export function VocabApp() {
  const [state, setState] = useState<VocabularyState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const cardHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const initial = loadState();
    setState(initial);

    const completed = getLogsForDay(initial.logs).length;
    const remainingGoal = Math.max(initial.settings.dailyGoal - completed, 0);
    setQueue(
      getDueWords(initial)
        .slice(0, remainingGoal || initial.settings.dailyGoal)
        .map((word) => word.id),
    );

    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        navigatorWithStandalone.standalone === true,
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
  const currentWord = queue.length > 0 ? wordsById.get(queue[0]) : undefined;
  const todayCompleted = state ? getLogsForDay(state.logs).length : 0;
  const todayGoal = state?.settings.dailyGoal ?? 8;
  const todayPercent = Math.min(100, Math.round((todayCompleted / todayGoal) * 100));

  const filteredWords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!state) return [];
    if (!normalizedSearch) return state.words;
    return state.words.filter(
      (word) =>
        word.term.toLocaleLowerCase().includes(normalizedSearch) ||
        word.meaning.includes(normalizedSearch),
    );
  }, [search, state]);

  function updateState(nextState: VocabularyState) {
    setState(nextState);
    saveState(nextState);
  }

  function rateCurrentWord(rating: ReviewRating) {
    if (!state || !currentWord) return;

    const result = reviewWord(currentWord, rating);
    const nextState = {
      ...state,
      words: state.words.map((word) =>
        word.id === currentWord.id ? result.word : word,
      ),
      logs: [...state.logs, result.log],
    };
    updateState(nextState);
    setQueue((currentQueue) => currentQueue.slice(1));
    setRevealed(false);
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

    const newWord: VocabularyWord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `word-${Date.now()}`,
      term,
      phonetic: String(form.get("phonetic") ?? "").trim(),
      meaning,
      example: String(form.get("example") ?? "").trim(),
      exampleTranslation: String(
        form.get("exampleTranslation") ?? "",
      ).trim(),
      createdAt: new Date().toISOString(),
      nextReviewAt: new Date().toISOString(),
      stage: 0,
      reviewCount: 0,
    };

    const nextState = {
      ...state,
      words: [newWord, ...state.words],
    };
    updateState(nextState);
    if (todayCompleted < todayGoal) {
      setQueue((currentQueue) => [...currentQueue, newWord.id]);
    }
    setShowAddSheet(false);
    event.currentTarget.reset();
  }

  function deleteWord(wordId: string) {
    if (!state) return;
    const word = state.words.find((item) => item.id === wordId);
    if (!word) return;
    if (!window.confirm(`删除“${word.term}”及其复习记录？`)) return;

    const nextState = {
      ...state,
      words: state.words.filter((item) => item.id !== wordId),
      logs: state.logs.filter((log) => log.wordId !== wordId),
    };
    updateState(nextState);
    setQueue((currentQueue) =>
      currentQueue.filter((item) => item !== wordId),
    );
  }

  function updateDailyGoal(dailyGoal: number) {
    if (!state) return;
    updateState({
      ...state,
      settings: {
        ...state.settings,
        dailyGoal,
      },
    });
  }

  if (!state) {
    return (
      <main className="app-shell loading-shell" aria-busy="true">
        <div className="loading-mark">词</div>
        <p>正在翻开今天的卡片…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        {tab === "today" && (
          <section className="screen today-screen" aria-labelledby="today-title">
            <header className="screen-header">
              <div>
                <p className="eyebrow">{getDateHeading()}</p>
                <h1 id="today-title">今日卡组</h1>
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

            <div className="daily-progress" aria-label={`今日进度 ${todayPercent}%`}>
              <div className="progress-copy">
                <span>今日痕迹</span>
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
                <article
                  className={`word-card ${revealed ? "is-revealed" : ""}`}
                  aria-live="polite"
                >
                  <div className="card-index">
                    <span>第 {todayCompleted + 1} 张</span>
                    <span>{Math.max(queue.length - 1, 0)} 张待复习</span>
                  </div>
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
                      显示释义
                    </button>
                  ) : (
                    <div className="answer-area">
                      <div className="meaning-block">
                        <span>释义</span>
                        <p>{currentWord.meaning}</p>
                      </div>
                      {currentWord.example && (
                        <blockquote>
                          <p>{currentWord.example}</p>
                          {currentWord.exampleTranslation && (
                            <footer>{currentWord.exampleTranslation}</footer>
                          )}
                        </blockquote>
                      )}
                      <div className="rating-row" aria-label="选择掌握程度">
                        {(Object.keys(RATING_COPY) as ReviewRating[]).map(
                          (rating) => {
                            const copy = RATING_COPY[rating];
                            return (
                              <button
                                className={`rating-button ${copy.className} interactive`}
                                key={rating}
                                onClick={() => rateCurrentWord(rating)}
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
                </article>
              </div>
            ) : (
              <EmptyState
                action={
                  <button
                    className="secondary-button"
                    onClick={() => setTab("library")}
                    type="button"
                  >
                    查看我的词库
                  </button>
                }
                description={
                  todayCompleted >= todayGoal
                    ? "今天的目标已经完成。记忆需要留白，明天再见。"
                    : "暂时没有到期单词。你可以去词库添加想学的新词。"
                }
                title={
                  todayCompleted >= todayGoal ? "今日留痕完成" : "卡组已经清空"
                }
              />
            )}
          </section>
        )}

        {tab === "library" && (
          <section
            className="screen library-screen"
            aria-labelledby="library-title"
          >
            <header className="screen-header">
              <div>
                <p className="eyebrow">{state.words.length} 个单词</p>
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

        {tab === "progress" && (
          <section
            className="screen progress-screen"
            aria-labelledby="progress-title"
          >
            <header className="screen-header">
              <div>
                <p className="eyebrow">慢一点，记得更久</p>
                <h1 id="progress-title">学习痕迹</h1>
              </div>
            </header>

            <section className="progress-hero" aria-label="连续学习">
              <p>连续学习</p>
              <strong>{getStreak(state.logs)}</strong>
              <span>天</span>
              <small>
                {getStreak(state.logs) === 0
                  ? "完成今天第一张卡片，留下新的痕迹。"
                  : "不追赶数字，只保持每天回来。"}
              </small>
            </section>

            <section className="history-section" aria-labelledby="history-title">
              <div className="section-heading">
                <h2 id="history-title">最近七天</h2>
                <span>{state.logs.length} 次累计复习</span>
              </div>
              <div className="week-chart">
                {(() => {
                  const counts = getReviewCountsForLastSevenDays(state.logs);
                  const max = Math.max(...counts.map((item) => item.count), 1);
                  return counts.map((item) => {
                    const height =
                      item.count === 0
                        ? 5
                        : Math.max(16, Math.round((item.count / max) * 100));
                    return (
                      <div className="day-column" key={item.date.toISOString()}>
                        <span className="day-value">{item.count || ""}</span>
                        <div className="day-bar-track" aria-hidden="true">
                          <span style={{ height: `${height}%` }} />
                        </div>
                        <small>
                          {new Intl.DateTimeFormat("zh-CN", {
                            weekday: "narrow",
                          }).format(item.date)}
                        </small>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>

            <section className="mastery-section" aria-labelledby="mastery-title">
              <div className="section-heading">
                <h2 id="mastery-title">词库状态</h2>
              </div>
              <div className="mastery-line">
                <span>已熟悉</span>
                <strong>
                  {state.words.filter((word) => word.stage >= 4).length}
                </strong>
              </div>
              <div className="mastery-line">
                <span>正在记忆</span>
                <strong>
                  {state.words.filter((word) => word.stage < 4).length}
                </strong>
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-title">
              <div className="section-heading">
                <h2 id="settings-title">每日目标</h2>
              </div>
              <div className="goal-picker" role="group" aria-label="每日单词目标">
                {[5, 8, 12].map((goal) => (
                  <button
                    aria-pressed={todayGoal === goal}
                    className={todayGoal === goal ? "is-selected" : ""}
                    key={goal}
                    onClick={() => updateDailyGoal(goal)}
                    type="button"
                  >
                    {goal} 词
                  </button>
                ))}
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
                <small>保存词库和复习记录的 JSON 文件</small>
              </span>
            </button>
            <p className="privacy-note">
              所有学习数据只保存在这台设备的浏览器中，不会上传。
            </p>
          </section>
        )}
      </main>

      <nav className="tab-bar" aria-label="主要导航">
        {(
          [
            ["today", "today", "今日"],
            ["library", "library", "词库"],
            ["progress", "progress", "进度"],
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
                <span>英文例句（可选）</span>
                <textarea
                  name="example"
                  placeholder="Small habits make a resilient routine."
                  rows={2}
                />
              </label>
              <label>
                <span>例句翻译（可选）</span>
                <textarea
                  name="exampleTranslation"
                  placeholder="微小的习惯构成有韧性的节奏。"
                  rows={2}
                />
              </label>
              <button className="primary-button interactive" type="submit">
                放入今日卡组
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
