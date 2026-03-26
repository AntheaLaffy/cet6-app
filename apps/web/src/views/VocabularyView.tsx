import type { LearningRecord, LexiconEntry } from "@cet6/domain/types";
import { EmptyState, MobilePager, Panel, StatusPill } from "@cet6/ui";

export function VocabularyView(props: {
  search: string;
  onSearchChange: (value: string) => void;
  visibleWords: LexiconEntry[];
  selectedWord: LexiconEntry | null;
  recordMap: Map<string, LearningRecord>;
  isMobile: boolean;
  mobilePage: number;
  onMobilePageChange: (index: number) => void;
  onBoundarySwipe?: (direction: "previous" | "next") => void;
  onBoundaryDrag?: (input: { direction: "previous" | "next"; deltaX: number; phase: "move" | "cancel" }) => void;
  onSelectWord: (wordId: string) => void;
  onVerdict: (verdict: "wrong" | "hard" | "good") => void;
}) {
  const pages = [
    <Panel key="queue" title="词汇队列" eyebrow="Due Words" className="vocabulary-queue-panel">
      <div className="search-row">
        <input className="search-input" value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder="搜索单词或中文释义" />
      </div>
      <div className="word-list">
        {props.visibleWords.slice(0, 120).map((entry) => {
          const record = props.recordMap.get(entry.id);
          return (
            <button key={entry.id} className={`list-item ${props.selectedWord?.id === entry.id ? "active" : ""}`} onClick={() => props.onSelectWord(entry.id)}>
              <strong>{entry.headWord}</strong>
              <span>{entry.translations[0]?.text ?? "未收录释义"}</span>
              <StatusPill tone={record?.wrongCount ? "warning" : "neutral"}>{record?.masteryLevel ?? "未学习"}</StatusPill>
            </button>
          );
        })}
      </div>
    </Panel>,
    <Panel key="detail" title={props.selectedWord?.headWord ?? "选择词条"} eyebrow="Study Focus" className="vocabulary-detail-panel">
      {props.selectedWord ? (
        <div className="detail-stack">
          <div className="word-hero">
            <div>
              <h3>{props.selectedWord.headWord}</h3>
              <p>{props.selectedWord.phonetics.us || props.selectedWord.phonetics.common || "暂无音标"}</p>
            </div>
            <StatusPill tone="accent">{props.recordMap.get(props.selectedWord.id)?.masteryLevel ?? "未学习"}</StatusPill>
          </div>

          <div className="chip-row">
            {props.selectedWord.translations.slice(0, 3).map((item) => (
              <span key={`${item.pos}-${item.text}`} className="soft-chip">
                {item.pos} {item.text}
              </span>
            ))}
          </div>

          <div className="detail-columns">
            <div>
              <h4>例句</h4>
              <ul className="copy-list">
                {props.selectedWord.examples.map((example) => (
                  <li key={example.english}>
                    <p>{example.english}</p>
                    <span>{example.chinese}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>真题语境</h4>
              <ul className="copy-list">
                {props.selectedWord.realExamExamples.slice(0, 3).map((example) => (
                  <li key={example.id}>
                    <p>{example.english}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="detail-columns">
            <div>
              <h4>短语</h4>
              <ul className="compact-list">
                {props.selectedWord.phrases.slice(0, 6).map((phrase) => (
                  <li key={phrase.text}>{phrase.text} · {phrase.translation}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>同根词</h4>
              <ul className="compact-list">
                {props.selectedWord.relWords.slice(0, 6).map((word) => (
                  <li key={`${word.text}-${word.pos}`}>{word.pos} {word.text} · {word.translation}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="button-row">
            <button className="danger-button" onClick={() => props.onVerdict("wrong")}>记错了</button>
            <button className="ghost-button" onClick={() => props.onVerdict("hard")}>有点模糊</button>
            <button className="primary-button" onClick={() => props.onVerdict("good")}>记住了</button>
          </div>
        </div>
      ) : (
        <EmptyState title="暂无词条" detail="可以先调整搜索条件或等待内容载入完成。" />
      )}
    </Panel>
  ];

  if (props.isMobile) {
    return <MobilePager ariaLabel="词汇分页" pages={pages} currentPage={props.mobilePage} onPageChange={props.onMobilePageChange} onBoundarySwipe={props.onBoundarySwipe} onBoundaryDrag={props.onBoundaryDrag} showIndicators={false} />;
  }

  return (
    <div className="content-grid">
      {pages}
    </div>
  );
}
