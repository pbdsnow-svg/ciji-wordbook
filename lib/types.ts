export type ReviewRating = "forgot" | "fuzzy" | "know";

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
}

export interface ReviewLog {
  id: string;
  wordId: string;
  rating: ReviewRating;
  reviewedAt: string;
}

export interface AppSettings {
  dailyGoal: number;
}

export interface VocabularyState {
  words: VocabularyWord[];
  logs: ReviewLog[];
  settings: AppSettings;
}
