import { describe, expect, it } from "vitest";
import { defaultCustomization } from "../customization";
import { getProject } from "../projects";
import { buildFamilyExpensesQuest } from "./family-expenses";

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
    expect(text(steps[14])).toContain("family-expenses-client");
    expect(text(steps[15])).toMatch(/1\. Кто будет вести бюджет[\s\S]+8\. Какие данные нельзя показывать/);
    expect(text(steps[16])).toMatch(/личн.+верси.+клиентск.+верси/i);
    expect(text(steps)).toMatch(/CSV.+JSON|JSON.+CSV/);
    expect(text(steps)).not.toMatch(/подключ.+банк|номер.+карт|банковск.+сч[её]т/i);
  });

  it("keeps the real family-expenses route inside prepared files", () => {
    const project = getProject("family-expenses")!;
    const steps = buildFamilyExpensesQuest(project, "real", defaultCustomization(project.slug)!);
    const all = text(steps);
    expect(all).toContain("семейные-расходы.csv");
    expect(all).toContain("правила-бюджета.txt");
    expect(all).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(all).not.toContain(project.demo.join("; "));
  });
});
