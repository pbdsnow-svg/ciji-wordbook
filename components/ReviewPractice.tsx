"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIALOGUE_MAX_ATTEMPTS,
  DIALOGUE_WORD_LIMIT,
  advanceDialogueQueue,
  buildDialogueChoices,
  buildDialogueLines,
  getTodayLearnedWordCount,
  getTodayLearnedWords,
  type DialogueLine,
} from "@/lib/dialogue";
import { reviewWord } from "@/lib/srs";
import type { VocabularyState, VocabularyWord } from "@/lib/types";

interface DialogueSession {
  lines: DialogueLine[];
  offset: number;
  totalCount: number;
  words: VocabularyWord[];
}

function createSession(
  state: VocabularyState,
  day: Date,
  offset = 0,
): DialogueSession {
  const words = getTodayLearnedWords(
    state,
    day,
    offset,
    DIALOGUE_WORD_LIMIT,
  );
  return {
    lines: buildDialogueLines(words),
    offset,
    totalCount: getTodayLearnedWordCount(state, day),
    words,
  };
}

function speak(word: VocabularyWord) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word.term);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

export function ReviewPractice({
  state,
  onStateChange,
  onGoToday,
}: {
  state: VocabularyState;
  onStateChange: (state: VocabularyState) => void;
  onGoToday: () => void;
}) {
  const sessionDayRef = useRef(new Date());
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeTurnRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState(() =>
    createSession(state, sessionDayRef.current),
  );
  const [queue, setQueue] = useState(() =>
    session.lines.map((line) => line.word.id),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);
  const [answeredAttempt, setAnsweredAttempt] = useState(0);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [needsMoreIds, setNeedsMoreIds] = useState<Set<string>>(() => new Set());
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [finished, setFinished] = useState(false);

  const currentId = queue[0];
  const currentLine = session.lines.find((line) => line.word.id === currentId);
  const currentWord = currentLine
    ? state.words.find((word) => word.id === currentLine.word.id) ??
      currentLine.word
    : undefined;
  const choices = useMemo(
    () =>
      currentWord ? buildDialogueChoices(currentWord, state.words) : [],
    [currentWord, state.words],
  );
  const answered = selectedId !== null;
  const remainingForNextDialogue = Math.max(
    session.totalCount - session.offset - session.words.length,
    0,
  );

  useEffect(() => {
    if (!currentId || !activeTurnRef.current) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    activeTurnRef.current.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }, [currentId]);

  if (session.lines.length === 0) {
    return (
      <section className="empty-state dialogue-empty-state">
        <h2>今天的对话还没有单词</h2>
        <p>
          在“今日学习”完成单词后，它们会自动进入同一段双人对话。学得越多，对话里连接的词就越多。
        </p>
        <button className="secondary-button" onClick={onGoToday} type="button">
          先完成今日单词
        </button>
      </section>
    );
  }

  function chooseAnswer(wordId: string) {
    if (answered || !currentWord) return;
    const correct = wordId === currentWord.id;
    const attemptNumber = (attemptCounts[currentWord.id] ?? 0) + 1;
    const rating = correct
      ? attemptNumber === 1 && !showHint
        ? "know"
        : "fuzzy"
      : "forgot";
    const now = new Date();
    const result = reviewWord(currentWord, rating, now, "context");
    const nextWord = {
      ...result.word,
      contextReviewCount: currentWord.contextReviewCount + 1,
    };

    onStateChange({
      ...state,
      words: state.words.map((word) =>
        word.id === currentWord.id ? nextWord : word,
      ),
      logs: [...state.logs, result.log],
    });
    setAttemptCounts((counts) => ({
      ...counts,
      [currentWord.id]: attemptNumber,
    }));
    if (correct && attemptNumber === 1 && !showHint) {
      setFirstTryCorrect((score) => score + 1);
    }
    setAnsweredAttempt(attemptNumber);
    setSelectedId(wordId);
    setAnswerCorrect(correct);
  }

  function continuePractice() {
    if (!currentId || answerCorrect === null) return;
    const exhausted =
      !answerCorrect && answeredAttempt >= DIALOGUE_MAX_ATTEMPTS;
    if (answerCorrect || exhausted) {
      setResolvedIds((ids) => new Set(ids).add(currentId));
    }
    if (exhausted) {
      setNeedsMoreIds((ids) => new Set(ids).add(currentId));
    }

    const nextQueue = advanceDialogueQueue(
      queue,
      answerCorrect,
      answeredAttempt,
    );
    setQueue(nextQueue);
    setSelectedId(null);
    setAnswerCorrect(null);
    setAnsweredAttempt(0);
    setShowHint(false);
    if (nextQueue.length === 0) setFinished(true);
  }

  function startGroup(offset: number) {
    const nextSession = createSession(state, sessionDayRef.current, offset);
    setSession(nextSession);
    setQueue(nextSession.lines.map((line) => line.word.id));
    setSelectedId(null);
    setAnswerCorrect(null);
    setAnsweredAttempt(0);
    setAttemptCounts({});
    setResolvedIds(new Set());
    setNeedsMoreIds(new Set());
    setFirstTryCorrect(0);
    setShowHint(false);
    setShowTranslations(false);
    setFinished(false);
  }

  if (finished) {
    return (
      <>
        <section className="practice-summary dialogue-summary" aria-live="polite">
          <span>今日对话完成</span>
          <strong>
            {firstTryCorrect}
            <small> / {session.lines.length}</small>
          </strong>
          <p>
            首次独立答对 {firstTryCorrect} 个；
            {needsMoreIds.size > 0
              ? `${needsMoreIds.size} 个词已标记为需要加强。`
              : "所有错词都已在本轮重新答对。"}
          </p>
          <div className="summary-actions">
            <button
              className="secondary-button"
              onClick={() => startGroup(session.offset)}
              type="button"
            >
              再练这段对话
            </button>
            {remainingForNextDialogue > 0 && (
              <button
                className="primary-button"
                onClick={() =>
                  startGroup(session.offset + session.words.length)
                }
                type="button"
              >
                继续剩余 {remainingForNextDialogue} 词
              </button>
            )}
          </div>
        </section>

        <div className="dialogue-language-row">
          <div>
            <span>完整对话</span>
            <small>{session.lines.length} 个今日单词</small>
          </div>
          <button
            aria-pressed={showTranslations}
            onClick={() => setShowTranslations((visible) => !visible)}
            type="button"
          >
            {showTranslations ? "隐藏中文" : "显示中文"}
          </button>
        </div>
        <DialogueTranscript
          lines={session.lines}
          revealAll
          showTranslations={showTranslations}
        />
      </>
    );
  }

  return (
    <section className="dialogue-practice" aria-labelledby="dialogue-title">
      <div className="dialogue-practice-heading">
        <div>
          <span>今日对话 · 最多 40 词</span>
          <h2 id="dialogue-title">把今天的词连起来</h2>
        </div>
        <strong>
          {resolvedIds.size}<small> / {session.lines.length}</small>
        </strong>
      </div>

      <DialogueTranscript
        activeRef={activeTurnRef}
        currentId={currentId}
        lines={session.lines}
        revealCurrent={answered}
        resolvedIds={resolvedIds}
        showCurrentTranslation={showHint || answered}
        transcriptRef={transcriptRef}
      />

      {currentLine && currentWord && (
        <div className="dialogue-answer-dock">
          <div className="dialogue-current-meta">
            <span>
              当前空格 · {session.lines.indexOf(currentLine) + 1} /{" "}
              {session.lines.length}
            </span>
            {!answered && !showHint && (
              <button onClick={() => setShowHint(true)} type="button">
                显示本句中文
              </button>
            )}
          </div>

          <div className="dialogue-choice-grid" aria-label="选择对话中缺少的单词">
            {choices.map((option) => {
              const isAnswer = option.id === currentWord.id;
              const isSelected = option.id === selectedId;
              const resultClass = answered
                ? isAnswer
                  ? "is-answer"
                  : isSelected
                    ? "is-wrong-choice"
                    : ""
                : "";
              return (
                <button
                  aria-pressed={isSelected}
                  className={resultClass}
                  disabled={answered}
                  key={option.id}
                  onClick={() => chooseAnswer(option.id)}
                  type="button"
                >
                  <strong>{option.term}</strong>
                  {answered && <small>{option.phonetic}</small>}
                </button>
              );
            })}
          </div>

          {answered && answerCorrect !== null && (
            <div
              className={`context-feedback ${
                answerCorrect ? "is-correct" : "is-wrong"
              }`}
              aria-live="polite"
            >
              <div>
                <strong>
                  {answerCorrect
                    ? answeredAttempt > 1
                      ? "这次答对了"
                      : "正确，句子接上了"
                    : `答案是 ${currentWord.term}`}
                </strong>
                {!answerCorrect && answeredAttempt < DIALOGUE_MAX_ATTEMPTS && (
                  <small>它会隔三句再次出现</small>
                )}
              </div>
              <button onClick={continuePractice} type="button">
                {queue.length === 1 && answerCorrect ? "查看完整对话" : "继续对话"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function DialogueTranscript({
  lines,
  currentId,
  resolvedIds = new Set<string>(),
  revealCurrent = false,
  revealAll = false,
  showCurrentTranslation = false,
  showTranslations = false,
  transcriptRef,
  activeRef,
}: {
  lines: DialogueLine[];
  currentId?: string;
  resolvedIds?: Set<string>;
  revealCurrent?: boolean;
  revealAll?: boolean;
  showCurrentTranslation?: boolean;
  showTranslations?: boolean;
  transcriptRef?: React.RefObject<HTMLDivElement | null>;
  activeRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="dialogue-transcript" ref={transcriptRef}>
      <div className="dialogue-turn dialogue-turn-intro">
        <span aria-hidden="true">M</span>
        <div>
          <strong>Mia</strong>
          <p>Let&apos;s connect the words we studied today in one conversation.</p>
          {(revealAll && showTranslations) && (
            <small>让我们把今天学过的单词放进同一段对话。</small>
          )}
        </div>
      </div>
      <div className="dialogue-turn dialogue-turn-intro is-leo">
        <span aria-hidden="true">L</span>
        <div>
          <strong>Leo</strong>
          <p>Good idea. Read each clue and complete the missing word.</p>
          {(revealAll && showTranslations) && (
            <small>好主意。读每个线索，补全缺少的单词。</small>
          )}
        </div>
      </div>

      {lines.map((line) => {
        const isCurrent = line.word.id === currentId;
        const isResolved = resolvedIds.has(line.word.id);
        const revealWord = revealAll || isResolved || (isCurrent && revealCurrent);
        const showTranslation =
          showTranslations || (isCurrent && showCurrentTranslation);
        return (
          <div
            aria-current={isCurrent ? "step" : undefined}
            className={`dialogue-turn ${line.speaker === "Leo" ? "is-leo" : ""} ${
              isCurrent ? "is-active" : ""
            } ${isResolved ? "is-resolved" : ""}`}
            data-word-id={line.word.id}
            key={line.id}
            ref={isCurrent ? activeRef : undefined}
          >
            <span aria-hidden="true">{line.speaker.charAt(0)}</span>
            <div>
              <strong>{line.speaker}</strong>
              <small className="dialogue-lead">{line.lead}</small>
              <p>{revealWord ? line.word.example : line.prompt}</p>
              {showTranslation && (
                <small className="dialogue-translation">
                  {line.leadTranslation} {line.translation}
                </small>
              )}
              {revealAll && (
                <button
                  className="dialogue-word-button"
                  onClick={() => speak(line.word)}
                  type="button"
                >
                  {line.word.term}
                  <small>{line.word.meaning}</small>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
