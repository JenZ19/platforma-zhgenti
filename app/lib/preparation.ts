import type { ProjectDefinition, ProjectKind } from "../content/types";
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

const kindMaterial: Record<ProjectKind, (project: ProjectDefinition) => PreparationItem> = {
  service: (project) => ({
    id: "real-examples",
    text: `5–10 настоящих примеров для полей: ${project.entities.join(", ")}`,
    detail: "Соберите их в одной таблице или текстовом файле и оставьте только данные, которые действительно нужны сервису.",
  }),
  bot: (project) => ({
    id: "real-dialogues",
    text: `5–10 реальных вопросов или сообщений для сценария «${project.features[0]}»`,
    detail: "Скопируйте примеры без фамилий, телефонов и лишних деталей переписки. Добавьте желаемый ответ рядом.",
  }),
  agent: (project) => ({
    id: "real-knowledge",
    text: `Документы и примеры, по которым агент выполнит: ${project.features.slice(0, 3).join(", ")}`,
    detail: "Положите инструкции, правила и 2–3 хороших примера результата. Удалите всё, что агенту не понадобится.",
  }),
  "simple-site": (project) => ({
    id: "real-site-copy",
    text: `Финальные факты и тексты для разделов: ${project.entities.join(", ")}`,
    detail: "Соберите в одном документе имя/название, описание, услуги, условия, цены и только публичные контакты.",
  }),
  "advanced-site": (project) => ({
    id: "real-business-data",
    text: `Рабочие данные для функций: ${project.features.join(", ")}`,
    detail: "Подготовьте структуру услуг или товаров, правила расчёта, условия заявки и тестовый путь без настоящей оплаты.",
  }),
  portfolio: () => ({
    id: "real-portfolio-work",
    text: "4–6 своих лучших проектов: ссылки, безопасные скриншоты и короткое описание каждого",
    detail: "Учебные работы подпишите как учебные. Не придумывайте клиентов, отзывы и результаты.",
  }),
};

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

export function buildRealDataChecklist(project: ProjectDefinition): PreparationItem[] {
  if (project.slug === "home-helper") return buildHomeHelperChecklist();
  return [
    {
      id: "folder",
      text: `Отдельная папка «${project.slug}» только для этого проекта`,
      detail: "Положите в неё копии материалов, а оригиналы оставьте на прежнем месте.",
    },
    kindMaterial[project.kind](project),
    {
      id: "structure",
      text: `Ваши названия и правила для: ${project.entities.join(", ")}`,
      detail: "Напишите простыми словами, как это устроено у вас или у клиента. Если чего-то нет — так и отметьте, не додумывайте.",
    },
    {
      id: "result-examples",
      text: `2–3 примера желаемого результата для: ${project.features.slice(0, 3).join(", ")}`,
      detail: "Подойдут текст, таблица, ссылка или скриншот. Чужой пример используйте только как референс, не выдавайте за свою работу.",
    },
    {
      id: "visuals",
      text: "Логотип, фотографии и визуальные примеры — только если они нужны проекту",
      detail: "Проверьте разрешение на использование изображений. Если визуалов пока нет, положите файл «визуалы-позже.txt».",
    },
    {
      id: "public-facts",
      text: "Подтверждённые цены, условия и контакты, которые разрешено показывать",
      detail: "Отдельно отметьте, что публичное, а что должно остаться только внутри рабочей папки.",
    },
    {
      id: "project-safety",
      text: project.safety,
      detail: "Проверьте это правило до загрузки материалов и ещё раз перед публикацией.",
    },
    {
      id: "no-secrets",
      text: "В папке нет паролей, токенов, банковских реквизитов, документов личности и лишних персональных данных",
      detail: "Секретные доступы подключаются только через защищённые настройки сервиса и никогда не вставляются в промпт.",
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
