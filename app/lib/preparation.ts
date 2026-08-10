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
  if (project.slug === "home-helper" && surface === "desktop") return buildHomeHelperChecklist();
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
  const location = surface === "mobile" ? `комнате «${profile.folderName}» в Telegram` : `папке «${profile.folderName}»`;
  const createMaterial = (
    id: string,
    file: string,
    text: string,
    detail: string,
    lines: string[],
    example: string,
    recordCount?: number,
  ): PreparationItem => ({
    id,
    text,
    detail,
    steps: surface === "mobile"
      ? [
        `Откройте в Telegram комнату проекта «${profile.folderName}».`,
        `Отправьте отдельное сообщение. В первой строке напишите: ФАЙЛ: ${file}.`,
        `Ниже напишите по одному пункту: ${lines.join("; ")}.`,
        recordCount ? `Добавьте минимум ${recordCount} своих примеров. Не копируйте пример ниже как свои данные.` : "Проверьте написанное и отправьте сообщение в комнату проекта.",
      ]
      : [
        `Откройте папку «${profile.folderName}».`,
        `Создайте в ней новый текстовый файл и назовите его «${file}».`,
        `Откройте файл и напишите по одному пункту: ${lines.join("; ")}.`,
        recordCount ? `Добавьте минимум ${recordCount} своих примеров. Не копируйте пример ниже как свои данные.` : "Сохраните файл и закройте его.",
      ],
    example,
    doneWhen: `${surface === "mobile" ? "В комнате проекта есть отдельное сообщение" : "В папке есть файл"} «${file}», внутри заполнены: ${lines.join(", ")}.`,
  });

  const folderItem: PreparationItem = surface === "mobile"
    ? {
      id: "folder",
      text: `Создайте в Telegram комнату «${profile.folderName}»`,
      detail: "Это отдельный чат проекта. Фея и Codex будут брать материалы только отсюда, поэтому другие переписки не смешаются с работой.",
      steps: [
        "Откройте в Telegram чат с Феей.",
        "Нажмите «Мои проекты», затем «Новый проект».",
        `Напишите точное название: ${profile.folderName}.`,
        "Откройте созданную комнату и пока ничего туда не отправляйте.",
      ],
      doneWhen: `В чате с Феей открывается отдельная пустая комната «${profile.folderName}».`,
    }
    : {
      id: "folder",
      text: `Создайте папку «${profile.folderName}»`,
      detail: "Это рабочая копия проекта. Codex будет видеть только файлы внутри неё, а ваши оригиналы останутся на прежнем месте.",
      steps: [
        "Откройте на компьютере папку «Документы».",
        "Нажмите правой кнопкой на свободном месте и выберите «Новая папка».",
        `Напечатайте точное название: ${profile.folderName}.`,
        "Нажмите Enter и откройте созданную пустую папку.",
      ],
      doneWhen: `В «Документах» видна отдельная пустая папка «${profile.folderName}».`,
    };

  return [
    folderItem,
    createMaterial("real-examples", profile.sourceFile, profile.sourceTitle, profile.sourceWhy, profile.sourceFields, profile.sourceExample, 5),
    createMaterial("structure", profile.rulesFile, profile.rulesTitle, profile.rulesWhy, profile.rules, profile.rules.join("\n")),
    createMaterial(
      "result-examples",
      "что-должно-получиться.txt",
      `Запишите, что должен уметь проект «${project.title}»`,
      "Этот список нужен, чтобы Codex не добавлял лишние функции и в конце проверил каждый обещанный результат.",
      project.features,
      `${project.features[0]} — ${project.demo[0]}\n${project.features[1]} — ${project.demo[1]}`,
    ),
    createMaterial("presentation", profile.presentationFile, profile.presentationTitle, profile.presentationWhy, profile.presentation, profile.presentation.join("\n")),
    createMaterial("sharing", profile.sharingFile, profile.sharingTitle, profile.sharingWhy, profile.sharing, profile.sharing.join("\n")),
    {
      id: "project-safety",
      text: `Проверьте правило безопасности проекта «${project.title}»`,
      detail: project.safety,
      steps: [
        `Откройте все подготовленные файлы или сообщения в ${location}.`,
        `По очереди проверьте: ${profile.safetyChecks.join("; ")}.`,
        "Удалите сведения, которые нарушают хотя бы одно правило, и сохраните исправленную копию.",
        `Добавьте в конец файла «${profile.rulesFile}» строку: «Правило безопасности проверено».`,
      ],
      example: profile.safetyChecks.join("\n"),
      doneWhen: `В материалах соблюдены все правила: ${profile.safetyChecks.join(", ")}.`,
    },
    {
      id: "no-secrets",
      text: "Уберите пароли, коды, банковские данные и документы",
      detail: "Codex не просит такие сведения в сообщении. Если доступ понадобится позже, его подключают в защищённых настройках вместе с куратором.",
      steps: [
        `Ещё раз откройте все файлы или сообщения в ${location}.`,
        "Найдите и удалите пароли, коды из СМС, токены, номера карт, паспортные данные и закрытые ссылки.",
        "Проверьте фотографии и скриншоты: на них не должно быть уведомлений, имён аккаунтов и адресной строки с секретной ссылкой.",
        "Оставьте оригиналы документов вне рабочей папки или комнаты проекта.",
      ],
      example: "Можно: тексты, примеры, правила, разрешённые фотографии.\nНельзя: пароль, токен, паспорт, карта, код из СМС.",
      doneWhen: `${surface === "mobile" ? "В комнате" : "В папке"} остались только материалы, необходимые проекту, без секретов и лишних личных данных.`,
    },
  ];
}

function buildHomeHelperChecklist(): PreparationItem[] {
  const item = (
    id: string,
    index: number,
    text: string,
    detail: string,
    steps: string[],
    doneWhen: string,
    example?: string,
  ): PreparationItem => ({
    id,
    text,
    detail,
    steps,
    doneWhen,
    example,
    screenshot: `/guides/home-helper/real/prep-${String(index).padStart(2, "0")}.png`,
  });

  return [
    item(
      "folder",
      1,
      "Создайте отдельную папку «home-helper»",
      "Это будет единственное место, с которым работает Codex. Оригиналы документов сюда не переносим.",
      [
        "Откройте на компьютере папку «Документы».",
        "Нажмите «Новая папка» и напечатайте home-helper.",
        "Нажмите Enter и убедитесь, что папка появилась в «Документах».",
      ],
      "В папке «Документы» видна отдельная папка с точным названием home-helper.",
    ),
    item(
      "real-examples",
      2,
      "Запишите пять домашних дел в файл «мои-дела.txt»",
      "Каждая строка описывает одно настоящее дело вашей семьи. Фамилии, телефоны и адрес дома не нужны.",
      [
        "Откройте обычный текстовый редактор и создайте пустой файл.",
        "В первой строке напишите: Что сделать | Где | Кто | Как часто.",
        "Ниже добавьте пять своих домашних дел — по одному делу в каждой строке.",
        "Сохраните файл под названием «мои-дела.txt» внутри папки home-helper.",
      ],
      "В файле «мои-дела.txt» есть заголовок и минимум пять заполненных строк.",
      "Купить продукты | Кухня | Я | каждую субботу\nСменить постельное бельё | Спальня | не важно | раз в неделю",
    ),
    item(
      "structure",
      3,
      "Проверьте четыре понятных ответа у каждого дела",
      "Нужно знать только: что сделать, где это сделать, кто делает и как часто. Если ответ не нужен, пишем «не важно».",
      [
        "Откройте файл «мои-дела.txt».",
        "Проверьте каждую из пяти строк слева направо.",
        "Допишите «не важно» во всех пустых местах и сохраните файл.",
      ],
      "В каждой строке есть четыре части, разделённые вертикальной чертой |.",
      "Разобрать шкаф | Спальня | не важно | один раз",
    ),
    item(
      "result-examples",
      4,
      "Запишите, что помощник должен показывать семье",
      "Одного короткого списка достаточно. Не нужно придумывать дизайн или технические функции.",
      [
        "Создайте в папке home-helper файл «что-должно-получиться.txt».",
        "Напишите четыре строки: список дел, покупки, повторы, семейный обзор.",
        "Рядом с каждой строкой добавьте одно простое предложение о результате и сохраните файл.",
      ],
      "В файле есть четыре результата, и каждый понятен без специальных терминов.",
      "Список дел — видно, что нужно сделать сегодня.\nПокупки — можно добавить товар и отметить купленное.",
    ),
    item(
      "visuals",
      5,
      "Выберите один спокойный цвет или напишите «выберет Codex»",
      "Логотип и фотографии для этого проекта не обязательны.",
      [
        "Создайте файл «оформление.txt» внутри home-helper.",
        "Напишите один любимый спокойный цвет или фразу «выберет Codex».",
        "Сохраните файл и закройте его.",
      ],
      "В папке есть файл «оформление.txt» с одним коротким пожеланием.",
      "Тёплый зелёный и светлый фон",
    ),
    item(
      "public-facts",
      6,
      "Решите, какие сведения можно показывать на опубликованной странице",
      "Для семейного помощника обычно достаточно придумать нейтральное название семьи. Настоящие имена не нужны.",
      [
        "Создайте файл «можно-показывать.txt» внутри home-helper.",
        "Напишите название для экрана, например «Наш дом».",
        "Следующей строкой напишите: «Имена, телефоны и адрес не показывать» и сохраните файл.",
      ],
      "В файле есть название экрана и отдельная строка о том, что нельзя публиковать.",
      "Наш дом\nИмена, телефоны и адрес не показывать",
    ),
    item(
      "project-safety",
      7,
      "Удалите из копий имена детей, телефоны и домашний адрес",
      "Codex должен видеть только сведения, без которых помощник не сможет работать.",
      [
        "Откройте по очереди все файлы внутри home-helper.",
        "Найдите и удалите фамилии, телефоны, адрес, данные документов и точное расписание детей.",
        "Сохраните очищенные копии и не меняйте исходные документы вне этой папки.",
      ],
      "Во всех файлах остались только названия дел, комнат, исполнителей и частота.",
    ),
    item(
      "no-secrets",
      8,
      "Проверьте, что в папке нет паролей и документов",
      "Пароли, коды, банковские данные и документы нельзя вставлять в команды или хранить рядом с проектом.",
      [
        "Откройте папку home-helper и посмотрите на все файлы.",
        "Удалите из этой папки копии паспортов, банковских документов, пароли, коды и токены, если они попали туда случайно.",
        "Снова посчитайте файлы и отметьте этот пункт только после проверки.",
      ],
      "В home-helper лежат только четыре подготовленных текстовых файла и безопасные визуальные примеры.",
    ),
  ];
}

export function isPreparationReady(preparation: QuestPreparation, checklist: PreparationItem[]): boolean {
  if (preparation.mode === "demo") return preparation.ready;
  if (preparation.mode !== "real" || !preparation.ready) return false;
  return checklist.every((item) => preparation.checked.includes(item.id));
}
