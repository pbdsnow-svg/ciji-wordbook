import type { VocabularyState, VocabularyWord } from "./types";

const seedWords: Array<
  Pick<
    VocabularyWord,
    "term" | "phonetic" | "meaning" | "example" | "exampleTranslation"
  >
> = [
  {
    term: "serendipity",
    phonetic: "/ˌserənˈdɪpəti/",
    meaning: "意外发现美好事物的运气",
    example: "Finding that quiet bookshop was pure serendipity.",
    exampleTranslation: "发现那家安静的书店纯属美好的偶然。",
  },
  {
    term: "resilient",
    phonetic: "/rɪˈzɪliənt/",
    meaning: "有韧性的；能迅速恢复的",
    example: "Small habits make a resilient learning routine.",
    exampleTranslation: "微小的习惯能构成有韧性的学习节奏。",
  },
  {
    term: "concise",
    phonetic: "/kənˈsaɪs/",
    meaning: "简明的；言简意赅的",
    example: "Keep each note concise enough to review quickly.",
    exampleTranslation: "让每条笔记足够简明，以便快速复习。",
  },
  {
    term: "immerse",
    phonetic: "/ɪˈmɜːrs/",
    meaning: "使沉浸；使专心投入",
    example: "Immerse yourself in English for ten minutes a day.",
    exampleTranslation: "每天让自己沉浸在英语中十分钟。",
  },
  {
    term: "retain",
    phonetic: "/rɪˈteɪn/",
    meaning: "记住；保留",
    example: "Spacing reviews helps you retain new words.",
    exampleTranslation: "间隔复习能帮助你记住新单词。",
  },
  {
    term: "subtle",
    phonetic: "/ˈsʌtl/",
    meaning: "微妙的；不易察觉的",
    example: "There is a subtle difference between the two phrases.",
    exampleTranslation: "这两个短语之间存在细微差别。",
  },
  {
    term: "deliberate",
    phonetic: "/dɪˈlɪbərət/",
    meaning: "深思熟虑的；有意的",
    example: "Deliberate practice is more useful than repetition alone.",
    exampleTranslation: "刻意练习比单纯重复更有效。",
  },
  {
    term: "momentum",
    phonetic: "/moʊˈmentəm/",
    meaning: "动力；势头",
    example: "One short session is enough to keep your momentum.",
    exampleTranslation: "一次短暂学习就足以保持你的势头。",
  },
];

export function createInitialState(now = new Date()): VocabularyState {
  const dueTime = new Date(now);
  dueTime.setSeconds(0, 0);

  return {
    words: seedWords.map((word, index) => ({
      id: `seed-${index + 1}`,
      ...word,
      createdAt: new Date(now.getTime() - index * 60_000).toISOString(),
      nextReviewAt: dueTime.toISOString(),
      stage: 0,
      reviewCount: 0,
    })),
    logs: [],
    settings: {
      dailyGoal: 8,
    },
  };
}
