import { buildChoiceOptions, createCloze } from "./learning";
import { isSameLocalDay } from "./srs";
import type { VocabularyState, VocabularyWord } from "./types";

export const DIALOGUE_WORD_LIMIT = 40;
export const DIALOGUE_RETRY_GAP = 3;
export const DIALOGUE_MAX_ATTEMPTS = 3;

export type DialogueSpeaker = "Mia" | "Leo";
export type DialogueThemeId =
  | "daily-life"
  | "travel"
  | "work-study"
  | "food-shopping"
  | "people-feelings"
  | "news-ideas";

export interface DialogueTheme {
  id: DialogueThemeId;
  title: string;
  titleZh: string;
  setting: string;
  settingZh: string;
  mission: string;
  missionZh: string;
}

export interface DialogueScenario {
  primaryTheme: DialogueTheme;
  themes: DialogueTheme[];
  wordCount: number;
}

export interface DialogueLine {
  id: string;
  speaker: DialogueSpeaker;
  lead: string;
  leadTranslation: string;
  prompt: string;
  translation: string;
  word: VocabularyWord;
  theme: DialogueTheme;
  isSceneStart: boolean;
}

export interface DialogueScript {
  scenario: DialogueScenario;
  lines: DialogueLine[];
}

interface ThemeDefinition extends DialogueTheme {
  keywords: readonly string[];
}

const THEMES: readonly ThemeDefinition[] = [
  {
    id: "travel",
    title: "A Day Out",
    titleZh: "出门旅行",
    setting: "From departure to arrival",
    settingZh: "从出发到抵达",
    mission: "Make the plan, solve small problems, and reach the destination.",
    missionZh: "商量行程、处理途中问题并顺利抵达。",
    keywords: [
      "travel", "trip", "journey", "road", "route", "way", "hotel",
      "airport", "station", "train", "bus", "ticket", "passport",
      "flight", "arrive", "leave", "visit", "map", "luggage", "bag",
      "seat", "car", "drive", "walk", "city", "country", "beach",
      "holiday", "tour", "direction",
    ],
  },
  {
    id: "work-study",
    title: "A Shared Project",
    titleZh: "工作与学习",
    setting: "A quiet table with a plan to finish",
    settingZh: "一起完成计划的安静桌边",
    mission: "Discuss the task, exchange information, and agree on the next step.",
    missionZh: "讨论任务、交换信息并确定下一步。",
    keywords: [
      "work", "job", "office", "company", "business", "meeting", "plan",
      "project", "team", "report", "study", "school", "class", "teacher",
      "student", "book", "learn", "test", "exam", "question", "answer",
      "idea", "information", "section", "list", "number", "write", "read",
    ],
  },
  {
    id: "food-shopping",
    title: "Lunch and Errands",
    titleZh: "餐饮与购物",
    setting: "A café and the shops nearby",
    settingZh: "咖啡馆和附近商店",
    mission: "Choose what is needed, place an order, and keep to the budget.",
    missionZh: "挑选需要的东西、完成点单并控制预算。",
    keywords: [
      "food", "eat", "drink", "water", "coffee", "tea", "restaurant",
      "order", "buy", "sell", "money", "price", "shop", "shopping",
      "market", "store", "bread", "fruit", "dinner", "lunch", "breakfast",
      "meal", "cook", "kitchen", "bill", "pay",
    ],
  },
  {
    id: "people-feelings",
    title: "People We Care About",
    titleZh: "人物与感受",
    setting: "A relaxed conversation between friends",
    settingZh: "朋友之间的一次轻松交谈",
    mission: "Talk about people, feelings, and how to respond with care.",
    missionZh: "谈论身边的人和感受，并作出体贴回应。",
    keywords: [
      "family", "friend", "people", "person", "man", "woman", "child",
      "mother", "father", "parent", "love", "happy", "sad", "feel",
      "feeling", "kind", "help", "care", "life", "heart", "together",
      "thanks", "thank", "calm", "fun",
    ],
  },
  {
    id: "news-ideas",
    title: "Today’s Big Question",
    titleZh: "新闻与观点",
    setting: "A conversation after reading the news",
    settingZh: "读完新闻后交换看法",
    mission: "Separate facts from opinions and explain one clear point.",
    missionZh: "区分事实与观点，并说清一个看法。",
    keywords: [
      "world", "government", "law", "public", "social", "society", "change",
      "issue", "problem", "case", "news", "report", "country", "community",
      "policy", "history", "future", "research", "result", "reason", "fact",
      "opinion", "important",
    ],
  },
  {
    id: "daily-life",
    title: "An Ordinary Day",
    titleZh: "日常生活",
    setting: "From morning plans to the end of the day",
    settingZh: "从早晨安排到一天结束",
    mission: "Handle everyday decisions and keep the conversation moving.",
    missionZh: "处理日常决定，让交流自然推进。",
    keywords: [
      "home", "house", "room", "day", "time", "morning", "night", "sleep",
      "door", "clothes", "phone", "today", "tomorrow", "year", "week",
      "start", "stop", "go", "come", "make", "do", "need", "want", "now",
    ],
  },
] as const;

const THEME_BRIDGES: Record<
  DialogueThemeId,
  readonly { lead: string; translation: string }[]
> = {
  travel: [
    { lead: "For the next part of the trip:", translation: "说到接下来的行程：" },
    { lead: "That changes our route. I would say:", translation: "这会影响路线，我会这样说：" },
  ],
  "work-study": [
    { lead: "For our shared task:", translation: "说到我们共同的任务：" },
    { lead: "That helps the plan. My next point is:", translation: "这有助于推进计划，我接着说：" },
  ],
  "food-shopping": [
    { lead: "Before we decide what to get:", translation: "决定买什么之前：" },
    { lead: "That works for me. I would add:", translation: "我觉得可以，我还想补充：" },
  ],
  "people-feelings": [
    { lead: "Thinking about the people involved:", translation: "想到这件事里的人：" },
    { lead: "I understand. My response would be:", translation: "我明白，我会这样回应：" },
  ],
  "news-ideas": [
    { lead: "Looking at the facts first:", translation: "先看看事实：" },
    { lead: "That is one view. Here is mine:", translation: "这是一种看法，我的看法是：" },
  ],
  "daily-life": [
    { lead: "For the next part of our day:", translation: "说到今天接下来的安排：" },
    { lead: "That makes sense. Then I would say:", translation: "有道理，那我会接着说：" },
  ],
};

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

function containsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function scoreTheme(word: VocabularyWord, theme: ThemeDefinition): number {
  const term = word.term.toLowerCase();
  const example = word.example.toLowerCase();
  return theme.keywords.reduce((score, keyword) => {
    if (term === keyword) return score + 4;
    if (containsKeyword(term, keyword)) return score + 2;
    if (containsKeyword(example, keyword)) return score + 1;
    return score;
  }, 0);
}

export function getDialogueTheme(word: VocabularyWord): DialogueTheme {
  let bestTheme = THEMES[THEMES.length - 1];
  let bestScore = 0;

  for (const theme of THEMES) {
    const score = scoreTheme(word, theme);
    if (score > bestScore) {
      bestTheme = theme;
      bestScore = score;
    }
  }

  return bestTheme;
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
      const aTime = studyTimes.get(a.id) ?? new Date(a.introducedAt).getTime();
      const bTime = studyTimes.get(b.id) ?? new Date(b.introducedAt).getTime();
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

export function buildDialogueScript(words: VocabularyWord[]): DialogueScript {
  const classified = words
    .filter((word) => word.example.trim().length > 0)
    .map((word, originalIndex) => ({
      word,
      originalIndex,
      theme: getDialogueTheme(word),
    }));
  const counts = new Map<DialogueThemeId, number>();
  for (const item of classified) {
    counts.set(item.theme.id, (counts.get(item.theme.id) ?? 0) + 1);
  }
  const primaryTheme = [...THEMES].sort((a, b) => {
    return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
  })[0];
  const orderedThemeIds = [
    primaryTheme.id,
    ...THEMES.map((theme) => theme.id).filter(
      (themeId) => themeId !== primaryTheme.id && counts.has(themeId),
    ),
  ];
  const themeOrder = new Map(
    orderedThemeIds.map((themeId, index) => [themeId, index]),
  );
  classified.sort((a, b) => {
    return (
      (themeOrder.get(a.theme.id) ?? Number.MAX_SAFE_INTEGER) -
        (themeOrder.get(b.theme.id) ?? Number.MAX_SAFE_INTEGER) ||
      a.originalIndex - b.originalIndex
    );
  });

  let previousThemeId: DialogueThemeId | undefined;
  const lines = classified.map((item, index) => {
    const bridges = THEME_BRIDGES[item.theme.id];
    const bridge = bridges[index % bridges.length];
    const isSceneStart = item.theme.id !== previousThemeId;
    previousThemeId = item.theme.id;
    return {
      id: `dialogue-${item.word.id}`,
      speaker: index % 2 === 0 ? ("Mia" as const) : ("Leo" as const),
      lead: bridge.lead,
      leadTranslation: bridge.translation,
      prompt: createCloze(item.word.example, item.word.term),
      translation: item.word.exampleTranslation,
      word: item.word,
      theme: item.theme,
      isSceneStart,
    };
  });
  const themes = orderedThemeIds
    .map((themeId) => THEMES.find((theme) => theme.id === themeId))
    .filter((theme): theme is ThemeDefinition => Boolean(theme));

  return {
    scenario: {
      primaryTheme,
      themes,
      wordCount: lines.length,
    },
    lines,
  };
}

export function buildDialogueLines(words: VocabularyWord[]): DialogueLine[] {
  return buildDialogueScript(words).lines;
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
