import { describe, expect, it } from "vitest";
import { projects } from "../content/projects";
import { completeStep, createEmptyProgress, getProjectLevelCount, progressKey } from "./progress";
import {
  buildDashboardSnapshot,
  loadDashboardSection,
  loadLastActiveProject,
  loadSavedProjects,
  saveDashboardSection,
  saveLastActiveProject,
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

  it("places a finished project in portfolio and records its completion date", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(progress));

    const snapshot = buildDashboardSnapshot([project], storage, "desktop", () => "2026-08-14");

    expect(snapshot.completed).toHaveLength(1);
    expect(snapshot.completed[0].completedAt).toBe("2026-08-14");
  });

  it("replaces a malformed completion-date collection before saving", () => {
    const storage = new MemoryStorage();
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const totalLevels = getProjectLevelCount(project);
    let progress = createEmptyProgress();
    for (let id = 1; id <= totalLevels; id += 1) progress = completeStep(progress, id, totalLevels);
    storage.setItem(progressKey("pressure-diary"), JSON.stringify(progress));
    storage.setItem("feya-dashboard-v1:completed-at", "[]");

    buildDashboardSnapshot([project], storage, "desktop", () => "2026-08-14");
    const snapshot = buildDashboardSnapshot([project], storage, "desktop", () => "2026-08-15");

    expect(snapshot.completed[0].completedAt).toBe("2026-08-14");
  });
});
