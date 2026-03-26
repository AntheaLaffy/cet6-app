import type { LearningRecord, StudyTask, UserSettings, WrongItemRecord } from "@cet6/domain/types";
import type { AudioBinding, MediaAsset } from "@cet6/media/types";
import { deleteOne, getAll, getOne, putOne } from "./idb";

export const settingsRepository = {
  async getSettings(): Promise<UserSettings | null> {
    const result = await getOne<{ id: string; value: UserSettings }>("settings", "user-settings");
    return result?.value ?? null;
  },
  async saveSettings(value: UserSettings) {
    await putOne("settings", { id: "user-settings", value });
  }
};

export const progressRepository = {
  getAllRecords() {
    return getAll<LearningRecord>("progress");
  },
  saveRecord(record: LearningRecord) {
    return putOne("progress", record);
  }
};

export const wrongItemRepository = {
  getAll() {
    return getAll<WrongItemRecord>("wrongItems");
  },
  save(value: WrongItemRecord) {
    return putOne("wrongItems", value);
  }
};

export const taskRepository = {
  getAll() {
    return getAll<StudyTask>("tasks");
  },
  save(value: StudyTask) {
    return putOne("tasks", value);
  }
};

export const mediaRepository = {
  listAssets() {
    return getAll<(MediaAsset & { blob?: Blob })>("mediaAssets");
  },
  getAsset(id: string) {
    return getOne<(MediaAsset & { blob?: Blob })>("mediaAssets", id);
  },
  saveImportedAsset(asset: MediaAsset, blob: Blob) {
    return putOne("mediaAssets", { ...asset, blob });
  },
  removeAsset(id: string) {
    return deleteOne("mediaAssets", id);
  }
};

export const mediaBindingRepository = {
  getAll() {
    return getAll<AudioBinding>("mediaBindings");
  },
  async getBindingsBySession(sessionId: string) {
    const bindings = await getAll<AudioBinding>("mediaBindings");
    return bindings.filter((binding) => binding.sessionId === sessionId);
  },
  upsertBinding(binding: AudioBinding) {
    return putOne("mediaBindings", binding);
  },
  removeBinding(id: string) {
    return deleteOne("mediaBindings", id);
  },
  async findUnmatchedPapers(validPaperIds: string[]) {
    const bindings = await getAll<AudioBinding>("mediaBindings");
    return bindings.filter((binding) => binding.paperIds.every((paperId) => !validPaperIds.includes(paperId)));
  }
};
