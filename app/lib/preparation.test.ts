import { describe, expect, it } from "vitest";
import { getQuestProject, questProjects } from "../content/projects";
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
    const project = getQuestProject("psychologist-site")!;
    const checklist = buildRealDataChecklist(project);
    expect(checklist).toHaveLength(5);
    const checklistText = checklist.map((item) => `${item.text} ${item.detail}`).join(" ");
    expect(checklistText).toMatch(/запрос|формат|контакт/i);
    expect(checklistText).toContain(project.safety);
    expect(checklistText).toMatch(/парол|токен/i);
    expect(new Set(checklist.map((item) => item.id)).size).toBe(checklist.length);
  });

  it("gives every project a personal conversation checklist without manual files", () => {
    const fingerprints = new Set<string>();

    for (const project of questProjects) {
      const checklist = buildRealDataChecklist(project);
      if (project.journey === "setup") {
        expect(checklist, project.slug).toEqual([]);
        continue;
      }
      if (project.slug === "family-expenses") {
        expect(checklist).toHaveLength(4);
        expect(checklist.every((item) => item.steps === undefined), project.slug).toBe(true);
        fingerprints.add(checklist.map((item) => `${item.text}|${item.detail}`).join("||"));
        continue;
      }
      expect(checklist, project.slug).toHaveLength(5);
      expect(checklist.every((item) => item.steps === undefined), project.slug).toBe(true);
      expect(checklist.every((item) => item.screenshot === undefined), project.slug).toBe(true);
      expect(checklist.every((item) => item.detail.length > 25), project.slug).toBe(true);

      const fingerprint = checklist
        .slice(0, 4)
        .map((item) => `${item.text}|${item.example ?? ""}`)
        .join("||");
      fingerprints.add(fingerprint);
    }

    const projectPaths = questProjects.filter((project) => project.journey !== "setup");
    expect(fingerprints.size).toBe(projectPaths.length);
    expect(getPreparationProfileSlugs().sort()).toEqual(projectPaths.map((project) => project.slug).sort());
  });

  it("gives every phone checklist Telegram actions instead of computer instructions", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const checklist = buildRealDataChecklist(project, "mobile");
      const text = checklist.map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""}`).join(" ");
      expect(text, project.slug).toMatch(/Telegram/i);
      expect(text, project.slug).not.toMatch(/на компьютере|папку «Документы»|правой кнопкой/i);
    }
  });

  it("asks for pressure diary records instead of branding and sales data", () => {
    const text = buildRealDataChecklist(getQuestProject("pressure-diary")!)
      .map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""} ${item.example ?? ""} ${item.doneWhen ?? ""}`)
      .join(" ");

    expect(text).not.toMatch(/mои-измерения\.csv|мои-измерения\.csv|\.txt/i);
    expect(text).toMatch(/верхн.+давлен/i);
    expect(text).toMatch(/нижн.+давлен/i);
    expect(text).toMatch(/пульс/i);
    expect(text).toMatch(/самочувств/i);
    expect(text).toMatch(/истори.+измерений|фильтр по дате/i);
    expect(text).not.toMatch(/логотип|цен[аы]|контакт/i);
  });

  it("does not request commercial materials for personal household services", () => {
    const personalServices = questProjects.filter((project) => project.kind === "service");
    for (const project of personalServices) {
      const text = buildRealDataChecklist(project).map((item) => item.text).join(" ");
      expect(text, project.slug).not.toMatch(/логотип|подтверждённые цены|публичные контакты/i);
    }
  });

  it("never tells a real-data checklist to use fictional examples", () => {
    for (const project of questProjects) {
      const text = buildRealDataChecklist(project)
        .map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""}`)
        .join(" ");
      expect(text, project.slug).not.toMatch(/вымышлен|демонстрацион/i);
      expect(text, project.slug).not.toMatch(/не добавляем.+реальные контакты в сообщения/i);
    }
  });

  it("lets a family-expenses learner prepare answers without creating folders or files", () => {
    const checklist = buildRealDataChecklist(getQuestProject("family-expenses")!);
    const text = checklist
      .map((item) => `${item.text} ${item.detail} ${item.steps?.join(" ") ?? ""} ${item.doneWhen ?? ""}`)
      .join(" ");

    expect(checklist).toHaveLength(4);
    expect(text).toMatch(/обычн.+слов|голос/i);
    expect(text).toMatch(/Codex сам создаст/i);
    expect(text).not.toMatch(/создайте.+(?:папк|файл)|откройте.+файл|\.csv|\.txt/i);
  });

  it.each([
    ["carousel-agent", ["утверждённый текст", "фотографии", "призыв", "нейрофон"]],
    ["threads-agent", ["профиль Threads", "свои источники", "внешние источники", "примеры голоса"]],
    ["webinar-moderator-agent", ["тестовый вебинар", "утверждённые шаблоны", "база знаний", "расписание"]],
    ["family-health-hub", ["безопасные копии", "варианты имени", "оригинальный PDF", "резервной копии"]],
  ])("prepares exact source materials for %s without asking the learner to create technical files", (slug, phrases) => {
    const checklist = buildRealDataChecklist(getQuestProject(slug)!);
    const text = checklist.map((item) => `${item.text} ${item.detail}`).join(" ");

    expect(checklist).toHaveLength(5);
    for (const phrase of phrases) expect(text).toMatch(new RegExp(phrase, "i"));
    expect(text).not.toMatch(/создайте.+(?:csv|txt|файл)|откройте.+файл/i);
  });

  it("requires every real-data checklist item but lets demo mode start immediately", () => {
    const checklist = buildRealDataChecklist(getQuestProject("planner")!);
    expect(isPreparationReady({ version: 1, mode: "demo", checked: [], ready: true }, checklist)).toBe(true);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.slice(0, -1).map((item) => item.id), ready: false }, checklist)).toBe(false);
    expect(isPreparationReady({ version: 1, mode: "real", checked: checklist.map((item) => item.id), ready: true }, checklist)).toBe(true);
  });

  it("prepares home-helper answers without folders, files, or special formatting", () => {
    const checklist = buildRealDataChecklist(getQuestProject("home-helper")!);
    expect(checklist).toHaveLength(5);
    const text = checklist.map((item) => `${item.text} ${item.detail}`).join(" ");
    expect(text).toMatch(/Что сделать.+Где.+Кто.+Как часто/i);
    expect(text).toMatch(/голосом или текстом/i);
    expect(text).toMatch(/Codex сам создаст проект home-helper, папки, файлы и нужные поля/i);
    expect(text).not.toMatch(/мои-дела\.txt|создайте.+папку|создайте.+файл|откройте.+файл/i);
    expect(checklist.every((item) => item.steps === undefined && item.screenshot === undefined)).toBe(true);
  });
});
