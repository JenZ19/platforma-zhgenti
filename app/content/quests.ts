import { buildAdvancedSiteQuest } from "./builders/advanced-site";
import { buildAgentQuest } from "./builders/agent";
import { buildBotQuest } from "./builders/bot";
import { buildPortfolioQuest } from "./builders/portfolio";
import { buildServiceQuest } from "./builders/service";
import { buildSimpleSiteQuest } from "./builders/simple-site";
import { getProject } from "./projects";
import type { ProjectDefinition, QuestStep } from "./types";

export function buildQuest(project: ProjectDefinition): QuestStep[] {
  switch (project.kind) {
    case "service":
      return buildServiceQuest(project);
    case "bot":
      return buildBotQuest(project);
    case "agent":
      return buildAgentQuest(project);
    case "simple-site":
      return buildSimpleSiteQuest(project);
    case "advanced-site":
      return buildAdvancedSiteQuest(project);
    case "portfolio":
      return buildPortfolioQuest(project);
  }
}

export function getQuest(slug: string): QuestStep[] | undefined {
  const project = getProject(slug);
  return project ? buildQuest(project) : undefined;
}
