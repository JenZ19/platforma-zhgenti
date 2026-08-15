import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const expectedSlugs = [
  "day-planner-agent",
  "home-organizer-agent",
  "meal-planning-agent",
  "study-agent",
  "idea-analysis-agent",
  "expense-agent",
  "family-schedule-agent",
  "habit-agent",
  "brief-agent",
  "content-agent",
  "expert-assistant-agent",
  "administrator-agent",
  "consultant-agent",
];

describe("functional agent result cover registry", () => {
  it("covers every standard agent with a unique scene and theme", async () => {
    const file = path.join(process.cwd(), "app/content/agent-cover-prototypes.ts");
    expect(fs.existsSync(file), "agent cover registry is missing").toBe(true);
    if (!fs.existsSync(file)) return;

    const target = "./agent-cover-prototypes";
    const registry = await import(target);
    expect(registry.agentCoverPrototypeSlugs).toEqual(expectedSlugs);

    const specs = expectedSlugs.map(registry.getAgentCoverPrototypeSpec);
    expect(new Set(specs.map((spec: { marker: string }) => spec.marker)).size).toBe(expectedSlugs.length);
    expect(new Set(specs.map((spec: { theme: string }) => spec.theme)).size).toBe(expectedSlugs.length);
  });
});
