import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildQuest } from "./quests";

describe("journey plans", () => {
  it("covers every concrete project with a sequential route", () => {
    for (const project of questProjects) {
      const steps = buildQuest(project);
      expect(steps.length, project.slug).toBeGreaterThan(0);
      expect(steps.map((step) => step.id), project.slug).toEqual(steps.map((_, index) => index + 1));
      expect(new Set(steps.map((step) => step.title)).size, project.slug).toBe(steps.length);
    }
  });

  it("allows route length to follow the project instead of a fixed 17-level contract", () => {
    const lengths = questProjects.map((project) => buildQuest(project).length);
    expect(new Set(lengths).size).toBeGreaterThan(2);
    expect(lengths.some((length) => length < 10)).toBe(true);
  });

  it("ends project routes with portfolio and optional client extension", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup" && item.kind !== "portfolio")) {
      const last = buildQuest(project).at(-1)!;
      expect(JSON.stringify(last), project.slug).toMatch(/портфолио|показываем/i);
      expect(`${last.extension?.title} ${last.extension?.description}`, project.slug).toMatch(/по желанию|можно пропустить/i);
    }
  });
});
