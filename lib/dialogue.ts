import { buildChoiceOptions, createCloze } from "./learning";
import { isSameLocalDay } from "./srs";
import type { VocabularyState, VocabularyWord } from "./types";

export const DIALOGUE_WORD_LIMIT = 40;
export const DIALOGUE_RETRY_GAP = 3;
export const DIALOGUE_MAX_ATTEMPTS = 3;

export type DialogueSpeaker = "Mia" | "Leo";

export interface DialogueLine {
  id: string;
  speaker: DialogueSpeaker;
  lead: string;
  leadTranslation: string;
  prompt: string;
  translation: string;
  word: VocabularyWord;
}

const DIALOGUE_LEADS = [
  { lead: "Here is my next clue:", translation: "这是我的下一个线索：" },
  { lead: "Try this one:", translation: "试试这一句：" },
  { lead: "Now connect this idea:", translation: "现在把这个意思接起来：" },
  { lead: "I have another example:", translation: "我还有一个例句：" },
] as const;

function getFirstStudyTimeByWord(
  state: VocabularyState,
  day: Date,
): Map<string, number> {
  const studyTimes = new Map<string, number>();

  for (const log of state.logs) {
    if (log.mode === "context") continue;
    const reviewedAt = new Date(log.reviewedAt);
    if (!isSameLocalDay(reviewedAt, day)) continue;
    const timestamp = reviewedAt.getTime();
    const previous = studyTimes.get(log.wordId);
    if (previous === undefined || timestamp < previous) {
      studyTimes.set(log.wordId, timestamp);
    }
  }

  return studyTimes;
}

export function getTodayLearnedWords(
  state: VocabularyState,
  day = new Date(),
  offset = 0,
  limit = DIALOGUE_WORD_LIMIT,
): VocabularyWord[] {
  const studyTimes = getFirstStudyTimeByWord(state, day);

  return state.words
    .filter((word) => {
      if (studyTimes.has(word.id)) return true;
      return (
        word.reviewCount > 0 &&
        isSameLocalDay(new Date(word.introducedAt), day)
      );
    })
    .sort((a, b) => {
      const aTime =
        studyTimes.get(a.id) ?? new Date(a.introducedAt).getTime();
      const bTime =
        studyTimes.get(b.id) ?? new Date(b.introducedAt).getTime();
      return aTime - bTime || a.term.localeCompare(b.term);
    })
    .slice(Math.max(0, offset), Math.max(0, offset) + Math.max(0, limit));
}

export function getTodayLearnedWordCount(
  state: VocabularyState,
  day = new Date(),
): number {
  return getTodayLearnedWords(state, day, 0, Number.MAX_SAFE_INTEGER).length;
}

export function buildDialogueLines(words: VocabularyWord[]): DialogueLine[] {
  return words
    .filter((word) => word.example.trim().length > 0)
    .map((word, index) => {
      const copy = DIALOGUE_LEADS[index % DIALOGUE_LEADS.length];
      return {
        id: `dialogue-${word.id}`,
        speaker: index % 2 === 0 ? "Mia" : "Leo",
        lead: copy.lead,
        leadTranslation: copy.translation,
        prompt: createCloze(word.example, word.term),
        translation: word.exampleTranslation,
        word,
      };
    });
}

export function buildDialogueChoices(
  target: VocabularyWord,
  pool: VocabularyWord[],
): VocabularyWord[] {
  return buildChoiceOptions(target, pool, 4);
}

export function advanceDialogueQueue(
  queue: string[],
  correct: boolean,
  attemptCount: number,
  retryGap = DIALOGUE_RETRY_GAP,
): string[] {
  if (queue.length === 0) return [];
  const [currentId, ...remaining] = queue;

  if (correct || attemptCount >= DIALOGUE_MAX_ATTEMPTS) {
    return remaining;
  }

  const insertionIndex = Math.min(Math.max(0, retryGap), remaining.length);
  return [
    ...remaining.slice(0, insertionIndex),
    currentId,
    ...remaining.slice(insertionIndex),
  ];
}
