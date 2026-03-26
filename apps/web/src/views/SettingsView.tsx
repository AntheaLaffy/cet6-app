import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ExamsPayload } from "@cet6/content/types";
import type { AppView, UserSettings } from "@cet6/domain/types";
import type { MediaAsset } from "@cet6/media/types";
import { EmptyState, MetricTile, MobilePager, Panel } from "@cet6/ui";
import { formatMonthLabel } from "@cet6/shared/index";
import { DEFAULT_MOBILE_PINNED_VIEWS, mobileNavIcons, mobileNavTitles } from "../mobileNav";

export function SettingsView(props: {
  settings: UserSettings;
  contentVersion: string;
  mobileNavViews: AppView[];
  mobilePinnedViews: AppView[];
  builtinAssetCount: number;
  importedAssets: MediaAsset[];
  exams: ExamsPayload;
  unmatchedPaperIds: string[];
  sessionPaperOptions: Array<{ value: string; label: string }>;
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  getImportedAssetSelection: (assetId: string) => string;
  onSaveSettings: (settings: UserSettings) => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
  onImportPaperAudio: (sessionId: string, paperId: string) => void;
  onRemoveAsset: (assetId: string) => void;
  onRebindAsset: (assetId: string, selection: string) => void;
  onAddPinnedView: (view: AppView) => void;
  onRemovePinnedView: (view: AppView) => void;
  onReplacePinnedViews: (views: AppView[]) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const pressRef = useRef<{ view: AppView; pointerId: number } | null>(null);
  const availableViews = props.mobileNavViews.filter((view) => !props.mobilePinnedViews.includes(view));
  const [selectedPinnedView, setSelectedPinnedView] = useState<AppView | null>(null);
  const [dragTargetView, setDragTargetView] = useState<AppView | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (editorRef.current && !editorRef.current.contains(event.target as Node)) {
        setSelectedPinnedView(null);
        setDragTargetView(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedPinnedView && !props.mobilePinnedViews.includes(selectedPinnedView)) {
      setSelectedPinnedView(null);
      setDragTargetView(null);
    }
  }, [props.mobilePinnedViews, selectedPinnedView]);

  const pinnedHint = useMemo(
    () => (selectedPinnedView ? "拖动排序，点右上角移除" : "长按选中"),
    [selectedPinnedView]
  );

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function reorderPinnedViews(source: AppView, target: AppView) {
    if (source === target) {
      return;
    }
    const next = [...props.mobilePinnedViews];
    const sourceIndex = next.indexOf(source);
    const targetIndex = next.indexOf(target);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    props.onReplacePinnedViews(next);
  }

  function handlePinnedPointerDown(view: AppView, event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    pressRef.current = { view, pointerId: event.pointerId };
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      setSelectedPinnedView(view);
      setDragTargetView(null);
      longPressTimerRef.current = null;
    }, 520);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePinnedPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const activePress = pressRef.current;
    if (!activePress || activePress.pointerId !== event.pointerId) {
      return;
    }

    const selectionReady = selectedPinnedView === activePress.view;
    if (!selectionReady) {
      return;
    }

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-nav-view]");
    const targetView = target?.dataset.navView as AppView | undefined;
    setDragTargetView(targetView && targetView !== selectedPinnedView ? targetView : null);
  }

  function handlePinnedPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const activePress = pressRef.current;
    if (!activePress || activePress.pointerId !== event.pointerId) {
      return;
    }

    clearLongPressTimer();
    if (selectedPinnedView === activePress.view && dragTargetView) {
      reorderPinnedViews(selectedPinnedView, dragTargetView);
    }

    setDragTargetView(null);
    pressRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const pages = [
    <Panel key="preferences" title="学习参数" eyebrow="Preferences">
      <div className="form-stack">
        <div className="chip-row">
          <span className="soft-chip active">内容版本 {props.contentVersion}</span>
          <span className="soft-chip active">导入音频 {props.importedAssets.length}</span>
          <span className="soft-chip active">待补全 {props.unmatchedPaperIds.length}</span>
        </div>
        <label>
          <span>考试日期</span>
          <input type="date" value={props.settings.examDate} onChange={(event) => props.onSaveSettings({ ...props.settings, examDate: event.target.value })} />
        </label>
        <label>
          <span>每日分钟数</span>
          <input type="number" min={20} max={300} value={props.settings.dailyMinutes} onChange={(event) => props.onSaveSettings({ ...props.settings, dailyMinutes: Number(event.target.value) })} />
        </label>
        <p className="setting-hint">首版默认本地优先，学习记录和导入音频都只保存在当前设备。</p>

        <div className="settings-subsection">
          <div className="settings-subsection-heading-row">
            <div className="settings-subsection-heading">
              <strong>常驻导航</strong>
              <span className="settings-inline-hint">{pinnedHint}</span>
            </div>
            <button
              className={`ghost-button batch-toggle ${batchOpen ? "active" : ""}`.trim()}
              aria-label="切换批处理"
              title="批处理"
              onClick={() => setBatchOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" aria-hidden="true">
                <path d="M6 7h12M6 12h12M6 17h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="18" cy="17" r="2" fill="currentColor" />
              </svg>
            </button>
          </div>

          {batchOpen ? (
            <div className="batch-action-row">
              <button className="ghost-button" onClick={() => props.onReplacePinnedViews([...props.mobileNavViews])}>全部设为常驻</button>
              <button className="ghost-button" onClick={() => props.onReplacePinnedViews([...DEFAULT_MOBILE_PINNED_VIEWS])}>恢复默认</button>
              <button className="ghost-button" onClick={() => props.onReplacePinnedViews([])}>清空常驻</button>
            </div>
          ) : null}

          {props.mobilePinnedViews.length ? (
            <div className="nav-order-list" ref={editorRef}>
              {props.mobilePinnedViews.map((view) => (
                <div
                  key={view}
                  data-nav-view={view}
                  className={`nav-order-item ${selectedPinnedView === view ? "selected" : ""} ${dragTargetView === view ? "drag-target" : ""}`.trim()}
                  onPointerDown={(event) => handlePinnedPointerDown(view, event)}
                  onPointerMove={handlePinnedPointerMove}
                  onPointerUp={handlePinnedPointerEnd}
                  onPointerCancel={handlePinnedPointerEnd}
                >
                  {selectedPinnedView === view ? (
                    <button
                      className="nav-delete-button"
                      aria-label={`移除 ${mobileNavTitles[view]}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        props.onRemovePinnedView(view);
                        setSelectedPinnedView(null);
                        setDragTargetView(null);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                  <div className="nav-order-main">
                    <span className="mobile-nav-icon">{mobileNavIcons[view]}</span>
                    <span>{mobileNavTitles[view]}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="当前没有常驻项" detail="底部导航会只保留“更多”入口，你可以随时把页面重新加入常驻。" />
          )}
        </div>

        <div className="settings-subsection">
          <div className="settings-subsection-heading">
            <strong>其他页面</strong>
            <span>这些页面会出现在“更多”抽屉里，也可以随时加入常驻。</span>
          </div>
          {availableViews.length ? (
            <div className="nav-add-grid">
              {availableViews.map((view) => (
                <button key={view} className="soft-chip nav-add-chip" onClick={() => props.onAddPinnedView(view)}>
                  <span className="mobile-nav-icon">{mobileNavIcons[view]}</span>
                  <span>{mobileNavTitles[view]}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="setting-hint">全部页面都已设为常驻。</p>
          )}
        </div>
      </div>
    </Panel>,
    <Panel
      key="media"
      title="媒体库"
      eyebrow="Pluggable Audio"
      actions={
        <div className="button-row">
          <button className="primary-button" onClick={props.onImportFiles}>导入音频</button>
          <button className="ghost-button" onClick={props.onImportFolder}>导入文件夹</button>
        </div>
      }
    >
      <div className="detail-stack">
        <div className="metric-row">
          <MetricTile label="内置音频" value={String(props.builtinAssetCount)} detail="来自仓库扫描" />
          <MetricTile label="导入音频" value={String(props.importedAssets.length)} detail="当前设备" />
          <MetricTile label="待补全套卷" value={String(props.unmatchedPaperIds.length)} detail="仍可手动绑定" />
        </div>

        <div className="detail-columns">
          <div>
            <h4>已导入音频</h4>
            {props.importedAssets.length ? (
              <ul className="resource-list">
                {props.importedAssets.map((asset) => (
                  <li key={asset.id}>
                    <div>
                      <strong>{asset.originLabel}</strong>
                      <span>{asset.duration ? `${Math.round(asset.duration)} 秒` : "时长未知"}</span>
                    </div>
                    <div className="inline-actions">
                      <select value={props.getImportedAssetSelection(asset.id)} onChange={(event) => props.onRebindAsset(asset.id, event.target.value)}>
                        <option value="unmatched">暂不绑定</option>
                        {props.sessionPaperOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <button className="ghost-button" onClick={() => props.onRemoveAsset(asset.id)}>移除</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="还没有用户音频" detail="导入后会先按文件名自动匹配到场次或套卷，再允许你手动调整。" />
            )}
          </div>
          <div>
            <h4>未补全套卷</h4>
            <ul className="resource-list">
              {props.exams.structuredSessions.flatMap((session) =>
                session.papers
                  .filter((paper) => props.unmatchedPaperIds.includes(paper.id))
                  .map((paper) => (
                    <li key={paper.id}>
                      <span>{formatMonthLabel(session.yearMonth)} 第 {paper.paperNo} 套</span>
                      <button className="ghost-button" onClick={() => props.onImportPaperAudio(session.id, paper.id)}>为这一套导入</button>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  ];

  if (props.isMobile) {
    return <MobilePager ariaLabel="设置分页" pages={pages} currentPage={props.mobilePage} onPageChange={props.onMobilePageChange} onBoundarySwipe={props.onBoundarySwipe} onBoundaryDrag={props.onBoundaryDrag} showIndicators={false} />;
  }

  return (
    <div className="content-grid">
      {pages}
    </div>
  );
}
