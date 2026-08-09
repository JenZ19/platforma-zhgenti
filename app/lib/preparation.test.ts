import { describe, expect, it } from "vitest";
import { getProject } from "../content/projects";
import {
  buildRealDataChecklist,
  createEmptyPreparation,
  isPreparationReady,
  loadPreparation,
  preparationKey,
  savePreparation,
} from "./preparation";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("quest data preparation", () => {
  it("stores the selected mode separately for every project", () => {
    const storage = memoryStorage();
    savePreparation("planner", { version: 1, mode: "real", checked: ["folder"], ready: false }, storage);
    savePreparation("recipe-book", { version: 1, mode: "demo", checked: [], ready: true }, storage);
    expect(preparationKey("planner")).not.toBe(preparationKey("recipe-book"));
    expect(loadPreparation("planner", storage).mode).toBe("real");
    expect(loadPreparation("recipe-book", storage).mode).toBe("demo");
  });

  it("returns a safe empty state for missing or broken saved data", () => {
    const storage = memoryStorage();
    storage.setItem(preparationKey("planner"), "broken-json");
    expect(loadPreparation("planner", storage)).toEqual(createEmptyPreparation());
  });

  it("builds a detailed checklist from the selected project", () => {
    const project = getProject("psychologist-site")!;
    const checklist = buildRealDataChecklist(project);
    expect(checklist.length).toBeGreaterThanOrEqual(7);
    expect(checklist.map((item) => item.text).join(" ")).toMatch(/запрос|формат|контакт/i);
    expect(checklist.map((item) => item.text).join(" ")).toContain(project.safety);
    expect(checklist.map((item) => item.text).join(" ")).toMatch(/парол|токен/i);
    expect(new Set(checklist.map((item) => item.id)).size).toBe(checklist.length);
  });

  it("requires every real-data checklist item but lets demo mode start immediately", () => {
    const checklist = buildRealDataChecklist(getProject("planner")!);
    expect(isPreparationReady({ version: 1, mode: "demo", checked: [], ready: true }, checklist)).toBe(true);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.slice(0, -1).map((item) => item.id), ready: false }, checklist)).toBe(false);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.map((item) => item.id), ready: true }, checklist)).toBe(true);
  });
});
