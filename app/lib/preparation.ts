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
  if (project.slug === "planner" || project.slug === "day-planner-agent") return [
    { id: "planning-one-day", text: project.slug === "planner" ? "Вспомните одно дело для своего планера" : "Вспомните 2–3 дела и одно ограничение времени", detail: "Ничего заранее оформлять не нужно. Вы введёте дела в готовый сервис или расскажете агенту. Не добавляйте адреса и личные подробности других людей." },
    { id: "planning-workspace", text: surface === "mobile" ? "Проверьте личного помощника от школы" : "Проверьте, что Codex отвечает", detail: surface === "mobile" ? "Откройте своего помощника в Telegram. Если ссылки ещё нет, запросите её у куратора. Помощник должен уметь создавать проект, а не только отвечать текстом. На вопросы можно отвечать голосом или текстом. Codex на телефон не устанавливаем." : "Если тестовая задача ещё не выполнялась, сначала пройдите урок установки. Проектные файлы Codex создаст сам; на вопросы можно отвечать голосом или текстом." },
    { id: "planning-private", text: "Личные дела не пойдут в публичное портфолио", detail: "Для показа другим будет отдельная учебная демонстрация без ваших записей. В режиме реальных данных ваши дела не заменяются примерами. Секреты и пароли не отправляем." },
  ];
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
    text: "Учебный комплект ждёт вас в первом шаге",
    detail: `В первом шаге нажмите «Скачать учебный комплект». В ZIP находятся оригинальный код, версия, инструкция и учебная проверка. ${telegram ? "Личному помощнику от школы передайте архив и команду первого шага" : "Распакуйте архив в отдельную папку и откройте её как проект Codex"}. Если скачать не получилось, запросите комплект у куратора. До проверки не отмечайте запуск выполненным. Секреты в переписку не отправляйте.`,
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
        text: "Начнём с обычной вёрстки",
        detail: "Для первой карусели генерация фона не нужна. Платные нейрофоны можно попробовать позже по желанию — только после просмотра стоимости и вашего подтверждения.",
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
        text: "Для первой проверки нужен учебный PDF",
        detail: "Используйте тестовый документ из школьного комплекта без сведений о настоящем человеке. Личные анализы пока не загружайте: сначала проверим закрытый доступ, хранение и отсутствие отправки во внешние ИИ-сервисы. Реальные документы позднее вводятся только в защищённый хаб, не в чат.",
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
        text: "Уточните закрытый доступ с куратором",
        detail: "Куратор должен подтвердить место хранения, доступ только владельца и резервную копию. Не нужно самостоятельно выбирать технические настройки. До подтверждения работаем только с учебным PDF.",
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
      detail: `Ничего оформлять не нужно. Пример формы запроса: «${contract.inputExample}». Это образец, не ваши данные. Сначала проверим агента на отдельном учебном наборе; свои безопасные сведения добавите после проверки.`,
    },
    {
      id: "fields-ready",
      text: "Не нужно заранее заполнять анкету",
      detail: `Помощник уточнит только нужное, по одному вопросу. Поля этого проекта: ${contract.requiredFields.join(", ")}. Можно ответить «нужно уточнить». Личные и клиентские документы в чат не отправляйте.`,
    },
    {
      id: "result-ready",
      text: `Результат — «${contract.resultTitle}»`,
      detail: `Проверим: ${contract.resultItems.join(", ")}. Вам не нужно придумывать устройство агента — готовая команда и тестовый диалог будут в уроке.`,
    },
    {
      id: "boundary-ready",
      text: "Вспомните, когда обязательно нужен человек",
      detail: `${contract.handoff} ${contract.confirmationRule} ${project.safety}`,
    },
    {
      id: "conversation-ready",
      text: surface === "mobile" ? "Проверьте личного помощника от школы" : "Проверьте, что Codex отвечает",
      detail: `Файлы создаст помощник. ${surface === "mobile" ? "Если личного помощника ещё не выдали, запросите его у куратора. Codex на телефон не устанавливаем." : "Если первая тестовая задача ещё не выполнялась, пройдите урок установки."} Отдельного Telegram-агента подключим после проверки диалога. Его работа требует настроенного сервера и доступов — текст в чате не означает, что подключение уже есть.`,
    },
  ];
}

function buildFamilyExpensesChecklist(surface: PreparationSurface): PreparationItem[] {
  const place = surface === "mobile" ? " в Telegram" : "";
  return [
    {
      id: "budget-answer",
      text: "Вспомните примерный бюджет и валюту",
      detail: "Назовёте сумму в своём готовом сервисе. Пока достаточно помнить её; можно оставить бюджет не заданным. Финансовые записи в чат с ИИ не отправляем.",
    },
    {
      id: "category-answer",
      text: "Вспомните 3–8 привычных категорий",
      detail: "Например: продукты, ребёнок, транспорт. Таблицу составлять не нужно — измените категории в готовом сервисе.",
    },
    {
      id: "expense-answer",
      text: "Вспомните один недавний расход",
      detail: "Достаточно даты, суммы и категории. Введёте его в личном режиме сервиса. Для проверки арифметики будет отдельный учебный режим, он не меняет ваши записи.",
    },
    {
      id: "conversation-ready",
      text: `Проверьте помощника${place}`,
      detail: `На компьютере нужен работающий Codex; на телефоне — личный помощник от школы. Первой командой он создаст сервис, файлы и поля. Ни CSV, ни отдельный документ с правилами вручную создавать не надо.`,
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
      text: `Выберите один свой пример для «${project.title}»`,
      detail: `Ничего оформлять в файлы не нужно. Для проекта пригодятся: ${profile.sourceFields.join(", ")}. ${project.kind === "service" ? "Личные записи вводите только в готовый сервис, не в переписку с ИИ. Для проверки будет отдельный учебный набор." : "Для публичной страницы используйте только свои или разрешённые материалы. Если исходного сайта ещё нет, дополнительный проект предложит сначала сделать базовый."}`,
    },
    {
      id: "rules-ready",
      text: "Вспомните свои правила и ограничения",
      detail: `Codex задаст короткие вопросы про: ${profile.rules.join(", ")}. Если ответа пока нет, можно сказать «пока не знаю» — Codex ничего не додумает.`,
    },
    {
      id: "result-ready",
      text: "Начнём с готовой основы, затем изменим под вас",
      detail: "В уроке уже есть команда создания и проверка результата. После первой рабочей версии выберете название, цвета и содержание. Не нужно заранее составлять техническое задание.",
    },
    {
      id: "safety-ready",
      text: "Отделите полезные сведения от личных и секретных",
      detail: `${project.safety} Не называйте пароли, коды из СМС, токены, реквизиты и паспортные данные. Если у вас уже есть документ или фотография, отправляйте только безопасную копию по просьбе Codex.`,
    },
    {
      id: "conversation-ready",
      text: surface === "mobile" ? "Проверьте личного помощника от школы" : "Проверьте, что Codex отвечает",
      detail: `Codex сам создаст проект ${project.slug}, папки, файлы и нужные поля. Он будет задавать по одному вопросу, а вы сможете отвечать голосом или текстом — вручную ничего создавать не придётся.`,
    },
  ];
}

export function isPreparationReady(preparation: QuestPreparation, checklist: PreparationItem[]): boolean {
  if (preparation.mode === "demo") return preparation.ready;
  if (preparation.mode !== "real" || !preparation.ready) return false;
  return checklist.every((item) => preparation.checked.includes(item.id));
}
