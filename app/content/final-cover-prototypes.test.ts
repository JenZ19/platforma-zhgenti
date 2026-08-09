import { describe, expect, it } from "vitest";
import { getFinalCoverPrototypeSpec, finalCoverPrototypeSlugs } from "./final-cover-prototypes";
import { getProject } from "./projects";

const expectedSlugs = [
  "course-site",
  "event-site",
  "small-shop-site",
  "portfolio-site",
  "expert-pro-site",
  "school-pro-site",
  "service-pro-site",
  "catalog-pro-site",
  "graduate-portfolio",
] as const;

describe("final cover prototype registry", () => {
  it("contains every project left after the first 43 personalized covers", () => {
    expect(finalCoverPrototypeSlugs).toEqual(expectedSlugs);
    expect(finalCoverPrototypeSlugs.map((slug) => getProject(slug)?.kind)).toEqual([
      "simple-site", "simple-site", "simple-site", "simple-site",
      "advanced-site", "advanced-site", "advanced-site", "advanced-site",
      "portfolio",
    ]);
  });

  it("uses a distinct theme and content marker for every final project", () => {
    const specs = finalCoverPrototypeSlugs.map(getFinalCoverPrototypeSpec);
    expect(new Set(specs.map((spec) => spec.theme)).size).toBe(expectedSlugs.length);
    expect(new Set(specs.map((spec) => spec.marker)).size).toBe(expectedSlugs.length);
    for (const spec of specs) {
      expect(spec.headline.length).toBeGreaterThan(8);
      expect(spec.metric.length).toBeGreaterThan(1);
      expect(spec.status.length).toBeGreaterThan(5);
    }
  });

  it("fails loudly for a project outside the final set", () => {
    expect(() => getFinalCoverPrototypeSpec("consultation-site")).toThrow(
      "Нет персональной обложки финальной части",
    );
  });
});
