import { isProjectBundle } from "../content/projects";
import type { CatalogProject } from "../content/types";
import type { QuestSurface } from "./output-format";
import { getCatalogProjectProgress, getProjectLevelCount, type StorageLike } from "./progress";

const PREFIX = "feya-dashboard-v1";

export type DashboardSection = "home" | "projects" | "weeks" | "portfolio" | "fairy";

const dashboardSections: readonly DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

export type DashboardProjectState = {
  project: CatalogProject;
  completedLevels: number;
  totalLevels: number;
  percent: number;
  status: "new" | "started" | "completed";
  saved: boolean;
  completedAt?: string;
};

export type DashboardSnapshot = {
  items: DashboardProjectState[];
  started: DashboardProjectState[];
  completed: DashboardProjectState[];
  saved: DashboardProjectState[];
  currentWeek: number;
  completedLevels: number;
  totalLevels: number;
  next: DashboardProjectState;
};

export type QuestionNote = {
  id: string;
  text: string;
  createdAt: string;
};

function readJson<T>(storage: StorageLike, key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const value: unknown = JSON.parse(storage.getItem(key) ?? "null");
    return validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function stringRecord(value: unknown): value is Record<string, string> {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every((item) => typeof item === "string");
}

function questionNotes(value: unknown): value is QuestionNote[] {
  return Array.isArray(value) && value.every((item) => Boolean(item)
    && typeof item === "object"
    && typeof (item as QuestionNote).id === "string"
    && typeof (item as QuestionNote).text === "string"
    && typeof (item as QuestionNote).createdAt === "string");
}

export function loadSavedProjects(storage: StorageLike): string[] {
  return [...new Set(readJson(storage, `${PREFIX}:saved`, [], stringList))];
}

export function toggleSavedProject(slug: string, storage: StorageLike): string[] {
  const saved = loadSavedProjects(storage);
  const next = saved.includes(slug) ? saved.filter((item) => item !== slug) : [...saved, slug];
  storage.setItem(`${PREFIX}:saved`, JSON.stringify(next));
  return next;
}

export function saveLastActiveProject(slug: string, surface: QuestSurface, storage: StorageLike): void {
  storage.setItem(`${PREFIX}:last:${surface}`, slug);
}

export function loadLastActiveProject(surface: QuestSurface, storage: StorageLike): string | undefined {
  return storage.getItem(`${PREFIX}:last:${surface}`) ?? undefined;
}

export function saveDashboardSection(section: DashboardSection, storage: StorageLike): void {
  storage.setItem(`${PREFIX}:section`, section);
}

export function loadDashboardSection(storage: StorageLike): DashboardSection {
  const value = storage.getItem(`${PREFIX}:section`);
  return dashboardSections.includes(value as DashboardSection) ? value as DashboardSection : "home";
}

export function loadQuestionNotes(scope: string, storage: StorageLike): QuestionNote[] {
  return readJson(storage, `${PREFIX}:notes:${scope}`, [], questionNotes);
}

export function saveQuestionNote(
  scope: string,
  text: string,
  storage: StorageLike,
  now: () => string = () => new Date().toISOString(),
): QuestionNote[] {
  const trimmed = text.trim();
  if (!trimmed) return loadQuestionNotes(scope, storage);
  const createdAt = now();
  const next = [...loadQuestionNotes(scope, storage), { id: createdAt, text: trimmed, createdAt }];
  storage.setItem(`${PREFIX}:notes:${scope}`, JSON.stringify(next));
  return next;
}

function completionMap(surface: QuestSurface, storage: StorageLike): Record<string, string> {
  return readJson(storage, `${PREFIX}:completed-at:${surface}`, {}, stringRecord);
}

function projectWeeks(project: CatalogProject): readonly number[] {
  return isProjectBundle(project) ? project.weeks : [project.week];
}

export function buildDashboardSnapshot(
  projects: CatalogProject[],
  storage: StorageLike,
  surface: QuestSurface,
  today: () => string = () => new Date().toISOString().slice(0, 10),
): DashboardSnapshot {
  const saved = loadSavedProjects(storage);
  const dates = completionMap(surface, storage);
  const items = projects.map((project): DashboardProjectState => {
    const progress = getCatalogProjectProgress(project, storage, surface);
    const totalLevels = getProjectLevelCount(project);
    const status = progress.completed.length === totalLevels
      ? "completed"
      : progress.completed.length
        ? "started"
        : "new";

    if (status === "completed" && !dates[project.slug]) dates[project.slug] = today();

    return {
      project,
      completedLevels: progress.completed.length,
      totalLevels,
      percent: Math.round((progress.completed.length / totalLevels) * 100),
      status,
      saved: saved.includes(project.slug),
      completedAt: dates[project.slug],
    };
  });

  storage.setItem(`${PREFIX}:completed-at:${surface}`, JSON.stringify(dates));

  const started = items.filter((item) => item.status === "started");
  const completed = items.filter((item) => item.status === "completed");
  const currentWeek = [1, 2, 3, 4, 5, 6].find((week) => items.some((item) =>
    projectWeeks(item.project).includes(week) && item.status !== "completed",
  )) ?? 6;
  const lastSlug = loadLastActiveProject(surface, storage);
  const next = items.find((item) => item.project.slug === lastSlug && item.status !== "completed")
    ?? started.at(-1)
    ?? items.find((item) => projectWeeks(item.project).includes(currentWeek) && item.status !== "completed")
    ?? items[0]!;

  return {
    items,
    started,
    completed,
    saved: items.filter((item) => item.saved && item.status === "new"),
    currentWeek,
    completedLevels: items.reduce((sum, item) => sum + item.completedLevels, 0),
    totalLevels: items.reduce((sum, item) => sum + item.totalLevels, 0),
    next,
  };
}
