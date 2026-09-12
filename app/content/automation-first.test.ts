import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildQuest } from "./quests";
import { buildMobileQuest } from "./mobile";
import { buildRealDataChecklist } from "../lib/preparation";

describe("automation-first learning", () => {
  it("keeps preparation conversational and leaves technical files to Codex", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const copy = JSON.stringify(buildRealDataChecklist(project));
      expect(copy, project.slug).not.toMatch(/создайте.+(?:\.txt|\.csv|таблиц|папк)|FILE:/i);
      expect(copy, project.slug).toMatch(/Codex|помощник/i);
    }
  });

  it("creates a working basis before customization or optional client work", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const steps = buildQuest(project, "real");
      expect(`${steps[0].action} ${steps[0].prompt ?? ""}`, project.slug).toMatch(/созда|собер|рабоч|открой/i);
      const customizationIndex = steps.findIndex((step) => Boolean(step.customization));
      if (customizationIndex >= 0) expect(customizationIndex, project.slug).toBeGreaterThan(0);
      if (project.kind !== "portfolio") expect(steps.at(-1)?.extension, project.slug).toEqual(expect.objectContaining({ title: expect.stringMatching(/по желанию/i) }));
    }
  });

  it("keeps phone commands free of local file chores and fake deployment claims", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const copy = JSON.stringify(buildMobileQuest(project, "real"));
      expect(copy, project.slug).not.toMatch(/FILE:|создайте.+(?:\.txt|\.csv)|откройте локальную папку/i);
      expect(copy, project.slug).toMatch(/не localhost|доступн.+телефон|куратор|Telegram/i);
      expect(copy, project.slug).toMatch(/не утверждай|не называй результат готовым|провер/i);
    }
  });
});
