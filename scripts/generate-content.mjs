import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resourcesDir = path.join(rootDir, "CET6-Resources");
const publicDir = path.join(rootDir, "apps", "web", "public");
const generatedDir = path.join(publicDir, "generated");
const copiedAssetsDir = path.join(publicDir, "content-assets");

const recentSessions = new Set([
  "2022.06",
  "2022.09",
  "2022.12",
  "2023.06",
  "2023.12",
  "2024.06",
  "2024.12",
  "2025.06"
]);

const markdownFiles = [
  { id: "guide", file: "一些建议.md", title: "备考指南" },
  { id: "writing", file: "可用作文素材.md", title: "作文素材" },
  { id: "translation", file: "历年翻译汇总.md", title: "翻译专题" },
  { id: "vocab-notes", file: "可用词汇整理.md", title: "词汇整理" }
];

const vocabFiles = [
  "CET6_1.json",
  "CET6_2.json",
  "CET6_3.json",
  "CET6luan_1.json"
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function sanitizeSegment(input) {
  return input
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function listFilesRecursive(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath));
      continue;
    }
    results.push(fullPath);
  }
  return results;
}

function extractPaperNo(text) {
  const matchers = [
    /第\s*([123])\s*套/u,
    /([123])\s*套/u,
    /paper\s*([123])/iu
  ];
  for (const matcher of matchers) {
    const match = text.match(matcher);
    if (match) {
      return Number(match[1]);
    }
  }
  return null;
}

function classifyResource(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  const label = baseName.replace(/\.[^.]+$/, "");
  const lower = `${filePath} ${baseName}`.toLowerCase();

  if (ext === ".mp3") {
    return { kind: "audio", label };
  }
  if (ext === ".txt") {
    return { kind: "note", label };
  }
  if (lower.includes("解析") || lower.includes("答案")) {
    return { kind: "analysis", label };
  }
  if (lower.includes("真题")) {
    return { kind: "paper", label };
  }
  if (ext === ".docx" || ext === ".doc" || ext === ".pdf") {
    return { kind: "document", label };
  }
  return { kind: "other", label };
}

function copyRecentAsset(sessionId, fullPath) {
  const targetDir = path.join(copiedAssetsDir, sessionId);
  ensureDir(targetDir);
  const ext = path.extname(fullPath).toLowerCase();
  const baseName = sanitizeSegment(path.basename(fullPath, ext)) || "asset";
  let candidate = `${baseName}${ext}`;
  let counter = 1;
  while (fs.existsSync(path.join(targetDir, candidate))) {
    candidate = `${baseName}-${counter}${ext}`;
    counter += 1;
  }
  fs.copyFileSync(fullPath, path.join(targetDir, candidate));
  return `/content-assets/${sessionId}/${candidate}`;
}

function parseVocabEntry(rawEntry) {
  const wordContent = rawEntry?.content?.word?.content ?? {};
  const translations = (wordContent.trans ?? []).map((item) => ({
    pos: item.pos ?? "",
    text: item.tranCn ?? item.tranOther ?? ""
  }));
  const examples = (wordContent.sentence?.sentences ?? []).slice(0, 3).map((item) => ({
    english: item.sContent ?? "",
    chinese: item.sCn ?? ""
  }));
  const examExamples = (wordContent.realExamSentence?.sentences ?? []).slice(0, 5).map((item, index) => ({
    id: `${rawEntry.headWord}-${index}`,
    english: item.sContent ?? "",
    source: item.sourceInfo ?? {}
  }));
  const phrases = (wordContent.phrase?.phrases ?? []).slice(0, 8).map((item) => ({
    text: item.pContent ?? "",
    translation: item.pCn ?? ""
  }));
  const relWords = (wordContent.relWord?.rels ?? []).flatMap((group) =>
    (group.words ?? []).map((word) => ({
      pos: group.pos ?? "",
      text: word.hwd ?? "",
      translation: word.tran ?? ""
    }))
  );

  return {
    id: rawEntry.headWord.toLowerCase(),
    headWord: rawEntry.headWord,
    phonetics: {
      us: wordContent.usphone ?? "",
      uk: wordContent.ukphone ?? "",
      common: wordContent.phone ?? ""
    },
    translations,
    examples,
    realExamExamples: examExamples,
    phrases,
    relWords,
    frequencyRank: rawEntry.wordRank ?? 0,
    sourceBooks: [rawEntry.bookId],
    hasExercise: Boolean(wordContent.exam),
    exerciseCount: (wordContent.exam ?? []).length
  };
}

function mergeVocabEntries(current, next) {
  const merged = { ...current };
  merged.sourceBooks = Array.from(new Set([...current.sourceBooks, ...next.sourceBooks]));
  merged.frequencyRank = Math.min(current.frequencyRank || Number.MAX_SAFE_INTEGER, next.frequencyRank || Number.MAX_SAFE_INTEGER);

  if (next.realExamExamples.length > current.realExamExamples.length) {
    merged.realExamExamples = next.realExamExamples;
  }
  if (next.examples.length > current.examples.length) {
    merged.examples = next.examples;
  }
  if (next.phrases.length > current.phrases.length) {
    merged.phrases = next.phrases;
  }
  if (next.relWords.length > current.relWords.length) {
    merged.relWords = next.relWords;
  }
  if (next.translations.length > current.translations.length) {
    merged.translations = next.translations;
  }
  merged.hasExercise = current.hasExercise || next.hasExercise;
  merged.exerciseCount = Math.max(current.exerciseCount, next.exerciseCount);
  return merged;
}

function loadVocabulary() {
  const vocabMap = new Map();
  for (const fileName of vocabFiles) {
    const fullPath = path.join(rootDir, fileName);
    const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const raw = JSON.parse(line);
      const parsed = parseVocabEntry(raw);
      const existing = vocabMap.get(parsed.id);
      if (existing) {
        vocabMap.set(parsed.id, mergeVocabEntries(existing, parsed));
      } else {
        vocabMap.set(parsed.id, parsed);
      }
    }
  }

  const vocabulary = Array.from(vocabMap.values()).sort((left, right) => {
    if (left.frequencyRank !== right.frequencyRank) {
      return left.frequencyRank - right.frequencyRank;
    }
    return left.headWord.localeCompare(right.headWord);
  });

  return {
    total: vocabulary.length,
    withRealExamExamples: vocabulary.filter((entry) => entry.realExamExamples.length > 0).length,
    entries: vocabulary
  };
}

function loadSpecialCollections() {
  return markdownFiles.map((config) => {
    const fullPath = path.join(resourcesDir, config.file);
    const raw = fs.readFileSync(fullPath, "utf8");
    const sections = raw
      .split(/\n(?=#{1,6}\s)/g)
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk, index) => {
        const lines = chunk.split(/\r?\n/).filter(Boolean);
        const headingLine = lines[0].startsWith("#") ? lines.shift() : null;
        return {
          id: `${config.id}-${index + 1}`,
          title: headingLine ? headingLine.replace(/^#+\s*/, "").trim() : `段落 ${index + 1}`,
          body: lines.join("\n").trim()
        };
      });
    return {
      id: config.id,
      title: config.title,
      sourceFile: config.file,
      sections
    };
  });
}

function buildSessionRecord(sessionFolderName) {
  const yearMonth = sessionFolderName.replace(/^CET6_/, "");
  const sessionId = `cet6-${yearMonth.replace(".", "-")}`;
  const fullPath = path.join(resourcesDir, sessionFolderName);
  const files = listFilesRecursive(fullPath);
  const isStructured = recentSessions.has(yearMonth);
  const papers = new Map(
    [1, 2, 3].map((paperNo) => [
      paperNo,
      {
        id: `${sessionId}-paper-${paperNo}`,
        paperNo,
        title: `${yearMonth} 第 ${paperNo} 套`,
        resources: [],
        notes: []
      }
    ])
  );

  const sharedResources = [];
  const mediaAssets = [];
  const builtinBindings = [];
  const audioCandidates = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (![".pdf", ".doc", ".docx", ".mp3", ".txt"].includes(ext)) {
      continue;
    }

    const relative = path.relative(fullPath, filePath);
    const paperNo = extractPaperNo(relative);
    const info = classifyResource(filePath);
    const copiedPath = isStructured ? copyRecentAsset(sessionId, filePath) : null;
    const resource = {
      id: `${sessionId}-${sanitizeSegment(relative)}`,
      label: info.label,
      kind: info.kind,
      sourcePath: toPosix(path.relative(rootDir, filePath)),
      publicPath: copiedPath
    };

    if (info.kind === "audio") {
      const assetId = `${sessionId}-builtin-audio-${mediaAssets.length + 1}`;
      const mediaAsset = {
        id: assetId,
        kind: "audio",
        sourceType: "builtin",
        storageRef: copiedPath,
        mimeType: "audio/mpeg",
        originLabel: info.label,
        createdAt: new Date().toISOString(),
        sessionId
      };
      mediaAssets.push(mediaAsset);
      audioCandidates.push({ assetId, paperNo, label: info.label });
      continue;
    }

    if (info.kind === "note") {
      if (paperNo && papers.has(paperNo)) {
        papers.get(paperNo).notes.push(resource);
      } else {
        sharedResources.push(resource);
      }
      continue;
    }

    if (paperNo && papers.has(paperNo)) {
      papers.get(paperNo).resources.push(resource);
    } else {
      sharedResources.push(resource);
    }
  }

  if (audioCandidates.length === 1) {
    builtinBindings.push({
      id: `${sessionId}-binding-session`,
      sessionId,
      paperIds: Array.from(papers.values()).map((paper) => paper.id),
      sectionType: "listening",
      assetId: audioCandidates[0].assetId,
      bindingSource: "builtin",
      confidence: 1,
      overrideScope: "session"
    });
  } else {
    for (const candidate of audioCandidates) {
      if (!candidate.paperNo || !papers.has(candidate.paperNo)) {
        continue;
      }
      builtinBindings.push({
        id: `${sessionId}-binding-paper-${candidate.paperNo}`,
        sessionId,
        paperIds: [papers.get(candidate.paperNo).id],
        sectionType: "listening",
        assetId: candidate.assetId,
        bindingSource: "builtin",
        confidence: 1,
        overrideScope: "paper"
      });
    }
  }

  const session = {
    id: sessionId,
    label: yearMonth,
    yearMonth,
    isStructured,
    sharedResources,
    papers: Array.from(papers.values()),
    notes: sharedResources.filter((resource) => resource.kind === "note").map((resource) => resource.label)
  };

  return {
    session,
    mediaAssets,
    builtinBindings,
    fileCount: files.length
  };
}

function loadExamContent() {
  const sessionFolders = fs
    .readdirSync(resourcesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^CET6_\d{4}\.\d{2}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  const structuredSessions = [];
  const archiveSessions = [];
  const mediaAssets = [];
  const builtinBindings = [];

  for (const sessionFolder of sessionFolders) {
    const record = buildSessionRecord(sessionFolder);
    if (record.session.isStructured) {
      structuredSessions.push(record.session);
      mediaAssets.push(...record.mediaAssets);
      builtinBindings.push(...record.builtinBindings);
    } else {
      archiveSessions.push({
        id: record.session.id,
        label: record.session.label,
        yearMonth: record.session.yearMonth,
        fileCount: record.fileCount
      });
    }
  }

  structuredSessions.sort((left, right) => right.yearMonth.localeCompare(left.yearMonth));
  archiveSessions.sort((left, right) => right.yearMonth.localeCompare(left.yearMonth));

  return { structuredSessions, archiveSessions, mediaAssets, builtinBindings };
}

function writeJson(fileName, payload) {
  fs.writeFileSync(path.join(generatedDir, fileName), JSON.stringify(payload, null, 2));
}

function main() {
  emptyDir(generatedDir);
  emptyDir(copiedAssetsDir);

  const vocabulary = loadVocabulary();
  const specials = loadSpecialCollections();
  const examContent = loadExamContent();

  writeJson("vocabulary.json", vocabulary);
  writeJson("specials.json", {
    updatedAt: new Date().toISOString(),
    collections: specials
  });
  writeJson("exams.json", {
    updatedAt: new Date().toISOString(),
    structuredSessions: examContent.structuredSessions,
    archiveSessions: examContent.archiveSessions,
    mediaAssets: examContent.mediaAssets,
    builtinBindings: examContent.builtinBindings
  });
  writeJson("overview.json", {
    updatedAt: new Date().toISOString(),
    contentVersion: new Date().toISOString().slice(0, 10),
    stats: {
      vocabularyCount: vocabulary.total,
      vocabularyWithRealExamExamples: vocabulary.withRealExamExamples,
      specialCollectionCount: specials.length,
      structuredSessionCount: examContent.structuredSessions.length,
      archiveSessionCount: examContent.archiveSessions.length,
      builtinAudioCount: examContent.mediaAssets.length
    }
  });
}

main();
