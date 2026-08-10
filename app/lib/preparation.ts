import { getPreparationProfile } from "../content/preparation";
import type { ProjectPreparationProfile } from "../content/preparation";
import type { ProjectDefinition } from "../content/types";
import type { StorageLike } from "./progress";

export type DataMode = "demo" | "real";

export type QuestPreparation = {
  version: 1;
  mode: DataMode | null;
  checked: string[];
  ready: boolean;
};

export type PreparationItem = {
  id: string;
  text: string;
  detail: string;
  steps?: string[];
  example?: string;
  doneWhen?: string;
  screenshot?: string;
};

const PREFIX = "feya-academy-preparation-v1";

export type PreparationSurface = "desktop" | "mobile";

export function preparationKey(slug: string): string {
  return `${PREFIX}:${slug}`;
}

export function createEmptyPreparation(): QuestPreparation {
  return { version: 1, mode: null, checked: [], ready: false };
}

export function parsePreparation(raw: string | null): QuestPreparation {
  if (!raw) return createEmptyPreparation();
  try {
    const value = JSON.parse(raw) as Partial<QuestPreparation>;
    if (value.version !== 1 || (value.mode !== "demo" && value.mode !== "real")) return createEmptyPreparation();
    const checked = Array.isArray(value.checked)
      ? [...new Set(value.checked.filter((item): item is string => typeof item === "string"))]
      : [];
    return { version: 1, mode: value.mode, checked, ready: value.mode === "demo" ? true : value.ready === true };
  } catch {
    return createEmptyPreparation();
  }
}

export function loadPreparation(slug: string, storage: StorageLike): QuestPreparation {
  return parsePreparation(storage.getItem(preparationKey(slug)));
}

export function savePreparation(slug: string, preparation: QuestPreparation, storage: StorageLike): void {
  storage.setItem(preparationKey(slug), JSON.stringify(preparation));
}

export function resetPreparation(slug: string, storage: StorageLike): void {
  storage.removeItem(preparationKey(slug));
}

export function buildRealDataChecklist(project: ProjectDefinition, surface: PreparationSurface = "desktop"): PreparationItem[] {
  if (project.slug === "family-expenses") return buildFamilyExpensesChecklist(surface);
  const profile = getPreparationProfile(project.slug);
  return buildProfileChecklist(project, profile, surface);
}

function buildFamilyExpensesChecklist(surface: PreparationSurface): PreparationItem[] {
  const place = surface === "mobile" ? " в Telegram" : "";
  return [
    {
      id: "budget-answer",
      text: "Вспомните примерный бюджет и валюту",
      detail: "Ничего записывать не нужно. Когда Codex спросит, назовите сумму обычными словами или ответьте «пока не знаю».",
    },
    {
      id: "category-answer",
      text: "Вспомните 3–8 привычных категорий",
      detail: "Например: продукты, ребёнок, транспорт. Таблицу составлять не нужно — перечислите категории голосом или текстом.",
    },
    {
      id: "expense-answer",
      text: "Вспомните 3–5 недавних расходов",
      detail: "Достаточно помнить дату, примерную сумму и категорию. Codex сам разложит ответы по нужным полям.",
    },
    {
      id: "conversation-ready",
      text: `Приготовьтесь ответить Codex${place}`,
      detail: `Codex сам создаст папку, файлы и структуру проекта после четырёх коротких вопросов. Вы отвечаете по одному голосом или текстом — вручную ничего создавать не будете.`,
    },
  ];
}

function buildProfileChecklist(
  project: ProjectDefinition,
  profile: ProjectPreparationProfile,
  surface: PreparationSurface,
): PreparationItem[] {
  return [
    {
      id: "examples-ready",
      text: `Вспомните 3–5 своих примеров для «${project.title}»`,
      detail: `Ничего записывать и оформлять не нужно. Когда Codex спросит, отвечайте обычными словами: ${profile.sourceFields.join(", ")}. Можно голосом или текстом.`,
    },
    {
      id: "rules-ready",
      text: "Вспомните свои правила и ограничения",
      detail: `Codex задаст короткие вопросы про: ${profile.rules.join(", ")}. Если ответа пока нет, можно сказать «пока не знаю» — Codex ничего не додумает.`,
    },
    {
      id: "result-ready",
      text: "Решите, какой результат хотите получить",
      detail: `Достаточно выбрать самое важное из списка: ${project.features.join(", ")}. Codex сам превратит ответы в понятное задание.`,
    },
    {
      id: "safety-ready",
      text: "Отделите полезные сведения от личных и секретных",
      detail: `${project.safety} Не называйте пароли, коды из СМС, токены, реквизиты и паспортные данные. Если у вас уже есть документ или фотография, отправляйте только безопасную копию по просьбе Codex.`,
    },
    {
      id: "conversation-ready",
      text: `Приготовьтесь ответить Codex${surface === "mobile" ? " в Telegram" : ""}`,
      detail: `Codex сам создаст проект ${project.slug}, папки, файлы и нужные поля. Он будет задавать по одному вопросу, а вы сможете отвечать голосом или текстом — вручную ничего создавать не придётся.`,
    },
  ];
}

export function isPreparationReady(preparation: QuestPreparation, checklist: PreparationItem[]): boolean {
  if (preparation.mode === "demo") return preparation.ready;
  if (preparation.mode !== "real" || !preparation.ready) return false;
  return checklist.every((item) => preparation.checked.includes(item.id));
}
