import { buildAdvancedSiteQuest } from "./builders/advanced-site";
import { buildAgentQuest } from "./builders/agent";
import { buildBotQuest } from "./builders/bot";
import { buildPortfolioQuest } from "./builders/portfolio";
import { buildServiceQuest } from "./builders/service";
import { buildSimpleSiteQuest } from "./builders/simple-site";
import { getProject } from "./projects";
import type { ProjectDefinition, QuestCustomization, QuestStep } from "./types";
import type { DataMode } from "../lib/preparation";
import { adaptQuestToDataMode } from "./data-mode";
import { buildHomeHelperGuide } from "./home-helper-guide";
import { defaultCustomization } from "./customization";
import { buildFamilyExpensesQuest } from "./original-quests/family-expenses";
import { buildPlannerQuest } from "./original-quests/planner";

export function buildQuest(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization): QuestStep[] {
  if (project.slug === "family-expenses") {
    return buildFamilyExpensesQuest(project, mode, customization ?? defaultCustomization(project.slug)!);
  }
  if (project.slug === "planner") {
    return buildPlannerQuest(project, mode, customization ?? defaultCustomization(project.slug)!);
  }
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
  const modeSteps = adaptQuestToDataMode(steps, project, mode);
  return project.slug === "home-helper" ? buildHomeHelperGuide(project, mode, modeSteps) : modeSteps;
}

export function getQuest(slug: string): QuestStep[] | undefined {
  const project = getProject(slug);
  return project ? buildQuest(project) : undefined;
}
