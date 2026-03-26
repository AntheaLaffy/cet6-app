export type MediaKind = "audio";

export type MediaSourceType = "builtin" | "imported";

export interface MediaAsset {
  id: string;
  kind: MediaKind;
  sourceType: MediaSourceType;
  storageRef: string | null;
  mimeType: string;
  originLabel: string;
  createdAt: string;
  sessionId?: string;
  duration?: number;
  checksum?: string;
}

export interface AudioBinding {
  id: string;
  sessionId: string;
  paperIds: string[];
  sectionType: "listening";
  assetId: string;
  bindingSource: "builtin" | "imported";
  confidence: number;
  overrideScope: "session" | "paper";
}

export interface ImportCandidate {
  file: File;
  mediaAsset: MediaAsset;
  suggestedBindings: AudioBindingDraft[];
  warnings: string[];
}

export interface AudioBindingDraft {
  sessionId: string;
  paperIds: string[];
  overrideScope: "session" | "paper";
  confidence: number;
}

export interface ImportSourceAdapter<TInput> {
  scan(input: TInput): Promise<File[]>;
  extractMetadata(file: File): Promise<MediaAsset>;
  suggestBindings(file: File): AudioBindingDraft[];
  validate(file: File): string[];
  persist(file: File): Promise<void>;
}
