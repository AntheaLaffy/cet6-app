import { useEffect, useMemo, useRef, useState } from "react";
import { buildTodayTasks, createOrUpdateRecord, createOrUpdateWrongItem, resolveWrongItem } from "@cet6/domain/learning";
import type {
  AppView,
  LearningRecord,
  StudyTask,
  TaskStatus,
  UserSettings,
  WrongItemRecord
} from "@cet6/domain/types";
import { loadExams, loadOverview, loadSpecials, loadVocabulary } from "@cet6/content/loaders";
import type { ExamsPayload, OverviewPayload, SpecialsPayload, VocabularyPayload } from "@cet6/content/types";
import { LocalFileImportSourceAdapter } from "@cet6/media/localFileImportSource";
import { materializeBindings } from "@cet6/media/matching";
import type { AudioBinding, MediaAsset } from "@cet6/media/types";
import { mediaBindingRepository, mediaRepository, progressRepository, settingsRepository, taskRepository, wrongItemRepository } from "@cet6/storage";
import { formatDateLabel, formatMonthLabel } from "@cet6/shared/index";
import { StatusPill } from "@cet6/ui";
import { ALL_APP_VIEWS, mobileNavIcons, mobileNavLabels, mobileNavTitles, normalizeMobilePinnedViews } from "./mobileNav";
import { DashboardView } from "./views/DashboardView";
import { ExamsView } from "./views/ExamsView";
import { SettingsView } from "./views/SettingsView";
import { SpecialsView } from "./views/SpecialsView";
import { StatsView } from "./views/StatsView";
import { VocabularyView } from "./views/VocabularyView";
import { WrongItemsView } from "./views/WrongItemsView";

type ImportedMediaAsset = MediaAsset & { blob?: Blob };
type NavTransition = {
  from: AppView;
  to: AppView;
  direction: "previous" | "next";
  phase: "drag" | "idle" | "active";
  dragOffset: number;
};

type TapTransition = {
  direction: "previous" | "next";
  phase: "idle" | "active";
};

const defaultSettings: UserSettings = {
  examDate: `${new Date().getFullYear()}-12-14`,
  dailyMinutes: 80,
  weakModules: ["translation", "listening", "vocab"],
  mobilePinnedViews: ["dashboard", "vocabulary", "specials", "exams"]
};

const MOBILE_VIEW_PAGE_COUNTS: Record<AppView, number> = {
  dashboard: 3,
  vocabulary: 2,
  specials: 2,
  exams: 3,
  wrong: 1,
  stats: 2,
  settings: 2
};

function computeCountdown(examDate: string) {
  const today = new Date();
  const target = new Date(examDate);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
}

function masteryWeight(record?: LearningRecord | null) {
  const scale = ["陌生", "认识", "模糊", "基本掌握", "已掌握"];
  return record ? scale.indexOf(record.masteryLevel) : -1;
}

function getBindingScore(binding: AudioBinding, asset: MediaAsset) {
  const sourceScore = asset.sourceType === "imported" ? 20 : 0;
  const scopeScore = binding.overrideScope === "paper" ? 10 : 0;
  return sourceScore + scopeScore + binding.confidence;
}

function resolveAudioBinding(bindings: AudioBinding[], assetMap: Map<string, MediaAsset>, paperId: string) {
  return bindings
    .filter((binding) => binding.paperIds.includes(paperId) && assetMap.has(binding.assetId))
    .map((binding) => ({ binding, asset: assetMap.get(binding.assetId)! }))
    .sort((left, right) => getBindingScore(right.binding, right.asset) - getBindingScore(left.binding, left.asset))[0];
}

function getNextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === "未开始" || status === "暂停" || status === "跳过") {
    return "进行中";
  }
  if (status === "进行中") {
    return "已完成";
  }
  return "未开始";
}

function normalizeSettings(value?: UserSettings | null): UserSettings {
  return {
    ...defaultSettings,
    ...value,
    weakModules: value?.weakModules?.length ? value.weakModules : defaultSettings.weakModules,
    mobilePinnedViews: normalizeMobilePinnedViews(value?.mobilePinnedViews)
  };
}

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyPayload | null>(null);
  const [specials, setSpecials] = useState<SpecialsPayload | null>(null);
  const [exams, setExams] = useState<ExamsPayload | null>(null);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [wrongItems, setWrongItems] = useState<WrongItemRecord[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [importedAssets, setImportedAssets] = useState<ImportedMediaAsset[]>([]);
  const [importedBindings, setImportedBindings] = useState<AudioBinding[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [selectedWordId, setSelectedWordId] = useState("");
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [pendingImportTarget, setPendingImportTarget] = useState<{ sessionId: string; paperId: string } | null>(null);
  const [selectedPendingPaperIds, setSelectedPendingPaperIds] = useState<string[]>([]);
  const [mobileNavSheetOpen, setMobileNavSheetOpen] = useState(false);
  const [navTransition, setNavTransition] = useState<NavTransition | null>(null);
  const [tapTransition, setTapTransition] = useState<TapTransition | null>(null);
  const [mobilePages, setMobilePages] = useState<Record<AppView, number>>({
    dashboard: 0,
    vocabulary: 0,
    specials: 0,
    exams: 0,
    wrong: 0,
    stats: 0,
    settings: 0
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const navTransitionTimerRef = useRef<number | null>(null);
  const tapTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (navTransitionTimerRef.current) {
        window.clearTimeout(navTransitionTimerRef.current);
      }
      if (tapTransitionTimerRef.current) {
        window.clearTimeout(tapTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const [nextOverview, nextVocabulary, nextSpecials, nextExams, storedSettings, storedRecords, storedWrongItems, storedTasks, storedAssets, storedBindings] =
          await Promise.all([
            loadOverview(),
            loadVocabulary(),
            loadSpecials(),
            loadExams(),
            settingsRepository.getSettings(),
            progressRepository.getAllRecords(),
            wrongItemRepository.getAll(),
            taskRepository.getAll(),
            mediaRepository.listAssets(),
            mediaBindingRepository.getAll()
          ]);

        if (!mounted) {
          return;
        }

        setOverview(nextOverview);
        setVocabulary(nextVocabulary);
        setSpecials(nextSpecials);
        setExams(nextExams);
        setSettings(normalizeSettings(storedSettings));
        setRecords(storedRecords);
        setWrongItems(storedWrongItems);
        setTasks(storedTasks);
        setImportedAssets(storedAssets);
        setImportedBindings(storedBindings);
        setSelectedCollectionId(nextSpecials.collections[0]?.id ?? "");
        setSelectedSectionId(nextSpecials.collections[0]?.sections[0]?.id ?? "");
        setSelectedSessionId(nextExams.structuredSessions[0]?.id ?? "");
        setSelectedPaperId(nextExams.structuredSessions[0]?.papers[0]?.id ?? "");
        setSelectedWordId(nextVocabulary.entries[0]?.id ?? "");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "内容加载失败");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const nextUrls: Record<string, string> = {};
    for (const asset of importedAssets) {
      if (asset.blob) {
        nextUrls[asset.id] = URL.createObjectURL(asset.blob);
      }
    }
    setAssetUrls(nextUrls);
    return () => {
      Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [importedAssets]);

  useEffect(() => {
    if (!exams) {
      return;
    }
    const nextTasks = buildTodayTasks(settings).map((task) => {
      const existing = tasks.find((entry) => entry.id === task.id);
      return existing ? { ...task, status: existing.status } : task;
    });
    setTasks(nextTasks);
    nextTasks.forEach((task) => {
      void taskRepository.save(task);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.examDate, settings.dailyMinutes, settings.weakModules.join(","), exams?.updatedAt]);

  const recordMap = useMemo(() => new Map(records.map((record) => [record.itemId, record])), [records]);
  const wrongMap = useMemo(() => new Map(wrongItems.map((item) => [item.itemId, item])), [wrongItems]);
  const builtinAssets = exams?.mediaAssets ?? [];
  const builtinBindings = exams?.builtinBindings ?? [];
  const allAssets = useMemo(() => [...builtinAssets, ...importedAssets], [builtinAssets, importedAssets]);
  const assetMap = useMemo(() => new Map(allAssets.map((asset) => [asset.id, asset])), [allAssets]);
  const activeBindings = useMemo(
    () => [...builtinBindings, ...importedBindings].filter((binding) => assetMap.has(binding.assetId)),
    [assetMap, builtinBindings, importedBindings]
  );

  const selectedCollection = specials?.collections.find((collection) => collection.id === selectedCollectionId) ?? specials?.collections[0] ?? null;
  const selectedSection = selectedCollection?.sections.find((section) => section.id === selectedSectionId) ?? selectedCollection?.sections[0] ?? null;
  const selectedSession = exams?.structuredSessions.find((session) => session.id === selectedSessionId) ?? exams?.structuredSessions[0] ?? null;
  const selectedPaper = selectedSession?.papers.find((paper) => paper.id === selectedPaperId) ?? selectedSession?.papers[0] ?? null;
  const selectedPaperAudio = selectedPaper ? resolveAudioBinding(activeBindings, assetMap, selectedPaper.id) : null;
  const paperSessionMap = useMemo(() => {
    const map = new Map<string, { id: string }>();
    exams?.structuredSessions.forEach((session) => {
      session.papers.forEach((paper) => map.set(paper.id, { id: session.id }));
    });
    return map;
  }, [exams]);

  const visibleWords = useMemo(() => {
    if (!vocabulary) {
      return [];
    }
    const term = search.trim().toLowerCase();
    return vocabulary.entries
      .filter((entry) => {
        if (!term) {
          return true;
        }
        return (
          entry.headWord.toLowerCase().includes(term) ||
          entry.translations.some((item) => item.text.includes(term))
        );
      })
      .sort((left, right) => {
        const masteryDiff = masteryWeight(recordMap.get(left.id)) - masteryWeight(recordMap.get(right.id));
        if (masteryDiff !== 0) {
          return masteryDiff;
        }
        return (recordMap.get(left.id)?.attempts ?? 0) - (recordMap.get(right.id)?.attempts ?? 0);
      });
  }, [recordMap, search, vocabulary]);

  const selectedWord = visibleWords.find((entry) => entry.id === selectedWordId) ?? visibleWords[0] ?? null;
  const pinnedMobileViews = useMemo(() => normalizeMobilePinnedViews(settings.mobilePinnedViews), [settings.mobilePinnedViews]);
  const mobileOverflowViews = useMemo(() => ALL_APP_VIEWS.filter((item) => !pinnedMobileViews.includes(item)), [pinnedMobileViews]);
  const mobileSwipeViews = useMemo<AppView[]>(() => (pinnedMobileViews.length ? pinnedMobileViews : ["dashboard"]), [pinnedMobileViews]);
  const mobileNavCompact = isMobile && pinnedMobileViews.length + (mobileOverflowViews.length ? 1 : 0) > 5;

  const unmatchedPaperIds = useMemo(
    () =>
      exams?.structuredSessions
        .flatMap((session) => session.papers)
        .filter((paper) => !resolveAudioBinding(activeBindings, assetMap, paper.id))
        .map((paper) => paper.id) ?? [],
    [activeBindings, assetMap, exams]
  );
  const unmatchedPapers = useMemo(
    () =>
      exams?.structuredSessions.flatMap((session) =>
        session.papers
          .filter((paper) => unmatchedPaperIds.includes(paper.id))
          .map((paper) => ({
            sessionId: session.id,
            paperId: paper.id,
            label: `${formatMonthLabel(session.yearMonth)} 第 ${paper.paperNo} 套`
          }))
      ) ?? [],
    [exams, unmatchedPaperIds]
  );

  const sessionPaperOptions = useMemo(
    () =>
      exams?.structuredSessions.flatMap((session) => [
        { value: `session:${session.id}`, label: `${session.yearMonth} 全场共享听力` },
        ...session.papers.map((paper) => ({
          value: `paper:${paper.id}`,
          label: `${session.yearMonth} 第 ${paper.paperNo} 套`
        }))
      ]) ?? [],
    [exams]
  );

  useEffect(() => {
    setSelectedPendingPaperIds((current) => current.filter((paperId) => unmatchedPaperIds.includes(paperId)));
  }, [unmatchedPaperIds]);

  async function persistSettings(nextSettings: UserSettings) {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    await settingsRepository.saveSettings(normalized);
    setFeedback("学习参数已更新。");
  }

  async function upsertTaskStatus(taskId: string, status: TaskStatus) {
    const nextTasks = tasks.map((task) => (task.id === taskId ? { ...task, status } : task));
    setTasks(nextTasks);
    const target = nextTasks.find((task) => task.id === taskId);
    if (target) {
      await taskRepository.save(target);
    }
  }

  async function handleWordVerdict(verdict: "wrong" | "hard" | "good") {
    if (!selectedWord) {
      return;
    }

    const nextRecord = createOrUpdateRecord(recordMap.get(selectedWord.id) ?? null, {
      itemId: selectedWord.id,
      itemType: "vocab",
      verdict,
      durationSeconds: 30,
      tags: ["词汇"]
    });

    setRecords([...records.filter((record) => record.itemId !== selectedWord.id), nextRecord]);
    await progressRepository.saveRecord(nextRecord);
    await upsertTaskStatus("task-vocab", "进行中");

    if (verdict === "wrong") {
      const nextWrong = createOrUpdateWrongItem(wrongMap.get(selectedWord.id) ?? null, {
        itemId: selectedWord.id,
        itemType: "vocab",
        title: selectedWord.headWord,
        sourceLabel: "词汇"
      });
      setWrongItems([...wrongItems.filter((item) => item.itemId !== selectedWord.id), nextWrong]);
      await wrongItemRepository.save(nextWrong);
      setFeedback(`${selectedWord.headWord} 已加入错题回收。`);
    } else {
      const currentWrong = wrongMap.get(selectedWord.id);
      if (currentWrong && verdict === "good") {
        const resolved = resolveWrongItem(currentWrong);
        setWrongItems([...wrongItems.filter((item) => item.itemId !== selectedWord.id), resolved]);
        await wrongItemRepository.save(resolved);
      }
      setFeedback(`${selectedWord.headWord} 的掌握度已更新。`);
    }

    const currentIndex = visibleWords.findIndex((entry) => entry.id === selectedWord.id);
    const nextWord = visibleWords[currentIndex + 1] ?? visibleWords[0];
    if (nextWord) {
      setSelectedWordId(nextWord.id);
    }
  }

  async function addReviewItem(input: { itemId: string; itemType: WrongItemRecord["itemType"]; title: string; sourceLabel: string }) {
    const nextWrong = createOrUpdateWrongItem(wrongMap.get(input.itemId) ?? null, input);
    setWrongItems([...wrongItems.filter((item) => item.itemId !== input.itemId), nextWrong]);
    await wrongItemRepository.save(nextWrong);
    setFeedback(`${input.title} 已加入错题本。`);
  }

  async function handleImportFiles(files: File[]) {
    if (!exams || files.length === 0) {
      return;
    }
    const adapter = new LocalFileImportSourceAdapter(exams.structuredSessions);
    const scanned = await adapter.scan(files);
    const nextAssets = [...importedAssets];
    const nextBindings = [...importedBindings];
    const manualQueue = pendingImportTarget ? [pendingImportTarget.paperId] : [...selectedPendingPaperIds];
    const consumedManualPaperIds: string[] = [];
    let importedCount = 0;

    for (const file of scanned) {
      const warnings = adapter.validate(file);
      if (warnings.length > 0) {
        setFeedback(warnings[0]);
        continue;
      }

      const asset = await adapter.extractMetadata(file);
      if (nextAssets.some((entry) => entry.checksum && entry.checksum === asset.checksum)) {
        setFeedback(`已跳过重复音频：${file.name}`);
        continue;
      }

      let suggestions = adapter.suggestBindings(file);
      const manualPaperId = manualQueue.shift();
      if (manualPaperId) {
        const session = paperSessionMap.get(manualPaperId);
        if (session) {
          suggestions = [
            {
              sessionId: session.id,
              paperIds: [manualPaperId],
              overrideScope: "paper" as const,
              confidence: 1
            }
          ];
          consumedManualPaperIds.push(manualPaperId);
        }
      }

      await mediaRepository.saveImportedAsset(asset, file);
      nextAssets.push({ ...asset, blob: file });
      importedCount += 1;

      const bindings = materializeBindings(asset, suggestions, "imported");
      for (const binding of bindings) {
        nextBindings.push(binding);
        await mediaBindingRepository.upsertBinding(binding);
      }
    }

    setImportedAssets(nextAssets);
    setImportedBindings(nextBindings);
    setPendingImportTarget(null);
    if (consumedManualPaperIds.length > 0) {
      setSelectedPendingPaperIds((current) => current.filter((paperId) => !consumedManualPaperIds.includes(paperId)));
    }
    setFeedback(importedCount > 0 ? `已导入 ${importedCount} 个音频文件。` : "没有新增音频文件。");
  }

  async function removeImportedAsset(assetId: string) {
    await mediaRepository.removeAsset(assetId);
    for (const binding of importedBindings.filter((entry) => entry.assetId === assetId)) {
      await mediaBindingRepository.removeBinding(binding.id);
    }
    setImportedBindings(importedBindings.filter((entry) => entry.assetId !== assetId));
    setImportedAssets(importedAssets.filter((asset) => asset.id !== assetId));
    setFeedback("导入音频已移除。");
  }

  async function rebindImportedAsset(assetId: string, selection: string) {
    for (const binding of importedBindings.filter((entry) => entry.assetId === assetId)) {
      await mediaBindingRepository.removeBinding(binding.id);
    }

    const nextBindings = importedBindings.filter((entry) => entry.assetId !== assetId);
    if (selection !== "unmatched" && exams) {
      const [scope, targetId] = selection.split(":");
      const session =
        scope === "session"
          ? exams.structuredSessions.find((entry) => entry.id === targetId)
          : exams.structuredSessions.find((entry) => entry.papers.some((paper) => paper.id === targetId));
      if (session) {
        const binding: AudioBinding = {
          id: `${assetId}-${scope}`,
          sessionId: session.id,
          paperIds: scope === "session" ? session.papers.map((paper) => paper.id) : [targetId],
          sectionType: "listening",
          assetId,
          bindingSource: "imported",
          confidence: 1,
          overrideScope: scope === "session" ? "session" : "paper"
        };
        nextBindings.push(binding);
        await mediaBindingRepository.upsertBinding(binding);
      }
    }

    setImportedBindings(nextBindings);
    setFeedback("音频绑定已更新。");
  }

  function triggerFileImport(target?: { sessionId: string; paperId: string }) {
    setPendingImportTarget(target ?? null);
    fileInputRef.current?.click();
  }

  function triggerFolderImport() {
    setPendingImportTarget(null);
    folderInputRef.current?.click();
  }

  function getImportedAssetSelection(assetId: string) {
    const binding = importedBindings.find((entry) => entry.assetId === assetId);
    if (!binding) {
      return "unmatched";
    }
    return binding.overrideScope === "session" ? `session:${binding.sessionId}` : `paper:${binding.paperIds[0]}`;
  }

  function activateNavTransition() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setNavTransition((current) => (current ? { ...current, phase: "active", dragOffset: 0 } : current));
      });
    });
  }

  function activateTapTransition() {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setTapTransition((current) => (current ? { ...current, phase: "active" } : current));
      });
    });
  }

  function getNavigationTaskId(nextView: AppView) {
    if (nextView === "vocabulary") {
      return "task-vocab";
    }
    if (nextView === "specials") {
      return "task-special";
    }
    if (nextView === "exams") {
      return "task-exam";
    }
    return null;
  }

  function getNavigationDirection(fromView: AppView, toView: AppView): "previous" | "next" {
    const fromIndex = mobileSwipeViews.indexOf(fromView);
    const toIndex = mobileSwipeViews.indexOf(toView);
    if (fromIndex < 0 || toIndex < 0) {
      return "next";
    }
    return toIndex >= fromIndex ? "next" : "previous";
  }

  function getAdjacentSwipeView(fromView: AppView, direction: "previous" | "next") {
    const currentIndex = mobileSwipeViews.indexOf(fromView);
    if (currentIndex < 0) {
      return null;
    }
    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    return mobileSwipeViews[nextIndex] ?? null;
  }

  function setViewAndActivate(nextView: AppView, options?: { resetPage?: boolean }) {
    setMobileNavSheetOpen(false);
    if (nextView === view) {
      return;
    }
    if (options?.resetPage !== false) {
      setMobilePages((current) => ({ ...current, [nextView]: 0 }));
    }
    const taskId = getNavigationTaskId(nextView);
    if (!isMobile) {
      if (taskId) {
        void upsertTaskStatus(taskId, "进行中");
      }
      setView(nextView);
      return;
    }

    const direction = getNavigationDirection(view, nextView);
    if (navTransitionTimerRef.current) {
      window.clearTimeout(navTransitionTimerRef.current);
    }
    if (tapTransitionTimerRef.current) {
      window.clearTimeout(tapTransitionTimerRef.current);
    }
    setTapTransition({
      direction,
      phase: "idle"
    });
    setView(nextView);
    activateTapTransition();
    tapTransitionTimerRef.current = window.setTimeout(() => {
      setTapTransition(null);
      if (taskId) {
        void upsertTaskStatus(taskId, "进行中");
      }
      tapTransitionTimerRef.current = null;
    }, 180);
  }

  function handleMobileBoundarySwipe(direction: "previous" | "next") {
    if (!isMobile || (navTransition && navTransition.phase === "active")) {
      return;
    }
    const nextView = getAdjacentSwipeView(view, direction);
    if (!nextView) {
      return;
    }
    if (navTransitionTimerRef.current) {
      window.clearTimeout(navTransitionTimerRef.current);
    }
    setMobileNavSheetOpen(false);
    setMobilePages((current) => ({ ...current, [nextView]: 0 }));
    const taskId = getNavigationTaskId(nextView);
    setNavTransition({
      from: view,
      to: nextView,
      direction,
      phase: "idle",
      dragOffset: 0
    });
    activateNavTransition();
    navTransitionTimerRef.current = window.setTimeout(() => {
      setView(nextView);
      setNavTransition(null);
      if (taskId) {
        void upsertTaskStatus(taskId, "进行中");
      }
      navTransitionTimerRef.current = null;
    }, 620);
  }

  function handleMobileBoundaryDrag(input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) {
    if (!isMobile || tapTransition) {
      return;
    }
    const nextView = getAdjacentSwipeView(view, input.direction);
    if (!nextView) {
      return;
    }

    if (navTransitionTimerRef.current) {
      window.clearTimeout(navTransitionTimerRef.current);
      navTransitionTimerRef.current = null;
    }

    if (input.phase === "move") {
      setNavTransition({
        from: view,
        to: nextView,
        direction: input.direction,
        phase: "drag",
        dragOffset: input.deltaX
      });
      return;
    }

    setNavTransition((current) =>
      current && current.to === nextView
        ? {
            ...current,
            phase: "idle",
            dragOffset: 0
          }
        : null
    );

    navTransitionTimerRef.current = window.setTimeout(() => {
      setNavTransition((current) => (current?.phase === "idle" ? null : current));
      navTransitionTimerRef.current = null;
    }, 180);
  }

  function togglePendingPaperSelection(paperId: string) {
    setSelectedPendingPaperIds((current) =>
      current.includes(paperId) ? current.filter((item) => item !== paperId) : [...current, paperId]
    );
  }

  if (loading) {
    return <div className="app-state">正在装载六级资料库与音频映射…</div>;
  }

  if (error || !overview || !vocabulary || !specials || !exams) {
    return <div className="app-state app-error">加载失败：{error ?? "缺少内容文件"}</div>;
  }

  const overviewData = overview;
  const specialsData = specials;
  const examsData = exams;
  const mobileBottomNavView = view;
  const mobileTopbarView = view;
  const mobileTopbarCount = MOBILE_VIEW_PAGE_COUNTS[mobileTopbarView];
  const mobileTopbarPage = mobilePages[mobileTopbarView] ?? 0;

  function renderView(targetView: AppView) {
    if (targetView === "dashboard") {
      return (
        <DashboardView
          overview={overviewData}
          tasks={tasks}
          settings={settings}
          unmatchedPaperIds={unmatchedPaperIds}
          unmatchedPapers={unmatchedPapers}
          selectedPendingPaperIds={selectedPendingPaperIds}
          importedAssetCount={importedAssets.length}
          onTogglePendingPaper={togglePendingPaperSelection}
          onToggleTask={(taskId, status) => void upsertTaskStatus(taskId, status)}
          onImportFiles={() => triggerFileImport()}
          onImportFolder={triggerFolderImport}
          exams={examsData}
          isMobile={isMobile}
          mobilePage={mobilePages.dashboard}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, dashboard: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    if (targetView === "vocabulary") {
      return (
        <VocabularyView
          search={search}
          onSearchChange={setSearch}
          visibleWords={visibleWords}
          selectedWord={selectedWord}
          recordMap={recordMap}
          onSelectWord={setSelectedWordId}
          onVerdict={(verdict) => void handleWordVerdict(verdict)}
          isMobile={isMobile}
          mobilePage={mobilePages.vocabulary}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, vocabulary: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    if (targetView === "specials") {
      return (
        <SpecialsView
          collections={specialsData.collections}
          selectedCollection={selectedCollection}
          selectedSection={selectedSection}
          onSelectCollection={(collectionId, sectionId) => {
            setSelectedCollectionId(collectionId);
            setSelectedSectionId(sectionId);
          }}
          onSelectSection={setSelectedSectionId}
          onAddReview={(itemId, title, sourceLabel) => void addReviewItem({ itemId, itemType: "special", title, sourceLabel })}
          isMobile={isMobile}
          mobilePage={mobilePages.specials}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, specials: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    if (targetView === "exams") {
      return (
        <ExamsView
          exams={examsData}
          selectedSession={selectedSession}
          selectedPaper={selectedPaper}
          selectedPaperAudio={selectedPaperAudio}
          assetUrls={assetUrls}
          unmatchedPaperIds={unmatchedPaperIds}
          onSelectSession={(sessionId, paperId) => {
            setSelectedSessionId(sessionId);
            setSelectedPaperId(paperId);
          }}
          onSelectPaper={setSelectedPaperId}
          onImportPaperAudio={(sessionId, paperId) => triggerFileImport({ sessionId, paperId })}
          onMarkReview={(paperId, title, sourceLabel) => void addReviewItem({ itemId: `paper:${paperId}`, itemType: "exam-paper", title, sourceLabel })}
          resolveAudioForPaper={(paperId) => resolveAudioBinding(activeBindings, assetMap, paperId)}
          isMobile={isMobile}
          mobilePage={mobilePages.exams}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, exams: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    if (targetView === "wrong") {
      return (
        <WrongItemsView
          wrongItems={wrongItems}
          isMobile={isMobile}
          mobilePage={mobilePages.wrong}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, wrong: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    if (targetView === "stats") {
      return (
        <StatsView
          records={records}
          wrongItems={wrongItems}
          importedAssetCount={importedAssets.length}
          structuredPaperCount={examsData.structuredSessions.flatMap((session) => session.papers).length}
          unmatchedPaperCount={unmatchedPaperIds.length}
          isMobile={isMobile}
          mobilePage={mobilePages.stats}
          onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, stats: index }))}
          onBoundarySwipe={handleMobileBoundarySwipe}
          onBoundaryDrag={handleMobileBoundaryDrag}
        />
      );
    }

    return (
      <SettingsView
        settings={settings}
        mobileNavViews={ALL_APP_VIEWS}
        mobilePinnedViews={pinnedMobileViews}
        builtinAssetCount={builtinAssets.length}
        importedAssets={importedAssets}
        exams={examsData}
        unmatchedPaperIds={unmatchedPaperIds}
        sessionPaperOptions={sessionPaperOptions}
        getImportedAssetSelection={getImportedAssetSelection}
        onSaveSettings={(nextSettings) => void persistSettings(nextSettings)}
        onImportFiles={() => triggerFileImport()}
        onImportFolder={triggerFolderImport}
        onImportPaperAudio={(sessionId, paperId) => triggerFileImport({ sessionId, paperId })}
        onRemoveAsset={(assetId) => void removeImportedAsset(assetId)}
        onRebindAsset={(assetId, selection) => void rebindImportedAsset(assetId, selection)}
        onAddPinnedView={(viewId) => void persistSettings({ ...settings, mobilePinnedViews: [...pinnedMobileViews, viewId] })}
        onRemovePinnedView={(viewId) =>
          void persistSettings({
            ...settings,
            mobilePinnedViews: pinnedMobileViews.filter((item) => item !== viewId)
          })
        }
        onReplacePinnedViews={(views) => void persistSettings({ ...settings, mobilePinnedViews: views })}
        isMobile={isMobile}
        mobilePage={mobilePages.settings}
        onMobilePageChange={(index) => setMobilePages((current) => ({ ...current, settings: index }))}
        onBoundarySwipe={handleMobileBoundarySwipe}
        onBoundaryDrag={handleMobileBoundaryDrag}
        contentVersion={overviewData.contentVersion}
      />
    );
  }

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        className="hidden-input"
        type="file"
        accept="audio/*,.mp3"
        multiple
        onChange={async (event) => {
          await handleImportFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={folderInputRef}
        className="hidden-input"
        type="file"
        accept="audio/*,.mp3"
        multiple
        onChange={async (event) => {
          await handleImportFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      <aside className="sidebar">
        <div className="brand-block">
          <p className="brand-kicker">CET6 PREP STUDIO</p>
          <h1>研六</h1>
          <p className="brand-copy">本地优先的六级备考工作台，包含可插拔的音频补全链路。</p>
        </div>
        <nav className="sidebar-nav">
          {isMobile ? (
            <>
              {pinnedMobileViews.map((item) => (
                <button
                  key={item}
                  className={`sidebar-link mobile-nav-link ${mobileBottomNavView === item ? "active" : ""} ${mobileNavCompact ? "compact" : ""}`.trim()}
                  aria-label={mobileNavTitles[item]}
                  title={mobileNavTitles[item]}
                  onClick={() => setViewAndActivate(item)}
                >
                  <span className="mobile-nav-icon">{mobileNavIcons[item]}</span>
                  <span className="mobile-nav-label">{mobileNavLabels[item]}</span>
                </button>
              ))}
              {mobileOverflowViews.length ? (
                <button
                  className={`sidebar-link mobile-nav-link mobile-nav-more ${mobileNavCompact ? "compact" : ""} ${mobileNavSheetOpen || mobileOverflowViews.includes(mobileBottomNavView) ? "active" : ""}`.trim()}
                  aria-label="更多页面"
                  title="更多页面"
                  onClick={() => setMobileNavSheetOpen((open) => !open)}
                >
                  <span className="mobile-nav-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg">
                      <path d="m6 14 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              ) : null}
            </>
          ) : (
            ALL_APP_VIEWS.map((item) => (
              <button key={item} className={`sidebar-link ${view === item ? "active" : ""}`} onClick={() => setViewAndActivate(item)}>
                {mobileNavTitles[item]}
              </button>
            ))
          )}
        </nav>
        <div className="sidebar-footer">
          <span>距离考试</span>
          <strong>{computeCountdown(settings.examDate)} 天</strong>
        </div>
      </aside>

      <main className={`workspace workspace-${view} ${isMobile && view !== "wrong" ? "workspace-mobile-pager-active" : ""} ${isMobile && navTransition ? "workspace-nav-transition" : ""}`.trim()}>
        <header className="topbar">
          <div className="topbar-title-row">
            <StatusPill tone="neutral">{formatDateLabel(new Date())}</StatusPill>
            <h2>{mobileNavTitles[view]}</h2>
          </div>
        </header>

        {feedback ? <div className="feedback-bar">{feedback}</div> : null}

        {isMobile && mobileTopbarCount > 1 ? (
          <div className="mobile-global-pager-topbar mobile-pager-controls">
            <span className="mobile-pager-leading">{`${new Date().getMonth() + 1}/${new Date().getDate()}`}</span>
            <div className="mobile-pager-indicators" role="tablist" aria-label={`${mobileNavTitles[mobileTopbarView]} 分页`}>
              {Array.from({ length: mobileTopbarCount }).map((_, index) => (
                <span key={index} className={`mobile-pager-dot ${index === mobileTopbarPage ? "active" : ""}`} />
              ))}
            </div>
            <span className="mobile-pager-count">
              {mobileTopbarPage + 1}/{mobileTopbarCount}
            </span>
          </div>
        ) : null}

        <div className={`view-body ${view === "exams" ? "view-body-exams" : ""}`}>
          <div className={`mobile-view-content ${isMobile && tapTransition ? `mobile-view-tap-enter mobile-view-direction-${tapTransition.direction} ${tapTransition.phase === "active" ? "is-active" : ""}` : ""}`.trim()}>
            {renderView(view)}
          </div>
          {isMobile && navTransition ? (
            <div
              className={`mobile-view-transition mobile-view-transition-overlay mobile-view-direction-${navTransition.direction} ${navTransition.phase === "active" ? "is-active" : ""} ${navTransition.phase === "drag" ? "is-dragging" : ""}`.trim()}
              style={{ ["--mobile-nav-peek" as string]: `${navTransition.dragOffset}px` }}
            >
              <div className="mobile-view-transition-track">
                {navTransition.direction === "next" ? (
                  <>
                    <div className="mobile-view-pane mobile-view-pane-from">{renderView(navTransition.from)}</div>
                    <div className="mobile-view-pane mobile-view-pane-to">{renderView(navTransition.to)}</div>
                  </>
                ) : (
                  <>
                    <div className="mobile-view-pane mobile-view-pane-to">{renderView(navTransition.to)}</div>
                    <div className="mobile-view-pane mobile-view-pane-from">{renderView(navTransition.from)}</div>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
      {isMobile && mobileNavSheetOpen && mobileOverflowViews.length ? (
        <div className="mobile-nav-sheet-layer" onClick={() => setMobileNavSheetOpen(false)}>
          <div className="mobile-nav-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="mobile-nav-sheet-handle" />
            <div className="mobile-nav-sheet-header">
              <strong>更多页面</strong>
              <span>未设为常驻</span>
            </div>
            <div className="mobile-nav-sheet-list">
              {mobileOverflowViews.map((item) => (
                <button
                  key={item}
                  className={`mobile-nav-sheet-item ${view === item ? "active" : ""}`}
                  onClick={() => setViewAndActivate(item)}
                >
                  <span className="mobile-nav-icon">{mobileNavIcons[item]}</span>
                  <span>{mobileNavTitles[item]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
