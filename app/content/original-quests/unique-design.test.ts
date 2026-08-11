import { describe, expect, it } from "vitest";
import { defaultCustomization } from "../customization";
import { getQuestProject } from "../projects";
import { buildQuest } from "../quests";
import { getProjectLevelCount } from "../../lib/progress";

function allText(value: unknown): string {
  return JSON.stringify(value);
}

describe("unique design quest", () => {
  it("turns three reference roles into an original personal and client result", () => {
    const project = getQuestProject("unique-design");
    expect(project).toBeDefined();
    if (!project) return;

    const customization = defaultCustomization(project.slug);
    expect(customization).toBeDefined();
    const steps = buildQuest(project, "demo", customization!);
    const baseSteps = steps.filter((step) => step.sourceStepId !== 0);
    const checks = steps.filter((step) => step.journeyCheck);
    const text = allText(steps);

    expect(steps).toHaveLength(getProjectLevelCount(project));
    expect(baseSteps).toHaveLength(17);
    expect(checks).toHaveLength(2);
    expect(new Set(steps.map((step) => step.title)).size).toBe(steps.length);
    expect(baseSteps.every((step) => step.why.startsWith("Сейчас мы"))).toBe(true);
    expect(baseSteps.every((step) => (step.prompt?.length ?? 0) > 220)).toBe(true);
    expect(steps.every((step) => step.expected.length >= 3)).toBe(true);
    expect(baseSteps.every((step) => step.guide?.length === 3)).toBe(true);
    expect(text).toMatch(/референс структуры/i);
    expect(text).toMatch(/референс настроения/i);
    expect(text).toMatch(/референс.+детал/i);
    expect(text).toContain("Landingfolio");
    expect(text).toContain("Landing.Gallery");
    expect(text).toContain("Lapa Ninja");
    expect(text).toContain("ui-ux-pro-max");
    expect(text).toMatch(/без скилла|скилл не установлен/i);
    expect(text).toMatch(/не копир/i);
    expect(text).toContain("unique-design-client");
  });

  it("collects real content in a one-question Codex interview without manual files", () => {
    const project = getQuestProject("unique-design");
    expect(project).toBeDefined();
    if (!project) return;

    const steps = buildQuest(project, "real", defaultCustomization(project.slug)!);
    const text = allText(steps);

    expect(text).toMatch(/один короткий вопрос за раз/i);
    expect(text).toMatch(/голосом или текстом/i);
    expect(text).toMatch(/все нужные папки, файлы и поля создавай сам/i);
    expect(steps.map((step) => step.action).join(" ")).not.toMatch(/создайте.+(?:\.txt|\.csv|служебный файл)/i);
  });
});
