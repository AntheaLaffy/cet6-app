import type { WrongItemRecord } from "@cet6/domain/types";
import { EmptyState, MobilePager, Panel, StatusPill } from "@cet6/ui";

export function WrongItemsView(props: {
  wrongItems: WrongItemRecord[];
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
}) {
  const page = (
    <Panel title="错题与待复盘" eyebrow="Recovery Loop">
      {props.wrongItems.length ? (
        <div className="word-list">
          {props.wrongItems
            .slice()
            .sort((left, right) => Number(left.resolved) - Number(right.resolved) || right.occurrences - left.occurrences)
            .map((item) => (
              <div key={item.id} className="list-item static-item">
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.sourceLabel} · 错误 {item.occurrences} 次</span>
                </div>
                <StatusPill tone={item.resolved ? "success" : "warning"}>{item.resolved ? "已回收" : "待复盘"}</StatusPill>
              </div>
            ))}
        </div>
      ) : (
        <EmptyState title="错题本还是空的" detail="词汇答错、专项手动加入、真题标记复盘后都会汇总到这里。" />
      )}
    </Panel>
  );

  if (props.isMobile) {
    return (
      <MobilePager
        ariaLabel="错题本分页"
        pages={[page]}
        currentPage={props.mobilePage}
        onPageChange={props.onMobilePageChange}
        onBoundarySwipe={props.onBoundarySwipe}
        onBoundaryDrag={props.onBoundaryDrag}
        showIndicators={false}
      />
    );
  }

  return page;
}
