import { describe, expect, it } from "vitest";
import {
  filterAndSortProjects,
  getCatalogDiscoveryProfile,
  getQuestDiscoveryProfile,
  goalKeywords,
} from "./discovery";
import { getQuestProject, projects, questProjects } from "./projects";

describe("quest discovery", () => {
  it("classifies every concrete quest with a difficulty and useful keywords", () => {
    expect(questProjects).toHaveLength(52);
    for (const project of questProjects) {
      const profile = getQuestDiscoveryProfile(project.slug);
      expect(profile.difficulty, project.slug).toBeGreaterThanOrEqual(1);
      expect(profile.difficulty, project.slug).toBeLessThanOrEqual(4);
      expect(profile.keywords.length, project.slug).toBeGreaterThanOrEqual(2);
      expect(profile.synonyms.length, project.slug).toBeGreaterThan(0);
    }
    expect(goalKeywords).toHaveLength(9);
  });

  it("sorts by week, then difficulty, then the stable course order", () => {
    const result = filterAndSortProjects(projects, { week: 0, difficulty: 0, goal: "Все цели", query: "" });
    expect(result).toHaveLength(45);
    expect(result.slice(0, 3).map((project) => project.slug)).toEqual(["install-codex", "planning", "ideas"]);

    for (let index = 1; index < result.length; index += 1) {
      const previous = getCatalogDiscoveryProfile(result[index - 1]);
      const current = getCatalogDiscoveryProfile(result[index]);
      expect(
        previous.firstWeek < current.firstWeek
        || (previous.firstWeek === current.firstWeek && previous.minDifficulty <= current.minDifficulty),
        `${result[index - 1].slug} before ${result[index].slug}`,
      ).toBe(true);
    }
  });

  it("finds projects by beginner synonyms and combines filters", () => {
    const byMother = filterAndSortProjects(projects, { week: 0, difficulty: 0, goal: "Все цели", query: "мама" });
    expect(byMother.map((project) => project.slug)).toContain("family-schedule");

    const startFamily = filterAndSortProjects(projects, { week: 0, difficulty: 1, goal: "Семья и быт", query: "" });
    expect(startFamily.map((project) => project.slug)).toContain("family-budget");
    expect(startFamily.map((project) => project.slug)).not.toContain("server-152fz");
  });

  it("aggregates a bundle into a visible difficulty range", () => {
    const planning = projects.find((project) => project.slug === "planning")!;
    const profile = getCatalogDiscoveryProfile(planning);
    expect(profile.minDifficulty).toBe(1);
    expect(profile.maxDifficulty).toBe(2);
    expect(profile.label).toBe("Стартовый → Лёгкий");
    expect(profile.keywords).toEqual(expect.arrayContaining(["Для себя", "Семья и быт"]));
  });

  it("keeps the manually assigned high-risk setup levels", () => {
    expect(getQuestDiscoveryProfile(getQuestProject("install-codex")!.slug).difficulty).toBe(1);
    expect(getQuestDiscoveryProfile(getQuestProject("api-keys")!.slug).difficulty).toBe(3);
    expect(getQuestDiscoveryProfile(getQuestProject("server-152fz")!.slug).difficulty).toBe(4);
  });
});
