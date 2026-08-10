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
  transition: string;
  transitionZh: string;
}

export interface DialoguePlotBeat {
  title: string;
  titleZh: string;
}

export interface DialogueStory {
  title: string;
  titleZh: string;
  premise: string;
  premiseZh: string;
  tension: string;
  tensionZh: string;
  resolution: string;
  resolutionZh: string;
  plotBeats: readonly DialoguePlotBeat[];
  clueFrames: readonly { lead: string; translation: string }[];
}

export interface DialogueScenario {
  primaryTheme: DialogueTheme;
  story: DialogueStory;
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
    transition: "A travel note changes where they need to go next.",
    transitionZh: "一条旅行信息改变了接下来的路线。",
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
    transition: "They turn to the task list and divide the work.",
    transitionZh: "两人开始核对任务清单并分配工作。",
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
    transition: "With the plan moving, they check the food and shopping notes.",
    transitionZh: "计划继续推进，两人开始核对餐饮和购物信息。",
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
    transition: "A personal message reveals how someone is feeling.",
    transitionZh: "一条私人消息让他们注意到当事人的感受。",
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
    transition: "The next section asks them to separate facts from opinions.",
    transitionZh: "接下来的内容需要他们区分事实和观点。",
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
    transition: "The recovered messages begin to reveal the shape of the day.",
    transitionZh: "恢复出的消息逐渐拼出这一天的安排。",
    keywords: [
      "home", "house", "room", "day", "time", "morning", "night", "sleep",
      "door", "clothes", "phone", "today", "tomorrow", "year", "week",
      "start", "stop", "go", "come", "make", "do", "need", "want", "now",
    ],
  },
] as const;

const STORIES: Record<DialogueThemeId, DialogueStory> = {
  travel: {
    title: "The Missing Itinerary",
    titleZh: "遗失的行程单",
    premise: "Mia and Leo are at the station when they find an itinerary with missing words.",
    premiseZh: "Mia 和 Leo 到达车站，却发现行程单上缺少了许多关键词。",
    tension: "Their train leaves soon. They must restore the notes before choosing the right route.",
    tensionZh: "列车即将出发，他们必须先补全信息，才能确定正确路线。",
    resolution: "The itinerary is complete, and the route finally makes sense.",
    resolutionZh: "行程单已经补全，正确路线也终于清楚了。",
    plotBeats: [
      { title: "Check departure", titleZh: "核对出发信息" },
      { title: "Rebuild the route", titleZh: "整理途中路线" },
      { title: "Handle the change", titleZh: "处理临时变化" },
      { title: "Reach the destination", titleZh: "确认顺利抵达" },
    ],
    clueFrames: [
      { lead: "The next itinerary note reads:", translation: "行程单的下一条写着：" },
      { lead: "I found another travel note:", translation: "我又找到一条旅行信息：" },
      { lead: "This recovered line may help:", translation: "这条恢复出的内容或许有帮助：" },
    ],
  },
  "work-study": {
    title: "The Last-Minute Presentation",
    titleZh: "最后一刻的汇报",
    premise: "Mia and Leo open their shared presentation and discover that key words have disappeared.",
    premiseZh: "Mia 和 Leo 打开共同准备的汇报，却发现许多关键词消失了。",
    tension: "The meeting starts soon. They need to restore every line and agree on who will present it.",
    tensionZh: "会议马上开始，他们需要补全内容并确认各自负责的部分。",
    resolution: "The missing lines are restored, and the presentation is ready to begin.",
    resolutionZh: "缺失内容已经恢复，这份汇报可以按时开始了。",
    plotBeats: [
      { title: "Recover the opening", titleZh: "找回汇报开场" },
      { title: "Organize the points", titleZh: "整理核心要点" },
      { title: "Confirm the roles", titleZh: "确认两人分工" },
      { title: "Finish the deck", titleZh: "完成最终汇报" },
    ],
    clueFrames: [
      { lead: "The next slide should say:", translation: "下一页应该写着：" },
      { lead: "I recovered another project line:", translation: "我恢复了另一条项目内容：" },
      { lead: "This note belongs in our presentation:", translation: "这条内容应该放进汇报：" },
    ],
  },
  "food-shopping": {
    title: "Dinner Before the Guests Arrive",
    titleZh: "客人到来前的晚餐",
    premise: "Mia and Leo are preparing a small dinner when their shopping messages become incomplete.",
    premiseZh: "Mia 和 Leo 正在准备一顿晚餐，购物消息却变得残缺不全。",
    tension: "The guests are on their way. They must restore the list, finish shopping, and place the order.",
    tensionZh: "客人已经在路上，他们必须补全清单、完成购物和点单。",
    resolution: "The list is complete, the order is placed, and dinner can begin on time.",
    resolutionZh: "清单和订单都已完成，晚餐可以准时开始了。",
    plotBeats: [
      { title: "Check the list", titleZh: "核对晚餐清单" },
      { title: "Choose what to buy", titleZh: "确定购物内容" },
      { title: "Place the order", titleZh: "完成最后点单" },
      { title: "Welcome the guests", titleZh: "准备迎接客人" },
    ],
    clueFrames: [
      { lead: "The next shopping message reads:", translation: "下一条购物消息写着：" },
      { lead: "I found another line on the list:", translation: "我又在清单上找到一条：" },
      { lead: "This message should help with dinner:", translation: "这条消息应该能帮助我们准备晚餐：" },
    ],
  },
  "people-feelings": {
    title: "The Unsent Voice Notes",
    titleZh: "没有发出的语音留言",
    premise: "Mia and Leo find a set of unfinished voice-note transcripts from a friend.",
    premiseZh: "Mia 和 Leo 发现了一组朋友没有发出的语音留言文字稿。",
    tension: "Important words are missing. They need to understand the message before deciding how to reply.",
    tensionZh: "留言里缺少了关键词，他们要先理解朋友的意思，再决定如何回应。",
    resolution: "The message is clear now, and they know how to reply with care.",
    resolutionZh: "留言的意思已经清楚，他们也知道该如何体贴地回复。",
    plotBeats: [
      { title: "Open the notes", titleZh: "打开语音留言" },
      { title: "Understand the feeling", titleZh: "理解其中感受" },
      { title: "Choose a response", titleZh: "商量如何回应" },
      { title: "Send the reply", titleZh: "完成体贴回复" },
    ],
    clueFrames: [
      { lead: "The next voice-note line says:", translation: "下一句语音留言是：" },
      { lead: "I recovered another part of the message:", translation: "我恢复了留言的另一部分：" },
      { lead: "This line may explain how they feel:", translation: "这句话也许能说明对方的感受：" },
    ],
  },
  "news-ideas": {
    title: "The Morning Edition",
    titleZh: "等待发布的晨间稿",
    premise: "Mia and Leo are checking a short news draft when several key words vanish.",
    premiseZh: "Mia 和 Leo 正在核对一篇短新闻稿，多个关键词却突然消失了。",
    tension: "The draft is due soon. They must restore the lines and keep facts separate from opinions.",
    tensionZh: "新闻稿即将提交，他们必须补全内容并区分事实与观点。",
    resolution: "The facts are clear, the missing words are back, and the edition is ready.",
    resolutionZh: "事实已经理清，缺失词也已补回，晨间稿可以发布了。",
    plotBeats: [
      { title: "Read the lead", titleZh: "核对新闻导语" },
      { title: "Restore the facts", titleZh: "补全事实信息" },
      { title: "Check each view", titleZh: "辨别不同观点" },
      { title: "Finish the edition", titleZh: "完成晨间稿件" },
    ],
    clueFrames: [
      { lead: "The next draft line reads:", translation: "新闻稿的下一句是：" },
      { lead: "I recovered another part of the report:", translation: "我恢复了报道的另一部分：" },
      { lead: "This line needs a careful fact check:", translation: "这句话需要仔细核对事实：" },
    ],
  },
  "daily-life": {
    title: "The Lost Chat History",
    titleZh: "丢失的聊天记录",
    premise: "Mia and Leo recover a day of messages, but many important words are missing.",
    premiseZh: "Mia 和 Leo 找回了一天的聊天记录，但很多重要单词都不见了。",
    tension: "They must restore the messages in order to understand what happened and finish the day’s plan.",
    tensionZh: "他们要补全消息，才能弄清发生了什么并完成当天安排。",
    resolution: "The chat history is complete, and the whole day finally fits together.",
    resolutionZh: "聊天记录已经补全，这一天的事情终于完整地串起来了。",
    plotBeats: [
      { title: "Recover the morning", titleZh: "恢复早间消息" },
      { title: "Rebuild the plan", titleZh: "理清当天安排" },
      { title: "Handle the change", titleZh: "处理临时变化" },
      { title: "Complete the day", titleZh: "拼回完整一天" },
    ],
    clueFrames: [
      { lead: "The next recovered message reads:", translation: "恢复出的下一条消息是：" },
      { lead: "I found another line in the chat:", translation: "我又在聊天记录里找到一句：" },
      { lead: "This missing message comes next:", translation: "接下来是这条缺失的消息：" },
    ],
  },
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
  const primaryTheme = classified.length
    ? [...THEMES].sort((a, b) => {
        return (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      })[0]
    : THEMES[THEMES.length - 1];
  const story = STORIES[primaryTheme.id];
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
    const clueFrame = story.clueFrames[index % story.clueFrames.length];
    const isSceneStart = item.theme.id !== previousThemeId;
    previousThemeId = item.theme.id;
    return {
      id: `dialogue-${item.word.id}`,
      speaker: index % 2 === 0 ? ("Mia" as const) : ("Leo" as const),
      lead: clueFrame.lead,
      leadTranslation: clueFrame.translation,
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
      story,
      themes,
      wordCount: lines.length,
    },
    lines,
  };
}

export function getDialoguePlotBeatIndex(
  resolvedCount: number,
  wordCount: number,
  beatCount = 4,
): number {
  if (beatCount <= 1 || wordCount <= 0) return 0;
  const wordsPerBeat = Math.max(1, Math.ceil(wordCount / beatCount));
  return Math.min(
    beatCount - 1,
    Math.floor(Math.max(0, resolvedCount) / wordsPerBeat),
  );
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
