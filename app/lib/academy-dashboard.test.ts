import { describe, expect, it } from "vitest";
import { isProjectBundle, projects } from "../content/projects";
import { branchStorageSlug, saveOutputChoice } from "./output-format";
import { completeStep, createEmptyProgress, getProjectLevelCount, progressKey, saveProgress } from "./progress";
import {
  buildDashboardSnapshot,
  loadDashboardSection,
  loadLastActiveProject,
  loadQuestionNotes,
  loadSavedProjects,
  saveDashboardSection,
  saveLastActiveProject,
  saveQuestionNote,
  toggleSavedProject,
} from "./academy-dashboard";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("academy dashboard state", () => {
  it("isolates malformed values and preserves old progress", () => {
    const storage = new MemoryStorage();
    storage.setItem("feya-dashboard-v1:saved", "broken");
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(completeStep(createEmptyProgress(), 1)));

    expect(loadSavedProjects(storage)).toEqual([]);
    expect(buildDashboardSnapshot(projects, storage, "desktop").started.map((item) => item.project.slug)).toContain("pressure-diary");
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
    const totalLevels = getProjectLevelCount(project);
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
      saveProgress(project.slug, completeStep(createEmptyProgress(), 1), storage, () => times.get(project.slug)!);
    }

    expect(buildDashboardSnapshot(selected, storage, "desktop").started.map((item) => item.project.slug)).toEqual([
      "personal-organizer",
      "content-agent",
      "pressure-diary",
    ]);
  });

  it("keeps legacy started projects in stable catalogue order without timestamps", () => {
    const storage = new MemoryStorage();
    const selected = projects.filter((project) => ["pressure-diary", "personal-organizer", "content-agent"].includes(project.slug));
    for (const project of selected) {
      storage.setItem(progressKey(project.slug), JSON.stringify(completeStep(createEmptyProgress(), 1)));
    }

    expect(buildDashboardSnapshot(selected, storage, "desktop").started.map((item) => item.project.slug)).toEqual(
      selected.map((project) => project.slug),
    );
  });

  it("uses the selected bundle branch factual level total", () => {
    const storage = new MemoryStorage();
    const bundle = projects.find((project) => project.slug === "family-budget")!;
    saveOutputChoice("family-budget", "desktop", "agent", storage);
    let progress = createEmptyProgress();
    for (let id = 1; id <= 18; id += 1) progress = completeStep(progress, id, 19);
    saveProgress(branchStorageSlug("family-budget", "agent", "desktop"), progress, storage);

    expect(buildDashboardSnapshot([bundle], storage, "desktop").items[0]).toMatchObject({
      completedLevels: 18,
      totalLevels: 19,
      percent: 95,
      status: "started",
    });
  });

  it("has no next quest when every catalogue project is complete", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    storage.setItem(progressKey(project.slug), JSON.stringify(progress));

    expect(buildDashboardSnapshot([project], storage, "desktop").next).toBeNull();
  });

  it("ignores old dashboard observation dates instead of treating them as completion", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
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
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
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

  it("ignores an empty question without changing saved notes", () => {
    const storage = new MemoryStorage();
    saveQuestionNote("planner", "Как добавить календарь?", storage, () => "2026-08-14T12:00:00.000Z");

    expect(saveQuestionNote("planner", "   ", storage, () => "2026-08-15T12:00:00.000Z")).toEqual([
      { id: "2026-08-14T12:00:00.000Z", text: "Как добавить календарь?", createdAt: "2026-08-14T12:00:00.000Z" },
    ]);
  });
});
