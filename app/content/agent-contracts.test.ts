import { describe, expect, it } from "vitest";
import { agentContracts, getAgentContract } from "./agent-contracts";
import { questProjects } from "./projects";

describe("ai agent contracts", () => {
  it("guides one client agent through the entire path from inquiry to follow-up", () => {
    const contract = getAgentContract("client-care-agent");
    expect(contract.role).toBe("ИИ-агент для работы с клиентами");
    expect(contract.requiredFields).toEqual(expect.arrayContaining([
      "заявка",
      "потребность",
      "вариант",
      "запись",
      "следующий шаг",
    ]));
    expect(contract.decisionRule).toMatch(/заявк.+уточн.+подбер.+запис.+следующ/i);
    expect(contract.resultItems).toEqual([
      "приём заявки",
      "уточнение запроса",
      "подбор и объяснение",
      "подготовка записи",
      "продажа и сопровождение",
    ]);
  });

  it("defines one complete and unique contract for every agent", () => {
    const agents = questProjects.filter((project) => project.kind === "agent");
    expect(agents).toHaveLength(20);
    expect(agentContracts).toHaveLength(20);
    expect(new Set(agentContracts.map((item) => item.slug)).size).toBe(20);

    for (const project of agents) {
      const contract = getAgentContract(project.slug);
      expect(contract.requiredFields.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.resultItems.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.selfCheck.length, project.slug).toBeGreaterThanOrEqual(3);
      expect(contract.handoff.length, project.slug).toBeGreaterThan(20);
      expect(contract.inputExample, project.slug).not.toMatch(/нажмите кнопку|выберите кнопку/i);
    }

    expect(new Set(agentContracts.map((item) => item.inputExample)).size).toBe(20);
    expect(new Set(agentContracts.map((item) => item.resultTitle)).size).toBe(20);
  });
});
