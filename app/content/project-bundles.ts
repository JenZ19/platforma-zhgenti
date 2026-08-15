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
    outcome: "На выбор: экранный планер или разговорный ИИ-помощник для составления реалистичного дня",
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
    outcome: "На выбор: копилка идей с карточками или разговорный ИИ-помощник для разбора мыслей и следующего шага",
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
    outcome: "На выбор: экранный учёт расходов с итогами или разговорный ИИ-помощник, который понимает траты из обычной фразы",
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
    outcome: "На выбор: база рецептов с меню и покупками или разговорный ИИ-помощник, который собирает их в диалоге",
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
    outcome: "На выбор: недельное расписание или разговорный ИИ-помощник, который принимает события и замечает пересечения",
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
    outcome: "На выбор: трекер отметок или разговорный ИИ-помощник для бережной ежедневной поддержки",
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
    outcome: "На выбор: экранный организатор домашних дел или разговорный ИИ-помощник, который собирает спокойный план",
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
