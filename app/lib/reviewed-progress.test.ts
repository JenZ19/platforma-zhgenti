import { describe, expect, it } from "vitest";
import { completeStep, loadProgress, progressKey, saveProgress } from "./progress";
import { importLearningBackup } from "./learning-backup";

describe("reviewed journey progress migration", () => {
  it("archives the local original during import and never replaces that archive", () => {
    localStorage.clear();
    const key = progressKey("planning:service");
    const archive = `${key}:legacy-20260908`;
    const original = JSON.stringify({ version: 1, activeStep: 9, completed: [1,2,3,4,5,6,7,8], score: 80 });
    const revised = JSON.stringify({ version: 1, journeyRevision: "planning-20260908", activeStep: 4, completed: [1,2,3], score: 30 });
    localStorage.setItem(key, original);
    const backup = (entries: Record<string, string>) => JSON.stringify({ type: "neiroprofi-learning-backup", version: 1, entries });
    importLearningBackup(backup({ [archive]: "{}", [key]: revised }), localStorage);
    expect(localStorage.getItem(archive)).toBe(original);
    expect(localStorage.getItem(key)).toBe(revised);
    importLearningBackup(backup({ [archive]: "{}" }), localStorage);
    expect(localStorage.getItem(archive)).toBe(original);
    localStorage.clear();
  });
  it.each(["planner", "planning:service", "mobile:planning:service"])("migrates %s by milestones, not truncated numbers", (slug) => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
    const original = JSON.stringify({ version: 1, activeStep: 9, completed: [1,2,3,4,5,6,7,8], score: 80 });
    storage.setItem(progressKey(slug), original);
    const migrated = loadProgress(slug, storage, 9);
    expect(migrated.completed).toEqual([1,2]);
    expect(storage.getItem(progressKey(slug))).toBe(original);
    saveProgress(slug, completeStep(migrated, 3, 9), storage, () => new Date(), 9);
    expect(loadProgress(slug, storage, 9).completed).toEqual([1,2,3]);
    expect(storage.getItem(`${progressKey(slug)}:legacy-20260908`)).toBe(original);
  });
  it("retains completion of an old fully completed agent", () => {
    const raw = JSON.stringify({ version: 1, activeStep: 17, completed: Array.from({ length: 17 }, (_, i) => i + 1), score: 170 });
    const storage = { getItem: () => raw, setItem: () => {}, removeItem: () => {} };
    expect(loadProgress("mobile:planning:agent", storage, 10).completed).toHaveLength(10);
  });
});
