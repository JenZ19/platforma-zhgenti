import { describe, expect, it } from "vitest";
import { firstCoverPrototypeSlugs, getFirstCoverPrototypeSpec } from "./first-cover-prototypes";

const expectedSlugs = [
  "family-expenses",
  "planner",
  "idea-vault",
  "child-schedule",
  "pressure-diary",
  "fitness-tracker",
  "recipe-book",
  "personal-organizer",
  "home-helper",
  "day-planner-agent",
];

describe("first cover prototype registry", () => {
  it("maps the first ten approved projects in course order", () => {
    expect(firstCoverPrototypeSlugs).toEqual(expectedSlugs);
  });

  it("gives every project a unique visual marker and theme", () => {
    const specs = firstCoverPrototypeSlugs.map(getFirstCoverPrototypeSpec);

    expect(new Set(specs.map((spec) => spec.marker)).size).toBe(10);
    expect(new Set(specs.map((spec) => spec.theme)).size).toBe(10);
  });

  it("fails loudly when a project has no dedicated cover", () => {
    expect(() => getFirstCoverPrototypeSpec("unmapped-project")).toThrow(
      "Нет персональной обложки для проекта: unmapped-project",
    );
  });
});
