import { describe, expect, it } from "vitest";
import { getProject, projects } from "../content/projects";
import { getPreparationProfileSlugs } from "../content/preparation";
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
    expect(checklist.map((item) => `${item.text} ${item.detail}`).join(" ")).toContain(project.safety);
    expect(checklist.map((item) => item.text).join(" ")).toMatch(/парол|токен/i);
    expect(new Set(checklist.map((item) => item.id)).size).toBe(checklist.length);
  });

  it("gives every project its own click-by-click preparation path", () => {
    const fingerprints = new Set<string>();

    for (const project of projects) {
      const checklist = buildRealDataChecklist(project);
      expect(checklist, project.slug).toHaveLength(8);
      expect(checklist.every((item) => (item.steps?.length ?? 0) >= 3), project.slug).toBe(true);
      expect(checklist.every((item) => (item.doneWhen?.length ?? 0) > 20), project.slug).toBe(true);
      expect(checklist.every((item) => item.detail.length > 25), project.slug).toBe(true);

      const fingerprint = checklist
        .slice(1, 6)
        .map((item) => `${item.text}|${item.example ?? ""}`)
        .join("||");
      fingerprints.add(fingerprint);
    }

    expect(fingerprints.size).toBe(projects.length);
    expect(getPreparationProfileSlugs().sort()).toEqual(projects.map((project) => project.slug).sort());
  });

  it("gives every phone checklist Telegram actions instead of computer instructions", () => {
    for (const project of projects) {
      const checklist = buildRealDataChecklist(project, "mobile");
      const text = checklist.map((item) => item.steps?.join(" ") ?? "").join(" ");
      expect(text, project.slug).toMatch(/Telegram/i);
      expect(text, project.slug).not.toMatch(/на компьютере|папку «Документы»|правой кнопкой/i);
    }
  });

  it("asks for pressure diary records instead of branding and sales data", () => {
    const text = buildRealDataChecklist(getProject("pressure-diary")!)
      .map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""} ${item.example ?? ""} ${item.doneWhen ?? ""}`)
      .join(" ");

    expect(text).toMatch(/мои-измерения\.csv/i);
    expect(text).toMatch(/верхн.+давлен/i);
    expect(text).toMatch(/нижн.+давлен/i);
    expect(text).toMatch(/пульс/i);
    expect(text).toMatch(/самочувств/i);
    expect(text).toMatch(/выгрузк.+врач/i);
    expect(text).not.toMatch(/логотип|цен[аы]|контакт/i);
  });

  it("does not request commercial materials for personal household services", () => {
    const personalServices = projects.filter((project) => project.kind === "service");
    for (const project of personalServices) {
      const text = buildRealDataChecklist(project).map((item) => item.text).join(" ");
      expect(text, project.slug).not.toMatch(/логотип|подтверждённые цены|публичные контакты/i);
    }
  });

  it("never tells a real-data checklist to use fictional examples", () => {
    for (const project of projects) {
      const text = buildRealDataChecklist(project)
        .map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""}`)
        .join(" ");
      expect(text, project.slug).not.toMatch(/вымышлен|демонстрацион/i);
      expect(text, project.slug).not.toMatch(/не добавляем.+реальные контакты в сообщения/i);
    }
  });

  it("requires every real-data checklist item but lets demo mode start immediately", () => {
    const checklist = buildRealDataChecklist(getProject("planner")!);
    expect(isPreparationReady({ version: 1, mode: "demo", checked: [], ready: true }, checklist)).toBe(true);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.slice(0, -1).map((item) => item.id), ready: false }, checklist)).toBe(false);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.map((item) => item.id), ready: true }, checklist)).toBe(true);
  });

  it("explains every home-helper preparation item as concrete beginner actions", () => {
    const checklist = buildRealDataChecklist(getProject("home-helper")!);
    expect(checklist).toHaveLength(8);
    expect(checklist[1].text).toBe("Запишите пять домашних дел в файл «мои-дела.txt»");
    expect(checklist.map((item) => item.text).join(" ")).not.toMatch(/сущност|дело, зона, исполнитель, повтор/i);
    for (const [index, item] of checklist.entries()) {
      expect(item.steps?.length, item.id).toBeGreaterThanOrEqual(3);
      expect(item.doneWhen?.length, item.id).toBeGreaterThan(20);
      expect(item.screenshot, item.id).toBe(`/guides/home-helper/real/prep-${String(index + 1).padStart(2, "0")}.png`);
    }
  });
});
