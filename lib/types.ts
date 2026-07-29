export type ReviewRating = "forgot" | "fuzzy" | "know";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type StudyMode = "recognition" | "spelling" | "context";
export type VocabularySource = "seed" | "cefr" | "custom";

export interface WordBankEntry {
  id: string;
  term: string;
  phonetic: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: CEFRLevel;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb";
  frequency: number;
  hasAuthenticExample: boolean;
}

export interface StudyPlan {
  id: string;
  name: string;
  level: CEFRLevel;
  startDate: string;
  durationDays: number;
  dailyNewWords: number;
  createdAt: string;
}

export interface VocabularyWord {
  id: string;
  term: string;
  phonetic: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  createdAt: string;
  nextReviewAt: string;
  stage: number;
  reviewCount: number;
  level: CEFRLevel | "custom";
  source: VocabularySource;
  introducedAt: string;
  spellingAttempts: number;
  spellingCorrect: number;
  contextReviewCount: number;
}

export interface ReviewLog {
  id: string;
  wordId: string;
  rating: ReviewRating;
  reviewedAt: string;
  mode: StudyMode;
}

export interface AppSettings {
  dailyGoal: number;
  selectedLevel: CEFRLevel;
  activePlan: StudyPlan | null;
}

export interface VocabularyState {
  version: 2;
  words: VocabularyWord[];
  logs: ReviewLog[];
  settings: AppSettings;
}
