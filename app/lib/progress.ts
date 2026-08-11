import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import { branchStorageSlug, loadOutputChoice, type QuestSurface } from "./output-format";
import { getJourneyLevelCount } from "../content/journey-plans";

export const LEVELS_PER_QUEST = 17;
const PREFIX = "feya-academy-progress-v1";

export type QuestProgress = {
  version: 1;
  activeStep: number;
  completed: number[];
  score: number;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function progressKey(slug: string): string {
  return `${PREFIX}:${slug}`;
}

export function createEmptyProgress(): QuestProgress {
  return { version: 1, activeStep: 1, completed: [], score: 0 };
}

export function getProjectLevelCount(project: Pick<CatalogProject, "slug"> | string): number {
  const slug = typeof project === "string" ? project : project.slug;
  return getJourneyLevelCount(slug);
}

export function isStepUnlocked(progress: QuestProgress, stepId: number): boolean {
  return stepId === 1 || progress.completed.includes(stepId - 1);
}

export function completeStep(progress: QuestProgress, stepId: number, totalLevels = LEVELS_PER_QUEST): QuestProgress {
  if (!isStepUnlocked(progress, stepId)) return progress;
  if (progress.completed.includes(stepId)) {
    const activeStep = Math.min(stepId + 1, totalLevels);
    return activeStep === progress.activeStep ? progress : { ...progress, activeStep };
  }
  const completed = [...progress.completed, stepId].sort((a, b) => a - b);
  return {
    version: 1,
    activeStep: Math.min(stepId + 1, totalLevels),
    completed,
    score: completed.length * 10,
  };
}

export function parseProgress(raw: string | null, totalLevels = LEVELS_PER_QUEST): QuestProgress {
  if (!raw) return createEmptyProgress();
  try {
    const value = JSON.parse(raw) as Partial<QuestProgress>;
    if (value.version !== 1 || !Array.isArray(value.completed)) return createEmptyProgress();
    const unique = [...new Set(value.completed)]
      .filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= totalLevels)
      .sort((a, b) => a - b);
    const sequential: number[] = [];
    for (let id = 1; id <= totalLevels; id += 1) {
      if (!unique.includes(id)) break;
      sequential.push(id);
    }
    const maxActive = Math.min(sequential.length + 1, totalLevels);
    const requestedActive = typeof value.activeStep === "number" ? value.activeStep : maxActive;
    return {
      version: 1,
      activeStep: Math.max(1, Math.min(requestedActive, maxActive)),
      completed: sequential,
      score: sequential.length * 10,
    };
  } catch {
    return createEmptyProgress();
  }
}

export function loadProgress(slug: string, storage: StorageLike, totalLevels = LEVELS_PER_QUEST): QuestProgress {
  return parseProgress(storage.getItem(progressKey(slug)), totalLevels);
}

export function saveProgress(slug: string, progress: QuestProgress, storage: StorageLike): void {
  storage.setItem(progressKey(slug), JSON.stringify(progress));
}

export function resetProgress(slug: string, storage: StorageLike): void {
  storage.removeItem(progressKey(slug));
}

export function getCatalogProjectProgress(
  project: CatalogProject,
  storage: StorageLike,
  surface: QuestSurface = "desktop",
): QuestProgress {
  if (!isProjectBundle(project)) {
    const storageSlug = `${surface === "mobile" ? "mobile:" : ""}${project.slug}`;
    return loadProgress(storageSlug, storage, getProjectLevelCount(project));
  }

  const selected = loadOutputChoice(project.slug, surface, storage);
  if (selected) {
    return loadProgress(branchStorageSlug(project.slug, selected, surface), storage);
  }

  const service = loadProgress(branchStorageSlug(project.slug, "service", surface), storage);
  const agent = loadProgress(branchStorageSlug(project.slug, "agent", surface), storage);
  return agent.completed.length > service.completed.length ? agent : service;
}

export function getAcademyStats(
  projects: CatalogProject[],
  storage: StorageLike,
  surface: QuestSurface = "desktop",
) {
  const values = projects.map((project) => ({
    progress: getCatalogProjectProgress(project, storage, surface),
    totalLevels: getProjectLevelCount(project),
  }));
  return {
    totalProjects: projects.length,
    startedProjects: values.filter(({ progress }) => progress.completed.length > 0).length,
    completedProjects: values.filter(({ progress, totalLevels }) => progress.completed.length === totalLevels).length,
    completedSteps: values.reduce((total, { progress }) => total + progress.completed.length, 0),
    totalSteps: values.reduce((total, { totalLevels }) => total + totalLevels, 0),
    score: values.reduce((total, { progress }) => total + progress.score, 0),
  };
}

export const getCatalogStats = getAcademyStats;
