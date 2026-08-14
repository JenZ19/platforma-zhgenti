import { isProjectBundle } from "../content/projects";
import type { CatalogProject, ProjectFormat } from "../content/types";
import type { QuestSurface } from "./output-format";
import { getCatalogProjectProgressState, type StorageLike } from "./progress";

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
  updatedAt?: string;
  completedAt?: string;
  output?: ProjectFormat;
  completedOutputs: Array<{ format: ProjectFormat; completedAt?: string }>;
};

export type DashboardSnapshot = {
  items: DashboardProjectState[];
  started: DashboardProjectState[];
  completed: DashboardProjectState[];
  saved: DashboardProjectState[];
  currentWeek: number;
  completedLevels: number;
  totalLevels: number;
  next: DashboardProjectState | null;
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
  const notes = loadQuestionNotes(scope, storage);
  if (!trimmed) return notes;
  const createdAt = now();
  const existingIds = new Set(notes.map((note) => note.id));
  let id = createdAt;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${createdAt}-${suffix}`;
    suffix += 1;
  }
  const next = [...notes, { id, text: trimmed, createdAt }];
  storage.setItem(`${PREFIX}:notes:${scope}`, JSON.stringify(next));
  return next;
}

function projectWeeks(project: CatalogProject): readonly number[] {
  return isProjectBundle(project) ? project.weeks : [project.week];
}

export function buildDashboardSnapshot(
  projects: CatalogProject[],
  storage: StorageLike,
  surface: QuestSurface,
): DashboardSnapshot {
  const saved = loadSavedProjects(storage);
  const items = projects.map((project): DashboardProjectState => {
    const { progress, totalLevels, format, branches = [] } = getCatalogProjectProgressState(project, storage, surface);
    const status = progress.completed.length === totalLevels
      ? "completed"
      : progress.completed.length
        ? "started"
        : "new";

    return {
      project,
      completedLevels: progress.completed.length,
      totalLevels,
      percent: Math.round((progress.completed.length / totalLevels) * 100),
      status,
      saved: saved.includes(project.slug),
      updatedAt: progress.updatedAt,
      completedAt: progress.completedAt,
      output: format,
      completedOutputs: branches
        .filter((branch) => branch.progress.completed.length === branch.totalLevels)
        .map((branch) => ({ format: branch.format, completedAt: branch.progress.completedAt })),
    };
  });

  const started = items
    .filter((item) => item.status === "started")
    .sort((left, right) => {
      if (left.updatedAt && right.updatedAt) return right.updatedAt.localeCompare(left.updatedAt);
      if (left.updatedAt) return -1;
      if (right.updatedAt) return 1;
      return 0;
    });
  const completed = items.filter((item) => item.status === "completed");
  const currentWeek = [1, 2, 3, 4, 5, 6].find((week) => items.some((item) =>
    projectWeeks(item.project).includes(week) && item.status !== "completed",
  )) ?? 6;
  const lastSlug = loadLastActiveProject(surface, storage);
  const next = completed.length === items.length
    ? null
    : items.find((item) => item.project.slug === lastSlug && item.status !== "completed")
      ?? started[0]
      ?? items.find((item) => projectWeeks(item.project).includes(currentWeek) && item.status !== "completed")
      ?? null;

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
