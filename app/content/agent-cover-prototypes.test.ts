import { describe, expect, it } from "vitest";
import { agentCoverPrototypeSlugs, getAgentCoverPrototypeSpec } from "./agent-cover-prototypes";

const expectedSlugs = [
  "home-organizer-agent",
  "meal-planning-agent",
  "study-agent",
  "idea-analysis-agent",
  "personal-content-agent",
  "content-agent",
  "expert-assistant-agent",
  "sales-manager-agent",
  "administrator-agent",
  "consultant-agent",
];

describe("second agent cover prototype registry", () => {
  it("maps the ten projects after the day planner in course order", () => {
    expect(agentCoverPrototypeSlugs).toEqual(expectedSlugs);
  });

  it("gives every agent a unique visual marker and theme", () => {
    const specs = agentCoverPrototypeSlugs.map(getAgentCoverPrototypeSpec);

    expect(new Set(specs.map((spec) => spec.marker)).size).toBe(10);
    expect(new Set(specs.map((spec) => spec.theme)).size).toBe(10);
  });

  it("fails loudly when an agent has no dedicated cover", () => {
    expect(() => getAgentCoverPrototypeSpec("unmapped-agent")).toThrow(
      "Нет персональной обложки для агента: unmapped-agent",
    );
  });
});
