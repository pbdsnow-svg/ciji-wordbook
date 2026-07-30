import { WORD_BANK, normalizeSpelling } from "./learning";
import type { WordBankEntry } from "./types";

export type ReadingKind = "news" | "classic";

export interface DailyReading {
  id: string;
  kind: ReadingKind;
  title: string;
  content: string;
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
    content:
      "At a country dance, Elizabeth Bennet meets the wealthy Mr. Darcy. He is quiet, proud, and unwilling to dance with people he does not know. Elizabeth hears one of his rude comments and decides that she dislikes him. Yet this awkward first meeting begins a much longer story. Both of them will have to question their quick judgments before they can understand each other clearly.",
    sourceName: "Pride and Prejudice · Jane Austen",
    sourceUrl: "https://www.gutenberg.org/ebooks/1342",
    level: "B1 分级改写",
    note: "根据 1813 年公共领域名著情节改写",
  },
  {
    id: "classic-alice",
    kind: "classic",
    title: "Down the Rabbit Hole",
    content:
      "Alice is sitting beside her sister when a white rabbit runs past. The rabbit speaks, checks a watch, and worries that it is late. Curious, Alice follows it across a field and into a deep hole. She falls for a surprisingly long time, passing cupboards, maps, and pictures on the walls. Instead of turning back, she wonders what strange world may be waiting below.",
    sourceName: "Alice's Adventures in Wonderland · Lewis Carroll",
    sourceUrl: "https://www.gutenberg.org/ebooks/11",
    level: "A2–B1 分级改写",
    note: "根据 1865 年公共领域名著情节改写",
  },
  {
    id: "classic-sherlock",
    kind: "classic",
    title: "A Visitor at Baker Street",
    content:
      "A worried visitor arrives at Baker Street with a problem that seems impossible. Sherlock Holmes does not begin by asking many questions. He studies the visitor's clothes, shoes, hands, and manner of speaking. From these small details, he discovers facts that surprise everyone in the room. To Holmes, careful observation is not a trick. It is a habit that turns ordinary evidence into a clear story.",
    sourceName: "The Adventures of Sherlock Holmes · Arthur Conan Doyle",
    sourceUrl: "https://www.gutenberg.org/ebooks/1661",
    level: "B1 分级改写",
    note: "根据 1892 年公共领域名著人物与情节改写",
  },
  {
    id: "classic-secret-garden",
    kind: "classic",
    title: "The Locked Garden",
    content:
      "Mary discovers a garden that has been locked for years. Branches cover the walls, and winter has left the ground cold and still. With the help of a friendly robin, she finds the hidden key and opens the door. Mary begins to care for the sleeping plants in secret. As green shoots return to the garden, patience and friendship slowly change her own lonely life as well.",
    sourceName: "The Secret Garden · Frances Hodgson Burnett",
    sourceUrl: "https://www.gutenberg.org/ebooks/17396",
    level: "A2–B1 分级改写",
    note: "根据 1911 年公共领域名著情节改写",
  },
  {
    id: "classic-time-machine",
    kind: "classic",
    title: "A Machine for Time",
    content:
      "The Time Traveller gathers his friends around a strange machine of metal and crystal. He argues that time is another direction, much like length or height. If people can move through space, perhaps they can also move through time. His guests doubt him, but he calmly demonstrates a small model. It disappears before their eyes, leaving them uncertain whether they have witnessed science, magic, or a clever joke.",
    sourceName: "The Time Machine · H. G. Wells",
    sourceUrl: "https://www.gutenberg.org/ebooks/35",
    level: "B1–B2 分级改写",
    note: "根据 1895 年公共领域名著情节改写",
  },
  {
    id: "classic-moby-dick",
    kind: "classic",
    title: "A Journey to the Sea",
    content:
      "Ishmael feels restless whenever life on land becomes too heavy. Rather than remain angry or unhappy, he chooses to go to sea. A voyage gives him movement, hard work, and the wide horizon. He does not travel as a wealthy passenger. He joins the crew and accepts the danger of life aboard a whaling ship. The decision leads him toward Captain Ahab and an unforgettable pursuit.",
    sourceName: "Moby-Dick · Herman Melville",
    sourceUrl: "https://www.gutenberg.org/ebooks/2701",
    level: "B1–B2 分级改写",
    note: "根据 1851 年公共领域名著情节改写",
  },
  {
    id: "classic-great-expectations",
    kind: "classic",
    title: "A Frightening Meeting",
    content:
      "Young Pip visits the quiet churchyard where his parents are buried. Suddenly, an escaped prisoner appears among the graves. The man is cold, hungry, and desperate. He orders Pip to bring him food and a tool for cutting his chains. Pip is terrified, but he also sees the prisoner's suffering. That frightening encounter becomes the first secret in a life shaped by ambition, loyalty, and unexpected kindness.",
    sourceName: "Great Expectations · Charles Dickens",
    sourceUrl: "https://www.gutenberg.org/ebooks/1400",
    level: "B1 分级改写",
    note: "根据 1861 年公共领域名著情节改写",
  },
  {
    id: "classic-wizard-oz",
    kind: "classic",
    title: "The Road to the Emerald City",
    content:
      "After a storm carries her house far from Kansas, Dorothy wants only to return home. She is told that the Wizard of Oz may be able to help. On the yellow road, she meets a scarecrow who wants a brain, a tin man who wants a heart, and a lion who wants courage. Each believes something important is missing, although their actions already reveal the qualities they hope to find.",
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
    content:
      "Pope Leo XIV began a visit to four African nations after arriving in Algeria. The journey included meetings with religious leaders, government officials, and local communities. Discussions focused on peace, migration, education, and cooperation between different faiths. Large crowds gathered at several public events during the visit.",
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
    content:
      "A New York City library hosted a concert for Women's History Month. The performance featured music by women composers and brought together musicians, library visitors, and local residents. Organizers said the event aimed to make overlooked music easier for the public to discover and enjoy.",
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
    content:
      "One Battle After Another became the leading winner at the Academy Awards. The film received six prizes, including Best Picture. Its success covered several areas of filmmaking, showing how acting, direction, and technical work can combine to shape one production.",
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

export async function fetchDailyNews(date = new Date()): Promise<DailyReading> {
  const cacheKey = `ciji-daily-news-${localDateKey(date)}`;
  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as DailyReading;
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
    const reading: DailyReading = {
      id: `nyt-${localDateKey(date)}`,
      kind: "news",
      title: item.title,
      content: item.description,
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
