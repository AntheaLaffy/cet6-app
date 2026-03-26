import type { SpecialCollection, SpecialSection } from "@cet6/domain/types";
import { EmptyState, MarkdownSection, MobilePager, Panel } from "@cet6/ui";

export function SpecialsView(props: {
  collections: SpecialCollection[];
  selectedCollection: SpecialCollection | null;
  selectedSection: SpecialSection | null;
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  onSelectCollection: (collectionId: string, sectionId: string) => void;
  onSelectSection: (sectionId: string) => void;
  onAddReview: (itemId: string, title: string, sourceLabel: string) => void;
}) {
  const pages = [
    <Panel key="catalog" title="专项目录" eyebrow="Focused Modules">
      <div className="word-list">
        {props.collections.map((collection) => (
          <button
            key={collection.id}
            className={`list-item ${props.selectedCollection?.id === collection.id ? "active" : ""}`}
            onClick={() => props.onSelectCollection(collection.id, collection.sections[0]?.id ?? "")}
          >
            <strong>{collection.title}</strong>
            <span>{collection.sections.length} 个章节</span>
          </button>
        ))}
      </div>
    </Panel>,
    <Panel
      key="detail"
      title={props.selectedCollection?.title ?? "专项详情"}
      eyebrow="Read & Review"
      className="specials-detail-panel"
      actions={
        props.selectedSection ? (
          <button className="ghost-button" onClick={() => props.onAddReview(`special:${props.selectedSection!.id}`, props.selectedSection!.title, props.selectedCollection?.title ?? "专项")}>
            加入复盘
          </button>
        ) : null
      }
    >
      {props.selectedCollection ? (
        <div className="detail-stack">
          <div className="section-tabs">
            {props.selectedCollection.sections.map((section) => (
              <button key={section.id} className={`soft-chip ${props.selectedSection?.id === section.id ? "active" : ""}`} onClick={() => props.onSelectSection(section.id)}>
                {section.title}
              </button>
            ))}
          </div>
          <MarkdownSection title={props.selectedSection?.title} content={props.selectedSection?.body ?? ""} tone="study" />
        </div>
      ) : (
        <EmptyState title="暂无专项内容" detail="内容生成脚本还没有产出可读章节。" />
      )}
    </Panel>
  ];

  if (props.isMobile) {
    return <MobilePager ariaLabel="专项分页" pages={pages} currentPage={props.mobilePage} onPageChange={props.onMobilePageChange} onBoundarySwipe={props.onBoundarySwipe} onBoundaryDrag={props.onBoundaryDrag} showIndicators={false} />;
  }

  return (
    <div className="content-grid">
      {pages}
    </div>
  );
}
