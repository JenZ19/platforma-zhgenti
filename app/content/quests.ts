import { buildAdvancedSiteQuest } from "./builders/advanced-site";
import { buildAgentQuest } from "./builders/agent";
import { buildPortfolioQuest } from "./builders/portfolio";
import { buildServiceQuest } from "./builders/service";
import { buildSimpleSiteQuest } from "./builders/simple-site";
import { getQuestProject } from "./projects";
import type { ProjectDefinition, QuestCustomization, QuestStep } from "./types";
import type { DataMode } from "../lib/preparation";
import { adaptQuestToDataMode } from "./data-mode";
import { buildHomeHelperGuide } from "./home-helper-guide";
import { defaultCustomization } from "./customization";
import { customizationSummary } from "./customization";
import { buildFamilyExpensesQuest } from "./original-quests/family-expenses";
import { buildPlannerQuest } from "./original-quests/planner";
import { buildIdeaVaultQuest } from "./original-quests/idea-vault";
import { buildChildScheduleQuest } from "./original-quests/child-schedule";
import { buildCarouselAgentQuest } from "./original-quests/carousel-agent";
import { buildThreadsAgentQuest } from "./original-quests/threads-agent";
import { buildWebinarModeratorAgentQuest } from "./original-quests/webinar-moderator-agent";
import { buildFamilyHealthHubQuest } from "./original-quests/family-health-hub";
import { buildUniqueDesignQuest } from "./original-quests/unique-design";
import { attachApiKeysQuestLinks, buildSetupQuest, isSetupQuestSlug } from "./setup-quests";
import { applyJourneyPlan } from "./journey-plans";
import { addBeginnerLanguage } from "./beginner-language";

function applyCustomization(
  steps: QuestStep[],
  project: ProjectDefinition,
  customization?: QuestCustomization,
): QuestStep[] {
  if (!customization || project.kind === "agent") return steps;
  const summary = customizationSummary(project.slug, customization);
  return steps.map((step) => {
    if (![2, 4, 13, 15, 16, 17].includes(step.id)) return step;
    return {
      ...step,
      prompt: step.prompt ? `${step.prompt}\n\nМОЯ ВЕРСИЯ ПРОЕКТА: ${summary}` : undefined,
      help: {
        ...step.help,
        prompt: `${step.help.prompt}\n\nСохрани мою версию: ${summary}`,
      },
    };
  });
}

export function buildQuest(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization): QuestStep[] {
  const finish = (steps: QuestStep[]) => addBeginnerLanguage(
    applyJourneyPlan(project, attachApiKeysQuestLinks(steps, project.slug), mode),
  );
  if (isSetupQuestSlug(project.slug)) {
    return finish(buildSetupQuest(project));
  }
  if (project.slug === "family-expenses") {
    return finish(buildFamilyExpensesQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "planner") {
    return finish(buildPlannerQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "idea-vault") {
    return finish(buildIdeaVaultQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "child-schedule") {
    return finish(buildChildScheduleQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "carousel-agent") {
    return finish(buildCarouselAgentQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "threads-agent") {
    return finish(buildThreadsAgentQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "webinar-moderator-agent") {
    return finish(buildWebinarModeratorAgentQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "family-health-hub") {
    return finish(buildFamilyHealthHubQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  if (project.slug === "unique-design") {
    return finish(buildUniqueDesignQuest(project, mode, customization ?? defaultCustomization(project.slug)!));
  }
  let steps: QuestStep[];
  switch (project.kind) {
    case "service":
      steps = buildServiceQuest(project);
      break;
    case "agent":
      steps = buildAgentQuest(project, customization ?? defaultCustomization(project.slug)!);
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
  const customizedSteps = applyCustomization(steps, project, customization ?? defaultCustomization(project.slug));
  const modeSteps = adaptQuestToDataMode(customizedSteps, project, mode);
  return finish(project.slug === "home-helper" ? buildHomeHelperGuide(project, mode, modeSteps) : modeSteps);
}

export function getQuest(slug: string): QuestStep[] | undefined {
  const project = getQuestProject(slug);
  return project ? buildQuest(project) : undefined;
}
