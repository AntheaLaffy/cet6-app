import type { ArchiveSession, ExamSession, LexiconEntry, SpecialCollection } from "@cet6/domain/types";
import type { AudioBinding, MediaAsset } from "@cet6/media/types";

export interface OverviewPayload {
  updatedAt: string;
  contentVersion: string;
  stats: {
    vocabularyCount: number;
    vocabularyWithRealExamExamples: number;
    specialCollectionCount: number;
    structuredSessionCount: number;
    archiveSessionCount: number;
    builtinAudioCount: number;
  };
}

export interface VocabularyPayload {
  total: number;
  withRealExamExamples: number;
  entries: LexiconEntry[];
}

export interface SpecialsPayload {
  updatedAt: string;
  collections: SpecialCollection[];
}

export interface ExamsPayload {
  updatedAt: string;
  structuredSessions: ExamSession[];
  archiveSessions: ArchiveSession[];
  mediaAssets: MediaAsset[];
  builtinBindings: AudioBinding[];
}
