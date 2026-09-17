export type IeltsSkill =
  | "vocabulary"
  | "grammar"
  | "listening"
  | "reading"
  | "speaking"
  | "writing"
  | "review"
  | "mock";

export type IeltsAction = "vocabulary" | "reading" | "review" | "workspace";

export interface IeltsTask {
  id: string;
  skill: IeltsSkill;
  minutes: number;
  title: string;
  outcome: string;
  steps: string[];
  action: IeltsAction;
  wordTarget?: number;
}

export interface IeltsDayPlan {
  day: number;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  focus: string;
  tasks: IeltsTask[];
  checkpoint?: "baseline" | "day15" | "day30";
}

export interface IeltsScore {
  listening?: number;
  reading?: number;
  note?: string;
}

export interface IeltsTrainingState {
  version: 1;
  currentDay: number;
  startedAt: string;
  completed: Record<string, string[]>;
  notes: Record<string, string>;
  nightSentences: Record<string, string>;
  scores: Partial<Record<"baseline" | "day15" | "day30", IeltsScore>>;
}

const GRAMMAR_TOPICS = [
  ["句子主干", "先圈谓语，再找主语和宾语", "把修饰语暂时括起来，只读主干"],
  ["核心时态", "对比一般过去、现在与将来", "用今天的经历各造一个句子"],
  ["现在完成时", "区分 have done 与 did", "写两句与学习经历有关的例句"],
  ["被动语态", "找出 be + 过去分词", "把一个主动句改成被动句"],
  ["定语从句", "标出 who / which / that 的指代", "拆成两个短句再合并"],
  ["名词性从句", "识别 that / whether / what 引导的成分", "写一个观点句"],
  ["状语从句", "识别原因、让步与条件", "用 although 或 because 扩展句子"],
] as const;

const PARAPHRASE_SETS = [
  "important → significant / crucial / essential",
  "decrease → decline / drop / fall / reduce",
  "increase → rise / grow / climb / expand",
  "problem → issue / challenge / difficulty",
  "show → indicate / reveal / demonstrate",
  "change → alter / shift / transform",
  "benefit → advantage / gain / positive effect",
  "cause → lead to / result in / contribute to",
] as const;

const SPEAKING_TOPICS = [
  "Work / Study",
  "Hometown",
  "Home",
  "Exercise",
  "Music",
  "Food",
  "Technology",
  "Friends",
  "Weekends",
] as const;

function task(
  id: string,
  skill: IeltsSkill,
  minutes: number,
  title: string,
  outcome: string,
  steps: string[],
  action: IeltsAction,
  wordTarget?: number,
): IeltsTask {
  return { id, skill, minutes, title, outcome, steps, action, wordTarget };
}

export function getIeltsDayPlan(dayInput: number): IeltsDayPlan {
  const day = Math.min(30, Math.max(1, Math.floor(dayInput)));

  if (day === 30) {
    return {
      day,
      phase: 4,
      phaseName: "阶段测评",
      focus: "严格计时，得到第一份可比较的听读成绩",
      checkpoint: "day30",
      tasks: [
        task("listening-mock", "mock", 40, "听力整套模拟", "完成 40 题并记录答案", ["使用自己合法持有的雅思真题", "全程不暂停、不查词", "做完后暂不对答案"], "workspace"),
        task("break", "review", 10, "离屏休息", "让注意力恢复后再进入阅读", ["离开屏幕", "喝水和活动", "不要查看答案或手机消息"], "workspace"),
        task("reading-mock", "mock", 60, "阅读严格计时", "60 分钟完成 40 题", ["不使用词典", "不会的题先标记再继续", "到点立即停笔"], "workspace"),
        task("score", "review", 10, "记录成绩与失分类型", "留下可用于下阶段调整的基线", ["录入听力与阅读正确题数", "各写一个主要失分原因", "确定下阶段最弱的一项"], "workspace"),
      ],
    };
  }

  if (day >= 24) {
    return {
      day,
      phase: 4,
      phaseName: "小冲刺",
      focus: "把单项训练接成接近考试的连续输出",
      tasks: [
        task("listening", "listening", 35, "听力 40 题训练", "完成一组连续题目并定位失分", ["计时完成", "核对答案", "把错因分为没听到、没反应、拼写错"], "workspace"),
        task("reading", "reading", 45, "阅读两篇计时", "在压力下保持定位和同义替换", ["先读题干关键词", "标出定位句", "为每道错题写出原文替换词"], "reading"),
        task("writing", "writing", 30, "Task 2 四段结构", "用逻辑完整的四段回答问题", ["写 Introduction", "写 Body 1 与 Body 2 的主题句", "写 Conclusion；先逻辑，后词汇"], "workspace"),
        task("review", "review", 10, "错题回收", "今天的错误不留到明天", ["重做最典型的 3 题", "写下一个可执行的改进动作"], "review"),
      ],
    };
  }

  if (day >= 16) {
    const speakingDay = day % 2 === 0;
    const topic = SPEAKING_TOPICS[(day - 16) % SPEAKING_TOPICS.length];
    return {
      day,
      phase: 3,
      phaseName: "雅思衔接",
      focus: "进入正式题型，同时保持基础能力恢复",
      tasks: [
        task("vocabulary", "vocabulary", 25, "主题词与同义替换", "把词汇变成听读定位和口笔语素材", ["复习旧词后学当天新词", `整理：${PARAPHRASE_SETS[(day - 16) % PARAPHRASE_SETS.length]}`, "每组至少口头造一个句子"], "vocabulary", 75),
        task("listening", "listening", 35, "雅思听力精练", "不仅对答案，还要知道为什么没听出来", ["先完整做一遍", "逐题定位错因", "选 2–3 分钟跟读并模仿重音"], "workspace"),
        task("reading", "reading", 35, "雅思阅读单篇", "用关键词和同义替换找到定位句", ["限时完成一篇", "每题圈题干关键词", "错题写出定位句和替换关系"], "reading"),
        task(
          "output",
          speakingDay ? "speaking" : "writing",
          25,
          speakingDay ? `口语 Part 1 · ${topic}` : "写作句子展开",
          speakingDay ? "每题连续回答 20–30 秒" : "把观点扩成解释和例子",
          speakingDay
            ? ["回答 3 个常见问题", "每个回答加入原因或例子", "录音回听一次，删掉一个卡顿点"]
            : ["写一句明确观点", "补一句原因解释", "再补一个具体例子"],
          "workspace",
        ),
      ],
    };
  }

  if (day === 15) {
    return {
      day,
      phase: 2,
      phaseName: "强化测评",
      focus: "用一次小测确认恢复速度，而不是凭感觉判断",
      checkpoint: "day15",
      tasks: [
        task("vocabulary", "vocabulary", 25, "高频词与替换复盘", "复习前两周最容易混淆的词", ["只复习到期词", "整理 5 组同义替换", "口头造句"], "vocabulary", 75),
        task("listening-test", "mock", 35, "听力 Section 1–2", "记录两部分正确题数", ["一次完成，不暂停", "核对答案", "按错因分类"], "workspace"),
        task("reading-test", "mock", 35, "阅读单篇计时", "记录一篇文章的正确题数", ["限时 30–35 分钟", "不查词", "写出每道错题的定位依据"], "reading"),
        task("review", "review", 25, "阶段复盘", "确定后半程最需要补的能力", ["录入听读成绩", "写出最大障碍", "选择一个下周改进动作"], "workspace"),
      ],
    };
  }

  if (day >= 8) {
    return {
      day,
      phase: 2,
      phaseName: "能力强化",
      focus: "提高词汇反应速度，开始雅思听读定位",
      tasks: [
        task("vocabulary", "vocabulary", 30, "词汇与同义替换", "看到词能快速反应，并认识常见替换", ["先完成旧词复习", "学习当天词汇的搭配和例句", `今日替换：${PARAPHRASE_SETS[(day - 8) % PARAPHRASE_SETS.length]}`], "vocabulary", 75),
        task("listening", "listening", 30, "听力 Section 1 / 2", "完成一节并吃透错题", ["完整做一遍", "对答案并定位原句", "把错误分为听音、反应或拼写问题"], "workspace"),
        task("reading", "reading", 35, "短篇阅读定位", "在 30–35 分钟内完成一篇", ["圈题干关键词", "找定位句", "标出题目与原文的同义替换"], "reading"),
        task("output", "speaking", 25, "口语复述与复盘", "把今天的输入变成自己的英语", ["用 3 句话复述阅读内容", "回答 2 个追问", "记录今天最常卡住的表达"], "workspace"),
      ],
    };
  }

  const grammar = GRAMMAR_TOPICS[day - 1];
  return {
    day,
    phase: 1,
    phaseName: "英语重启",
    focus: day === 1 ? "建立基线，重新找回英语感觉" : "恢复词汇、听力、句子和开口能力",
    checkpoint: day === 1 ? "baseline" : undefined,
    tasks: [
      task("vocabulary", "vocabulary", 30, "50 词：新词与旧词复习", "恢复看到英文就能反应的速度", ["先复习到期旧词", "新词同时记搭配和例句", "不要只背一个中文释义"], "vocabulary", 50),
      task("grammar", "grammar", 30, grammar[0], "看长句时先找到骨架", [grammar[1], grammar[2], "从今天的阅读中找一个同类句"], "workspace"),
      task("listening", "listening", 30, "可理解听力四遍法", "听懂六至八成材料并完成短跟读", ["第一遍不看字幕", "第二遍看英文字幕", "第三遍再次裸听", "跟读 2–3 分钟"], "workspace"),
      task("output", "speaking", 30, "阅读 15 分钟 + 开口 15 分钟", "能连续表达，不追求复杂", ["读一篇简短英文", "回答 3 个简单问题", "每题至少说 3 句"], "reading"),
    ],
  };
}

export function getPlanMinutes(plan: IeltsDayPlan): number {
  return plan.tasks.reduce((sum, item) => sum + item.minutes, 0);
}

export function createIeltsTrainingState(now = new Date()): IeltsTrainingState {
  return {
    version: 1,
    currentDay: 1,
    startedAt: now.toISOString(),
    completed: {},
    notes: {},
    nightSentences: {},
    scores: {},
  };
}

