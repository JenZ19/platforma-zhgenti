import { getPreparationProfile } from "../content/preparation";
import type { ProjectPreparationProfile } from "../content/preparation";
import { getAgentContract } from "../content/agent-contracts";
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
  if (project.journey === "setup") return [];
  if (project.slug === "family-expenses") return buildFamilyExpensesChecklist(surface);
  const sourceChecklist = buildSourceProjectChecklist(project, surface);
  if (sourceChecklist) return sourceChecklist;
  if (project.kind === "agent") return buildAgentChecklist(project, surface);
  const profile = getPreparationProfile(project.slug);
  return buildProfileChecklist(project, profile, surface);
}

function buildSourceProjectChecklist(project: ProjectDefinition, surface: PreparationSurface): PreparationItem[] | undefined {
  const telegram = surface === "mobile" ? " в Telegram" : "";
  const commonFinish: PreparationItem = {
    id: "conversation-ready",
    text: `Приготовьтесь отвечать Codex${telegram}`,
    detail: `Codex сам создаст проект ${project.slug}, все папки, файлы и поля. Вы только отвечаете на вопросы по одному — голосом или текстом. Пароли, токены и коды из СМС сюда не отправляйте.`,
  };

  if (project.slug === "carousel-agent") {
    return [
      {
        id: "approved-copy",
        text: "Выберите один утверждённый текст для будущей карусели",
        detail: "Подойдёт ваш готовый пост длиной от 40 знаков. Агент сохранит основной текст дословно и сможет придумать только заголовки, акценты и финальный призыв.",
      },
      {
        id: "owned-photos",
        text: "Подготовьте фотографии или скриншоты, которые вам разрешено использовать",
        detail: "Фотографии необязательны: можно сделать карусель без них. Если они есть, первая станет обложкой, а остальные вы распределите по слайдам вручную или автоматически.",
      },
      {
        id: "cta-and-handle",
        text: "Решите, какой призыв и ник появятся на последнем слайде",
        detail: "Например: «Сохраните, чтобы не потерять» и ваш ник. Если призыв пока не готов, агент предложит варианты, но вы выберете финальный текст сами.",
      },
      {
        id: "render-choice",
        text: "Выберите обычную вёрстку или платные нейрофоны",
        detail: "Обычная вёрстка собирается без генерации фона. Нейрофоны создаются отдельно и могут расходовать оплачиваемый лимит — агент обязательно спросит подтверждение.",
      },
      commonFinish,
    ];
  }

  if (project.slug === "threads-agent") {
    return [
      {
        id: "threads-profile",
        text: "Выберите один профиль Threads, для которого будет работать агент",
        detail: "Приготовьте ник, тему профиля, описание аудитории и главную цель публикаций. Автоматически публиковать посты агент не будет.",
      },
      {
        id: "voice-samples",
        text: "Примеры голоса: выберите 3–5 своих удачных постов",
        detail: "Возьмите короткие посты, которыми вы довольны. По ним агент соберёт паспорт голоса: длину фраз, любимые обороты, допустимый юмор и запреты.",
      },
      {
        id: "owned-sources",
        text: "Соберите свои источники, которые можно адаптировать",
        detail: "Это могут быть ваши Telegram-каналы, сайт, заметки и опубликованные материалы. Свои тексты агент сможет переработать без подписи источника.",
      },
      {
        id: "external-sources",
        text: "Соберите внешние источники и факты, которые нужно проверять",
        detail: "Чужой материал агент перепишет с нуля и добавит источник. Отдельно приготовьте проверенные факты, запрещённые темы и удобное время ежедневной выдачи.",
      },
      commonFinish,
    ];
  }

  if (project.slug === "webinar-moderator-agent") {
    return [
      {
        id: "test-webinar",
        text: "Выберите один тестовый вебинар и отдельную учебную комнату",
        detail: "Нужны дата, время, ссылка на комнату и несколько безопасных тестовых сообщений. Сначала агент работает только в режиме наблюдения.",
      },
      {
        id: "approved-templates",
        text: "Подготовьте утверждённые шаблоны технических ответов",
        detail: "Подойдут ответы про звук, видео, запись и организацию эфира. Цены, возражения и вопросы по содержанию курса всегда передаются человеку.",
      },
      {
        id: "knowledge-base",
        text: "База знаний: соберите материалы вебинара",
        detail: "Подготовьте программу, правила, ссылки и FAQ. Если подтверждённого ответа в базе знаний нет, агент не должен его придумывать.",
      },
      {
        id: "schedule-and-access",
        text: "Уточните расписание и подготовьте отдельного сотрудника с минимальными правами",
        detail: surface === "mobile"
          ? "Первый вход и калибровку один раз выполнит куратор. Не помещайте пароль в Академию, Codex или Telegram."
          : "Логин один раз вводится куратором при настройке на компьютере. Не помещайте пароль в Академию, Codex или Telegram.",
      },
      commonFinish,
    ];
  }

  if (project.slug === "family-health-hub") {
    return [
      {
        id: "safe-pdf-copies",
        text: "Подготовьте безопасные копии лабораторных PDF",
        detail: "Используйте копии документов, которые разрешено обрабатывать. Они остаются в вашей закрытой установке и никогда не попадают в учебное портфолио.",
      },
      {
        id: "family-profiles",
        text: "Перечислите профили людей и животных и варианты имени каждого",
        detail: "Можно использовать домашние обозначения: «Мама», «Кот Барсик». Варианты имени помогают правильно прикрепить документ и не смешать профили.",
      },
      {
        id: "original-blank",
        text: "Оставьте рядом оригинальный PDF-бланк для проверки",
        detail: "После распознавания вы глазами сверите 5–10 значений, единицы измерения, материал и референсы. Неразобранные строки должны остаться видимыми.",
      },
      {
        id: "private-storage",
        text: "Решите, где будет закрытый хаб и отдельное место резервной копии",
        detail: "Базовый вариант — локально на вашем компьютере. Для доступа с телефона подойдёт только закрытый сервер с паролем и приватной сетью.",
      },
      commonFinish,
    ];
  }

  return undefined;
}

function buildAgentChecklist(project: ProjectDefinition, surface: PreparationSurface): PreparationItem[] {
  const contract = getAgentContract(project.slug);
  return [
    {
      id: "request-ready",
      text: `Вспомните один обычный запрос для «${project.title}»`,
      detail: `Ничего оформлять не нужно. Можно сказать примерно так: «${contract.inputExample}». Codex примет ответ голосом или текстом и сам выделит нужные сведения.`,
    },
    {
      id: "fields-ready",
      text: `Вспомните ответы про: ${contract.requiredFields.join(", ")}`,
      detail: `Codex будет спрашивать строго по одному вопросу. Если чего-то пока не знаете, ответьте «нужно уточнить» — агент не станет додумывать факт.`,
    },
    {
      id: "result-ready",
      text: `Представьте результат «${contract.resultTitle}»`,
      detail: `Выберите, что важнее увидеть первым из списка: ${contract.resultItems.join(", ")}. Codex сам соберёт из ответов понятный экран результата.`,
    },
    {
      id: "boundary-ready",
      text: "Вспомните, когда обязательно нужен человек",
      detail: `${contract.handoff} ${contract.confirmationRule} ${project.safety}`,
    },
    {
      id: "conversation-ready",
      text: `Приготовьтесь ответить Codex${surface === "mobile" ? " в Telegram" : ""}`,
      detail: `Codex сам создаст проект ${project.slug}, папки, файлы, поля и инструкцию. Вы отвечаете на один вопрос за раз голосом или текстом — вручную ничего создавать не придётся.`,
    },
  ];
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
