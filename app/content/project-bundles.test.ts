import { describe, expect, it } from "vitest";
import { isProjectBundle, projects, questProjects } from "./projects";

describe("bundled project registry", () => {
  it("contains 42 catalogue cards and 49 concrete quest paths", () => {
    expect(projects).toHaveLength(42);
    expect(new Set(projects.map((item) => item.slug)).size).toBe(42);
    expect(questProjects).toHaveLength(49);
    expect(new Set(questProjects.map((item) => item.slug)).size).toBe(49);
  });

  it("contains exactly seven service-or-agent bundles", () => {
    const bundles = projects.filter(isProjectBundle);
    expect(bundles).toHaveLength(7);
    expect(bundles.map((item) => item.slug)).toEqual([
      "planning",
      "ideas",
      "family-budget",
      "recipes",
      "family-schedule",
      "habits",
      "household",
    ]);

    for (const bundle of bundles) {
      expect(bundle.formats.service.kind).toBe("service");
      expect(bundle.formats.agent.kind).toBe("agent");
      expect(bundle.weeks).toEqual([1, 2]);
    }
  });

  it("has no concrete bot kind", () => {
    expect(questProjects.map((item) => item.kind)).not.toContain("bot");
  });
});
