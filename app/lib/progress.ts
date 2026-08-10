import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import { branchStorageSlug, loadOutputChoice, type QuestSurface } from "./output-format";

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

export function isStepUnlocked(progress: QuestProgress, stepId: number): boolean {
  return stepId === 1 || progress.completed.includes(stepId - 1);
}

export function completeStep(progress: QuestProgress, stepId: number): QuestProgress {
  if (!isStepUnlocked(progress, stepId) || progress.completed.includes(stepId)) return progress;
  const completed = [...progress.completed, stepId].sort((a, b) => a - b);
  return {
    version: 1,
    activeStep: Math.min(stepId + 1, LEVELS_PER_QUEST),
    completed,
    score: completed.length * 10,
  };
}

export function parseProgress(raw: string | null): QuestProgress {
  if (!raw) return createEmptyProgress();
  try {
    const value = JSON.parse(raw) as Partial<QuestProgress>;
    if (value.version !== 1 || !Array.isArray(value.completed)) return createEmptyProgress();
    const unique = [...new Set(value.completed)]
      .filter((id): id is number => Number.isInteger(id) && id >= 1 && id <= LEVELS_PER_QUEST)
      .sort((a, b) => a - b);
    const sequential: number[] = [];
    for (let id = 1; id <= LEVELS_PER_QUEST; id += 1) {
      if (!unique.includes(id)) break;
      sequential.push(id);
    }
    const maxActive = Math.min(sequential.length + 1, LEVELS_PER_QUEST);
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

export function loadProgress(slug: string, storage: StorageLike): QuestProgress {
  return parseProgress(storage.getItem(progressKey(slug)));
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
    return loadProgress(storageSlug, storage);
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
  const values = projects.map((project) => getCatalogProjectProgress(project, storage, surface));
  return {
    totalProjects: projects.length,
    startedProjects: values.filter((progress) => progress.completed.length > 0).length,
    completedProjects: values.filter((progress) => progress.completed.length === LEVELS_PER_QUEST).length,
    completedSteps: values.reduce((total, progress) => total + progress.completed.length, 0),
    totalSteps: projects.length * LEVELS_PER_QUEST,
    score: values.reduce((total, progress) => total + progress.score, 0),
  };
}

export const getCatalogStats = getAcademyStats;
