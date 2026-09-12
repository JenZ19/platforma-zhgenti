import type { ProjectDefinition, QuestStep } from "./types";

/**
 * Награды переработанных квестов.
 *
 * Раньше феи стояли на шагах 4, 8, 12 и 17 длинной версии курса. После сокращения уроков
 * до семи-десяти шагов эти номера перестали существовать, и почти все квесты не давали
 * ни одной награды. Теперь узловые шаги считаются от фактической длины квеста.
 */
type RewardNames = { middle: string; last: string };

const byKind: Record<string, RewardNames> = {
  service: { middle: "Хранительница своей версии", last: "Фея работающего сервиса" },
  agent: { middle: "Хранительница живого разговора", last: "Фея готового агента" },
  "simple-site": { middle: "Хранительница своего стиля", last: "Фея опубликованного сайта" },
  "advanced-site": { middle: "Хранительница надёжной версии", last: "Фея выросшего проекта" },
  portfolio: { middle: "Хранительница честных работ", last: "Фея выпускного портфолио" },
};

const fallback: RewardNames = { middle: "Хранительница проекта", last: "Фея готового результата" };

const setup: RewardNames = { middle: "Хранительница доступа", last: "Фея настроенного рабочего места" };

/** Узловые шаги: середина пути и последний шаг. Короткий квест получает одну награду на финише. */
export function rewardSteps(total: number): { middle?: number; last?: number } {
  if (total < 1) return {};
  if (total < 5) return { last: total };
  return { middle: Math.ceil(total / 2), last: total };
}

/** Проставляет награды, не трогая те, что автор уже задал руками. */
export function attachRewards(project: ProjectDefinition, steps: QuestStep[]): QuestStep[] {
  if (steps.some((step) => step.reward)) return steps;
  const names = project.journey === "setup" ? setup : byKind[project.kind] ?? fallback;
  const { middle, last } = rewardSteps(steps.length);
  return steps.map((step) => {
    if (step.id === last) return { ...step, reward: names.last };
    if (step.id === middle) return { ...step, reward: names.middle };
    return step;
  });
}
