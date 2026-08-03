import { WORD_BANK, normalizeSpelling } from "./learning";
import type { WordBankEntry } from "./types";

export type ReadingKind = "news" | "classic";

export interface DailyReading {
  id: string;
  kind: ReadingKind;
  title: string;
  titleTranslation: string;
  content: string;
  translation: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt?: string;
  level: string;
  note: string;
}

export interface ReaderDefinition {
  term: string;
  phonetic: string;
  meaning: string;
  bankEntry?: WordBankEntry;
  source: "cefr" | "ecdict";
}

const CLASSIC_READINGS: DailyReading[] = [
  {
    id: "classic-pride-prejudice",
    kind: "classic",
    title: "An Unexpected First Impression",
    titleTranslation: "一次意外的初印象",
    content:
      "At a country dance, Elizabeth Bennet meets the wealthy Mr. Darcy. He is quiet, proud, and unwilling to dance with people he does not know. Elizabeth hears one of his rude comments and decides that she dislikes him. Yet this awkward first meeting begins a much longer story. Both of them will have to question their quick judgments before they can understand each other clearly.",
    translation:
      "在一场乡村舞会上，伊丽莎白·班纳特遇见了富有的达西先生。他沉默、傲慢，也不愿与不认识的人跳舞。伊丽莎白听见他一句失礼的评论，便认定自己不喜欢他。然而，这次尴尬的初遇开启了一个漫长得多的故事。在真正理解彼此之前，他们都必须重新审视自己仓促的判断。",
    sourceName: "Pride and Prejudice · Jane Austen",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    level: "B1 分级改写",
    note: "根据 1813 年公共领域名著情节改写",
  },
  {
    id: "classic-alice",
    kind: "classic",
    title: "Down the Rabbit Hole",
    titleTranslation: "掉进兔子洞",
    content:
      "Alice is sitting beside her sister when a white rabbit runs past. The rabbit speaks, checks a watch, and worries that it is late. Curious, Alice follows it across a field and into a deep hole. She falls for a surprisingly long time, passing cupboards, maps, and pictures on the walls. Instead of turning back, she wonders what strange world may be waiting below.",
    translation:
      "爱丽丝正坐在姐姐身边，一只白兔忽然跑过。兔子会说话，还看了看怀表，担心自己迟到。爱丽丝十分好奇，跟着它穿过田野，钻进一个深洞。她下落了很久，沿途经过橱柜、地图和墙上的图画。她没有想着回头，反而猜想下面会有什么奇异的世界在等待她。",
    sourceName: "Alice's Adventures in Wonderland · Lewis Carroll",
    sourceUrl: "https://www.gutenberg.org/ebooks/11",
    level: "A2–B1 分级改写",
    note: "根据 1865 年公共领域名著情节改写",
  },
  {
    id: "classic-sherlock",
    kind: "classic",
    title: "A Visitor at Baker Street",
    titleTranslation: "贝克街的访客",
    content:
      "A worried visitor arrives at Baker Street with a problem that seems impossible. Sherlock Holmes does not begin by asking many questions. He studies the visitor's clothes, shoes, hands, and manner of speaking. From these small details, he discovers facts that surprise everyone in the room. To Holmes, careful observation is not a trick. It is a habit that turns ordinary evidence into a clear story.",
    translation:
      "一位忧心忡忡的访客来到贝克街，带来了一个看似无解的问题。夏洛克·福尔摩斯并没有先问许多问题，而是观察访客的衣服、鞋子、双手和说话方式。他从这些细小之处发现了令屋里所有人惊讶的事实。对福尔摩斯来说，仔细观察不是把戏，而是一种把普通线索串成清晰故事的习惯。",
    sourceName: "The Adventures of Sherlock Holmes · Arthur Conan Doyle",
    sourceUrl: "https://www.gutenberg.org/ebooks/1661",
    level: "B1 分级改写",
    note: "根据 1892 年公共领域名著人物与情节改写",
  },
  {
    id: "classic-secret-garden",
    kind: "classic",
    title: "The Locked Garden",
    titleTranslation: "上锁的花园",
    content:
      "Mary discovers a garden that has been locked for years. Branches cover the walls, and winter has left the ground cold and still. With the help of a friendly robin, she finds the hidden key and opens the door. Mary begins to care for the sleeping plants in secret. As green shoots return to the garden, patience and friendship slowly change her own lonely life as well.",
    translation:
      "玛丽发现了一座封闭多年的花园。树枝爬满围墙，冬天让土地变得寒冷而沉寂。在一只友善知更鸟的帮助下，她找到了藏起来的钥匙并打开了门。玛丽开始偷偷照料沉睡的植物。当绿色嫩芽重回花园时，耐心与友谊也慢慢改变了她孤独的生活。",
    sourceName: "The Secret Garden · Frances Hodgson Burnett",
    sourceUrl: "https://www.gutenberg.org/ebooks/17396",
    level: "A2–B1 分级改写",
    note: "根据 1911 年公共领域名著情节改写",
  },
  {
    id: "classic-time-machine",
    kind: "classic",
    title: "A Machine for Time",
    titleTranslation: "一台穿越时间的机器",
    content:
      "The Time Traveller gathers his friends around a strange machine of metal and crystal. He argues that time is another direction, much like length or height. If people can move through space, perhaps they can also move through time. His guests doubt him, but he calmly demonstrates a small model. It disappears before their eyes, leaving them uncertain whether they have witnessed science, magic, or a clever joke.",
    translation:
      "时间旅行者把朋友们召集到一台由金属和水晶制成的奇怪机器旁。他认为时间也是一个方向，就像长度或高度一样。既然人能在空间中移动，也许也能在时间中移动。客人们并不相信，但他镇定地演示了一个小模型。模型在众人眼前消失，让他们分不清自己见到的是科学、魔法，还是一个巧妙的玩笑。",
    sourceName: "The Time Machine · H. G. Wells",
    sourceUrl: "https://www.gutenberg.org/ebooks/35",
    level: "B1–B2 分级改写",
    note: "根据 1895 年公共领域名著情节改写",
  },
  {
    id: "classic-moby-dick",
    kind: "classic",
    title: "A Journey to the Sea",
    titleTranslation: "驶向大海",
    content:
      "Ishmael feels restless whenever life on land becomes too heavy. Rather than remain angry or unhappy, he chooses to go to sea. A voyage gives him movement, hard work, and the wide horizon. He does not travel as a wealthy passenger. He joins the crew and accepts the danger of life aboard a whaling ship. The decision leads him toward Captain Ahab and an unforgettable pursuit.",
    translation:
      "每当陆地生活变得过于沉重，以实玛利就会感到烦躁不安。他不愿一直愤怒或消沉，于是选择出海。航行带给他行动、劳作和开阔的地平线。他不是富有的乘客，而是加入船员，接受捕鲸船上生活的危险。这个决定让他遇见亚哈船长，也走向一场难忘的追逐。",
    sourceName: "Moby-Dick · Herman Melville",
    sourceUrl: "https://www.gutenberg.org/ebooks/2701",
    level: "B1–B2 分级改写",
    note: "根据 1851 年公共领域名著情节改写",
  },
  {
    id: "classic-great-expectations",
    kind: "classic",
    title: "A Frightening Meeting",
    titleTranslation: "一次可怕的相遇",
    content:
      "Young Pip visits the quiet churchyard where his parents are buried. Suddenly, an escaped prisoner appears among the graves. The man is cold, hungry, and desperate. He orders Pip to bring him food and a tool for cutting his chains. Pip is terrified, but he also sees the prisoner's suffering. That frightening encounter becomes the first secret in a life shaped by ambition, loyalty, and unexpected kindness.",
    translation:
      "年幼的皮普来到埋葬父母的安静墓园。突然，一名逃犯从墓碑间出现。这个男人又冷又饿，已经走投无路。他命令皮普带来食物和能割断锁链的工具。皮普非常害怕，却也看见了犯人的痛苦。这次可怕的相遇，成为他日后一段由抱负、忠诚和意外善意塑造的人生中的第一个秘密。",
    sourceName: "Great Expectations · Charles Dickens",
    sourceUrl: "https://www.gutenberg.org/ebooks/1400",
    level: "B1 分级改写",
    note: "根据 1861 年公共领域名著情节改写",
  },
  {
    id: "classic-wizard-oz",
    kind: "classic",
    title: "The Road to the Emerald City",
    titleTranslation: "通往翡翠城的路",
    content:
      "After a storm carries her house far from Kansas, Dorothy wants only to return home. She is told that the Wizard of Oz may be able to help. On the yellow road, she meets a scarecrow who wants a brain, a tin man who wants a heart, and a lion who wants courage. Each believes something important is missing, although their actions already reveal the qualities they hope to find.",
    translation:
      "一场暴风把多萝西的房子带离堪萨斯很远，她只想回家。有人告诉她，奥兹国的魔法师也许能帮忙。在黄色道路上，她遇见了想要大脑的稻草人、想要心的铁皮人和想要勇气的狮子。他们都相信自己缺少某种重要品质，可他们的行动其实早已显露出自己渴望得到的东西。",
    sourceName: "The Wonderful Wizard of Oz · L. Frank Baum",
    sourceUrl: "https://www.gutenberg.org/ebooks/55",
    level: "A2–B1 分级改写",
    note: "根据 1900 年公共领域名著情节改写",
  },
];

const OFFLINE_NEWS: DailyReading[] = [
  {
    id: "wikinews-africa-visit",
    kind: "news",
    title: "Pope Leo XIV visits four nations in Africa",
    titleTranslation: "教皇利奥十四世访问四个非洲国家",
    content:
      "Pope Leo XIV began a visit to four African nations after arriving in Algeria. The journey included meetings with religious leaders, government officials, and local communities. Discussions focused on peace, migration, education, and cooperation between different faiths. Large crowds gathered at several public events during the visit.",
    translation:
      "教皇利奥十四世抵达阿尔及利亚后，开始访问四个非洲国家。行程包括与宗教领袖、政府官员和当地社区会面。讨论重点涉及和平、移民、教育以及不同信仰之间的合作。访问期间，多场公开活动吸引了大批民众。",
    sourceName: "Wikinews",
    sourceUrl:
      "https://en.wikinews.org/wiki/Pope_Leo_XIV_visits_four_nations_in_Africa",
    publishedAt: "2026-04-24",
    level: "B1 新闻摘要",
    note: "离线新闻后备 · CC BY 4.0 · 内容经缩写",
  },
  {
    id: "wikinews-library-concert",
    kind: "news",
    title: "Library concert marks Women's History Month",
    titleTranslation: "图书馆音乐会纪念女性历史月",
    content:
      "A New York City library hosted a concert for Women's History Month. The performance featured music by women composers and brought together musicians, library visitors, and local residents. Organizers said the event aimed to make overlooked music easier for the public to discover and enjoy.",
    translation:
      "纽约市一家图书馆为女性历史月举办了一场音乐会。演出以女性作曲家的作品为主，让音乐家、图书馆访客和当地居民相聚一堂。组织者表示，这场活动旨在让公众更容易发现和欣赏那些曾被忽视的音乐。",
    sourceName: "Wikinews",
    sourceUrl:
      "https://en.wikinews.org/wiki/Musique_Libre_Femmes_plays_for_Women%27s_History_Month_at_Tompkins_Square_Library_in_New_York_City",
    publishedAt: "2026-03-24",
    level: "A2–B1 新闻摘要",
    note: "离线新闻后备 · CC BY 4.0 · 内容经缩写",
  },
  {
    id: "wikinews-oscars",
    kind: "news",
    title: "Film wins six awards including Best Picture",
    titleTranslation: "一部影片斩获包括最佳影片在内的六项大奖",
    content:
      "One Battle After Another became the leading winner at the Academy Awards. The film received six prizes, including Best Picture. Its success covered several areas of filmmaking, showing how acting, direction, and technical work can combine to shape one production.",
    translation:
      "《一场又一场的战斗》成为本届奥斯卡金像奖的最大赢家。影片共获得六个奖项，其中包括最佳影片。它在电影制作的多个领域取得成功，展现了表演、导演和技术工作如何共同塑造一部作品。",
    sourceName: "Wikinews",
    sourceUrl:
      "https://en.wikinews.org/wiki/%22One_Battle_After_Another%22_wins_6_Oscars_including_Best_Picture",
    publishedAt: "2026-03-21",
    level: "A2–B1 新闻摘要",
    note: "离线新闻后备 · CC BY 4.0 · 内容经缩写",
  },
];

function localDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getReadingDayIndex(date = new Date()): number {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000,
  );
}

export function getDailyClassic(date = new Date()): DailyReading {
  return CLASSIC_READINGS[getReadingDayIndex(date) % CLASSIC_READINGS.length];
}

export function getOfflineNews(date = new Date()): DailyReading {
  return OFFLINE_NEWS[getReadingDayIndex(date) % OFFLINE_NEWS.length];
}

function textFromHtml(value: string): string {
  const document = new DOMParser().parseFromString(value, "text/html");
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

async function translateToChinese(
  value: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(value)}&langpair=en%7Czh-CN`,
    { signal },
  );
  if (!response.ok) throw new Error("Translation unavailable");
  const result = (await response.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const translation = result.responseData?.translatedText?.trim();
  if (result.responseStatus !== 200 || !translation) {
    throw new Error("Translation unavailable");
  }
  return translation;
}

export async function fetchDailyNews(date = new Date()): Promise<DailyReading> {
  const cacheKey = `ciji-daily-news-${localDateKey(date)}`;
  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as DailyReading;
      if (parsed.titleTranslation && parsed.translation) return parsed;
      window.localStorage.removeItem(cacheKey);
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error("News feed unavailable");
    const xml = new DOMParser().parseFromString(await response.text(), "text/xml");
    const items = [...xml.querySelectorAll("item")]
      .map((item) => {
        const title = textFromHtml(item.querySelector("title")?.textContent ?? "");
        const description = textFromHtml(
          item.querySelector("description")?.textContent ?? "",
        );
        const sourceUrl = item.querySelector("link")?.textContent?.trim() ?? "";
        const publishedAt = item.querySelector("pubDate")?.textContent?.trim();
        return { title, description, sourceUrl, publishedAt };
      })
      .filter(
        (item) =>
          item.title.length > 0 &&
          item.description.split(/\s+/).length >= 18 &&
          item.sourceUrl.startsWith("https://"),
      );
    if (items.length === 0) throw new Error("No readable news item");
    const item = items[getReadingDayIndex(date) % Math.min(items.length, 10)];
    const [titleTranslation, translation] = await Promise.all([
      translateToChinese(item.title, controller.signal),
      translateToChinese(item.description, controller.signal),
    ]);
    const reading: DailyReading = {
      id: `nyt-${localDateKey(date)}`,
      kind: "news",
      title: item.title,
      titleTranslation,
      content: item.description,
      translation,
      sourceName: "The New York Times · World",
      sourceUrl: item.sourceUrl,
      publishedAt: item.publishedAt,
      level: "真实英文新闻",
      note: "RSS 标题与摘要 · 点击来源可阅读原文",
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(reading));
    return reading;
  } catch {
    return getOfflineNews(date);
  } finally {
    window.clearTimeout(timeout);
  }
}

export function tokenizeReading(text: string): Array<{
  value: string;
  isWord: boolean;
}> {
  return (text.match(/[A-Za-z]+(?:[’'][A-Za-z]+)*|[^A-Za-z’']+/g) ?? []).map(
    (value) => ({
      value,
      isWord: /^[A-Za-z]+(?:[’'][A-Za-z]+)*$/.test(value),
    }),
  );
}

export function getLookupCandidates(value: string): string[] {
  const word = normalizeSpelling(value).replace(/’/g, "'");
  const candidates = [word, word.replace(/'s$/, "")];
  if (word.endsWith("ies")) candidates.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    candidates.push(stem, `${stem}e`, stem.replace(/(.)\1$/, "$1"));
  }
  if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    candidates.push(stem, `${stem}e`, stem.replace(/(.)\1$/, "$1"));
  }
  if (word.endsWith("es")) candidates.push(word.slice(0, -2));
  if (word.endsWith("s")) candidates.push(word.slice(0, -1));
  return [...new Set(candidates.filter(Boolean))];
}

let lexiconPromise: Promise<Record<string, [string, string]>> | null = null;

export async function lookupReadingWord(
  value: string,
  lexiconUrl: string,
): Promise<ReaderDefinition | null> {
  const candidates = getLookupCandidates(value);
  const bankEntry = candidates
    .map((candidate) => WORD_BANK.find((entry) => entry.term === candidate))
    .find(Boolean);
  if (bankEntry) {
    return {
      term: bankEntry.term,
      phonetic: bankEntry.phonetic,
      meaning: bankEntry.meaning,
      bankEntry,
      source: "cefr",
    };
  }

  lexiconPromise ??= fetch(lexiconUrl).then(async (response) => {
    if (!response.ok) throw new Error("Reader lexicon unavailable");
    return (await response.json()) as Record<string, [string, string]>;
  });
  try {
    const lexicon = await lexiconPromise;
    for (const candidate of candidates) {
      const entry = lexicon[candidate];
      if (entry) {
        return {
          term: candidate,
          phonetic: entry[0],
          meaning: entry[1],
          source: "ecdict",
        };
      }
    }
  } catch {
    lexiconPromise = null;
  }
  return null;
}

export function sentenceForWord(content: string, word: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [content];
  const normalized = normalizeSpelling(word);
  return (
    sentences.find((sentence) =>
      tokenizeReading(sentence).some(
        (token) =>
          token.isWord && normalizeSpelling(token.value) === normalized,
      ),
    ) ?? content
  ).trim();
}
