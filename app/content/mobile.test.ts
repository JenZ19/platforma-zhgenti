import { describe, expect, it } from "vitest";
import { buildMobileQuest, getMobileCapability } from "./mobile";
import { projects } from "./projects";

describe("mobile quest builder", () => {
  it("builds seventeen phone-only steps for every project", () => {
    let total = 0;
    for (const project of projects) {
      const steps = buildMobileQuest(project, "demo");
      expect(steps, project.slug).toHaveLength(17);
      expect(steps.map((step) => step.id), project.slug).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
      expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" "), project.slug).not.toMatch(/терминал|npm|\bgit\b|папк.+компьютер/i);
      expect(steps.every((step) => step.screenshot === `/screens-mobile/${project.slug}/step-${String(step.id).padStart(2, "0")}.png`), project.slug).toBe(true);
      total += steps.length;
    }
    expect(total).toBe(884);
  });

  it("gives every project the actions needed for a phone workflow", () => {
    for (const project of projects) {
      const steps = buildMobileQuest(project, "demo");
      const tools = steps.map((step) => step.mobileAction.tool);
      expect(tools, project.slug).toContain("telegram");
      expect(tools, project.slug).toContain("screenshot");
      expect(tools.some((tool) => tool === "lovable" || tool === "chatium"), project.slug).toBe(true);
      expect(getMobileCapability(project).label.length, project.slug).toBeGreaterThan(5);
    }
  });

  it("routes advanced setup to a curator and keeps real prompts grounded", () => {
    for (const project of projects) {
      const steps = buildMobileQuest(project, "real");
      const prompts = steps.flatMap((step) => step.prompt ?? []);
      expect(prompts.join(" "), project.slug).toMatch(/реальн|подготовленн.+материал/i);
      if (project.kind === "advanced-site") {
        expect(steps.map((step) => step.mobileAction.tool), project.slug).toContain("curator");
      }
    }
  });
});
