import { buildAdvancedSiteQuest } from "./builders/advanced-site";
import { buildAgentQuest } from "./builders/agent";
import { buildBotQuest } from "./builders/bot";
import { buildPortfolioQuest } from "./builders/portfolio";
import { buildServiceQuest } from "./builders/service";
import { buildSimpleSiteQuest } from "./builders/simple-site";
import { getProject } from "./projects";
import type { ProjectDefinition, QuestStep } from "./types";
import type { DataMode } from "../lib/preparation";
import { adaptQuestToDataMode } from "./data-mode";

export function buildQuest(project: ProjectDefinition, mode: DataMode = "demo"): QuestStep[] {
  let steps: QuestStep[];
  switch (project.kind) {
    case "service":
      steps = buildServiceQuest(project);
      break;
    case "bot":
      steps = buildBotQuest(project);
      break;
    case "agent":
      steps = buildAgentQuest(project);
      break;
    case "simple-site":
      steps = buildSimpleSiteQuest(project);
      break;
    case "advanced-site":
      steps = buildAdvancedSiteQuest(project);
      break;
    case "portfolio":
      steps = buildPortfolioQuest(project);
      break;
  }
  return adaptQuestToDataMode(steps, project, mode);
}

export function getQuest(slug: string): QuestStep[] | undefined {
  const project = getProject(slug);
  return project ? buildQuest(project) : undefined;
}
