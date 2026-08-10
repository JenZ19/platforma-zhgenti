import type { ProjectBundleDefinition, ProjectDefinition } from "./types";

type BundleSeed = Omit<ProjectBundleDefinition, "formats"> & {
  serviceSlug: string;
  agentSlug: string;
};

export const projectBundleSeeds: BundleSeed[] = [
  {
    slug: "planning",
    title: "Планирование",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "✓",
    outcome: "Планер с экранами или агент, который собирает реалистичный день в разговоре",
    device: "телефон или ноутбук",
    serviceSlug: "planner",
    agentSlug: "day-planner-agent",
  },
  {
    slug: "ideas",
    title: "Идеи",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "✦",
    outcome: "Копилка идей или агент, который группирует мысли и предлагает следующий шаг",
    device: "телефон или ноутбук",
    serviceSlug: "idea-vault",
    agentSlug: "idea-analysis-agent",
  },
  {
    slug: "family-budget",
    title: "Семейный бюджет",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "₽",
    outcome: "Сервис с итогами или агент, который понимает расход из обычной фразы",
    device: "телефон или ноутбук",
    serviceSlug: "family-expenses",
    agentSlug: "expense-agent",
  },
  {
    slug: "recipes",
    title: "Рецепты и питание",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "⌂",
    outcome: "База рецептов или агент, который уточняет условия и собирает меню с покупками",
    device: "телефон или ноутбук",
    serviceSlug: "recipe-book",
    agentSlug: "meal-planning-agent",
  },
  {
    slug: "family-schedule",
    title: "Семейное расписание",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "◷",
    outcome: "Недельный экран или агент, который принимает события и замечает пересечения",
    device: "телефон или ноутбук",
    serviceSlug: "child-schedule",
    agentSlug: "family-schedule-agent",
  },
  {
    slug: "habits",
    title: "Привычки и активность",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "○",
    outcome: "Трекер отметок или бережный агент ежедневной поддержки",
    device: "телефон или ноутбук",
    serviceSlug: "fitness-tracker",
    agentSlug: "habit-agent",
  },
  {
    slug: "household",
    title: "Домашние дела",
    weeks: [1, 2],
    track: "Сервис или ИИ-агент",
    symbol: "⌁",
    outcome: "Сервис распределения дел или агент, который собирает спокойный домашний план",
    device: "телефон или ноутбук",
    serviceSlug: "home-helper",
    agentSlug: "home-organizer-agent",
  },
];

export const bundledConcreteSlugs = new Set(
  projectBundleSeeds.flatMap((bundle) => [bundle.serviceSlug, bundle.agentSlug]),
);

export function createProjectBundles(
  concreteBySlug: ReadonlyMap<string, ProjectDefinition>,
): ProjectBundleDefinition[] {
  return projectBundleSeeds.map(({ serviceSlug, agentSlug, ...bundle }) => {
    const service = concreteBySlug.get(serviceSlug);
    const agent = concreteBySlug.get(agentSlug);
    if (!service || !agent) {
      throw new Error(`Не найдены ветки проекта ${bundle.slug}`);
    }
    return { ...bundle, formats: { service, agent } };
  });
}
