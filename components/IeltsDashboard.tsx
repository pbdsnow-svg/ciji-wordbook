"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createIeltsTrainingState,
  getIeltsDayPlan,
  type IeltsScore,
  type IeltsTask,
  type IeltsTrainingState,
} from "@/lib/ielts";

const STORAGE_KEY = "ciji-ielts-training-v1";

const SKILL_LABELS: Record<IeltsTask["skill"], string> = {
  vocabulary: "词汇",
  grammar: "语法",
  listening: "听力",
  reading: "阅读",
  speaking: "口语",
  writing: "写作",
  review: "复盘",
  mock: "模考",
};

const MONTHS = [
  ["第 1 月", "基础重建", "完成 30 天重启，得到听读基线"],
  ["第 2 月", "雅思全科", "熟悉题型，口语与写作进入稳定输出"],
  ["第 3 月", "专项提分", "用错题数据集中补最弱的两项"],
  ["第 4 月", "整套模考", "按考试节奏查漏补缺，决定报考时点"],
] as const;

function loadTrainingState(): IeltsTrainingState {
  if (typeof window === "undefined") return createIeltsTrainingState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createIeltsTrainingState();
    const parsed = JSON.parse(raw) as Partial<IeltsTrainingState>;
    return {
      version: 1,
      currentDay: Math.min(30, Math.max(1, Number(parsed.currentDay) || 1)),
      startedAt: parsed.startedAt ?? new Date().toISOString(),
      completed: parsed.completed ?? {},
      notes: parsed.notes ?? {},
      nightSentences: parsed.nightSentences ?? {},
      scores: parsed.scores ?? {},
    };
  } catch {
    return createIeltsTrainingState();
  }
}

function saveTrainingState(state: IeltsTrainingState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function TaskCard({
  task,
  completed,
  expanded,
  note,
  onExpand,
  onComplete,
  onNoteChange,
  onOpenVocabulary,
  onOpenReading,
  onOpenReview,
}: {
  task: IeltsTask;
  completed: boolean;
  expanded: boolean;
  note: string;
  onExpand: () => void;
  onComplete: () => void;
  onNoteChange: (value: string) => void;
  onOpenVocabulary: (target: number) => void;
  onOpenReading: () => void;
  onOpenReview: () => void;
}) {
  function openTool() {
    if (task.action === "vocabulary") {
      onOpenVocabulary(task.wordTarget ?? 50);
    } else if (task.action === "reading") {
      onOpenReading();
    } else if (task.action === "review") {
      onOpenReview();
    }
  }

  const hasTool = task.action !== "workspace";

  return (
    <article className={`ielts-task ${completed ? "is-complete" : ""}`}>
      <button
        aria-expanded={expanded}
        className="ielts-task-summary"
        onClick={onExpand}
        type="button"
      >
        <span className="task-time">{task.minutes}<small>分钟</small></span>
        <span className="task-copy">
          <small>{SKILL_LABELS[task.skill]}</small>
          <strong>{task.title}</strong>
          <span>{task.outcome}</span>
        </span>
        <span className="task-state" aria-hidden="true">
          {completed ? "✓" : expanded ? "−" : "+"}
        </span>
      </button>

      {expanded && (
        <div className="ielts-task-detail">
          <ol>
            {task.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <label className="training-note-field">
            <span>训练记录</span>
            <textarea
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="记下错因、表达或今天最卡的地方…"
              rows={3}
              value={note}
            />
          </label>
          <div className="task-actions">
            {hasTool && (
              <button className="secondary-button" onClick={openTool} type="button">
                {task.action === "vocabulary"
                  ? "进入背词"
                  : task.action === "reading"
                    ? "进入阅读"
                    : "进入复习"}
              </button>
            )}
            <button
              className={completed ? "task-undo-button" : "primary-button"}
              onClick={onComplete}
              type="button"
            >
              {completed ? "取消完成" : "完成这项训练"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ScorePanel({
  checkpoint,
  score,
  onChange,
}: {
  checkpoint: "baseline" | "day15" | "day30";
  score: IeltsScore;
  onChange: (score: IeltsScore) => void;
}) {
  const title = checkpoint === "baseline" ? "起点记录" : checkpoint === "day15" ? "第 15 天小测" : "第 30 天阶段成绩";
  return (
    <section className="score-panel" aria-labelledby={`score-${checkpoint}`}>
      <div>
        <p className="eyebrow">只记录，不评判</p>
        <h2 id={`score-${checkpoint}`}>{title}</h2>
      </div>
      <div className="score-inputs">
        <label>
          <span>听力正确题</span>
          <input
            inputMode="numeric"
            max={40}
            min={0}
            onChange={(event) => onChange({ ...score, listening: event.target.value === "" ? undefined : Number(event.target.value) })}
            placeholder="0–40"
            type="number"
            value={score.listening ?? ""}
          />
        </label>
        <label>
          <span>阅读正确题</span>
          <input
            inputMode="numeric"
            max={40}
            min={0}
            onChange={(event) => onChange({ ...score, reading: event.target.value === "" ? undefined : Number(event.target.value) })}
            placeholder="0–40"
            type="number"
            value={score.reading ?? ""}
          />
        </label>
      </div>
      <label className="training-note-field">
        <span>主要失分原因</span>
        <textarea
          onChange={(event) => onChange({ ...score, note: event.target.value })}
          placeholder="例如：同义替换反应慢、拼写丢分、时间不够…"
          rows={2}
          value={score.note ?? ""}
        />
      </label>
    </section>
  );
}

export function IeltsDashboard({
  onOpenVocabulary,
  onOpenReading,
  onOpenReview,
}: {
  onOpenVocabulary: (target: number) => void;
  onOpenReading: () => void;
  onOpenReview: () => void;
}) {
  const [state, setState] = useState<IeltsTrainingState | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showRoadmap, setShowRoadmap] = useState(false);

  useEffect(() => setState(loadTrainingState()), []);
  useEffect(() => {
    if (state) saveTrainingState(state);
  }, [state]);

  const plan = useMemo(() => getIeltsDayPlan(state?.currentDay ?? 1), [state?.currentDay]);
  if (!state) return <section className="screen ielts-screen" aria-busy="true" />;
  const trainingState = state;

  const dayKey = String(plan.day);
  const completedIds = trainingState.completed[dayKey] ?? [];
  const completedMinutes = plan.tasks
    .filter((item) => completedIds.includes(item.id))
    .reduce((sum, item) => sum + item.minutes, 0);
  const percent = Math.round((completedMinutes / 120) * 100);
  const allComplete = completedIds.length === plan.tasks.length;

  function update(next: IeltsTrainingState) {
    setState(next);
    saveTrainingState(next);
  }

  function toggleTask(taskId: string) {
    const nextCompleted = completedIds.includes(taskId)
      ? completedIds.filter((id) => id !== taskId)
      : [...completedIds, taskId];
    update({ ...trainingState, completed: { ...trainingState.completed, [dayKey]: nextCompleted } });
  }

  function setTaskNote(taskId: string, value: string) {
    update({ ...trainingState, notes: { ...trainingState.notes, [`${dayKey}:${taskId}`]: value } });
  }

  function finishDay() {
    if (!allComplete || plan.day === 30) return;
    update({ ...trainingState, currentDay: plan.day + 1 });
    setExpandedTask(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="screen ielts-screen" aria-labelledby="ielts-title">
      <header className="ielts-header">
        <div>
          <p className="eyebrow">雅思 7.0 目标 · 每日 120 分钟</p>
          <h1 id="ielts-title">Day {plan.day}</h1>
          <p>{plan.phaseName} · {plan.focus}</p>
        </div>
        <div className="day-seal" aria-label={`第 ${plan.day} 天，共 30 天`}>
          <strong>{plan.day}</strong><span>/30</span>
        </div>
      </header>

      <div className="ielts-progress" aria-label={`今日训练完成 ${percent}%`}>
        <div>
          <span>今天已完成</span>
          <strong>{completedMinutes}<small> / 120 分钟</small></strong>
        </div>
        <div className="progress-track" style={{ "--progress": `${percent}%` } as React.CSSProperties}><span /></div>
      </div>

      <div className="phase-strip" aria-label="30天阶段">
        {["重启", "强化", "衔接", "冲刺"].map((label, index) => (
          <span className={plan.phase === index + 1 ? "is-current" : plan.phase > index + 1 ? "is-past" : ""} key={label}>
            <b>{index + 1}</b>{label}
          </span>
        ))}
      </div>

      <div className="ielts-task-list">
        {plan.tasks.map((item) => (
          <TaskCard
            completed={completedIds.includes(item.id)}
            expanded={expandedTask === item.id}
            key={item.id}
            note={trainingState.notes[`${dayKey}:${item.id}`] ?? ""}
            onComplete={() => toggleTask(item.id)}
            onExpand={() => setExpandedTask(expandedTask === item.id ? null : item.id)}
            onNoteChange={(value) => setTaskNote(item.id, value)}
            onOpenReading={onOpenReading}
            onOpenReview={onOpenReview}
            onOpenVocabulary={onOpenVocabulary}
            task={item}
          />
        ))}
      </div>

      {plan.checkpoint && (
        <ScorePanel
          checkpoint={plan.checkpoint}
          onChange={(score) => update({ ...trainingState, scores: { ...trainingState.scores, [plan.checkpoint!]: score } })}
          score={trainingState.scores[plan.checkpoint] ?? {}}
        />
      )}

      <section className="night-english" aria-labelledby="night-title">
        <div>
          <span aria-hidden="true">3</span>
          <div>
            <h2 id="night-title">睡前 3 句英文</h2>
            <p>不用翻译腔，直接用英语回想今天。</p>
          </div>
        </div>
        <textarea
          aria-label="今天的三句英文"
          onChange={(event) => update({ ...trainingState, nightSentences: { ...trainingState.nightSentences, [dayKey]: event.target.value } })}
          placeholder={"Today I…\nI noticed that…\nTomorrow I will…"}
          rows={4}
          value={trainingState.nightSentences[dayKey] ?? ""}
        />
      </section>

      {plan.day < 30 ? (
        <button className="finish-day-button" disabled={!allComplete} onClick={finishDay} type="button">
          {allComplete ? `完成 Day ${plan.day}，进入下一天` : `完成全部训练后进入 Day ${plan.day + 1}`}
        </button>
      ) : (
        <div className="program-finish-note">
          <strong>{allComplete ? "第一阶段完成" : "完成今天四项严格测评"}</strong>
          <span>根据第 30 天成绩，再决定冲刺 6.5 还是 7.0 路线。</span>
        </div>
      )}

      <button className="roadmap-toggle" aria-expanded={showRoadmap} onClick={() => setShowRoadmap(!showRoadmap)} type="button">
        <span><strong>查看四个月总路线</strong><small>30 天重启只是第一阶段</small></span>
        <b aria-hidden="true">{showRoadmap ? "−" : "+"}</b>
      </button>
      {showRoadmap && (
        <ol className="month-roadmap">
          {MONTHS.map(([month, title, detail], index) => (
            <li className={index === 0 ? "is-active" : ""} key={month}>
              <span>{month}</span><div><strong>{title}</strong><small>{detail}</small></div>
            </li>
          ))}
        </ol>
      )}

      <p className="ielts-disclaimer">目标分数不是保证。第 15 天和第 30 天的真实成绩，才用于调整后续训练。</p>
    </section>
  );
}
