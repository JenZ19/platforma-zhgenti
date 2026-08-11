import { getQuestProject, isProjectBundle } from "./projects";
import type { CatalogProject, ProjectDefinition } from "./types";

export type Difficulty = 1 | 2 | 3 | 4;
export type DifficultyFilter = 0 | Difficulty;
export type GoalKeyword =
  | "Для себя"
  | "Семья и быт"
  | "Здоровье"
  | "Контент"
  | "Для клиентов"
  | "Для заработка"
  | "Сайты и сервисы"
  | "ИИ-агенты"
  | "Настройка";
export type GoalFilter = "Все цели" | GoalKeyword;

export type QuestDiscoveryProfile = {
  difficulty: Difficulty;
  keywords: GoalKeyword[];
  synonyms: string[];
};

export type CatalogDiscoveryProfile = {
  firstWeek: number;
  minDifficulty: Difficulty;
  maxDifficulty: Difficulty;
  label: string;
  keywords: GoalKeyword[];
  synonyms: string[];
};

export type DiscoveryFilters = {
  week: number;
  difficulty: DifficultyFilter;
  goal: GoalFilter;
  query: string;
};

export const difficultyLabels: Record<Difficulty, string> = {
  1: "Стартовый",
  2: "Лёгкий",
  3: "Средний",
  4: "Продвинутый",
};

export const goalKeywords: GoalKeyword[] = [
  "Для себя",
  "Семья и быт",
  "Здоровье",
  "Контент",
  "Для клиентов",
  "Для заработка",
  "Сайты и сервисы",
  "ИИ-агенты",
  "Настройка",
];

const difficultyGroups: Record<Difficulty, string[]> = {
  1: ["install-codex", "family-expenses", "planner", "idea-vault", "child-schedule", "pressure-diary", "fitness-tracker", "recipe-book", "personal-organizer", "home-helper", "portfolio-site"],
  2: ["day-planner-agent", "home-organizer-agent", "meal-planning-agent", "study-agent", "idea-analysis-agent", "expense-agent", "family-schedule-agent", "habit-agent", "brief-agent", "content-agent", "expert-assistant-agent", "event-organizer-agent", "unique-design", "expert-site", "beauty-site", "photographer-site", "designer-site", "consultation-site", "event-site"],
  3: ["api-keys", "family-health-hub", "client-care-agent", "administrator-agent", "consultant-agent", "online-school-agent", "carousel-agent", "threads-agent", "psychologist-site", "course-site", "small-shop-site", "expert-pro-site", "service-pro-site", "graduate-portfolio"],
  4: ["server-152fz", "fairy-team-agent", "webinar-moderator-agent", "school-pro-site", "catalog-pro-site"],
};

const difficultyBySlug = new Map<string, Difficulty>(
  (Object.entries(difficultyGroups) as [string, string[]][]).flatMap(([difficulty, slugs]) =>
    slugs.map((slug) => [slug, Number(difficulty) as Difficulty] as const),
  ),
);

const healthSlugs = new Set(["pressure-diary", "fitness-tracker", "habit-agent", "family-health-hub"]);
const contentSlugs = new Set(["content-agent", "carousel-agent", "threads-agent", "course-site", "event-site", "event-organizer-agent", "webinar-moderator-agent", "unique-design"]);
const setupSlugs = new Set(["install-codex", "api-keys", "server-152fz"]);
const personalPortfolioSlugs = new Set(["portfolio-site", "graduate-portfolio"]);

const synonymMap: Record<GoalKeyword, string[]> = {
  "Для себя": ["личное", "себе", "мой проект"],
  "Семья и быт": ["мама", "ребёнок", "семья", "дом", "быт"],
  "Здоровье": ["здоровье", "давление", "фитнес", "самочувствие"],
  "Контент": ["рилс", "пост", "карусель", "threads", "вебинар"],
  "Для клиентов": ["клиент", "заказчик", "заявка", "запись"],
  "Для заработка": ["заработок", "продажи", "услуга", "портфолио"],
  "Сайты и сервисы": ["сайт", "лендинг", "приложение", "сервис"],
  "ИИ-агенты": ["бот", "помощник", "агент", "автоматизация"],
  "Настройка": ["установка", "сервер", "api", "ключ", "codex"],
};

function deriveKeywords(project: ProjectDefinition): GoalKeyword[] {
  const keywords = new Set<GoalKeyword>();

  if (setupSlugs.has(project.slug)) keywords.add("Настройка");
  if (project.week <= 2 || personalPortfolioSlugs.has(project.slug)) keywords.add("Для себя");
  if (project.week <= 2 && !setupSlugs.has(project.slug)) keywords.add("Семья и быт");
  if (healthSlugs.has(project.slug)) keywords.add("Здоровье");
  if (contentSlugs.has(project.slug)) keywords.add("Контент");
  if (project.week >= 3 || project.slug === "server-152fz") keywords.add("Для клиентов");
  if (project.week >= 3 || project.slug === "api-keys" || project.slug === "server-152fz") keywords.add("Для заработка");
  if (project.kind === "service" || project.kind === "simple-site" || project.kind === "advanced-site" || project.kind === "portfolio") keywords.add("Сайты и сервисы");
  if (project.kind === "agent") keywords.add("ИИ-агенты");

  if (keywords.size < 2) keywords.add("Для себя");
  return [...keywords];
}

export function getQuestDiscoveryProfile(slug: string): QuestDiscoveryProfile {
  const project = getQuestProject(slug);
  const difficulty = difficultyBySlug.get(slug);
  if (!project || !difficulty) throw new Error(`Не задан профиль выбора для проекта ${slug}`);
  const keywords = deriveKeywords(project);
  return {
    difficulty,
    keywords,
    synonyms: [...new Set(keywords.flatMap((keyword) => synonymMap[keyword]))],
  };
}

export function getCatalogDiscoveryProfile(project: CatalogProject): CatalogDiscoveryProfile {
  const branches = isProjectBundle(project) ? Object.values(project.formats) : [project];
  const profiles = branches.map((branch) => getQuestDiscoveryProfile(branch.slug));
  const minDifficulty = Math.min(...profiles.map((profile) => profile.difficulty)) as Difficulty;
  const maxDifficulty = Math.max(...profiles.map((profile) => profile.difficulty)) as Difficulty;
  const keywords = [...new Set(profiles.flatMap((profile) => profile.keywords))];
  const synonyms = [...new Set(profiles.flatMap((profile) => profile.synonyms))];
  return {
    firstWeek: isProjectBundle(project) ? Math.min(...project.weeks) : project.week,
    minDifficulty,
    maxDifficulty,
    label: minDifficulty === maxDifficulty ? difficultyLabels[minDifficulty] : `${difficultyLabels[minDifficulty]} → ${difficultyLabels[maxDifficulty]}`,
    keywords,
    synonyms,
  };
}

function matchesQuery(project: CatalogProject, profile: CatalogDiscoveryProfile, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("ru");
  if (!needle) return true;
  const branches = isProjectBundle(project) ? Object.values(project.formats) : [project];
  const branchText = branches.flatMap((branch) => [branch.title, branch.audience, branch.outcome, branch.track, ...branch.entities, ...branch.features]);
  return [project.title, project.outcome, project.track, ...profile.keywords, ...profile.synonyms, ...branchText]
    .join(" ")
    .toLocaleLowerCase("ru")
    .includes(needle);
}

export function filterAndSortProjects(items: CatalogProject[], filters: DiscoveryFilters): CatalogProject[] {
  return items
    .map((project, index) => ({ project, index, profile: getCatalogDiscoveryProfile(project) }))
    .filter(({ project, profile }) => {
      const inWeek = filters.week === 0 || (isProjectBundle(project) ? project.weeks.includes(filters.week as 1 | 2) : project.week === filters.week);
      const inDifficulty = filters.difficulty === 0 || (profile.minDifficulty <= filters.difficulty && filters.difficulty <= profile.maxDifficulty);
      const inGoal = filters.goal === "Все цели" || profile.keywords.includes(filters.goal);
      return inWeek && inDifficulty && inGoal && matchesQuery(project, profile, filters.query);
    })
    .sort((left, right) => left.profile.firstWeek - right.profile.firstWeek || left.profile.minDifficulty - right.profile.minDifficulty || left.index - right.index)
    .map(({ project }) => project);
}
