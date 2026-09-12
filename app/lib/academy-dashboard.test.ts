import { describe, expect, it } from "vitest";
import { isProjectBundle, projects } from "../content/projects";
import { branchStorageSlug, saveOutputChoice } from "./output-format";
import { completeStep, createEmptyProgress, getProjectLevelCount, journeyRevisionInfo, progressKey, resetProgress, saveProgress } from "./progress";
import {
  buildDashboardSnapshot,
  loadDashboardSection,
  loadLastActiveProject,
  loadQuestionNotes,
  loadQuestionNotesResult,
  loadSavedProjects,
  saveDashboardSection,
  saveLastActiveProject,
  saveQuestionNote,
  saveQuestionNoteResult,
  toggleSavedProject,
} from "./academy-dashboard";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function currentProgress(slug: string, total: number, completed = 1) {
  let progress = createEmptyProgress();
  for (let id = 1; id <= completed; id += 1) progress = completeStep(progress, id, total);
  const info = journeyRevisionInfo(slug, total);
  return { ...progress, ...(info ? { journeyRevision: info.revision } : {}) };
}

describe("academy dashboard state", () => {
  it("lists every concrete result in its own week with independent branch progress", () => {
    const storage = new MemoryStorage();
    const planning = projects.find((project) => project.slug === "planning")!;
    if (!isProjectBundle(planning)) throw new Error("Expected planning bundle");
    const slug = branchStorageSlug("planning", "service", "mobile");
    const total = getProjectLevelCount(planning.formats.service);
    saveProgress(slug, currentProgress(slug, total, 2), storage, undefined, total);
    const snapshot = buildDashboardSnapshot(projects, storage, "mobile");
    const variants = snapshot.items.flatMap((item) => item.variants ?? [item]);
    const week2 = variants.filter((item) => !isProjectBundle(item.project) && item.project.week === 2);
    expect(week2).toHaveLength(8);
    expect(week2.every((item) => !isProjectBundle(item.project) && item.project.kind === "agent")).toBe(true);
    expect(new Set(variants.map((item) => item.project.slug)).size).toBe(variants.length);
    expect(variants.find((item) => item.catalogSlug === "planning" && item.output === "service")).toMatchObject({ completedLevels: 2, status: "started" });
    expect(variants.find((item) => item.catalogSlug === "planning" && item.output === "agent")).toMatchObject({ completedLevels: 0, status: "new" });
  });
  it("isolates malformed values and archives a lone obsolete first step", () => {
    const storage = new MemoryStorage();
    storage.setItem("feya-dashboard-v1:saved", "broken");
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(completeStep(createEmptyProgress(), 1)));

    expect(loadSavedProjects(storage)).toEqual([]);
    const item = buildDashboardSnapshot(projects, storage, "desktop").items.find((entry) => entry.project.slug === "pressure-diary")!;
    expect(item).toMatchObject({ completedLevels: 0, status: "new" });
  });

  it("saves one project once and removes it on the next click", () => {
    const storage = new MemoryStorage();

    expect(toggleSavedProject("planner", storage)).toEqual(["planner"]);
    expect(toggleSavedProject("planner", storage)).toEqual([]);
  });

  it("keeps the last active quest per learning format", () => {
    const storage = new MemoryStorage();
    saveLastActiveProject("planner", "desktop", storage);
    saveLastActiveProject("pressure-diary", "mobile", storage);

    expect(loadLastActiveProject("desktop", storage)).toBe("planner");
    expect(loadLastActiveProject("mobile", storage)).toBe("pressure-diary");
  });

  it("restores only a known dashboard section", () => {
    const storage = new MemoryStorage();
    saveDashboardSection("portfolio", storage);

    expect(loadDashboardSection(storage)).toBe("portfolio");
    storage.setItem("feya-dashboard-v1:section", "unknown");
    expect(loadDashboardSection(storage)).toBe("home");
  });

  it("keeps a legacy finished project without inventing a completion date", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = 19;
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(progress));

    const snapshot = buildDashboardSnapshot([project], storage, "desktop");

    expect(snapshot.completed).toHaveLength(1);
    expect(snapshot.completed[0].completedAt).toBeUndefined();
    expect(storage.getItem("feya-dashboard-v1:completed-at:desktop")).toBeNull();
  });

  it("orders started projects by their latest saved progress", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["pressure-diary", "personal-organizer", "content-agent"].includes(project.slug));
    const times = new Map([
      ["pressure-diary", "2026-08-15T10:00:00.000Z"],
      ["personal-organizer", "2026-08-15T12:00:00.000Z"],
      ["content-agent", "2026-08-15T11:00:00.000Z"],
    ]);
    for (const project of selected) {
      const total = getProjectLevelCount(project);
      saveProgress(project.slug, currentProgress(project.slug, total), storage, () => times.get(project.slug)!, total);
    }

    expect(buildDashboardSnapshot(selected, storage, "desktop").started.map((item) => item.project.slug)).toEqual([
      "personal-organizer",
      "content-agent",
      "pressure-diary",
    ]);
  });

  it("ignores an untouched last-active quest when a project is actually started", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["install-codex", "pressure-diary"].includes(project.slug));
    saveLastActiveProject("install-codex", "desktop", storage);
    const pressure = selected.find((project) => project.slug === "pressure-diary")!;
    const total = getProjectLevelCount(pressure);
    saveProgress("pressure-diary", currentProgress("pressure-diary", total), storage, () => "2026-08-15T12:00:00.000Z", total);

    expect(buildDashboardSnapshot(selected, storage, "desktop").next?.project.slug).toBe("pressure-diary");
  });

  it("ignores an untouched last-active quest when choosing the current-week recommendation", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["install-codex", "pressure-diary"].includes(project.slug));
    saveLastActiveProject("pressure-diary", "desktop", storage);

    expect(buildDashboardSnapshot(selected, storage, "desktop").next?.project.slug).toBe("install-codex");
  });

  it("does not let a reset last-active quest replace the current-week recommendation", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["install-codex", "pressure-diary"].includes(project.slug));
    saveProgress("pressure-diary", completeStep(createEmptyProgress(), 1), storage);
    saveLastActiveProject("pressure-diary", "desktop", storage);
    resetProgress("pressure-diary", storage);

    expect(buildDashboardSnapshot(selected, storage, "desktop").next?.project.slug).toBe("install-codex");
  });

  it("keeps legacy started projects in stable catalogue order without timestamps", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["pressure-diary", "personal-organizer", "content-agent"].includes(project.slug));
    for (const project of selected) {
      const total = getProjectLevelCount(project);
      storage.setItem(progressKey(project.slug), JSON.stringify(currentProgress(project.slug, total)));
    }

    expect(buildDashboardSnapshot(selected, storage, "desktop").started.map((item) => item.project.slug)).toEqual(
      selected.map((project) => project.slug),
    );
  });

  it("uses the selected bundle branch factual level total", () => {
    const storage = new MemoryStorage();
    const bundle = projects.find((project) => project.slug === "family-budget")!;
    saveOutputChoice("family-budget", "desktop", "agent", storage);
    const storageSlug = branchStorageSlug("family-budget", "agent", "desktop");
    const total = 8;
    const progress = currentProgress(storageSlug, total, 7);
    saveProgress(storageSlug, progress, storage, () => new Date(), total);

    expect(buildDashboardSnapshot([bundle], storage, "desktop").items[0]).toMatchObject({
      completedLevels: 7,
      totalLevels: 8,
      percent: 88,
      status: "started",
    });
  });

  it("has no next quest when every catalogue project is complete", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    const info = journeyRevisionInfo(project.slug, totalLevels)!;
    storage.setItem(progressKey(project.slug), JSON.stringify({ ...progress, journeyRevision: info.revision }));

    expect(buildDashboardSnapshot([project], storage, "desktop").next).toBeNull();
  });

  it("ignores old dashboard observation dates instead of treating them as completion", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = 19;
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(progress));
    storage.setItem("feya-dashboard-v1:completed-at:desktop", "[]");

    const snapshot = buildDashboardSnapshot([project], storage, "desktop");

    expect(snapshot.completed[0].completedAt).toBeUndefined();
    expect(storage.getItem("feya-dashboard-v1:completed-at:desktop")).toBe("[]");
  });

  it("reads factual completion dates independently from desktop and mobile progress", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
    const progress = currentProgress("pressure-diary", totalLevels, totalLevels);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify({ ...progress, completedAt: "2026-08-14" }));
    storage.setItem(progressKey("mobile:pressure-diary"), JSON.stringify({ ...progress, completedAt: "2026-08-15" }));

    const desktop = buildDashboardSnapshot([project], storage, "desktop");
    const mobile = buildDashboardSnapshot([project], storage, "mobile");

    expect(desktop.completed[0].completedAt).toBe("2026-08-14");
    expect(mobile.completed[0].completedAt).toBe("2026-08-15");
  });

  it("exposes the selected bundle branch and every factually completed output", () => {
    const storage = new MemoryStorage();
    const bundle = projects.find((project) => project.slug === "planning");
    if (!bundle || !isProjectBundle(bundle)) throw new Error("Нет bundle-проекта planning");
    saveOutputChoice("planning", "desktop", "agent", storage);
    for (const format of ["service", "agent"] as const) {
      const branch = bundle.formats[format];
      const total = getProjectLevelCount(branch);
      let progress = createEmptyProgress();
      for (let id = 1; id <= total; id += 1) progress = completeStep(progress, id, total);
      storage.setItem(progressKey(branchStorageSlug("planning", format, "desktop")), JSON.stringify({
        ...progress,
        journeyRevision: "planning-20260908",
        completedAt: format === "service" ? "2026-08-14" : "2026-08-15",
      }));
    }

    expect(buildDashboardSnapshot([bundle], storage, "desktop").items[0]).toMatchObject({
      output: "agent",
      completedOutputs: [
        { format: "service", completedAt: "2026-08-14" },
        { format: "agent", completedAt: "2026-08-15" },
      ],
    });
  });

  it("recovers from malformed question-note storage for a scope", () => {
    const storage = new MemoryStorage();
    storage.setItem("feya-dashboard-v1:notes:planner", "broken");

    expect(loadQuestionNotes("planner", storage)).toEqual([]);
  });

  it("trims a saved question and uses the supplied timestamp", () => {
    const storage = new MemoryStorage();

    expect(saveQuestionNote("planner", "  Как добавить календарь?  ", storage, () => "2026-08-14T12:00:00.000Z")).toEqual([
      { id: "2026-08-14T12:00:00.000Z", text: "Как добавить календарь?", createdAt: "2026-08-14T12:00:00.000Z" },
    ]);
    expect(loadQuestionNotes("planner", storage)).toEqual([
      { id: "2026-08-14T12:00:00.000Z", text: "Как добавить календарь?", createdAt: "2026-08-14T12:00:00.000Z" },
    ]);
  });

  it("keeps note ids unique when two questions share one millisecond", () => {
    const storage = new MemoryStorage();
    const now = () => "2026-08-14T12:00:00.000Z";

    saveQuestionNote("planner", "Первый вопрос", storage, now);
    const notes = saveQuestionNote("planner", "Второй вопрос", storage, now);

    expect(notes).toEqual([
      { id: "2026-08-14T12:00:00.000Z", text: "Первый вопрос", createdAt: "2026-08-14T12:00:00.000Z" },
      { id: "2026-08-14T12:00:00.000Z-2", text: "Второй вопрос", createdAt: "2026-08-14T12:00:00.000Z" },
    ]);
    expect(new Set(notes.map((note) => note.id)).size).toBe(notes.length);
    expect(notes.map((note) => note.createdAt)).toEqual([now(), now()]);
  });

  it("ignores an empty question without changing saved notes", () => {
    const storage = new MemoryStorage();
    saveQuestionNote("planner", "Как добавить календарь?", storage, () => "2026-08-14T12:00:00.000Z");

    expect(saveQuestionNote("planner", "   ", storage, () => "2026-08-15T12:00:00.000Z")).toEqual([
      { id: "2026-08-14T12:00:00.000Z", text: "Как добавить календарь?", createdAt: "2026-08-14T12:00:00.000Z" },
    ]);
  });

  it("does not crash when browser note storage cannot be read", () => {
    const storage = {
      getItem() { throw new DOMException("Blocked", "SecurityError"); },
      setItem() { throw new Error("setItem must not run after a read failure"); },
      removeItem() {},
    };

    expect(() => loadQuestionNotes("planner", storage)).not.toThrow();
    expect(loadQuestionNotesResult("planner", storage)).toEqual({ notes: [], error: "storage" });
    expect(() => saveQuestionNote("planner", "Не потерять вопрос", storage)).not.toThrow();
    expect(saveQuestionNoteResult("planner", "Не потерять вопрос", storage)).toEqual({ notes: [], saved: false, error: "storage" });
  });

  it("reports an unsaved question when browser storage rejects the write", () => {
    const storage = {
      getItem() { return null; },
      setItem() { throw new DOMException("Quota exceeded", "QuotaExceededError"); },
      removeItem() {},
    };

    expect(saveQuestionNoteResult("planner", "Не потерять вопрос", storage)).toEqual({ notes: [], saved: false, error: "storage" });
    expect(saveQuestionNote("planner", "Не потерять вопрос", storage)).toEqual([]);
  });
});
