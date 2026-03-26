import type { ExamSession } from "@cet6/domain/types";
import type { AudioBinding, AudioBindingDraft, MediaAsset } from "./types";
import { createLocalId } from "@cet6/shared/index";

const yearMonthMatcher = /(20\d{2})[.\-_年\s]?(0[1-9]|1[0-2])/u;

function extractPaperNo(input: string) {
  const match = input.match(/第\s*([123])\s*套/u) ?? input.match(/([123])\s*套/u);
  return match ? Number(match[1]) : null;
}

export function extractYearMonth(input: string) {
  const match = input.match(yearMonthMatcher);
  if (!match) {
    return null;
  }
  return `${match[1]}.${match[2]}`;
}

export function suggestBindingsFromFilename(fileName: string, sessions: ExamSession[]): AudioBindingDraft[] {
  const yearMonth = extractYearMonth(fileName);
  if (!yearMonth) {
    return [];
  }
  const session = sessions.find((entry) => entry.yearMonth === yearMonth);
  if (!session) {
    return [];
  }
  const paperNo = extractPaperNo(fileName);
  if (!paperNo) {
    return [
      {
        sessionId: session.id,
        paperIds: session.papers.map((paper) => paper.id),
        overrideScope: "session",
        confidence: 0.9
      }
    ];
  }
  const paper = session.papers.find((entry) => entry.paperNo === paperNo);
  if (!paper) {
    return [];
  }
  return [
    {
      sessionId: session.id,
      paperIds: [paper.id],
      overrideScope: "paper",
      confidence: 0.96
    }
  ];
}

export function materializeBindings(
  asset: MediaAsset,
  drafts: AudioBindingDraft[],
  source: AudioBinding["bindingSource"]
): AudioBinding[] {
  return drafts.map((draft) => ({
    id: createLocalId("binding"),
    sessionId: draft.sessionId,
    paperIds: draft.paperIds,
    sectionType: "listening",
    assetId: asset.id,
    bindingSource: source,
    confidence: draft.confidence,
    overrideScope: draft.overrideScope
  }));
}
