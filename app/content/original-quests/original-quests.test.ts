import { describe, expect, it } from "vitest";
import { defaultCustomization, questColorPalettes } from "../customization";
import { getProject } from "../projects";
import { buildFamilyExpensesQuest } from "./family-expenses";
import { buildPlannerQuest } from "./planner";
import { buildIdeaVaultQuest } from "./idea-vault";
import { buildChildScheduleQuest } from "./child-schedule";

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(text).join(" ");
  return "";
}

describe("first four original quests", () => {
  it("builds a fully bespoke family-expenses learning and client path", () => {
    const project = getProject("family-expenses")!;
    const customization = {
      ...defaultCustomization(project.slug)!,
      audience: "Семья с детьми",
      name: "Копим на море",
      style: "Пудровое спокойствие",
      feature: "Дни без покупок",
      palette: questColorPalettes[1],
    };
    const steps = buildFamilyExpensesQuest(project, "demo", customization);

    expect(steps).toHaveLength(17);
    expect(steps.map((step) => step.id)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(new Set(steps.map((step) => step.title)).size).toBe(17);
    expect(steps.every((step) => /бюджет|расход/i.test(text(step))), "every level stays in the budget domain").toBe(true);
    expect(steps.every((step) => step.why.startsWith("Сейчас мы")), "every why explains the current purpose").toBe(true);
    expect(steps.every((step) => (step.prompt?.length ?? 0) > 220), "every Codex command is detailed").toBe(true);
    expect(steps.every((step) => step.expected.length >= 3), "every result is observable").toBe(true);
    expect(steps.every((step) => (step.guide?.length ?? 0) >= 3), "every level has click-by-click frames").toBe(true);

    for (const id of [2, 5, 9, 10, 15, 16, 17]) {
      const step = text(steps[id - 1]);
      expect(step, `step ${id}`).toContain("Копим на море");
      expect(step, `step ${id}`).toContain("Дни без покупок");
    }
    expect(text(steps[8])).toContain("Пудровое спокойствие");
    expect(text(steps[8])).toContain(questColorPalettes[1].name);
    expect(text(steps[8])).toContain(questColorPalettes[1].accent);
    expect(text(steps[8])).not.toMatch(/стиле SUBMARINE/i);
    expect(text(steps[14])).toContain("family-expenses-client");
    expect(text(steps[15])).toMatch(/1\. Кто будет вести бюджет[\s\S]+8\. Какие данные нельзя показывать/);
    expect(text(steps[16])).toMatch(/личн.+верси.+клиентск.+верси/i);
    expect(text(steps)).toMatch(/CSV.+JSON|JSON.+CSV/);
    expect(text(steps)).not.toMatch(/подключ.+банк|номер.+карт|банковск.+сч[её]т/i);
  });

  it("makes Codex create the family-expenses workspace and data files itself", () => {
    const project = getProject("family-expenses")!;
    const steps = buildFamilyExpensesQuest(project, "real", defaultCustomization(project.slug)!);
    const all = text(steps);
    expect(all).toMatch(/Codex сам создаст|создай сам/i);
    expect(all).toMatch(/задавай.+по одному|один вопрос за раз/i);
    expect(all).toMatch(/голосом или текстом/i);
    expect(all).not.toMatch(/Откройте файл|Создайте.+папку|Создайте.+файл/i);
    expect(steps[2].prompt).toMatch(/папки проекта ещё может не быть/i);
    expect(steps[2].prompt).not.toMatch(/Работай только внутри папки текущего проекта/i);
    expect(all).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(all).not.toContain(project.demo.join("; "));
  });

  it("builds a calm, original planner that can be repeated for a client", () => {
    const project = getProject("planner")!;
    const customization = {
      ...defaultCustomization(project.slug)!,
      audience: "Мама с малышом",
      name: "Дела без паники",
      style: "Цветные стикеры",
      tone: "Заботливо",
      feature: "Режим одной руки",
    };
    const steps = buildPlannerQuest(project, "demo", customization);

    expect(steps).toHaveLength(17);
    expect(new Set(steps.map((step) => step.title)).size).toBe(17);
    expect(steps.every((step) => /план|дел|задач|день|недел/i.test(text(step))), "every level stays in the planner domain").toBe(true);
    expect(steps.every((step) => step.why.startsWith("Сейчас мы"))).toBe(true);
    expect(steps.every((step) => (step.prompt?.length ?? 0) > 220)).toBe(true);
    expect(steps.every((step) => step.expected.length >= 3)).toBe(true);
    expect(steps.every((step) => step.guide?.length === 3)).toBe(true);

    for (const id of [2, 5, 9, 10, 15, 16, 17]) {
      expect(text(steps[id - 1]), `step ${id}`).toContain("Дела без паники");
      expect(text(steps[id - 1]), `step ${id}`).toContain("Режим одной руки");
    }
    expect(text(steps[8])).toContain("Цветные стикеры");
    expect(text(steps[14])).toContain("planner-client");
    expect(text(steps[15])).toMatch(/1\. Кто будет пользоваться планером[\s\S]+8\. Что нельзя показывать/);
    expect(text(steps[16])).toMatch(/личн.+верси.+клиентск.+верси/i);
    expect(text(steps)).toMatch(/перенести на завтра/i);
    expect(text(steps)).not.toMatch(/бюджет|расход/i);
    expect(text(steps)).not.toMatch(/автоматически.+назнач.+приоритет|публичн.+личн.+дел/i);
  });

  it("keeps the real planner route inside its prepared files", () => {
    const project = getProject("planner")!;
    const all = text(buildPlannerQuest(project, "real", defaultCustomization(project.slug)!));
    expect(all).toContain("мои-дела.txt");
    expect(all).toContain("правила-планера.txt");
    expect(all).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(all).not.toContain(project.demo.join("; "));
  });

  it("builds an original idea vault with a small-step client adaptation", () => {
    const project = getProject("idea-vault")!;
    const customization = { ...defaultCustomization(project.slug)!, audience: "Автор контента", name: "Лови мысль", style: "Яркая доска", tone: "Вдохновляюще", feature: "Следующий маленький шаг" };
    const steps = buildIdeaVaultQuest(project, "demo", customization);
    expect(steps).toHaveLength(17);
    expect(new Set(steps.map((step) => step.title)).size).toBe(17);
    expect(steps.every((step) => /иде|мысл|копил|карточ|тем/i.test(text(step)))).toBe(true);
    expect(steps.every((step) => step.why.startsWith("Сейчас мы"))).toBe(true);
    expect(steps.every((step) => (step.prompt?.length ?? 0) > 220)).toBe(true);
    expect(steps.every((step) => step.expected.length >= 3 && step.guide?.length === 3)).toBe(true);
    for (const id of [2, 5, 9, 10, 15, 16, 17]) {
      expect(text(steps[id - 1]), `step ${id}`).toContain("Лови мысль");
      expect(text(steps[id - 1]), `step ${id}`).toContain("Следующий маленький шаг");
    }
    expect(text(steps[8])).toContain("Яркая доска");
    expect(text(steps[14])).toContain("idea-vault-client");
    expect(text(steps[15])).toMatch(/1\. Какие идеи человек хочет сохранять[\s\S]+8\. Что нельзя показывать/);
    expect(text(steps[16])).toMatch(/личн.+верси.+клиентск.+верси/i);
    expect(text(steps)).not.toMatch(/бюджет|расход|главное сегодня/i);
  });

  it("keeps the real idea-vault route inside its prepared files", () => {
    const project = getProject("idea-vault")!;
    const all = text(buildIdeaVaultQuest(project, "real", defaultCustomization(project.slug)!));
    expect(all).toContain("мои-идеи.txt");
    expect(all).toContain("темы-и-статусы.txt");
    expect(all).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(all).not.toContain(project.demo.join("; "));
  });

  it("builds a private child schedule with a distinct client adaptation", () => {
    const project = getProject("child-schedule")!;
    const customization = { ...defaultCustomization(project.slug)!, audience: "Семья с двумя детьми", name: "Неделя без спешки", style: "Мягкие цветовые дни", tone: "По-семейному", feature: "Что взять с собой" };
    const steps = buildChildScheduleQuest(project, "demo", customization);
    expect(steps).toHaveLength(17);
    expect(new Set(steps.map((step) => step.title)).size).toBe(17);
    expect(steps.every((step) => /расписан|занят|недел|реб[её]н|круж|день/i.test(text(step)))).toBe(true);
    expect(steps.every((step) => step.why.startsWith("Сейчас мы"))).toBe(true);
    expect(steps.every((step) => (step.prompt?.length ?? 0) > 220)).toBe(true);
    expect(steps.every((step) => step.expected.length >= 3 && step.guide?.length === 3)).toBe(true);
    for (const id of [2, 5, 9, 10, 15, 16, 17]) {
      expect(text(steps[id - 1]), `step ${id}`).toContain("Неделя без спешки");
      expect(text(steps[id - 1]), `step ${id}`).toContain("Что взять с собой");
    }
    expect(text(steps[8])).toContain("Мягкие цветовые дни");
    expect(text(steps[14])).toContain("child-schedule-client");
    expect(text(steps[15])).toMatch(/1\. Кто будет пользоваться расписанием[\s\S]+8\. Что нельзя показывать/);
    expect(text(steps[16])).toMatch(/семейн.+верси.+клиентск.+верси/i);
    expect(text(steps)).toMatch(/Реб[её]нок А.+Реб[её]нок Б|Реб[её]нок Б.+Реб[её]нок А/i);
    expect(text(steps)).toMatch(/не сохраняем ФИО ребёнка.+домашний адрес.+геолокацию.+контакты преподавателей/i);
    expect(text(steps)).not.toMatch(/ул\.|дом \d|\+7\s?\d{3}/i);
  });

  it("keeps the real child-schedule route inside its prepared files", () => {
    const project = getProject("child-schedule")!;
    const all = text(buildChildScheduleQuest(project, "real", defaultCustomization(project.slug)!));
    expect(all).toContain("занятия-недели.txt");
    expect(all).toContain("правила-расписания.txt");
    expect(all).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(all).not.toContain(project.demo.join("; "));
  });
});
