import type {
  ReviewLog,
  ReviewRating,
  StudyMode,
  VocabularyState,
  VocabularyWord,
} from "./types";

const KNOW_INTERVALS_IN_DAYS = [1, 3, 7, 14, 30, 60, 120];
const FUZZY_INTERVALS_IN_HOURS = [8, 18, 36, 72, 168];

export interface ReviewResult {
  word: VocabularyWord;
  log: ReviewLog;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return addHours(date, days * 24);
}

export function reviewWord(
  word: VocabularyWord,
  rating: ReviewRating,
  now = new Date(),
  mode: StudyMode = "recognition",
): ReviewResult {
  let nextStage = word.stage;
  let nextReviewAt: Date;

  if (rating === "forgot") {
    nextStage = Math.max(0, word.stage - 1);
    nextReviewAt = addHours(now, 4);
  } else if (rating === "fuzzy") {
    nextStage = Math.max(1, word.stage);
    const fuzzyIndex = Math.min(nextStage - 1, FUZZY_INTERVALS_IN_HOURS.length - 1);
    nextReviewAt = addHours(now, FUZZY_INTERVALS_IN_HOURS[fuzzyIndex]);
  } else {
    nextStage = Math.min(word.stage + 1, KNOW_INTERVALS_IN_DAYS.length);
    const intervalIndex = Math.min(
      nextStage - 1,
      KNOW_INTERVALS_IN_DAYS.length - 1,
    );
    nextReviewAt = addDays(now, KNOW_INTERVALS_IN_DAYS[intervalIndex]);
  }

  return {
    word: {
      ...word,
      stage: nextStage,
      nextReviewAt: nextReviewAt.toISOString(),
      reviewCount: word.reviewCount + 1,
    },
    log: {
      id: `${word.id}-${now.getTime()}-${rating}`,
      wordId: word.id,
      rating,
      reviewedAt: now.toISOString(),
      mode,
    },
  };
}

export function getDueWords(
  state: VocabularyState,
  now = new Date(),
): VocabularyWord[] {
  return [...state.words]
    .filter((word) => new Date(word.nextReviewAt).getTime() <= now.getTime())
    .sort((a, b) => {
      const dueDifference =
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime();
      if (dueDifference !== 0) return dueDifference;
      return a.reviewCount - b.reviewCount;
    });
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getLogsForDay(
  logs: ReviewLog[],
  day = new Date(),
): ReviewLog[] {
  return logs.filter((log) => isSameLocalDay(new Date(log.reviewedAt), day));
}

export function getStreak(logs: ReviewLog[], today = new Date()): number {
  if (logs.length === 0) return 0;

  const activeDays = new Set(
    logs.map((log) => {
      const date = new Date(log.reviewedAt);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    }),
  );

  const cursor = new Date(today);
  cursor.setHours(12, 0, 0, 0);

  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!activeDays.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
    if (!activeDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getReviewCountsForLastSevenDays(
  logs: ReviewLog[],
  today = new Date(),
): Array<{ date: Date; count: number }> {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return {
      date,
      count: getLogsForDay(logs, date).length,
    };
  });
}
