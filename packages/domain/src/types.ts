export type MasteryLevel = "陌生" | "认识" | "模糊" | "基本掌握" | "已掌握";

export type TaskStatus = "未开始" | "进行中" | "已完成" | "暂停" | "跳过";

export type AppView = "dashboard" | "vocabulary" | "specials" | "exams" | "wrong" | "stats" | "settings";

export type StudyUnitType =
  | "vocab"
  | "special"
  | "exam-paper"
  | "reading"
  | "listening"
  | "translation"
  | "writing";

export interface TranslationItem {
  pos: string;
  text: string;
}

export interface ExampleItem {
  english: string;
  chinese?: string;
}

export interface RelWordItem {
  pos: string;
  text: string;
  translation: string;
}

export interface PhraseItem {
  text: string;
  translation: string;
}

export interface LexiconEntry {
  id: string;
  headWord: string;
  phonetics: {
    us: string;
    uk: string;
    common: string;
  };
  translations: TranslationItem[];
  examples: ExampleItem[];
  realExamExamples: Array<ExampleItem & { id: string; source: Record<string, unknown> }>;
  phrases: PhraseItem[];
  relWords: RelWordItem[];
  frequencyRank: number;
  sourceBooks: string[];
  hasExercise: boolean;
  exerciseCount: number;
}

export interface SpecialSection {
  id: string;
  title: string;
  body: string;
}

export interface SpecialCollection {
  id: string;
  title: string;
  sourceFile: string;
  sections: SpecialSection[];
}

export interface ContentResource {
  id: string;
  label: string;
  kind: "paper" | "analysis" | "document" | "note" | "other" | "audio";
  sourcePath: string;
  publicPath: string | null;
}

export interface ExamPaper {
  id: string;
  paperNo: number;
  title: string;
  resources: ContentResource[];
  notes: ContentResource[];
}

export interface ExamSession {
  id: string;
  label: string;
  yearMonth: string;
  isStructured: boolean;
  sharedResources: ContentResource[];
  papers: ExamPaper[];
  notes: string[];
}

export interface ArchiveSession {
  id: string;
  label: string;
  yearMonth: string;
  fileCount: number;
}

export interface StudyTask {
  id: string;
  type: StudyUnitType;
  title: string;
  sourceId: string;
  estimatedMinutes: number;
  scheduledDate: string;
  status: TaskStatus;
}

export interface LearningRecord {
  itemId: string;
  itemType: StudyUnitType;
  attempts: number;
  masteryLevel: MasteryLevel;
  wrongCount: number;
  lastReviewedAt: string | null;
  timeSpent: number;
  tags: string[];
}

export interface WrongItemRecord {
  id: string;
  itemId: string;
  itemType: StudyUnitType;
  title: string;
  sourceLabel: string;
  occurrences: number;
  lastWrongAt: string;
  resolved: boolean;
}

export interface UserSettings {
  examDate: string;
  dailyMinutes: number;
  weakModules: StudyUnitType[];
  mobilePinnedViews: AppView[];
}
