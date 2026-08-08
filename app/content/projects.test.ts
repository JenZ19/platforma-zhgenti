import { describe, expect, it } from "vitest";
import { getProject, projects } from "./projects";

describe("project registry", () => {
  it("contains the complete approved collection of 52 unique projects", () => {
    expect(projects).toHaveLength(52);
    expect(new Set(projects.map((project) => project.slug)).size).toBe(52);
  });

  it("matches the exact project counts by kind", () => {
    const count = (kind: string) => projects.filter((project) => project.kind === kind).length;
    expect(count("service")).toBe(9);
    expect(count("bot")).toBe(13);
    expect(count("agent")).toBe(15);
    expect(count("simple-site")).toBe(10);
    expect(count("advanced-site")).toBe(4);
    expect(count("portfolio")).toBe(1);
  });

  it("gives every project complete, specific configuration", () => {
    for (const project of projects) {
      expect(project.title.length, project.slug).toBeGreaterThan(4);
      expect(project.audience.length, project.slug).toBeGreaterThan(4);
      expect(project.outcome.length, project.slug).toBeGreaterThan(12);
      expect(project.entities.length, project.slug).toBeGreaterThanOrEqual(2);
      expect(project.features.length, project.slug).toBeGreaterThanOrEqual(4);
      expect(project.demo.length, project.slug).toBeGreaterThanOrEqual(2);
      expect(project.safety.length, project.slug).toBeGreaterThan(8);
      expect(project.portfolioAngle.length, project.slug).toBeGreaterThan(8);
    }
  });

  it("finds a project by slug and rejects an unknown slug", () => {
    expect(getProject("family-expenses")?.title).toBe("Учёт расходов семьи");
    expect(getProject("missing-project")).toBeUndefined();
  });
});
