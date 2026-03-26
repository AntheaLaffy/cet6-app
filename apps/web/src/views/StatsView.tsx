import type { LearningRecord, WrongItemRecord } from "@cet6/domain/types";
import { MetricTile, MobilePager, Panel } from "@cet6/ui";

export function StatsView(props: {
  records: LearningRecord[];
  wrongItems: WrongItemRecord[];
  importedAssetCount: number;
  structuredPaperCount: number;
  unmatchedPaperCount: number;
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
}) {
  const accuracy = props.records.length
    ? Math.round(((props.records.length - props.records.filter((record) => record.wrongCount > 0).length) / props.records.length) * 100)
    : 0;

  const pages = [
    <Panel key="progress" title="学习概览" eyebrow="Progress">
      <div className="metric-row">
        <MetricTile label="学习记录" value={String(props.records.length)} detail="已沉淀到本机" />
        <MetricTile label="错题条目" value={String(props.wrongItems.filter((item) => !item.resolved).length)} detail="待复盘" />
        <MetricTile label="导入音频" value={String(props.importedAssetCount)} detail="用户媒体库" />
        <MetricTile label="准确率" value={`${accuracy}%`} detail="按已学习记录估算" />
      </div>
    </Panel>,
    <Panel key="coverage" title="媒体覆盖" eyebrow="Listening Coverage">
      <div className="metric-row">
        <MetricTile label="近年套卷" value={String(props.structuredPaperCount)} detail="结构化场次总套数" />
        <MetricTile label="待补全" value={String(props.unmatchedPaperCount)} detail="仍缺听力资源" />
        <MetricTile label="已覆盖" value={String(Math.max(props.structuredPaperCount - props.unmatchedPaperCount, 0))} detail="内置或已导入" />
      </div>
    </Panel>
  ];

  if (props.isMobile) {
    return <MobilePager ariaLabel="统计分页" pages={pages} currentPage={props.mobilePage} onPageChange={props.onMobilePageChange} onBoundarySwipe={props.onBoundarySwipe} onBoundaryDrag={props.onBoundaryDrag} showIndicators={false} />;
  }

  return (
    <div className="dashboard-grid">
      {pages}
    </div>
  );
}
