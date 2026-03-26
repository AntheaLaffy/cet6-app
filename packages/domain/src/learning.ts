import type { LearningRecord, MasteryLevel, StudyTask, UserSettings, WrongItemRecord } from "./types";
import { clamp, createLocalId } from "@cet6/shared/index";

const masteryScale: MasteryLevel[] = ["陌生", "认识", "模糊", "基本掌握", "已掌握"];

export function updateMasteryLevel(current: MasteryLevel, verdict: "wrong" | "hard" | "good") {
  const index = masteryScale.indexOf(current);
  if (verdict === "wrong") {
    return masteryScale[Math.max(0, index - 1)];
  }
  if (verdict === "hard") {
    return masteryScale[clamp(index, 0, masteryScale.length - 1)];
  }
  return masteryScale[Math.min(masteryScale.length - 1, index + 1)];
}

export function createOrUpdateRecord(
  current: LearningRecord | null,
  input: {
    itemId: string;
    itemType: LearningRecord["itemType"];
    verdict: "wrong" | "hard" | "good";
    durationSeconds?: number;
    tags?: string[];
  }
): LearningRecord {
  const base: LearningRecord =
    current ??
    ({
      itemId: input.itemId,
      itemType: input.itemType,
      attempts: 0,
      masteryLevel: "陌生",
      wrongCount: 0,
      lastReviewedAt: null,
      timeSpent: 0,
      tags: input.tags ?? []
    } satisfies LearningRecord);

  return {
    ...base,
    attempts: base.attempts + 1,
    masteryLevel: updateMasteryLevel(base.masteryLevel, input.verdict),
    wrongCount: base.wrongCount + (input.verdict === "wrong" ? 1 : 0),
    lastReviewedAt: new Date().toISOString(),
    timeSpent: base.timeSpent + (input.durationSeconds ?? 0),
    tags: Array.from(new Set([...(base.tags ?? []), ...(input.tags ?? [])]))
  };
}

export function createOrUpdateWrongItem(
  current: WrongItemRecord | null,
  input: Pick<WrongItemRecord, "itemId" | "itemType" | "title" | "sourceLabel">
): WrongItemRecord {
  if (!current) {
    return {
      id: createLocalId("wrong"),
      itemId: input.itemId,
      itemType: input.itemType,
      title: input.title,
      sourceLabel: input.sourceLabel,
      occurrences: 1,
      lastWrongAt: new Date().toISOString(),
      resolved: false
    };
  }

  return {
    ...current,
    occurrences: current.occurrences + 1,
    lastWrongAt: new Date().toISOString(),
    resolved: false
  };
}

export function resolveWrongItem(current: WrongItemRecord) {
  return {
    ...current,
    resolved: true
  };
}

export function buildTodayTasks(settings: UserSettings): StudyTask[] {
  const today = new Date().toISOString().slice(0, 10);
  const totalMinutes = settings.dailyMinutes;
  const examWeight = Math.max(20, Math.round(totalMinutes * 0.45));
  const vocabWeight = Math.max(15, Math.round(totalMinutes * 0.3));
  const specialWeight = Math.max(10, totalMinutes - examWeight - vocabWeight);

  return [
    {
      id: "task-vocab",
      type: "vocab",
      title: "今日词汇复习",
      sourceId: "vocab-due",
      estimatedMinutes: vocabWeight,
      scheduledDate: today,
      status: "未开始"
    },
    {
      id: "task-special",
      type: "special",
      title: "今日专项强化",
      sourceId: settings.weakModules[0] ?? "translation",
      estimatedMinutes: specialWeight,
      scheduledDate: today,
      status: "未开始"
    },
    {
      id: "task-exam",
      type: "exam-paper",
      title: "今日真题推进",
      sourceId: "recent-exam",
      estimatedMinutes: examWeight,
      scheduledDate: today,
      status: "未开始"
    }
  ];
}
