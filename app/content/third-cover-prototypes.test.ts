import { describe, expect, it } from "vitest";
import { getProject } from "./projects";
import { getThirdCoverPrototypeSpec, thirdCoverPrototypeSlugs } from "./third-cover-prototypes";

const expectedSlugs = [
  "online-school-agent",
  "event-organizer-agent",
  "client-care-agent",
  "fairy-team-agent",
  "expert-site",
  "psychologist-site",
  "beauty-site",
  "photographer-site",
  "designer-site",
  "consultation-site",
] as const;

describe("third cover prototype registry", () => {
  it("maps the next ten projects after the AI consultant in catalogue order", () => {
    expect(thirdCoverPrototypeSlugs).toEqual(expectedSlugs);
    expect(thirdCoverPrototypeSlugs.map((slug) => getProject(slug)?.kind)).toEqual([
      "agent", "agent", "agent", "agent",
      "simple-site", "simple-site", "simple-site", "simple-site", "simple-site", "simple-site",
    ]);
  });

  it("gives every project its own visual identity and content marker", () => {
    const specs = thirdCoverPrototypeSlugs.map(getThirdCoverPrototypeSpec);
    expect(new Set(specs.map((spec) => spec.theme)).size).toBe(expectedSlugs.length);
    expect(new Set(specs.map((spec) => spec.marker)).size).toBe(expectedSlugs.length);
    for (const spec of specs) {
      expect(spec.headline.length).toBeGreaterThan(8);
      expect(spec.metric.length).toBeGreaterThan(1);
      expect(spec.status.length).toBeGreaterThan(5);
    }
  });

  it("fails loudly for a project outside this cover batch", () => {
    expect(() => getThirdCoverPrototypeSpec("consultant-agent")).toThrow(
      "Нет персональной обложки третьей десятки",
    );
  });
});
