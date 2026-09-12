import { describe, expect, it } from "vitest";
import { projects, resolveProjectVariant } from "./projects";
import { buildQuest } from "./quests";
import { rewardSteps } from "./quest-rewards";

function variants() {
  return projects.flatMap((project) => ("formats" in project
    ? [resolveProjectVariant(project, "service"), resolveProjectVariant(project, "agent")]
    : [project])).filter(Boolean);
}

describe("награды квестов", () => {
  it("каждый квест курса даёт хотя бы одну фею", () => {
    for (const project of variants()) {
      const steps = buildQuest(project!, "demo");
      expect(steps.filter((step) => step.reward).length, project!.slug).toBeGreaterThan(0);
    }
  });

  it("последний шаг всегда награждает — финиш квеста виден", () => {
    for (const project of variants()) {
      const steps = buildQuest(project!, "demo");
      expect(steps[steps.length - 1].reward, project!.slug).toBeTruthy();
    }
  });

  it("награды не повторяются внутри одного квеста", () => {
    for (const project of variants()) {
      const rewards = buildQuest(project!, "demo").flatMap((step) => (step.reward ? [step.reward] : []));
      expect(new Set(rewards).size, project!.slug).toBe(rewards.length);
    }
  });

  it("узловые шаги считаются от длины квеста", () => {
    expect(rewardSteps(9)).toEqual({ middle: 5, last: 9 });
    expect(rewardSteps(6)).toEqual({ middle: 3, last: 6 });
    expect(rewardSteps(3)).toEqual({ last: 3 });
    expect(rewardSteps(0)).toEqual({});
  });
});
