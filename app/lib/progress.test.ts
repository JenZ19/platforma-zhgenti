import { afterEach, describe, expect, it, vi } from "vitest";
import { projects } from "../content/projects";
import { branchStorageSlug, saveOutputChoice } from "./output-format";
import {
  completeStep,
  createEmptyProgress,
  getAcademyStats,
  getProjectLevelCount,
  isStepUnlocked,
  journeyRevisionInfo,
  loadProgress,
  parseProgress,
  progressKey,
  saveProgress,
} from "./progress";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function currentProgress(slug: string, total: number, completed: number) {
  let progress = createEmptyProgress();
  for (let id = 1; id <= completed; id += 1) progress = completeStep(progress, id, total);
  const info = journeyRevisionInfo(slug, total);
  return { ...progress, ...(info ? { journeyRevision: info.revision } : {}) };
}

describe("academy progress", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("keeps progress isolated by project slug", () => {
    expect(progressKey("planner")).not.toBe(progressKey("recipe-book"));
    const storage = new MemoryStorage();
    saveProgress("planner", completeStep(createEmptyProgress(), 1), storage);
    expect(loadProgress("planner", storage).completed).toEqual([1]);
    expect(loadProgress("recipe-book", storage).completed).toEqual([]);
  });

  it("records a stable updatedAt timestamp when progress is saved", () => {
    const storage = new MemoryStorage();

    saveProgress(
      "planner",
      completeStep(createEmptyProgress(), 1),
      storage,
      () => "2026-08-15T10:30:00.000Z",
    );

    expect(loadProgress("planner", storage).updatedAt).toBe("2026-08-15T10:30:00.000Z");
    expect(parseProgress(JSON.stringify({ version: 1, activeStep: 2, completed: [1], score: 10 }))).not.toHaveProperty("updatedAt");
  });

  it("records completedAt only when the final level is actually saved", () => {
    const storage = new MemoryStorage();
    let finished = createEmptyProgress();
    for (let id = 1; id <= 17; id += 1) finished = completeStep(finished, id, 17);

    saveProgress("finished", finished, storage, () => new Date(2026, 7, 15, 21, 45));
    saveProgress("started", completeStep(createEmptyProgress(), 1), storage, () => "2026-08-16T08:00:00.000Z");

    expect(loadProgress("finished", storage).completedAt).toBe("2026-08-15");
    expect(loadProgress("started", storage)).not.toHaveProperty("completedAt");
  });

  it("uses the learner's local calendar date at a UTC boundary", () => {
    const NativeDate = Date;
    class BoundaryDate extends NativeDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(args.length ? args[0] : "2026-08-14T21:30:00.000Z");
      }
      getFullYear() { return 2026; }
      getMonth() { return 7; }
      getDate() { return 15; }
    }
    vi.stubGlobal("Date", BoundaryDate);
    const storage = new MemoryStorage();
    let finished = createEmptyProgress();
    for (let id = 1; id <= 17; id += 1) finished = completeStep(finished, id, 17);

    saveProgress("local-boundary", finished, storage);

    expect(loadProgress("local-boundary", storage).updatedAt).toBe("2026-08-14T21:30:00.000Z");
    expect(loadProgress("local-boundary", storage).completedAt).toBe("2026-08-15");
  });

  it("does not invent a completion date when legacy completed progress is saved again", () => {
    const storage = new MemoryStorage();
    const legacy = {
      version: 1 as const,
      activeStep: 17,
      completed: Array.from({ length: 17 }, (_, index) => index + 1),
      score: 170,
    };
    storage.setItem(progressKey("legacy-finished"), JSON.stringify(legacy));

    saveProgress("legacy-finished", legacy, storage, () => "2026-08-15T21:45:00.000Z");

    expect(loadProgress("legacy-finished", storage)).not.toHaveProperty("completedAt");
  });

  it("keeps only real ISO calendar completion dates from stored progress", () => {
    const valid = parseProgress(JSON.stringify({
      version: 1,
      activeStep: 17,
      completed: Array.from({ length: 17 }, (_, index) => index + 1),
      score: 170,
      completedAt: "2024-02-29",
    }));
    const impossible = parseProgress(JSON.stringify({
      version: 1,
      activeStep: 17,
      completed: Array.from({ length: 17 }, (_, index) => index + 1),
      score: 170,
      completedAt: "2026-02-31",
    }));
    const incomplete = parseProgress(JSON.stringify({
      version: 1,
      activeStep: 2,
      completed: [1],
      score: 10,
      completedAt: "2026-08-15",
    }));

    expect(valid.completedAt).toBe("2024-02-29");
    expect(impossible).not.toHaveProperty("completedAt");
    expect(incomplete).not.toHaveProperty("completedAt");
  });

  it("unlocks sequentially and never awards a level twice", () => {
    const empty = createEmptyProgress();
    expect(isStepUnlocked(empty, 1)).toBe(true);
    expect(completeStep(empty, 2)).toEqual(empty);
    const first = completeStep(empty, 1);
    expect(first).toMatchObject({ activeStep: 2, completed: [1], score: 10 });
    expect(completeStep(first, 1)).toEqual(first);
    expect(isStepUnlocked(first, 2)).toBe(true);
  });

  it("continues to the next level after reopening an already completed level", () => {
    const completedFirst = completeStep(createEmptyProgress(), 1);
    const reopenedFirst = { ...completedFirst, activeStep: 1 };

    expect(completeStep(reopenedFirst, 1)).toEqual({
      version: 1,
      activeStep: 2,
      completed: [1],
      score: 10,
    });
  });

  it("finishes a short quest on its actual last level", () => {
    let progress = createEmptyProgress();
    for (let id = 1; id <= 8; id += 1) progress = completeStep(progress, id, 8);

    expect(progress.activeStep).toBe(8);
    expect(progress.completed).toHaveLength(8);
    expect(parseProgress(JSON.stringify(progress), 8)).toEqual(progress);
  });

  it("recovers safely from malformed storage", () => {
    expect(parseProgress("broken json")).toEqual(createEmptyProgress());
    expect(parseProgress('{"version":2,"completed":[1]}')).toEqual(createEmptyProgress());
  });

  it("calculates statistics by catalogue card instead of summing both branches", () => {
    const storage = new MemoryStorage();
    const planning = projects.find((project) => project.slug === "planning")!;
    if (!("formats" in planning)) throw new Error("planning must be a bundle");
    const agentTotal = getProjectLevelCount(planning.formats.agent);
    const serviceTotal = getProjectLevelCount(planning.formats.service);
    const pressure = projects.find((project) => project.slug === "pressure-diary")!;
    const pressureTotal = getProjectLevelCount(pressure);
    const finished = currentProgress(branchStorageSlug("planning", "agent", "desktop"), agentTotal, agentTotal);
    saveOutputChoice("planning", "desktop", "agent", storage);
    saveProgress(branchStorageSlug("planning", "agent", "desktop"), finished, storage, () => new Date(), agentTotal);
    saveProgress(branchStorageSlug("planning", "service", "desktop"), currentProgress(branchStorageSlug("planning", "service", "desktop"), serviceTotal, 1), storage, () => new Date(), serviceTotal);
    saveProgress("pressure-diary", currentProgress("pressure-diary", pressureTotal, 1), storage, () => new Date(), pressureTotal);
    const stats = getAcademyStats(projects, storage);
    expect(stats).toMatchObject({
      totalProjects: projects.length,
      startedProjects: 2,
      completedProjects: 1,
      completedSteps: agentTotal + 1,
      score: (agentTotal + 1) * 10,
    });
    expect(stats.totalSteps).toBe(351);
  });

  it("uses the most advanced branch when a bundle has no valid saved choice", () => {
    const storage = new MemoryStorage();
    saveProgress(
      branchStorageSlug("planning", "service", "desktop"),
      completeStep(createEmptyProgress(), 1),
      storage,
    );
    let agent = createEmptyProgress();
    agent = completeStep(agent, 1);
    agent = completeStep(agent, 2);
    saveProgress(branchStorageSlug("planning", "agent", "desktop"), agent, storage, () => new Date(), 10);
    expect(getAcademyStats(projects, storage)).toMatchObject({
      startedProjects: 1,
      completedSteps: 2,
      score: 20,
    });
  });
});
