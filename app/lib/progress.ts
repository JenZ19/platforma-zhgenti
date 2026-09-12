import { isProjectBundle } from "../content/projects";
import type { CatalogProject, ProjectFormat } from "../content/types";
import { branchStorageSlug, loadOutputChoice, type QuestSurface } from "./output-format";
import { getJourneyLevelCount, legacyQuestLevelCounts } from "../content/journey-plans";
import { concreteProgressSlug, CURRICULUM_REVISION, reviewedLevelCounts } from "../content/reviewed/revision";

export const LEVELS_PER_QUEST = 17;
const PREFIX = "feya-academy-progress-v1";

export type QuestProgress = {
  version: 1;
  journeyRevision?: string;
  activeStep: number;
  completed: number[];
  score: number;
  updatedAt?: string;
  completedAt?: string;
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
    ...progress,
    version: 1,
    activeStep: Math.min(stepId + 1, totalLevels),
    completed,
    score: completed.length * 10,
  };
}

export function isIsoCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function localCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    const progress: QuestProgress = {
      version: 1,
      activeStep: Math.max(1, Math.min(requestedActive, maxActive)),
      completed: sequential,
      score: sequential.length * 10,
    };
    if (["planning-20260908", CURRICULUM_REVISION].includes(value.journeyRevision ?? "")) progress.journeyRevision = value.journeyRevision;
    if (typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))) {
      progress.updatedAt = value.updatedAt;
    }
    if (sequential.length === totalLevels && typeof value.completedAt === "string" && isIsoCalendarDate(value.completedAt)) {
      progress.completedAt = value.completedAt;
    }
    return progress;
  } catch {
    return createEmptyProgress();
  }
}

export function loadProgress(slug: string, storage: StorageLike, totalLevels = LEVELS_PER_QUEST): QuestProgress {
  return readJourneyProgress(slug, storage.getItem(progressKey(slug)), totalLevels);
}

export function journeyRevisionInfo(slug: string, totalLevels: number): { revision: string; oldTotal: number; milestones: number[] } | undefined {
  const route = slug.replace(/^mobile:/, "");
  if (["planner", "planning:service"].includes(route) && totalLevels === 9) return { revision:"planning-20260908", oldTotal:17, milestones:[6, 7, 10, 11, 11, 12, 14, 14, 17] };
  if (["day-planner-agent", "planning:agent"].includes(route) && totalLevels === 10) return { revision:"planning-20260908", oldTotal:17, milestones:[6, 15, 15, 15, 15, 15, 15, 15, 15, 17] };
  const concrete=concreteProgressSlug(slug);
  if(reviewedLevelCounts[concrete] !== totalLevels) return undefined;
  const oldTotal=legacyQuestLevelCounts[concrete as keyof typeof legacyQuestLevelCounts];
  if(!oldTotal) return undefined;
  // New functional tests are not equivalent to old generic checkboxes. Preserve
  // the proven working base, archive the rest; fully finished routes stay finished.
  const milestones=concrete === "api-keys" ? [1,2,3,4,5,10,11,14] : [6,...Array.from({length:totalLevels-1},()=>oldTotal)];
  return { revision:CURRICULUM_REVISION, oldTotal, milestones };
}

export function readJourneyProgress(slug: string, raw: string | null, totalLevels: number): QuestProgress {
  const info = journeyRevisionInfo(slug, totalLevels);
  const current = parseProgress(raw, totalLevels);
  if (!info || current.journeyRevision === info.revision) return current;
  const old = parseProgress(raw, info.oldTotal);
  const count = info.milestones.filter((required) => old.completed.includes(required)).length;
  return {
    ...old, journeyRevision: info.revision, completed: Array.from({ length: count }, (_, i) => i + 1),
    activeStep: Math.min(count + 1, totalLevels), score: count * 10,
    completedAt: count === totalLevels ? old.completedAt : undefined,
  };
}

export function saveProgress(
  slug: string,
  progress: QuestProgress,
  storage: StorageLike,
  now: () => string | Date = () => new Date(),
  totalLevels = LEVELS_PER_QUEST,
): void {
  const clockValue = now();
  const instant = typeof clockValue === "string" ? new Date(clockValue) : clockValue;
  const updatedAt = typeof clockValue === "string" ? clockValue : instant.toISOString();
  const today = localCalendarDate(instant);
  const previous = loadProgress(slug, storage, totalLevels);
  const completedAt = progress.completedAt
    ?? previous.completedAt
    ?? (progress.completed.length === totalLevels && previous.completed.length < totalLevels
      ? today
      : undefined);
  const raw = storage.getItem(progressKey(slug));
  const reviewed = journeyRevisionInfo(slug, totalLevels);
  if (reviewed && raw && parseProgress(raw, reviewed.oldTotal).journeyRevision !== reviewed.revision) {
    const archive = `${progressKey(slug)}:legacy-20260908`;
    if (!storage.getItem(archive)) storage.setItem(archive, raw);
  }
  storage.setItem(progressKey(slug), JSON.stringify({ ...progress, ...(reviewed ? { journeyRevision: reviewed.revision } : {}), updatedAt, completedAt }));
  // Копия в аккаунте узнаёт об отметке отсюда: другого места записи прогресса нет.
  if (typeof window !== "undefined" && storage === window.localStorage) window.dispatchEvent(new Event("learning-progress-saved"));
}

export function resetProgress(slug: string, storage: StorageLike): void {
  storage.removeItem(progressKey(slug));
  storage.removeItem(`${progressKey(slug)}:legacy-20260908`);
}

export type CatalogProjectProgressState = {
  progress: QuestProgress;
  totalLevels: number;
  format?: ProjectFormat;
  branches?: Array<{
    format: ProjectFormat;
    progress: QuestProgress;
    totalLevels: number;
  }>;
};

export function getCatalogProjectProgressState(
  project: CatalogProject,
  storage: StorageLike,
  surface: QuestSurface = "desktop",
): CatalogProjectProgressState {
  if (!isProjectBundle(project)) {
    const storageSlug = `${surface === "mobile" ? "mobile:" : ""}${project.slug}`;
    const totalLevels = getProjectLevelCount(project);
    if (project.slug === "install-codex") {
      const options = [storageSlug, `${storageSlug}:mac`, `${storageSlug}:windows`].map((slug) => loadProgress(slug, storage, totalLevels));
      return { progress: options.sort((a, b) => b.completed.length - a.completed.length)[0], totalLevels };
    }
    return { progress: loadProgress(storageSlug, storage, totalLevels), totalLevels };
  }

  const serviceTotal = getProjectLevelCount(project.formats.service);
  const agentTotal = getProjectLevelCount(project.formats.agent);
  const service = loadProgress(branchStorageSlug(project.slug, "service", surface), storage, serviceTotal);
  const agent = loadProgress(branchStorageSlug(project.slug, "agent", surface), storage, agentTotal);
  const branches = [
    { format: "service" as const, progress: service, totalLevels: serviceTotal },
    { format: "agent" as const, progress: agent, totalLevels: agentTotal },
  ];
  const selected = loadOutputChoice(project.slug, surface, storage);
  const chosen = selected
    ? branches.find((branch) => branch.format === selected)!
    : agent.completed.length > service.completed.length ? branches[1] : branches[0];
  return {
    ...chosen,
    format: selected ?? (chosen.progress.completed.length > 0 ? chosen.format : undefined),
    branches,
  };
}

export function getCatalogProjectProgress(
  project: CatalogProject,
  storage: StorageLike,
  surface: QuestSurface = "desktop",
): QuestProgress {
  return getCatalogProjectProgressState(project, storage, surface).progress;
}

export function getAcademyStats(
  projects: CatalogProject[],
  storage: StorageLike,
  surface: QuestSurface = "desktop",
) {
  const values = projects.map((project) => getCatalogProjectProgressState(project, storage, surface));
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
