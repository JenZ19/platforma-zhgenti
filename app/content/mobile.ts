import type { DataMode } from "../lib/preparation";
import { getPreparationProfile } from "./preparation";
import type { ProjectDefinition, ProjectKind, QuestStep } from "./types";

export type MobileCapability = "phone-full" | "phone-template" | "curator";
export type MobileTool = "telegram" | "lovable" | "chatium" | "screenshot" | "curator";
export type MobileAction = {
  tool: MobileTool;
  label: string;
  href?: string;
  note?: string;
};
export type MobileQuestStep = QuestStep & { mobileAction: MobileAction };

export type MobileCapabilityInfo = {
  id: MobileCapability;
  label: string;
  detail: string;
};

const capabilityByKind: Record<ProjectKind, MobileCapabilityInfo> = {
  service: { id: "phone-full", label: "Полностью с телефона", detail: "Telegram и мобильный конструктор" },
  bot: { id: "phone-template", label: "С телефона по шаблону", detail: "Тексты, кнопки и сценарий без кода" },
  agent: { id: "phone-full", label: "Полностью с телефона", detail: "Настройка и проверка через Telegram" },
  "simple-site": { id: "phone-full", label: "Полностью с телефона", detail: "Сборка и публикация в Lovable" },
  "advanced-site": { id: "curator", label: "С помощью куратора", detail: "Домен, платежи и секреты проверяет куратор" },
  portfolio: { id: "phone-template", label: "С телефона по шаблону", detail: "Готовая мобильная витрина работ" },
};

const constructorByKind: Record<ProjectKind, "lovable" | "chatium"> = {
  service: "lovable",
  bot: "chatium",
  agent: "chatium",
  "simple-site": "lovable",
  "advanced-site": "lovable",
  portfolio: "lovable",
};

const titles = [
  "Фея открыта в Telegram",
  "Свой Codex подключён",
  "Выбран режим данных",
  "Материалы собраны в чате",
  "Анкета проекта заполнена",
  "Паспорт проекта готов",
  "Мастер-задание запущено",
  "Первый результат получен",
  "Проект открыт в конструкторе",
  "Первый экран проверен",
  "Скриншот отправлен Фее",
  "Исправление подготовлено",
  "Главное действие работает",
  "Безопасность проверена",
  "Мобильный аудит пройден",
  "Проект опубликован",
  "Карточка портфолио готова",
];

const eyebrows = [
  "Старт", "Подключение", "Данные", "Материалы", "Короткая анкета", "План", "Запуск", "Результат", "Конструктор", "Первый экран", "Проверка", "Правка", "Сценарий", "Безопасность", "Аудит", "Публикация", "Финал",
];

function constructorAction(project: ProjectDefinition, label?: string): MobileAction {
  const tool = constructorByKind[project.kind];
  if (tool === "chatium") {
    return { tool, label: label ?? "Открыть Чатиум", href: "https://chatium.com/", note: "Войдите в свой аккаунт и откройте шаблон проекта." };
  }
  const prompt = `Создай мобильный проект «${project.title}» для аудитории «${project.audience}». Результат: ${project.outcome}. Функции: ${project.features.join(", ")}. Сделай интерфейс для телефона, крупные кнопки, понятные пустые состояния и правило безопасности: ${project.safety}`;
  return { tool, label: label ?? "Создать в Lovable", href: `https://lovable.dev/?autosubmit=true#prompt=${encodeURIComponent(prompt)}`, note: "Lovable откроется с уже подготовленным заданием." };
}

function mobileAction(project: ProjectDefinition, step: number): MobileAction {
  if (step <= 8 || step === 12 || step === 14 || step === 17) return { tool: "telegram", label: step === 7 ? "Запустить мой Codex" : step === 17 ? "Получить карточку" : "Открыть Фею в Telegram", note: "Бот откроет именно этот проект и этот уровень." };
  if (step === 11 || step === 13 || step === 15) return { tool: "screenshot", label: "Отправить скриншот Фее", note: "Сделайте обычный скриншот телефона и отправьте его в чат проекта." };
  if (step === 16 && project.kind === "advanced-site") return { tool: "curator", label: "Позвать куратора", note: "Куратор проверит домен, платежи и закрытые настройки перед публикацией." };
  return constructorAction(project, step === 16 ? "Открыть публикацию" : undefined);
}

function modeLine(mode: DataMode, project: ProjectDefinition): string {
  const profile = getPreparationProfile(project.slug);
  return mode === "real"
    ? `Работай в личной комнате «${profile.folderName}». Сначала найди сообщение «ФАЙЛ: ${profile.sourceFile}». В нём должны быть поля: ${profile.sourceFields.join(", ")}. Не додумывай отсутствующие факты и не публикуй частные данные.`
    : `Работай с безопасными учебными примерами: ${project.demo.join("; ")}. Не добавляй настоящие контакты, пароли и личные данные.`;
}

function promptFor(project: ProjectDefinition, step: number, mode: DataMode): string {
  const base = modeLine(mode, project);
  const requests = [
    "Подтверди, что открылся правильный учебный проект, и покажи одну кнопку для продолжения.",
    "Проверь персональное подключение Codex. Не показывай токены, служебные данные и сведения аккаунта.",
    "Зафиксируй выбранный режим данных отдельно для этого проекта и перечисли, что можно безопасно использовать.",
    `Проверь материалы для сущностей: ${project.entities.join(", ")}. Если важного не хватает, задай один короткий вопрос.`,
    `Задай по одному простому вопросу про аудиторию, результат и функции ${project.features.slice(0, 3).join(", ")}.`,
    `Собери паспорт проекта: для кого, какой результат, что умеет, какие данные использует и какие ограничения соблюдает.`,
    `Запусти создание проекта «${project.title}» по паспорту. Делай изменения маленькими шагами и сохраняй рабочую версию.`,
    `Покажи первый понятный результат: ${project.outcome}. Дай ссылку или безопасный предпросмотр для телефона.`,
    `Подготовь перенос проекта в ${constructorByKind[project.kind] === "lovable" ? "Lovable" : "Чатиум"}: один готовый промпт, структуру экранов и тексты кнопок.`,
    `Проверь первый экран: за пять секунд должно быть понятно, что это «${project.title}» и как выполнить ${project.features[0]}.`,
    "По скриншоту найди только три самые важные проблемы мобильного интерфейса и объясни их простыми словами.",
    "Составь одну готовую команду, которая исправит найденные проблемы, не затронув уже работающие функции.",
    `Проверь главный путь пользователя: ${project.features.slice(0, 3).join(" → ")}. Верни короткий список «работает / исправить».`,
    `Проверь правило безопасности: ${project.safety} Отдельно подтверди отсутствие токенов, паролей и закрытых данных.`,
    "Проведи аудит на ширине 390 пикселей: текст читается, кнопки нажимаются большим пальцем, формы не выходят за экран, ошибок нет.",
    "Подготовь безопасную публикацию. Если нужны домен, платежный секрет или рискованная настройка, остановись и передай шаг куратору.",
    `Оформи карточку проекта «${project.title}»: польза, четыре функции, моя роль, честное ограничение, ссылка и три безопасных скриншота.`,
  ];
  return `Ты — Фея мобильного проекта. Ученица работает только с телефона через Telegram, Codex и мобильный конструктор. ${base}\n\n${requests[step - 1]}`;
}

function actionText(project: ProjectDefinition, step: number, mode: DataMode): string {
  const constructor = constructorByKind[project.kind] === "lovable" ? "Lovable" : "Чатиум";
  const profile = getPreparationProfile(project.slug);
  const actions = [
    "Нажмите большую кнопку ниже. Фея откроет нужный проект в Telegram.",
    "Один раз подключите собственный аккаунт Codex по ссылке и коду, который пришлёт Фея.",
    "Выберите учебные или реальные данные. Выбор сохранится только для этого проекта.",
    mode === "real"
      ? `Откройте комнату «${profile.folderName}». Отправьте отдельное сообщение с первой строкой «ФАЙЛ: ${profile.sourceFile}». Ниже заполните: ${profile.sourceFields.join(", ")}. Оригиналы и секреты не отправляйте.`
      : `Отправьте в чат готовые учебные примеры проекта «${project.title}». Настоящие контакты, оригиналы и секреты не отправляйте.`,
    "Ответьте Фее на три коротких вопроса. Можно голосовыми сообщениями.",
    "Прочитайте готовый паспорт и нажмите «Всё верно» или напишите одно исправление.",
    "Нажмите «Запустить мой Codex». Можно закрыть Telegram — Фея сообщит, когда результат будет готов.",
    "Откройте полученную ссылку и проверьте, что видите название проекта и первый результат.",
    `Откройте ${constructor} по готовой кнопке. Задание уже подготовлено — останется войти в свой аккаунт.`,
    "Посмотрите первый экран одной рукой: понятно ли, что делать дальше, и видна ли главная кнопка.",
    "Сделайте скриншот телефона и отправьте его Фее в чат этого проекта.",
    "Скопируйте готовую команду Феи в конструктор и дождитесь одного аккуратного исправления.",
    `Пройдите главное действие: ${project.features.slice(0, 3).join(" → ")}. Отправьте Фее финальный экран.`,
    "Нажмите «Проверить безопасность» и убедитесь, что в публикации нет закрытых материалов.",
    "Отправьте три скриншота: первый экран, главное действие и итог. Фея проведёт мобильный аудит.",
    project.kind === "advanced-site" ? "Передайте куратору ссылку на предпросмотр. Не подключайте домен и платежи самостоятельно." : "Нажмите публикацию в конструкторе и пришлите Фее готовую ссылку.",
    "Получите описание и три безопасных кадра, затем добавьте проект в мобильное портфолио.",
  ];
  return actions[step - 1];
}

export function getMobileCapability(project: ProjectDefinition): MobileCapabilityInfo {
  return capabilityByKind[project.kind];
}

export function buildMobileQuest(project: ProjectDefinition, mode: DataMode = "demo"): MobileQuestStep[] {
  return titles.map((title, index) => {
    const id = index + 1;
    const action = mobileAction(project, id);
    return {
      id,
      title,
      eyebrow: eyebrows[index],
      why: id === 1
        ? "В мобильной версии Telegram становится вашей рабочей мастерской: здесь лежат задания, материалы, ссылки и ответы Феи."
        : `Этот уровень ведёт к результату «${project.outcome}» без работы с кодом и без компьютера.`,
      action: actionText(project, id, mode),
      kind: "prompt",
      prompt: promptFor(project, id, mode),
      expected: [
        title,
        id < 16 ? "Следующее действие понятно и помещается на одном экране телефона" : "Результат можно безопасно показать другому человеку",
        id === 14 ? project.safety : `Проект «${project.title}» остаётся в личной комнате ученицы`,
      ],
      screenshot: `/screens-mobile/${project.slug}/step-${String(id).padStart(2, "0")}.png`,
      reward: [4, 8, 12, 16, 17].includes(id) ? ["Фея материалов", "Фея первого результата", "Фея аккуратных правок", "Фея публикации", "Фея портфолио"][([4, 8, 12, 16, 17] as number[]).indexOf(id)] : undefined,
      help: {
        title: "Если застряли",
        body: action.tool === "curator" ? "На этом шаге не нужно разбираться самостоятельно — отправьте куратору ссылку и дождитесь проверки." : "Вернитесь в чат Феи и напишите «Объясни этот шаг ещё проще». Она даст одно действие без сложных слов.",
        prompt: `Объясни уровень ${id} проекта «${project.title}» одной маме с грудным ребёнком: одно действие, одна кнопка и один понятный результат. ${modeLine(mode, project)}`,
      },
      mobileAction: action,
    };
  });
}
