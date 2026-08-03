import wordBankData from "./cefr-bank.generated.json";
import { isSameLocalDay } from "./srs";
import type {
  CEFRLevel,
  StudyPlan,
  VocabularyState,
  VocabularyWord,
  WordBankEntry,
} from "./types";

export const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const WORD_BANK = wordBankData as WordBankEntry[];

export const LEVEL_COPY: Record<
  CEFRLevel,
  { title: string; description: string }
> = {
  A1: { title: "入门", description: "生活中最基础的词汇" },
  A2: { title: "基础", description: "熟悉话题与日常表达" },
  B1: { title: "中级", description: "工作、旅行与观点表达" },
  B2: { title: "中高级", description: "更自然地理解和交流" },
  C1: { title: "高级", description: "复杂文本与精准表达" },
  C2: { title: "精通", description: "细腻语义与专业语境" },
};

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getLocalDayKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeSpelling(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
}

export function isSpellingCorrect(answer: string, term: string): boolean {
  return normalizeSpelling(answer) === normalizeSpelling(term);
}

export function createStudyPlan(
  input: Pick<StudyPlan, "name" | "level" | "durationDays" | "dailyNewWords">,
  now = new Date(),
): StudyPlan {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `plan-${now.getTime()}`;
  return {
    ...input,
    id,
    startDate: startOfLocalDay(now).toISOString(),
    createdAt: now.toISOString(),
  };
}

export function getPlanDay(plan: StudyPlan, now = new Date()): number {
  const start = startOfLocalDay(new Date(plan.startDate)).getTime();
  const today = startOfLocalDay(now).getTime();
  return Math.max(1, Math.floor((today - start) / 86_400_000) + 1);
}

export function getPlanMetrics(
  plan: StudyPlan,
  state: VocabularyState,
  now = new Date(),
) {
  const target = plan.durationDays * plan.dailyNewWords;
  const introduced = state.words.filter(
    (word) =>
      word.source === "cefr" &&
      new Date(word.introducedAt).getTime() >= new Date(plan.startDate).getTime(),
  ).length;
  const day = getPlanDay(plan, now);
  return {
    target,
    introduced,
    day,
    remainingDays: Math.max(plan.durationDays - day + 1, 0),
    percent: Math.min(100, Math.round((introduced / Math.max(target, 1)) * 100)),
    isComplete: introduced >= target,
    isExpired: day > plan.durationDays,
  };
}

export function getAvailableWordCount(
  level: CEFRLevel,
  state?: VocabularyState,
): number {
  const maxLevelIndex = CEFR_LEVELS.indexOf(level);
  const existingTerms = new Set(
    state?.words.map((word) => normalizeSpelling(word.term)) ?? [],
  );
  return WORD_BANK.filter(
    (entry) =>
      CEFR_LEVELS.indexOf(entry.level) <= maxLevelIndex &&
      !existingTerms.has(normalizeSpelling(entry.term)),
  ).length;
}

export function ensureDailyWords(
  state: VocabularyState,
  now = new Date(),
): VocabularyState {
  const activePlan = state.settings.activePlan;
  const level = activePlan?.level ?? state.settings.selectedLevel;
  const dailyTarget = activePlan?.dailyNewWords ?? state.settings.dailyGoal;
  const introducedToday = state.words.filter(
    (word) =>
      (word.source === "cefr" || word.source === "seed") &&
      isSameLocalDay(new Date(word.introducedAt), now),
  ).length;
  const missing = Math.max(dailyTarget - introducedToday, 0);
  if (missing === 0) return state;

  if (activePlan) {
    const metrics = getPlanMetrics(activePlan, state, now);
    if (metrics.isComplete || metrics.isExpired) return state;
  }

  const existingTerms = new Set(
    state.words.map((word) => normalizeSpelling(word.term)),
  );
  const maxLevelIndex = CEFR_LEVELS.indexOf(level);
  const candidates = WORD_BANK.filter(
    (entry) =>
      CEFR_LEVELS.indexOf(entry.level) <= maxLevelIndex &&
      !existingTerms.has(normalizeSpelling(entry.term)),
  ).sort((a, b) => {
    const levelDifference =
      CEFR_LEVELS.indexOf(b.level) - CEFR_LEVELS.indexOf(a.level);
    return levelDifference || b.frequency - a.frequency;
  });

  let limit = missing;
  if (activePlan) {
    const metrics = getPlanMetrics(activePlan, state, now);
    limit = Math.min(limit, Math.max(metrics.target - metrics.introduced, 0));
  }

  const timestamp = now.toISOString();
  const additions: VocabularyWord[] = candidates.slice(0, limit).map((entry) => ({
    id: entry.id,
    term: entry.term,
    phonetic: entry.phonetic,
    meaning: entry.meaning,
    example: entry.example,
    exampleTranslation: entry.exampleTranslation,
    createdAt: timestamp,
    introducedAt: timestamp,
    nextReviewAt: timestamp,
    stage: 0,
    reviewCount: 0,
    level: entry.level,
    source: "cefr",
    spellingAttempts: 0,
    spellingCorrect: 0,
    contextReviewCount: 0,
  }));

  if (additions.length === 0) return state;
  return { ...state, words: [...additions, ...state.words] };
}

export function getDailyLearningProgress(
  state: VocabularyState,
  now = new Date(),
): { target: number; introduced: number; completed: number } {
  const target =
    state.settings.activePlan?.dailyNewWords ?? state.settings.dailyGoal;
  const targetWordIds = new Set(
    state.words
      .filter(
        (word) =>
          (word.source === "cefr" || word.source === "seed") &&
          isSameLocalDay(new Date(word.introducedAt), now),
      )
      .map((word) => word.id),
  );
  const completedWordIds = new Set(
    state.logs
      .filter(
        (log) =>
          log.mode === "spelling" &&
          targetWordIds.has(log.wordId) &&
          isSameLocalDay(new Date(log.reviewedAt), now),
      )
      .map((log) => log.wordId),
  );
  return {
    target,
    introduced: targetWordIds.size,
    completed: completedWordIds.size,
  };
}

export function createCloze(example: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`\\b${escaped}\\b`, "gi");
  return example.replace(matcher, "＿＿＿＿");
}

export function selectContextWords(
  state: VocabularyState,
  count = 4,
): VocabularyWord[] {
  return [...state.words]
    .filter((word) => word.reviewCount > 0 && word.example.trim().length > 0)
    .sort((a, b) => {
      if (a.contextReviewCount !== b.contextReviewCount) {
        return a.contextReviewCount - b.contextReviewCount;
      }
      return new Date(b.introducedAt).getTime() - new Date(a.introducedAt).getTime();
    })
    .slice(0, count);
}

function stableChoiceScore(value: string): number {
  return [...value].reduce(
    (score, character) => (score * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
}

export function buildChoiceOptions(
  target: VocabularyWord,
  pool: VocabularyWord[],
  count = 4,
): VocabularyWord[] {
  const seenTerms = new Set([normalizeSpelling(target.term)]);
  const distractors = [...pool]
    .filter((word) => word.id !== target.id)
    .sort((a, b) => {
      const sameLevelA = a.level === target.level ? 0 : 1;
      const sameLevelB = b.level === target.level ? 0 : 1;
      return (
        sameLevelA - sameLevelB ||
        stableChoiceScore(`${target.id}:${a.id}`) -
          stableChoiceScore(`${target.id}:${b.id}`)
      );
    })
    .filter((word) => {
      const normalized = normalizeSpelling(word.term);
      if (seenTerms.has(normalized)) return false;
      seenTerms.add(normalized);
      return true;
    })
    .slice(0, Math.max(0, count - 1));

  return [target, ...distractors].sort(
    (a, b) =>
      stableChoiceScore(`${target.id}:position:${a.id}`) -
      stableChoiceScore(`${target.id}:position:${b.id}`),
  );
}
