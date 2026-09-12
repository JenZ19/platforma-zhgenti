import { describe, expect, it } from "vitest";
import { getQuestProject, questProjects } from "../content/projects";
import { getPreparationProfileSlugs } from "../content/preparation";
import { buildRealDataChecklist, createEmptyPreparation, isPreparationReady, loadPreparation, preparationKey, savePreparation } from "./preparation";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
}

describe("quest data preparation", () => {
  it("stores each project mode independently and recovers from broken data", () => {
    const storage = memoryStorage();
    savePreparation("planner", { version: 1, mode: "real", checked: ["one"], ready: false }, storage);
    savePreparation("recipe-book", { version: 1, mode: "demo", checked: [], ready: true }, storage);
    expect(loadPreparation("planner", storage).mode).toBe("real");
    expect(loadPreparation("recipe-book", storage).mode).toBe("demo");
    storage.setItem(preparationKey("planner"), "broken");
    expect(loadPreparation("planner", storage)).toEqual(createEmptyPreparation());
  });

  it("covers every non-setup project without technical file chores", () => {
    const expected = questProjects.filter((project) => project.journey !== "setup");
    for (const project of questProjects) {
      const checklist = buildRealDataChecklist(project);
      if (project.journey === "setup") { expect(checklist).toEqual([]); continue; }
      expect(checklist.length, project.slug).toBeGreaterThan(0);
      const text = JSON.stringify(checklist);
      expect(text, project.slug).not.toMatch(/создайте.+(?:\.txt|\.csv|папк|техническ.+файл)|FILE:/i);
      expect(checklist.every((item) => item.steps === undefined && item.screenshot === undefined), project.slug).toBe(true);
    }
    expect(getPreparationProfileSlugs().sort()).toEqual(expected.map((project) => project.slug).sort());
  });

  it("uses conversation or the ready product instead of sending private records to AI", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const text = JSON.stringify(buildRealDataChecklist(project));
      expect(text, project.slug).toMatch(/помощник|Codex|чат|готов.+форм|голос|текст/i);
      expect(text, project.slug).toMatch(/не отправля|не проси|без личн|защищён|учебн|секретн|парол|токен/i);
    }
  });

  it("keeps household preparation specific and non-commercial", () => {
    const pressure = JSON.stringify(buildRealDataChecklist(getQuestProject("pressure-diary")!));
    expect(pressure).toMatch(/давлен|пульс|измерен/i);
    expect(pressure).not.toMatch(/логотип|цен[аы]|публичные контакты/i);
    const expenses = JSON.stringify(buildRealDataChecklist(getQuestProject("family-expenses")!));
    expect(expenses).toMatch(/расход|покупк|бюджет/i);
    expect(expenses).not.toMatch(/банковск.+реквизит|создайте.+файл/i);
  });

  it("requires every real checklist item while demo can start immediately", () => {
    const checklist = buildRealDataChecklist(getQuestProject("planner")!);
    expect(isPreparationReady({ version: 1, mode: "demo", checked: [], ready: true }, checklist)).toBe(true);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.slice(0, -1).map((item) => item.id), ready: false }, checklist)).toBe(false);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.map((item) => item.id), ready: true }, checklist)).toBe(true);
  });

  it("keeps phone preparation free of desktop-specific actions", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const text = JSON.stringify(buildRealDataChecklist(project, "mobile"));
      expect(text, project.slug).not.toMatch(/откройте на компьютере|нажмите правой кнопкой|откройте локальную папку|запустите терминал/i);
    }
  });
});
