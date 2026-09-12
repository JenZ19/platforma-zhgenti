import type { DataMode } from "../lib/preparation";
import type { ProjectDefinition, QuestCustomization, QuestStep, SetupPlatform } from "./types";
import { buildQuest } from "./quests";
import { isReviewedPlanning } from "./reviewed/planning";
import { demoDataPrompt } from "./demo-data";

export type MobileCapability = "phone-full" | "phone-template" | "curator";
export type MobileTool = "telegram" | "lovable" | "chatium" | "screenshot" | "curator";
export type MobileAction = { tool: MobileTool; label: string; href?: string; note?: string };
export type MobileQuestStep = QuestStep & { mobileAction: MobileAction };
export type MobileCapabilityInfo = { id: MobileCapability; label: string; detail: string };

function phoneInstruction(action: string): string {
  return action
    .replaceAll("в тот же разговор Codex", "в тот же чат Феечки")
    .replaceAll("попросите Codex", "попросите Феечку")
    .replaceAll("в чате Codex", "в чате Феечки")
    .replace("Распакуйте ZIP в отдельную папку и откройте её как проект в Codex.", "Откройте чат личного помощника от школы и прикрепите ZIP как файл. Распакует и запустит его помощник в вашем отдельном рабочем месте.")
    .replace(/Откройте Codex → «Новая задача»/g, "Откройте чат личного помощника от школы")
    .replace(/В Codex откройте новую задачу/g, "Откройте чат личного помощника от школы")
    .replace(/Откройте в Codex разговор/g, "Откройте у помощника от школы разговор")
    .replace(/Откройте в Codex проект/g, "Откройте у помощника от школы разговор о проекте")
    .replaceAll("Codex", "помощник от школы");
}

/** Keep completed-step IDs stable; simplify wording, not the actual success checks. */
function simplifyPhoneLesson(project: ProjectDefinition, step: MobileQuestStep): MobileQuestStep {
  if (project.slug === "pressure-diary") {
    if (step.id === 1) return { ...step, title: "Создаём закрытый дневник измерений" };
    if (step.id === 6) return { ...step, action: "Откройте дневник по закрытой ссылке из «Моего портфолио» в Феечке. Проверьте доступ только на учебной записи 120/80. Настоящие измерения не добавляйте до проверки защиты и не публикуйте ради демонстрации." };
  }
  if (project.slug === "day-planner-agent" && step.id === 7) return { ...step, title: "Добавляем дело одним сообщением", action: "Отправьте своему агенту: «Добавь купить хлеб завтра». Проверьте название и дату. Если удобнее, продиктуйте эту фразу микрофону клавиатуры и проверьте текст перед отправкой. Устанавливать или подключать голосовой ввод не нужно." };
  if (project.slug === "unique-design" && step.id === 6) return { ...step, title: "Проверяем читаемость и кнопки", action: "Отправьте команду: Феечка проверит контраст, отступы и основные действия. Устанавливать скилл не обязательно. Если помощник предлагает его подключить, сначала проверьте источник и необходимые доступы вместе с куратором." };
  if (project.slug === "planner" && step.id === 7) return { ...step, title: "Готовим безопасный вариант для показа", action: "Личный планер уже открывается на телефоне через «Моё портфолио» в Феечке — повторно размещать его не нужно. Команда подготовит демонстрацию без ваших личных дел. Публикацию для других людей согласуйте отдельно." };
  if (project.slug === "family-health-hub" && step.id === 3) return { ...step, action: "Попросите Феечку проверить закрытый доступ к учебному хабу вместе с куратором. Не включайте публичную ссылку. До проверки защиты используйте только вымышленный PDF из комплекта; не загружайте личные медицинские документы и не отправляйте их внешнему ИИ." };
  if (project.slug === "carousel-agent" && step.id === 3) return { ...step, action: "Согласуйте с куратором подключение своей тестовой копии бота и один пробный запуск. Токен Telegram и AI-ключ вводите только в выданной защищённой настройке, не в переписке. Если такого способа нет, остановитесь и запросите его у куратора. Для пробы выберите бесплатную вёрстку, не кнопку Qwen." };
  return step;
}

function phoneTaskSource(prompt: string): string {
  return prompt.replace(
    "Если проект с этим именем уже существует, сначала спроси, продолжить его или сделать отдельную копию. Не перезаписывай существующие файлы и данные без согласования.",
    "Продолжай проект текущего чата. Не перезаписывай существующие файлы и данные без согласования. Если обнаружен другой по смыслу проект, уточни выбор до изменения файлов.",
  )
    // These are authored safety requirements, not requests for another learner's records.
    // State the allowed data positively so the bot's privacy preflight does not mistake them for access requests.
    .replaceAll("отсутствие секретов и чужих данных", "что секреты исключены, а комплект содержит только вымышленные учебные данные")
    .replaceAll("Не публикуй личные планы, ключи или доступ к чужим данным.", "Для показа используй только вымышленный пример. Личные планы, ключи и ссылки доступа оставь закрытыми.")
    .replaceAll("Передай человеку спорную сумму, чужие банковские данные или запрос финансового совета.", "При спорной сумме или запросе финансового совета останови действие и предложи обратиться к специалисту. Банковские реквизиты не запрашивай, не обрабатывай и никому не передавай.");
}

export function getMobileCapability(project: ProjectDefinition): MobileCapabilityInfo {
  if (project.journey === "setup") return { id: "curator", label: "Действия на компьютере", detail: "Телефон можно держать рядом как инструкцию" };
  if (project.kind === "advanced-site" || ["family-health-hub", "webinar-moderator-agent", "fairy-team-agent", "small-shop-site"].includes(project.slug)) return { id: "curator", label: "С помощью куратора", detail: "Сервер, доступы и внешние подключения проверяем вместе с куратором. Это дополнительный сложный проект." };
  return { id: "phone-template", label: "С телефона через Феечку", detail: "Феечка выполняет техническую работу на сервере школы. Вы отправляете команды в Telegram и открываете результат на телефоне. Установка Codex не требуется." };
}

/** One source of truth for the objective, prompt and success checks on both surfaces. */
function buildMobileQuestBase(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization, setupPlatform: SetupPlatform = "mac"): MobileQuestStep[] {
  const steps = buildQuest(project, mode, customization, setupPlatform);
  const projectName = customization?.name?.trim() || project.title;
  if (project.journey === "setup") {
    const setupPrompt = (prompt: string) => `${projectName}\n\nЯ читаю учебную инструкцию с телефона. Это настройка моего компьютера или отдельного сервера, а не создание сервиса внутри Феечки. Не выполняй настройку своего сервера вместо моего устройства. Если для действия нужен компьютер, скажи об этом прямо; не обещай установить Codex на телефон. Помоги разобраться с заданием ниже. Покупки, изменение доступов и операции с секретами не выполняй без отдельного согласования. Не проси присылать пароли и API-ключи в чат.\n\n${prompt}`;
    return steps.map(step => ({
      ...step,
      prompt: step.prompt ? setupPrompt(step.prompt) : undefined,
      help: { ...step.help, prompt: setupPrompt(step.help.prompt) },
      extension: step.extension ? { ...step.extension, prompt: setupPrompt(step.extension.prompt) } : undefined,
      mobileAction: { tool: "curator", label: "Продолжить на компьютере", note: "Этот инструмент настраивается на Mac или Windows. На телефоне можно прочитать инструкцию." },
    }));
  }
  const rules = `Работай в рабочем месте текущего чата Феечки. Название сервиса — «${projectName}»; ${project.slug} — только код учебного трека, не имя отдельного рабочего места. Если в задании упомянут Codex, локальный файл или терминал, выполни эту работу сама в своей среде. Не проси меня создавать файлы вручную или переносить проект в другой конструктор.\n\nНе проси пароли и API-ключи в чате. Публикацию для всех, платные подключения и действия с реальными данными согласуй отдельно. Создание учебных файлов и проверка в уже выделенной среде не требуют нового согласования. Если конкретная операция недоступна, объясни, какая именно, и что написать куратору; не выдумывай выполненную работу.`;
  const environment = `Это сервер школы, а не мой компьютер. Слова «локально» и «запусти предпросмотр» в учебной основе ниже означают твою серверную среду. Файлы и запуск выполни сама; проверку я делаю с телефона. Эти правила заменяют компьютерный способ выполнения, но сохраняют цель и проверки урока.\n\nИспользуй существующий закрытый HTTPS-доступ через «Моё портфолио» в Феечке. Не создавай новую публикацию для доступа с телефона. Публичная демонстрация для других людей — отдельное действие по согласованию, она не нужна для просмотра личного результата. Не выдумывай ссылку и не выдавай localhost за адрес для телефона. Если внешний доступ нельзя проверить, прямо назови это ограничение, не делай вывод, что проект работает на моём компьютере.\n\nПеред работой коротко подтверди, что задание принято. При смене этапа сообщи, что реально делаешь: создаёшь, проверяешь или исправляешь. Не имитируй прогресс и не обещай точное время. В конце объясни, что готово, что проверить на телефоне и где открыть результат в «Моём портфолио». Для агента укажи проверенный способ общения; не выдавай макет или пример диалога за подключённого бота.`;
  const supportPrompt = (prompt: string, extension = false) => `${projectName}\n\n${extension ? "Дополнительная практика для заказчика. Отдельная копия разрешена только для этой дополнительной практики и только после согласования задания. Сохрани исходный проект и мои записи; не переноси в копию личные данные, ключи и подключения." : "Помоги исправить текущий шаг. Не начинай проект заново и не заменяй его новым сервисом. Сначала изучи ошибку и существующие файлы; если не хватает описания, задай один конкретный вопрос. Исправляй только причину проблемы, сохраняя остальные функции и мои данные."}\n\n${rules}\n\n${environment}\n\nУсловия конкретного задания:\n${prompt}\n\nПроверку и исправления выполни в серверной среде; мне дай одно понятное действие для повторной проверки с телефона.`;
  const phoneResult = "Это мой учебный проект в текущем чате. Используй только мою выделенную рабочую среду и вымышленные примеры для проверки.\n\n" + (project.kind === "agent" ? "Выполни шаг ИИ-агента в серверной среде. Учебный диалог не заменяет подключение отдельного бота; внешние интеграции и ключи согласуем отдельно." : "Создай или доработай адаптивный веб-сервис в текущей серверной среде: он должен открываться в браузере телефона по закрытой HTTPS-ссылке из портфолио. Не выдавай вместо него код, архив или приложение для запуска на моём компьютере.");
  const taskPrompt = (step: QuestStep, result: string) => `${projectName}\n\nЗадание: ${step.title}.\nНачни выполнять задание сейчас в текущем проекте. Нужен работающий результат, а не только план или объяснение. Не создавай дубликат текущего проекта, кроме отдельной безопасной демонстрации или тестовой копии, прямо предусмотренной заданием. Если шаг требует разработки и файлов ещё нет, создай их; если есть — сначала изучи и доработай, сохранив мои данные. Если урок требует оригинальный учебный комплект, используй его; при отсутствии попроси прикрепить комплект, не придумывай замену.\n\n${phoneResult}\n\n${environment}\n\nУсловия и проверки урока:\n${phoneTaskSource(step.prompt!)}\n\n${rules}\n\n${result} Если что-то не удалось, скажи об этом прямо.`;
  const reviewedOpening = project.kind === "agent"
    ? "Откройте Феечку кнопкой в этом уроке и отправьте команду ниже. Получите пример тестового диалога: рассказ о делах, уточнение и план. Это ещё не ваш отдельный агент в Telegram — его подключим следующим шагом. Если бот просит приглашение, отправьте его сообщение с вашим ID куратору."
    : "Скачайте учебный комплект по ссылке в уроке. Откройте Феечку кнопкой в этом уроке и прикрепите скачанный ZIP как файл. Если Феечка не принимает архив, передайте его куратору для загрузки в ваш проект — не создавайте файлы вручную. После загрузки отправьте команду ниже и дождитесь ссылки на результат. Устанавливать Codex на телефон не нужно.";
  if (isReviewedPlanning(project.slug)) return steps.map<MobileQuestStep>(step => ({
    ...step,
    action: step.prompt ? step.id === 1 ? reviewedOpening : project.kind === "agent" && step.id === 9 ? "Отправьте команду Феечке. Затем закройте её чат и откройте своего агента планирования. Отправьте «Покажи мой план». Уточните у куратора, где агент работает постоянно и как продлевается доступ." : phoneInstruction(step.action) : step.action,
    prompt: step.prompt ? taskPrompt(step, project.kind === "agent" ? (step.id === 1 ? "Покажи тестовый диалог прямо здесь. Подключение отдельного Telegram-агента — следующий этап; не выдавай пример диалога за подключённого бота." : "Продолжай существующего агента. Проверь сценарий этого шага и честно укажи состояние его подключения.") : "Проверь предпросмотр в своей среде. Используй существующую закрытую ссылку проекта из портфолио, не localhost. Публичную демонстрацию размещай только после отдельного согласования.") : undefined,
    help: { ...step.help, prompt: supportPrompt(step.help.prompt) },
    extension: step.extension ? { ...step.extension, prompt: supportPrompt(step.extension.prompt, true) } : undefined,
    links: step.links?.filter(link => link.href !== "?quest=install-codex"),
    mobileAction: { tool: "telegram", label: "Открыть моего помощника", note: "Команда не отправляется автоматически: вставьте её в чат. Для проверки откройте отдельную ссылку своего планера или созданного агента." },
  })).map(step => simplifyPhoneLesson(project, step));
  return steps.map<MobileQuestStep>((step) => ({
    ...step,
    action: phoneInstruction(step.action),
    prompt: step.prompt ? taskPrompt(step, "Проверь результат в своей среде. Используй существующую закрытую ссылку проекта из портфолио, не localhost. Если ссылка пока недоступна, сохрани сделанное и отдельно объясни проблему с просмотром. Не публикуй сайт для всех.") : undefined,
    guide: undefined,
    showScreenshot: step.showScreenshot !== false && (step.screenshotKind === "real" || step.screenshotKind === "placeholder"),
    help: { ...step.help, prompt: supportPrompt(step.help.prompt) },
    extension: step.extension ? { ...step.extension, prompt: supportPrompt(step.extension.prompt, true) } : undefined,
    mobileAction: { tool: "telegram", label: "Открыть моего помощника", note: "Откроется чат. Команда не отправляется автоматически: вставьте её в поле сообщения и отправьте." },
    links: step.links?.filter(link => link.href !== "?quest=install-codex"),
  })).map(step => simplifyPhoneLesson(project, step));
}

/** Apply to task, help and extension alike: no copy surface can miss the data source. */
export function buildMobileQuest(project: ProjectDefinition, mode: DataMode = "demo", customization?: QuestCustomization, setupPlatform: SetupPlatform = "mac"): MobileQuestStep[] {
  const source = demoDataPrompt(project.slug, mode);
  const adapt = (prompt: string) => {
    const firstBreak = prompt.indexOf("\n");
    const normalized = prompt
      .replaceAll("Возьми учебные материалы из комплекта; если их нет, назови, какой пример нужен, и согласуй его.", "Возьми вымышленные материалы из публичного набора школы по ссылке выше. Согласование вымышленных примеров не требуется.")
      .replaceAll("Если нет учебного шаблона — остановись и составь точный запрос куратору; не создавай похожий продукт по названию.", "Сначала скачай вымышленные данные по ссылке выше. Если отсутствуют именно исходники оригинального шаблона, а не данные, сообщи об этом отдельно и попроси прикрепить ZIP по кнопке «Скачать учебный комплект» в уроке. Не создавай похожий продукт по названию.");
    return firstBreak < 0 ? `${normalized}\n\n${source}` : `${normalized.slice(0, firstBreak)}\n\n${source}${normalized.slice(firstBreak)}`;
  };
  return buildMobileQuestBase(project, mode, customization, setupPlatform).map(step => ({
    ...step,
    prompt: step.prompt ? adapt(step.prompt) : undefined,
    help: {...step.help, prompt: adapt(step.help.prompt)},
    extension: step.extension ? {...step.extension, prompt: adapt(step.extension.prompt)} : undefined,
    links: [...(step.links ?? []), ...(step.id === 1 ? [{label:"Учебные данные для этого проекта", href:`https://ezhgenti.ru/data/#${project.slug}`, note:"Готовые вымышленные примеры. Феечка получает ссылку вместе с командой."}] : [])],
  }));
}
