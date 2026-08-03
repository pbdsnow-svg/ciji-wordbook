"use client";

import { useState } from "react";
import {
  buildChoiceOptions,
  createCloze,
  selectContextWords,
} from "@/lib/learning";
import type { VocabularyState, VocabularyWord } from "@/lib/types";

interface PracticeQuestion {
  target: VocabularyWord;
  options: VocabularyWord[];
}

function createSession(state: VocabularyState): PracticeQuestion[] {
  return selectContextWords(state, 5).map((target) => ({
    target,
    options: buildChoiceOptions(target, state.words, 4),
  }));
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
  const [session, setSession] = useState(() => createSession(state));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  if (session.length === 0) {
    return (
      <section className="empty-state">
        <h2>语境正在等单词</h2>
        <p>至少完成一个单词的认识与拼写后，这里会自动生成选词填空。</p>
        <button className="secondary-button" onClick={onGoToday} type="button">
          先完成今日单词
        </button>
      </section>
    );
  }

  const question = session[questionIndex];
  const answered = selectedId !== null;
  const isCorrect = selectedId === question.target.id;

  function chooseAnswer(wordId: string) {
    if (answered) return;
    const correct = wordId === question.target.id;
    const now = new Date();
    onStateChange({
      ...state,
      words: state.words.map((word) =>
        word.id === question.target.id
          ? { ...word, contextReviewCount: word.contextReviewCount + 1 }
          : word,
      ),
      logs: [
        ...state.logs,
        {
          id: `${question.target.id}-${now.getTime()}-context`,
          wordId: question.target.id,
          rating: correct ? "know" : "fuzzy",
          reviewedAt: now.toISOString(),
          mode: "context",
        },
      ],
    });
    setSelectedId(wordId);
    if (correct) setScore((value) => value + 1);
  }

  function continuePractice() {
    if (questionIndex + 1 >= session.length) {
      setFinished(true);
      return;
    }
    setQuestionIndex((value) => value + 1);
    setSelectedId(null);
    setShowHint(false);
  }

  function restart() {
    setSession(createSession(state));
    setQuestionIndex(0);
    setSelectedId(null);
    setScore(0);
    setShowHint(false);
    setFinished(false);
  }

  if (finished) {
    return (
      <>
        <section className="practice-summary" aria-live="polite">
          <span>本组完成</span>
          <strong>
            {score}<small> / {session.length}</small>
          </strong>
          <p>
            {score === session.length
              ? "全部答对，这组词已经能放回语境了。"
              : "错题已记为模糊，之后会优先再出现。"}
          </p>
          <button className="primary-button" onClick={restart} type="button">
            再练一组
          </button>
        </section>
        <ReviewParagraph words={session.map((item) => item.target)} />
      </>
    );
  }

  return (
    <>
      <section className="context-card choice-practice" aria-labelledby="cloze-title">
        <div className="context-card-topline">
          <span>选词填空 · 得分 {score}</span>
          <span>
            {questionIndex + 1} / {session.length}
          </span>
        </div>
        <h2 id="cloze-title">
          {createCloze(question.target.example, question.target.term)}
        </h2>
        {!answered && !showHint && (
          <button
            className="text-hint-button"
            onClick={() => setShowHint(true)}
            type="button"
          >
            显示中文提示
          </button>
        )}
        {(showHint || answered) && (
          <p className="choice-translation">{question.target.exampleTranslation}</p>
        )}
        <div className="choice-grid" aria-label="选择缺失的单词">
          {question.options.map((option) => {
            const isAnswer = option.id === question.target.id;
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
                <small>{option.meaning}</small>
              </button>
            );
          })}
        </div>
        {answered && (
          <div
            className={`context-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}
            aria-live="polite"
          >
            <strong>{isCorrect ? "正确，句子完整了" : `答案是 ${question.target.term}`}</strong>
            <button onClick={continuePractice} type="button">
              {questionIndex + 1 === session.length ? "查看得分" : "下一题"}
            </button>
          </div>
        )}
      </section>
      <ReviewParagraph words={session.map((item) => item.target)} />
    </>
  );
}

function ReviewParagraph({ words }: { words: VocabularyWord[] }) {
  return (
    <section className="paragraph-card" aria-labelledby="paragraph-title">
      <div className="section-heading">
        <h2 id="paragraph-title">本组复习段落</h2>
        <span>{words.length} 个已学词</span>
      </div>
      <div className="paragraph-copy">
        {words.map((word) => (
          <p key={word.id}>{word.example}</p>
        ))}
      </div>
      <div className="context-word-chips" aria-label="段落重点词">
        {words.map((word) => (
          <button key={word.id} onClick={() => speak(word)} type="button">
            {word.term}
            <small>{word.meaning}</small>
          </button>
        ))}
      </div>
      <p className="paragraph-hint">先通读，再点重点词听发音。句子来自离线中英例句库。</p>
    </section>
  );
}
