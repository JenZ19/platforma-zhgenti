import type { DataMode } from "../lib/preparation";
import { getPreparationProfile } from "./preparation";
import type { ProjectDefinition, ProjectKind, QuestCustomization, QuestStep } from "./types";
import { defaultCustomization } from "./customization";
import { buildOriginalMobileQuest } from "./original-quests/mobile";
import { getAgentContract } from "./agent-contracts";
import { buildSetupQuest } from "./setup-quests";

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
  agent: { id: "phone-full", label: "Полностью с телефона", detail: "Текст, голос и проверка через Telegram" },
  "simple-site": { id: "phone-full", label: "Полностью с телефона", detail: "Сборка и публикация в Lovable" },
  "advanced-site": { id: "curator", label: "С помощью куратора", detail: "Домен, платежи и секреты проверяет куратор" },
  portfolio: { id: "phone-template", label: "С телефона по шаблону", detail: "Готовая мобильная витрина работ" },
};

const constructorByKind: Record<ProjectKind, "lovable" | "chatium"> = {
  service: "lovable",
  agent: "chatium",
  "simple-site": "lovable",
  "advanced-site": "lovable",
  portfolio: "lovable",
};

const titles = [
  "Фея открыта в Telegram",
  "Свой Codex подключён",
  "Выбран режим данных",
  "Ответы собраны в разговоре",
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
  "Личная версия готова",
  "Клиентская копия готова",
  "Две версии в портфолио",
];

const agentTitles = [
  "Фея открыла нужного агента",
  "Свой Codex подключён",
  "Выбрана моя версия агента",
  "Свободное сообщение принято",
  "Задан один нужный вопрос",
  "Паспорт агента подтверждён",
  "Мастер-инструкция установлена",
  "Полезный результат получен",
  "Агент открыт в Чатиуме",
  "Голосовой ответ понят",
  "Скриншот отправлен Фее",
  "Самопроверка исправлена",
  "Полный разговор пройден",
  "Подтверждение защищено",
  "Личная версия работает в Telegram",
  "Клиентская копия готова",
  "Две версии в портфолио",
];

const eyebrows = [
  "Старт", "Подключение", "Данные", "Короткий разговор", "Короткая анкета", "План", "Запуск", "Результат", "Конструктор", "Первый экран", "Проверка", "Правка", "Сценарий", "Безопасность", "Аудит", "Публикация", "Финал",
];

function constructorAction(project: ProjectDefinition, label?: string): MobileAction {
  const tool = constructorByKind[project.kind];
  if (tool === "chatium") {
    return { tool, label: label ?? "Открыть Чатиум", href: "https://chatium.com/", note: "Войдите в свой аккаунт: Фея откроет именно этот проект и этот уровень." };
  }
  const prompt = `Создай мобильный проект «${project.title}» для аудитории «${project.audience}». Результат: ${project.outcome}. Функции: ${project.features.join(", ")}. Сделай интерфейс для телефона, крупные кнопки, понятные пустые состояния и правило безопасности: ${project.safety}`;
  return { tool, label: label ?? "Создать в Lovable", href: `https://lovable.dev/?autosubmit=true#prompt=${encodeURIComponent(prompt)}`, note: "Lovable откроется с уже подготовленным заданием." };
}

function mobileAction(project: ProjectDefinition, step: number): MobileAction {
  if (step <= 8 || step === 12 || step === 14 || step === 16 || step === 17) return { tool: "telegram", label: step === 7 ? "Запустить мой Codex" : step === 16 ? "Создать клиентскую копию" : step === 17 ? "Получить две карточки" : "Открыть Фею в Telegram", note: "Фея откроет именно этот проект и этот уровень." };
  if (step === 11 || step === 13) return { tool: "screenshot", label: "Отправить скриншот Фее", note: "Сделайте обычный скриншот телефона и отправьте его в чат проекта." };
  if (step === 15 && project.kind === "advanced-site") return { tool: "curator", label: "Позвать куратора", note: "Куратор проверит домен, платежи и закрытые настройки перед публикацией." };
  if (step === 15) return constructorAction(project, project.kind === "agent" ? "Открыть личного агента" : "Опубликовать личную версию");
  return constructorAction(project);
}

function modeLine(mode: DataMode, project: ProjectDefinition, step: number): string {
  const profile = getPreparationProfile(project.slug);
  if (mode === "demo") return `Работай с безопасными учебными примерами: ${project.demo.join("; ")}. Не добавляй настоящие контакты, пароли и личные данные.`;
  const shared = "Папки, файлы и поля создавай сам в личной серверной комнате проекта. Не проси ученицу готовить служебные файлы, не додумывай отсутствующие факты и не публикуй частные данные.";
  if (step < 4) return `Режим реальных данных выбран. На этом уровне не начинай опрос: выполни только текущее действие и подготовь ученицу к следующему шагу. ${shared}`;
  if (step === 4) return `Сейчас один раз собери сведения для проекта. Задавай строго один короткий вопрос за раз и принимай ответы голосом или текстом. Уточни: ${profile.sourceFields.join(", ")}. Если уже есть документ или фотография, можно предложить прикрепить безопасную копию. После ответов покажи сводку и дождись подтверждения. ${shared}`;
  if (step === 5) return `Продолжи уже начатый короткий разговор только вопросами об аудитории, результате и нужных функциях. Задавай по одному вопросу и принимай ответы голосом или текстом. Не повторяй уже полученные вопросы. ${shared}`;
  return `Используй уже подтверждённые ответы ученицы из этого чата и не начинай опрос заново. Если для текущего уровня не хватает одного факта, задай один короткий вопрос и прими ответ голосом или текстом. ${shared}`;
}

function agentPromptFor(project: ProjectDefinition, step: number, mode: DataMode, customization: QuestCustomization): string {
  const contract = getAgentContract(project.slug);
  const fields = contract.requiredFields.join(", ");
  const checks = contract.selfCheck.join("; ");
  const base = modeLine(mode, project, step);
  const requests = [
    `Открой только проект ${project.slug} «${customization.name}» и покажи первое безопасное сообщение. Фея должна открыть именно этот проект и этот уровень.`,
    "Проверь персональное подключение Codex. Не показывай токены, пароль, служебные данные и сведения аккаунта.",
    `Зафиксируй мою версию: имя «${customization.name}», аудитория «${customization.audience}», тон «${customization.tone}», функция «${customization.feature}», цветовая гамма «${customization.palette.name}». Ничего пока не меняй.`,
    `Прими свободное сообщение «${contract.inputExample}» как обычный текст или голосовую расшифровку. Выдели только подтверждённые поля из списка ${fields}, не требуй анкеты и ничего не выдумывай.`,
    `Задавай строго один вопрос за раз. Первым дословно спроси: «${contract.firstQuestion}». Следующий вопрос можно задать только после ответа голосом или текстом и только об одном недостающем поле.`,
    `Покажи паспорт ИИ-агента «${customization.name}»: для кого, входные поля ${fields}, правило «${contract.decisionRule}», результат «${contract.resultTitle}», подтверждение и граница «${contract.handoff}». Дождись слов «Всё верно».`,
    `Установи мастер-инструкцию агента: свободный текст и голос; один вопрос за раз; поля ${fields}; первый вопрос «${contract.firstQuestion}»; решение «${contract.decisionRule}»; результат «${contract.resultTitle}»; самопроверка ${checks}; правило «${contract.confirmationRule}»; передача человеку «${contract.handoff}».`,
    `Заверши тестовый разговор и покажи результат «${contract.resultTitle}» с частями ${contract.resultItems.join(", ")}. Используй только подтверждённые сведения, выдержи тон «${customization.tone}» и дай один следующий шаг.`,
    `Подготовь перенос проверенной инструкции в Чатиум. Сохрани вход текстом и голосом, один вопрос за раз, результат «${contract.resultTitle}», самопроверку и передачу человеку. Не проси токен и не показывай закрытые настройки.`,
    `Проверь голосовой вход «${contract.voiceExample}». Покажи расшифровку, выделенные поля ${fields} и единственный уточняющий вопрос, если без него нельзя продолжить.`,
    `По скриншоту мобильного диалога «${customization.name}» найди только три проблемы: читаемость, удобство голосового ответа и ясность результата «${contract.resultTitle}».`,
    `Исправь три найденные проблемы и повтори самопроверку: ${checks}. Не меняй предметную логику, поля, вопрос и границу передачи человеку.`,
    `Пройди полный разговор: сообщение «${contract.inputExample}» → вопрос «${contract.firstQuestion}» → ответ голосом или текстом → правило «${contract.decisionRule}» → результат «${contract.resultTitle}». Покажи «работает / исправить» для каждого перехода.`,
    `Проверь защиту внешнего действия: ${contract.confirmationRule} До точной фразы «Да, подтверждаю» покажи черновик и остановись. На «Нет» ничего не меняй. При границе выполни передачу человеку: ${contract.handoff}`,
    `Установи и проверь личную Telegram-версию «${customization.name}». Сохрани текст, голос, один вопрос за раз, результат «${contract.resultTitle}», самопроверку, фразу «Да, подтверждаю» и правило передачи «${contract.handoff}».`,
    `Создай отдельный ${project.slug}-client и не меняй личную версию. Задай восемь вопросов строго по одному и принимай ответы голосом или текстом: аудитория, задача, входные поля, первый вопрос, правило решения, результат, подтверждение, граница. Покажи «было / станет» и ничего не меняй до подтверждения. Затем проверь клиентскую копию без реального внешнего действия.`,
    `Оформи две версии для портфолио: личную «${customization.name}» и клиентскую ${project.slug}-client. Для каждой покажи аудиторию, вход, вопрос, результат «${contract.resultTitle}», самопроверку, подтверждение, границу, ссылку и три безопасных кадра. Не придумывай клиента, отзыв или доход.`,
  ];
  return `Ты — Фея мобильного проекта. Ученица работает только с телефона через Telegram, Codex и Чатиум. ${base}\n\n${requests[step - 1]}`;
}

function promptFor(project: ProjectDefinition, step: number, mode: DataMode): string {
  const base = modeLine(mode, project, step);
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

function agentActionText(project: ProjectDefinition, step: number): string {
  const contract = getAgentContract(project.slug);
  const actions = [
    "Нажмите большую кнопку ниже. Фея откроет в Telegram именно вашего ИИ-агента и первый уровень.",
    "Один раз подключите собственный Codex по безопасной ссылке. Пароль и секреты остаются только у вас.",
    "Выберите имя, аудиторию, тон, одну особенную функцию и цветовую гамму. Нажмите «Сохранить мою версию».",
    `Отправьте Фее обычную фразу «${contract.inputExample}» свободным текстом или голосом. Никакую анкету и файл готовить не нужно.`,
    `Дождитесь одного вопроса «${contract.firstQuestion}». Ответьте голосом или текстом; следующий вопрос появится только после ответа.`,
    "Прочитайте паспорт агента на одном экране. Если всё правильно, напишите «Всё верно»; иначе отправьте одно исправление.",
    "Нажмите «Запустить мой Codex». Фея сообщит, когда мастер-инструкция будет установлена и проверена.",
    `Откройте готовый результат «${contract.resultTitle}» и проверьте, что в нём нет придуманных сведений.`,
    "Откройте Чатиум по готовой кнопке. Фея уже передала туда инструкцию именно этого ИИ-агента.",
    "Нажмите микрофон, наговорите один ответ и отправьте. Проверьте расшифровку и смысл, который понял агент.",
    "Сделайте скриншот диалога на телефоне и отправьте его Фее в чат этого проекта.",
    "Скопируйте одну готовую команду исправления, дождитесь результата и повторите самопроверку.",
    `Пройдите полный разговор: свободное сообщение → один вопрос за раз → результат «${contract.resultTitle}». Отправьте Фее финальный экран.`,
    `Попросите внешнее действие и проверьте остановку. Введите «Нет», затем повторите тест с точной фразой «Да, подтверждаю». Граница: ${contract.handoff}`,
    "Откройте личную версию в Telegram и повторите текстовый и голосовой тесты. Никакие секреты в сообщение не вставляйте.",
    `Нажмите «Создать клиентскую копию». Ответьте на восемь вопросов по одному голосом или текстом, проверьте «было / станет» и подтвердите ${project.slug}-client.`,
    "Получите две карточки и шесть безопасных кадров, затем добавьте личную и клиентскую версии в портфолио.",
  ];
  return actions[step - 1];
}

function actionText(project: ProjectDefinition, step: number, mode: DataMode): string {
  const constructor = constructorByKind[project.kind] === "lovable" ? "Lovable" : "Чатиум";
  const profile = getPreparationProfile(project.slug);
  const actions = [
    "Нажмите большую кнопку ниже. Фея откроет нужный проект в Telegram.",
    "Один раз подключите собственный аккаунт Codex по ссылке и коду, который пришлёт Фея.",
    "Выберите учебные или реальные данные. Выбор сохранится только для этого проекта.",
    mode === "real"
      ? `Откройте Фею и нажмите «Начать короткий опрос». Отвечайте по одному вопросу голосом или текстом: ${profile.sourceFields.join(", ")}. Ничего заранее оформлять не нужно — серверную комнату и файлы создаст Codex.`
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
    project.kind === "advanced-site" ? "Передайте куратору ссылку на предпросмотр. Не подключайте домен, платежи и секреты самостоятельно." : "Проведите мобильный аудит, опубликуйте личную версию и повторите главное действие по готовой ссылке.",
    `Нажмите «Создать клиентскую копию». Ответьте на восемь вопросов по одному голосом или текстом, проверьте «было / станет» и подтвердите ${project.slug}-client.`,
    "Получите две карточки и шесть безопасных кадров, затем добавьте личную и клиентскую версии в портфолио.",
  ];
  return actions[step - 1];
}

export function getMobileCapability(project: ProjectDefinition): MobileCapabilityInfo {
  if (project.journey === "setup") return { id: "curator", label: "Действия на компьютере", detail: "Телефон можно держать рядом как инструкцию" };
  return capabilityByKind[project.kind];
}

export function buildMobileQuest(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization): MobileQuestStep[] {
  if (project.journey === "setup") {
    return buildSetupQuest(project).map((step) => ({
      ...step,
      screenshot: `/screens-mobile/${project.slug}/step-${String(step.id).padStart(2, "0")}.png`,
      mobileAction: step.links?.[0]
        ? { tool: "curator", label: step.links[0].label, href: step.links[0].href, note: step.links[0].note }
        : { tool: "curator", label: "Продолжить у компьютера", note: "Читайте этот уровень на телефоне, а указанное действие выполняйте на Mac или Windows." },
    }));
  }
  const selectedCustomization = customization ?? defaultCustomization(project.slug)!;
  const original = buildOriginalMobileQuest(project, mode, selectedCustomization);
  if (original) return original;
  const stepTitles = project.kind === "agent" ? agentTitles : titles;
  return stepTitles.map((title, index) => {
    const id = index + 1;
    const action = mobileAction(project, id);
    return {
      id,
      title,
      eyebrow: eyebrows[index],
      why: id === 1
        ? "В мобильной версии Telegram становится вашей рабочей мастерской: здесь лежат задания, материалы, ссылки и ответы Феи."
        : `Этот уровень ведёт к результату «${project.outcome}» без работы с кодом и без компьютера.`,
      action: project.kind === "agent" ? agentActionText(project, id) : actionText(project, id, mode),
      kind: "prompt",
      prompt: project.kind === "agent"
        ? agentPromptFor(project, id, mode, selectedCustomization)
        : promptFor(project, id, mode),
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
        prompt: `Объясни уровень ${id} проекта «${project.title}» одной маме с грудным ребёнком: одно действие, одна кнопка и один понятный результат. ${modeLine(mode, project, id)}`,
      },
      mobileAction: action,
    };
  });
}
