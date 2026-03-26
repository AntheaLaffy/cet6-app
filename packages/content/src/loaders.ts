import type { ExamsPayload, OverviewPayload, SpecialsPayload, VocabularyPayload } from "./types";

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function loadOverview() {
  return loadJson<OverviewPayload>("/generated/overview.json");
}

export function loadVocabulary() {
  return loadJson<VocabularyPayload>("/generated/vocabulary.json");
}

export function loadSpecials() {
  return loadJson<SpecialsPayload>("/generated/specials.json");
}

export function loadExams() {
  return loadJson<ExamsPayload>("/generated/exams.json");
}
