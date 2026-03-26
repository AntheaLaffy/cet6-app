import type { ExamsPayload } from "@cet6/content/types";
import type { ExamPaper, ExamSession } from "@cet6/domain/types";
import type { AudioBinding, MediaAsset } from "@cet6/media/types";
import { EmptyState, MobilePager, Panel, StatusPill } from "@cet6/ui";
import { formatMonthLabel } from "@cet6/shared/index";

export function ExamsView(props: {
  exams: ExamsPayload;
  selectedSession: ExamSession | null;
  selectedPaper: ExamPaper | null;
  selectedPaperAudio: { binding: AudioBinding; asset: MediaAsset } | null;
  assetUrls: Record<string, string>;
  unmatchedPaperIds: string[];
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  onSelectSession: (sessionId: string, paperId: string) => void;
  onSelectPaper: (paperId: string) => void;
  onImportPaperAudio: (sessionId: string, paperId: string) => void;
  onMarkReview: (paperId: string, title: string, sourceLabel: string) => void;
  resolveAudioForPaper: (paperId: string) => { binding: AudioBinding; asset: MediaAsset } | undefined;
}) {
  const sessionsPanel = (
    <Panel title="近年场次" eyebrow="Structured Sessions" className="exam-column exam-sessions-panel">
      <div className="panel-scroll word-list">
        {props.exams.structuredSessions.map((session) => (
          <button key={session.id} className={`list-item ${props.selectedSession?.id === session.id ? "active" : ""}`} onClick={() => props.onSelectSession(session.id, session.papers[0]?.id ?? "")}>
            <strong>{formatMonthLabel(session.yearMonth)}</strong>
            <span>{session.papers.length} 套卷</span>
          </button>
        ))}
      </div>
    </Panel>
  );

  const papersPanel = (
    <Panel
      title={props.selectedSession ? `${formatMonthLabel(props.selectedSession.yearMonth)} 真题` : "选择场次"}
      eyebrow="Papers"
      className="exam-column exam-papers-panel"
    >
      {props.selectedSession ? (
        <div className="panel-scroll paper-list">
          {props.selectedSession.papers.map((paper) => {
            const resolved = props.resolveAudioForPaper(paper.id);
            const tone = resolved?.asset.sourceType === "imported" ? "accent" : resolved ? "success" : "warning";
            const label = resolved?.asset.sourceType === "imported" ? "已导入" : resolved ? "有音频" : "待匹配";
            return (
              <button key={paper.id} className={`paper-tile ${props.selectedPaper?.id === paper.id ? "active" : ""}`} onClick={() => props.onSelectPaper(paper.id)}>
                <div>
                  <strong>第 {paper.paperNo} 套</strong>
                  <span>{paper.resources.length + props.selectedSession!.sharedResources.length} 个资源</span>
                </div>
                <StatusPill tone={tone}>{label}</StatusPill>
              </button>
            );
          })}
        </div>
      ) : null}
    </Panel>
  );

  const detailPanel = (
    <Panel
      title={props.selectedPaper?.title ?? "套卷详情"}
      eyebrow="Listening & Source Assets"
      className="exam-detail-panel"
      actions={
        props.selectedPaper && props.selectedSession ? (
          <div className="button-row exam-detail-actions">
            <button className="ghost-button" onClick={() => props.onMarkReview(props.selectedPaper!.id, props.selectedPaper!.title, props.selectedSession!.label)}>
              标记待复盘
            </button>
            <button className="primary-button" onClick={() => props.onImportPaperAudio(props.selectedSession!.id, props.selectedPaper!.id)}>
              补充音频
            </button>
          </div>
        ) : null
      }
    >
      <div className="panel-scroll detail-stack">
        {props.selectedPaper && props.selectedSession ? (
          <>
            <div className="audio-hero">
              <div>
                <p className="eyebrow">音频来源</p>
                <h3>
                  {props.selectedPaperAudio?.asset.sourceType === "imported"
                    ? "用户导入"
                    : props.selectedPaperAudio
                      ? "仓库内置"
                      : "未提供"}
                </h3>
                <p>
                  {props.selectedPaperAudio
                    ? props.selectedPaperAudio.asset.originLabel
                    : "当前套卷还没有可播放听力，导入后会优先覆盖到这一套卷。"}
                </p>
              </div>
              {props.selectedPaperAudio ? (
                <StatusPill tone={props.selectedPaperAudio.asset.sourceType === "imported" ? "accent" : "success"}>
                  {props.selectedPaperAudio.asset.sourceType === "imported" ? "已导入" : "有音频"}
                </StatusPill>
              ) : (
                <StatusPill tone="warning">待匹配</StatusPill>
              )}
            </div>

            {props.selectedPaperAudio ? (
              <audio
                key={props.selectedPaperAudio.asset.id}
                className="audio-player"
                controls
                src={props.selectedPaperAudio.asset.sourceType === "imported" ? props.assetUrls[props.selectedPaperAudio.asset.id] : props.selectedPaperAudio.asset.storageRef ?? undefined}
              />
            ) : (
              <EmptyState
                title="当前没有听力资源"
                detail="你可以导入单个 MP3，也可以直接把下载好的文件夹拖进系统完成自动匹配。"
                actions={<button className="primary-button" onClick={() => props.onImportPaperAudio(props.selectedSession!.id, props.selectedPaper!.id)}>导入这一套的音频</button>}
              />
            )}

            <div className="detail-columns">
              <div>
                <h4>套卷资源</h4>
                <ul className="resource-list">
                  {[...props.selectedPaper.resources, ...props.selectedSession.sharedResources].map((resource) => (
                    <li key={resource.id}>
                      <span>{resource.label}</span>
                      {resource.publicPath ? <a href={resource.publicPath} target="_blank" rel="noreferrer">打开资源</a> : <span className="resource-muted">仅索引</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>说明与笔记</h4>
                <ul className="resource-list">
                  {props.selectedPaper.notes.length || props.selectedSession.notes.length ? (
                    <>
                      {props.selectedPaper.notes.map((note) => (
                        <li key={note.id}>
                          <span>{note.label}</span>
                          {note.publicPath ? <a href={note.publicPath} target="_blank" rel="noreferrer">查看说明</a> : null}
                        </li>
                      ))}
                      {props.selectedSession.notes.map((note) => (
                        <li key={note}><span>{note}</span></li>
                      ))}
                    </>
                  ) : (
                    <li><span>暂无额外说明</span></li>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="先选择一套真题" detail="左侧选择场次后，再切到具体套卷查看资源和音频状态。" />
        )}
      </div>
    </Panel>
  );

  const archivePanel = (
    <Panel title="历史档案" eyebrow="Archive Index" className="exam-archive-panel">
      <div className="panel-scroll">
        <div className="archive-grid">
          {props.exams.archiveSessions.slice(0, 12).map((session) => (
            <div key={session.id} className="archive-item">
              <strong>{formatMonthLabel(session.yearMonth)}</strong>
              <span>{session.fileCount} 个文件</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );

  if (props.isMobile) {
    return (
      <MobilePager
        ariaLabel="真题分页"
        pages={[
          sessionsPanel,
          papersPanel,
          <div key="detail-page" className="mobile-stack">
            {detailPanel}
            {archivePanel}
          </div>
        ]}
        currentPage={props.mobilePage}
        onPageChange={props.onMobilePageChange}
        onBoundarySwipe={props.onBoundarySwipe}
        onBoundaryDrag={props.onBoundaryDrag}
        showIndicators={false}
      />
    );
  }

  return (
    <div className="exams-grid">
      {sessionsPanel}
      {papersPanel}
      <div className="exam-detail-column">
        {detailPanel}
        {archivePanel}
      </div>
    </div>
  );
}
