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

export function isPreparationReady(preparation: QuestPreparation, checklist: PreparationItem[]): boolean {
  if (preparation.mode === "demo") return preparation.ready;
  if (preparation.mode !== "real" || !preparation.ready) return false;
  return checklist.every((item) => preparation.checked.includes(item.id));
}
