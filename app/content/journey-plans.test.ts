import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildQuest } from "./quests";
import {
  getJourneyPlan,
  getJourneyLevelCount,
  questLevelCounts,
} from "./journey-plans";

describe("complete quest journey passports", () => {
  it("covers every concrete route and keeps its declared final product", () => {
    expect(Object.keys(questLevelCounts).sort()).toEqual(
      questProjects.map((project) => project.slug).sort(),
    );

    for (const project of questProjects) {
      const plan = getJourneyPlan(project);
      expect(plan.outcome, project.slug).toBe(project.outcome);
      expect(plan.levelCount, project.slug).toBe(getJourneyLevelCount(project.slug));
      const steps = buildQuest(project);
      expect(plan.levelCount, project.slug).toBe(steps.length);
      if (project.journey !== "setup") {
        expect(steps.at(-1)?.sourceStepId, project.slug).toBe(17);
        expect(steps.at(-1)?.title, project.slug).toMatch(/портфолио|упаковала|две версии|готовую услугу/i);
      }
      expect(plan.finalProof.length, project.slug).toBeGreaterThan(20);
    }
  });

  it("uses the number of levels required by each project instead of one course-wide number", () => {
    expect(new Set(Object.values(questLevelCounts)).size).toBeGreaterThanOrEqual(8);
    expect(getJourneyLevelCount("server-152fz")).toBe(9);
    expect(getJourneyLevelCount("api-keys")).toBe(14);
    expect(getJourneyLevelCount("planner")).toBe(17);
    expect(getJourneyLevelCount("pressure-diary")).toBe(19);
    expect(getJourneyLevelCount("client-care-agent")).toBe(20);
    expect(getJourneyLevelCount("catalog-pro-site")).toBe(22);
  });

  it("adds only named project checks and never repeats a check inside one route", () => {
    for (const project of questProjects) {
      const checks = getJourneyPlan(project).checks;
      expect(new Set(checks).size, project.slug).toBe(checks.length);
      expect(checks.every((check) => check.length > 3), project.slug).toBe(true);
    }
  });
});
