import type { CatalogProject, ProjectFormat } from "../content/types";
import { isProjectBundle } from "../content/projects";
import type { QuestSurface } from "./output-format";
import { getCatalogProjectProgressState, type StorageLike } from "./progress";
import { buildCourseMilestones, type CourseMilestone } from "./course-route";

const PREFIX = "feya-dashboard-v1";

export type DashboardSection = "home" | "projects" | "weeks" | "portfolio" | "fairy";

const dashboardSections: readonly DashboardSection[] = ["home", "projects", "weeks", "portfolio", "fairy"];

export type DashboardProjectState = {
  project: CatalogProject;
  /** Concrete library cards retain their bundle's navigation and saved-project identity. */
  catalogSlug?: string;
  variants?: DashboardProjectState[];
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
  course?: CourseMilestone[];
};

export type QuestionNote = {
  id: string;
  text: string;
  createdAt: string;
};

export type QuestionNotesLoadResult = {
  notes: QuestionNote[];
  error?: "storage";
};

export type QuestionNoteSaveResult = {
  notes: QuestionNote[];
  saved: boolean;
  error?: "storage";
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
  return loadQuestionNotesResult(scope, storage).notes;
}

export function loadQuestionNotesResult(scope: string, storage: StorageLike): QuestionNotesLoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(`${PREFIX}:notes:${scope}`);
  } catch {
    return { notes: [], error: "storage" };
  }

  try {
    const value: unknown = JSON.parse(raw ?? "null");
    return { notes: questionNotes(value) ? value : [] };
  } catch {
    return { notes: [] };
  }
}

export function saveQuestionNoteResult(
  scope: string,
  text: string,
  storage: StorageLike,
  now: () => string = () => new Date().toISOString(),
): QuestionNoteSaveResult {
  const trimmed = text.trim();
  const loaded = loadQuestionNotesResult(scope, storage);
  if (loaded.error) return { notes: loaded.notes, saved: false, error: loaded.error };
  const notes = loaded.notes;
  if (!trimmed) return { notes, saved: false };
  const createdAt = now();
  const existingIds = new Set(notes.map((note) => note.id));
  let id = createdAt;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${createdAt}-${suffix}`;
    suffix += 1;
  }
  const next = [...notes, { id, text: trimmed, createdAt }];
  try {
    storage.setItem(`${PREFIX}:notes:${scope}`, JSON.stringify(next));
    return { notes: next, saved: true };
  } catch {
    return { notes, saved: false, error: "storage" };
  }
}

export function saveQuestionNote(
  scope: string,
  text: string,
  storage: StorageLike,
  now: () => string = () => new Date().toISOString(),
): QuestionNote[] {
  return saveQuestionNoteResult(scope, text, storage, now).notes;
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
      variants: isProjectBundle(project) ? branches.map((branch) => ({
        project: project.formats[branch.format],
        catalogSlug: project.slug,
        output: branch.format,
        completedLevels: branch.progress.completed.length,
        totalLevels: branch.totalLevels,
        percent: Math.round(branch.progress.completed.length / branch.totalLevels * 100),
        status: branch.progress.completed.length === branch.totalLevels ? "completed" : branch.progress.completed.length ? "started" : "new",
        saved: saved.includes(project.slug),
        updatedAt: branch.progress.updatedAt,
        completedAt: branch.progress.completedAt,
        completedOutputs: [],
      })) : undefined,
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
  const course = buildCourseMilestones(items, storage, surface);
  const currentWeek = course.find((week) => !week.complete)?.week ?? 6;
  const lastSlug = loadLastActiveProject(surface, storage);
  const resumed = started.find((item) => item.project.slug === lastSlug) ?? started[0];
  const install = surface === "desktop" && !resumed && !completed.length ? items.find((item) => item.project.slug === "install-codex" && item.status !== "completed") : undefined;
  const next = resumed ?? install ?? course.find((week) => !week.complete)?.item ?? null;

  return {
    items,
    started,
    completed,
    saved: items.filter((item) => item.saved && item.status === "new"),
    currentWeek,
    completedLevels: items.reduce((sum, item) => sum + item.completedLevels, 0),
    totalLevels: items.reduce((sum, item) => sum + item.totalLevels, 0),
    next,
    course,
  };
}
