import { describe, expect, it } from "vitest";
import { projects } from "../content/projects";
import { branchStorageSlug, saveOutputChoice } from "./output-format";
import {
  completeStep,
  createEmptyProgress,
  getAcademyStats,
  isStepUnlocked,
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

describe("academy progress", () => {
  it("keeps progress isolated by project slug", () => {
    expect(progressKey("planner")).not.toBe(progressKey("recipe-book"));
    const storage = new MemoryStorage();
    saveProgress("planner", completeStep(createEmptyProgress(), 1), storage);
    expect(loadProgress("planner", storage).completed).toEqual([1]);
    expect(loadProgress("recipe-book", storage).completed).toEqual([]);
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

  it("recovers safely from malformed storage", () => {
    expect(parseProgress("broken json")).toEqual(createEmptyProgress());
    expect(parseProgress('{"version":2,"completed":[1]}')).toEqual(createEmptyProgress());
  });

  it("calculates statistics by catalogue card instead of summing both branches", () => {
    const storage = new MemoryStorage();
    let finished = createEmptyProgress();
    for (let id = 1; id <= 17; id += 1) finished = completeStep(finished, id);
    saveOutputChoice("planning", "desktop", "agent", storage);
    saveProgress(branchStorageSlug("planning", "agent", "desktop"), finished, storage);
    saveProgress(branchStorageSlug("planning", "service", "desktop"), completeStep(createEmptyProgress(), 1), storage);
    saveProgress("pressure-diary", completeStep(createEmptyProgress(), 1), storage);
    expect(getAcademyStats(projects, storage)).toEqual({
      totalProjects: 42,
      startedProjects: 2,
      completedProjects: 1,
      completedSteps: 18,
      totalSteps: 714,
      score: 180,
    });
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
    saveProgress(branchStorageSlug("planning", "agent", "desktop"), agent, storage);
    expect(getAcademyStats(projects, storage)).toMatchObject({
      startedProjects: 1,
      completedSteps: 2,
      score: 20,
    });
  });
});
