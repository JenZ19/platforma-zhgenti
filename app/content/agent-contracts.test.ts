import { describe, expect, it } from "vitest";
import { agentContracts, getAgentContract } from "./agent-contracts";
import { questProjects } from "./projects";

describe("ai agent contracts", () => {
  it("defines one complete and unique contract for every agent", () => {
    const agents = questProjects.filter((project) => project.kind === "agent");
    expect(agents).toHaveLength(24);
    expect(agentContracts).toHaveLength(24);
    expect(new Set(agentContracts.map((item) => item.slug)).size).toBe(24);

    for (const project of agents) {
      const contract = getAgentContract(project.slug);
      expect(contract.requiredFields.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.resultItems.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.selfCheck.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.handoff.length, project.slug).toBeGreaterThan(20);
      expect(contract.inputExample, project.slug).not.toMatch(/нажмите кнопку|выберите кнопку/i);
    }

    expect(new Set(agentContracts.map((item) => item.inputExample)).size).toBe(24);
    expect(new Set(agentContracts.map((item) => item.resultTitle)).size).toBe(24);
  });
});
