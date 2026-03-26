import type { ExamsPayload, OverviewPayload } from "@cet6/content/types";
import type { StudyTask, TaskStatus, UserSettings } from "@cet6/domain/types";
import { MetricTile, MobilePager, Panel } from "@cet6/ui";

function getTaskLabel(status: TaskStatus) {
  if (status === "已完成") {
    return "已完成";
  }
  if (status === "进行中") {
    return "进行中";
  }
  return "未接手";
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

export function DashboardView(props: {
  overview: OverviewPayload;
  tasks: StudyTask[];
  settings: UserSettings;
  unmatchedPaperIds: string[];
  unmatchedPapers: Array<{ sessionId: string; paperId: string; label: string }>;
  selectedPendingPaperIds: string[];
  importedAssetCount: number;
  exams: ExamsPayload;
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  onTogglePendingPaper: (paperId: string) => void;
  onToggleTask: (taskId: string, status: TaskStatus) => void;
  onImportFiles: () => void;
  onImportFolder: () => void;
}) {
  const pages = [
    <Panel key="hero" title="今日工作台" eyebrow="Start Here" className="hero-panel">
      <div className="hero-copy">
        <h3>今天先完成词汇、专项和真题主线，再决定要不要继续扩展。</h3>
        <p>当前重点是把近年真题的听力状态补全到可播放、可回听、可本地重用。</p>
      </div>
      <div className="metric-row">
        <MetricTile label="词条总量" value={String(props.overview.stats.vocabularyCount)} detail="去重后的词库" />
        <MetricTile label="近年场次" value={String(props.overview.stats.structuredSessionCount)} detail="2022.06 - 2025.06" />
        <MetricTile label="内置听力" value={String(props.overview.stats.builtinAudioCount)} detail="已自动映射" />
        <MetricTile label="用户导入" value={String(props.importedAssetCount)} detail="仅保存在本机" />
      </div>
    </Panel>,
    <Panel key="tasks" title="今日任务" eyebrow="Daily Flow">
      <div className="task-list">
        {props.tasks.map((task) => (
          <div key={task.id} className="task-row">
            <div className="task-summary">
              <h3>{task.title}</h3>
              <p>{task.estimatedMinutes} 分钟</p>
            </div>
            <div className="task-actions">
              <button
                className={`task-status-button task-status-${task.status === "已完成" ? "done" : task.status === "进行中" ? "active" : "idle"}`.trim()}
                onClick={() => props.onToggleTask(task.id, getNextTaskStatus(task.status))}
              >
                {getTaskLabel(task.status)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Panel>,
    <Panel key="media" title="听力补全" eyebrow="Media Status">
      <div className="split-list">
        <div>
          <h3>待匹配套卷</h3>
          <div className="pending-paper-list" role="listbox" aria-label="待匹配套卷">
            {props.unmatchedPapers.map((paper) => (
              <button
                key={paper.paperId}
                className={`pending-paper-item ${props.selectedPendingPaperIds.includes(paper.paperId) ? "active" : ""}`.trim()}
                onClick={() => props.onTogglePendingPaper(paper.paperId)}
              >
                <span className="pending-paper-dot" aria-hidden="true" />
                <span>{paper.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3>本地导入</h3>
          <p>支持单文件和文件夹导入，先自动匹配文件名，再允许在设置页媒体库手动修正。</p>
          <div className="button-row">
            <button className="primary-button" onClick={props.onImportFiles}>导入音频文件</button>
            <button className="ghost-button" onClick={props.onImportFolder}>导入整个文件夹</button>
          </div>
        </div>
      </div>
    </Panel>
  ];

  if (props.isMobile) {
    return <MobilePager ariaLabel="今日计划分页" pages={pages} currentPage={props.mobilePage} onPageChange={props.onMobilePageChange} onBoundarySwipe={props.onBoundarySwipe} onBoundaryDrag={props.onBoundaryDrag} showIndicators={false} />;
  }

  return (
    <div className="dashboard-grid">
      {pages}
    </div>
  );
}
