import { buildQuest } from "../content/quests";
import { resolveProjectVariant } from "../content/projects";
import type { ProjectDefinition } from "../content/types";
import type { DashboardSnapshot } from "./academy-dashboard";

/** Награда, которую ученица уже забрала: имя феи и проект, в котором это случилось. */
export type EarnedReward = { slug: string; project: string; reward: string; step: number };
/** Ближайшая награда: сколько шагов до неё осталось в начатом проекте. */
export type NextReward = { slug: string; project: string; reward: string; stepsLeft: number };
export type RewardsSummary = { sparks: number; earned: EarnedReward[]; next?: NextReward };

export const SPARKS_PER_STEP = 10;

function rewardsOf(project: ProjectDefinition): { step: number; reward: string }[] {
  try {
    return buildQuest(project, "demo").flatMap((step) => (step.reward ? [{ step: step.id, reward: step.reward }] : []));
  } catch {
    // Проект без готовых уроков не должен ронять кабинет — просто не даёт наград.
    return [];
  }
}

/**
 * Что искры уже принесли. Считаем только по начатым проектам: остальная библиотека
 * ничего не заработала, а строить её уроки ради нулей незачем.
 */
export function collectRewards(snapshot: DashboardSnapshot): RewardsSummary {
  // У проекта с двумя форматами прогресс живёт в каждой ветке отдельно — считаем их как разные прохождения.
  const runs = snapshot.items.flatMap((item) => (item.variants?.length ? item.variants : [item]));
  const touched = runs.filter((item) => item.completedLevels > 0);
  const earned: EarnedReward[] = [];
  let next: NextReward | undefined;
  for (const item of touched) {
    const project = resolveProjectVariant(item.project, item.output);
    if (!project) continue;
    for (const { step, reward } of rewardsOf(project)) {
      if (step <= item.completedLevels) {
        earned.push({ slug: item.catalogSlug ?? item.project.slug, project: project.title, reward, step });
      } else {
        const stepsLeft = step - item.completedLevels;
        if (!next || stepsLeft < next.stepsLeft) next = { slug: item.catalogSlug ?? item.project.slug, project: project.title, reward, stepsLeft };
        break;
      }
    }
  }
  return { sparks: snapshot.completedLevels * SPARKS_PER_STEP, earned, next };
}

export function stepsLabel(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return "шагов";
  const last = count % 10;
  if (last === 1) return "шаг";
  if (last >= 2 && last <= 4) return "шага";
  return "шагов";
}

export function sparksLabel(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return "искр";
  const last = count % 10;
  if (last === 1) return "искра";
  if (last >= 2 && last <= 4) return "искры";
  return "искр";
}
