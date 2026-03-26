import type { ExamSession } from "@cet6/domain/types";
import type { AudioBindingDraft, ImportSourceAdapter, MediaAsset } from "./types";
import { suggestBindingsFromFilename } from "./matching";
import { createLocalId } from "@cet6/shared/index";

async function sha256(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function getAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to read duration for ${file.name}`));
    };
  });
}

export class LocalFileImportSourceAdapter implements ImportSourceAdapter<File[]> {
  constructor(private readonly sessions: ExamSession[]) {}

  async scan(input: File[]) {
    return input.filter((file) => file.type.startsWith("audio/") || file.name.toLowerCase().endsWith(".mp3"));
  }

  async extractMetadata(file: File): Promise<MediaAsset> {
    return {
      id: createLocalId("media"),
      kind: "audio",
      sourceType: "imported",
      storageRef: null,
      mimeType: file.type || "audio/mpeg",
      originLabel: file.name,
      createdAt: new Date().toISOString(),
      duration: await getAudioDuration(file),
      checksum: await sha256(file)
    };
  }

  suggestBindings(file: File): AudioBindingDraft[] {
    return suggestBindingsFromFilename(file.name, this.sessions);
  }

  validate(file: File) {
    const warnings: string[] = [];
    if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) {
      warnings.push("当前只支持音频文件。");
    }
    if (file.size === 0) {
      warnings.push("文件为空，无法导入。");
    }
    return warnings;
  }

  async persist() {
    return;
  }
}
