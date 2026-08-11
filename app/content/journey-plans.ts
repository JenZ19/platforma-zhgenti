import type { DataMode } from "../lib/preparation";
import type { ProjectDefinition, QuestStep } from "./types";

export type JourneyCheckKey =
  | "feature-three"
  | "feature-four"
  | "privacy-boundary"
  | "recovery"
  | "export-backup"
  | "conflict"
  | "source-proof"
  | "calculation"
  | "substitution"
  | "decision-trace"
  | "missing-info"
  | "revision-loop"
  | "permission-boundary"
  | "handoff"
  | "load"
  | "audit-trail"
  | "originality"
  | "contact-route"
  | "claims"
  | "booking"
  | "case-rights"
  | "form-delivery"
  | "student-access"
  | "registration"
  | "fact-check"
  | "catalog"
  | "cart"
  | "test-payment"
  | "delivery"
  | "link-audit"
  | "honest-status"
  | "request-route"
  | "search-filter"
  | "enrollment"
  | "scheduling"
  | "restore";

export const questLevelCounts = {
  "install-codex": 6,
  "server-152fz": 9,
  "api-keys": 14,
  "family-expenses": 18,
  planner: 17,
  "idea-vault": 18,
  "child-schedule": 19,
  "pressure-diary": 19,
  "fitness-tracker": 17,
  "recipe-book": 18,
  "personal-organizer": 18,
  "home-helper": 17,
  "family-health-hub": 20,
  "day-planner-agent": 17,
  "home-organizer-agent": 18,
  "meal-planning-agent": 19,
  "study-agent": 18,
  "idea-analysis-agent": 18,
  "expense-agent": 19,
  "family-schedule-agent": 18,
  "habit-agent": 17,
  "brief-agent": 18,
  "content-agent": 19,
  "expert-assistant-agent": 18,
  "administrator-agent": 19,
  "consultant-agent": 18,
  "online-school-agent": 19,
  "event-organizer-agent": 19,
  "client-care-agent": 20,
  "fairy-team-agent": 21,
  "carousel-agent": 18,
  "threads-agent": 18,
  "webinar-moderator-agent": 20,
  "unique-design": 19,
  "expert-site": 17,
  "psychologist-site": 19,
  "beauty-site": 18,
  "photographer-site": 18,
  "designer-site": 18,
  "consultation-site": 19,
  "course-site": 20,
  "event-site": 19,
  "small-shop-site": 21,
  "portfolio-site": 18,
  "expert-pro-site": 20,
  "school-pro-site": 21,
  "service-pro-site": 20,
  "catalog-pro-site": 22,
  "graduate-portfolio": 19,
} as const;

const checksBySlug: Record<keyof typeof questLevelCounts, JourneyCheckKey[]> = {
  "install-codex": [],
  "server-152fz": [],
  "api-keys": [],
  "family-expenses": ["export-backup"],
  planner: [],
  "idea-vault": ["recovery"],
  "child-schedule": ["privacy-boundary", "conflict"],
  "pressure-diary": ["privacy-boundary", "export-backup", "recovery"],
  "fitness-tracker": ["privacy-boundary"],
  "recipe-book": ["feature-four", "recovery"],
  "personal-organizer": ["feature-four", "export-backup"],
  "home-helper": [],
  "family-health-hub": ["privacy-boundary", "source-proof", "restore"],
  "day-planner-agent": [],
  "home-organizer-agent": ["conflict"],
  "meal-planning-agent": ["privacy-boundary", "substitution"],
  "study-agent": ["source-proof"],
  "idea-analysis-agent": ["decision-trace"],
  "expense-agent": ["privacy-boundary", "calculation"],
  "family-schedule-agent": ["conflict"],
  "habit-agent": [],
  "brief-agent": ["missing-info"],
  "content-agent": ["source-proof", "revision-loop"],
  "expert-assistant-agent": ["source-proof"],
  "administrator-agent": ["permission-boundary", "recovery"],
  "consultant-agent": ["handoff"],
  "online-school-agent": ["source-proof", "handoff"],
  "event-organizer-agent": ["registration", "conflict"],
  "client-care-agent": ["privacy-boundary", "load", "audit-trail"],
  "fairy-team-agent": ["load", "conflict", "recovery", "audit-trail"],
  "carousel-agent": ["case-rights"],
  "threads-agent": ["source-proof"],
  "webinar-moderator-agent": ["load", "permission-boundary", "handoff"],
  "unique-design": ["case-rights", "originality"],
  "expert-site": ["contact-route"],
  "psychologist-site": ["privacy-boundary", "contact-route", "claims"],
  "beauty-site": ["booking", "contact-route"],
  "photographer-site": ["case-rights", "contact-route"],
  "designer-site": ["case-rights", "contact-route"],
  "consultation-site": ["form-delivery", "privacy-boundary", "contact-route"],
  "course-site": ["fact-check", "form-delivery", "student-access", "case-rights"],
  "event-site": ["registration", "fact-check", "contact-route"],
  "small-shop-site": ["catalog", "cart", "test-payment", "delivery", "recovery"],
  "portfolio-site": ["link-audit", "honest-status"],
  "expert-pro-site": ["form-delivery", "privacy-boundary", "audit-trail", "recovery"],
  "school-pro-site": ["enrollment", "student-access", "test-payment", "privacy-boundary", "recovery"],
  "service-pro-site": ["request-route", "scheduling", "privacy-boundary", "recovery"],
  "catalog-pro-site": ["catalog", "search-filter", "cart", "test-payment", "delivery", "recovery"],
  "graduate-portfolio": ["link-audit", "honest-status", "request-route"],
};

const compactSharedSlugs = new Set([
  "pressure-diary",
  "fitness-tracker",
  "recipe-book",
  "personal-organizer",
  "expert-site",
  "psychologist-site",
  "beauty-site",
  "photographer-site",
  "designer-site",
  "consultation-site",
  "course-site",
  "event-site",
  "small-shop-site",
  "portfolio-site",
  "expert-pro-site",
  "school-pro-site",
  "service-pro-site",
  "catalog-pro-site",
  "graduate-portfolio",
]);

type CheckCopy = {
  title: string;
  why: string;
  action: string;
  expected: [string, string, string];
};

const feature = (project: ProjectDefinition, index: number) => project.features[index % project.features.length];

function checkCopy(key: JourneyCheckKey, project: ProjectDefinition): CheckCopy {
  const title = (value: string) => `Финальная проверка: ${value}`;
  switch (key) {
    case "feature-three":
      return { title: title(feature(project, 2)), why: `Функция «${feature(project, 2)}» входит в обещанный результат проекта, поэтому её нужно проверить отдельно на обеих готовых версиях.`, action: `Откройте личную и клиентскую версии. В каждой один раз выполните «${feature(project, 2)}» на безопасном примере и сравните видимый результат.`, expected: [`Работает «${feature(project, 2)}»`, "Проверены обе версии", "Результаты не смешались"] };
    case "feature-four":
      return { title: title(feature(project, 3)), why: `Последняя обязательная функция «${feature(project, 3)}» не должна оставаться только подписью на карточке проекта.`, action: `Откройте обе готовые версии и один раз выполните «${feature(project, 3)}». Не добавляйте новые функции во время этой проверки.`, expected: [`Работает «${feature(project, 3)}»`, "Есть понятное подтверждение", "Остальные функции сохранились"] };
    case "privacy-boundary":
      return { title: "Проверила границу личных данных", why: `Проект работает с чувствительными сведениями. Отдельный безопасный тест подтверждает правило: ${project.safety}`, action: "Введите один вымышленный пример с лишним личным полем. Проект должен отказаться сохранять лишнее, объяснить причину и оставить полезную часть сценария рабочей.", expected: ["Лишнее поле не сохранено", "Причина объяснена простыми словами", "Основной сценарий продолжает работать"] };
    case "recovery":
      return { title: "Проверила пустой экран и понятную ошибку", why: "Работающий проект должен помогать и тогда, когда данных ещё нет или действие не удалось с первого раза.", action: "Откройте проект без записей, затем один раз отправьте неполный безопасный пример. Проверьте пустое состояние и одно сообщение об ошибке.", expected: ["Пустой экран объясняет первый шаг", "Ошибка называет, что исправить", "После исправления путь продолжается"] };
    case "export-backup":
      return { title: "Проверила выгрузку и возврат данных", why: "Данные нельзя считать сохранёнными, пока готовую копию не удалось открыть и проверить отдельно.", action: "Скачайте безопасную копию, откройте её и найдите один заранее выбранный тестовый пример. Оригинал проекта не удаляйте.", expected: ["Копия скачалась", "В копии найден тестовый пример", "Секретов и лишних личных данных нет"] };
    case "conflict":
      return { title: "Разрешила одно реальное пересечение", why: "В расписаниях и совместной работе два дела могут претендовать на одно время или одного исполнителя. Проект должен показать конфликт до сохранения.", action: "Добавьте два вымышленных дела на одно время или одного исполнителя. Выберите один из предложенных вариантов решения и сохраните его.", expected: ["Конфликт замечен до сохранения", "Предложено понятное решение", "После выбора нет дубля"] };
    case "source-proof":
      return { title: "Проверила источник и отсутствие догадок", why: "Пользователь должен отличать подтверждённый факт от предположения ИИ.", action: "Откройте один готовый результат и выберите в нём факт, который требует источника. Проверьте ссылку или честную отметку «источник не указан».", expected: ["Факт связан с источником", "Нет выдуманной ссылки", "Неуверенность обозначена прямо"] };
    case "calculation":
      return { title: "Пересчитала итог на контрольном примере", why: "Финансовый результат нужно сверить на простом примере, который можно проверить без калькулятора.", action: "Введите три вымышленные суммы 100 ₽, 200 ₽ и 300 ₽. Проверьте итог, затем измените 200 ₽ на 250 ₽ и проверьте новый итог.", expected: ["Первый итог — 600 ₽", "После изменения итог — 650 ₽", "Исходная запись не продублировалась"] };
    case "substitution":
      return { title: "Проверила безопасную замену", why: "Совет должен меняться, когда пользователь сообщает ограничение, и не превращаться в медицинское назначение.", action: "Добавьте одно вымышленное ограничение и попросите заменить только неподходящий пункт результата. Остальную часть не меняйте.", expected: ["Неподходящий пункт заменён", "Остальной результат сохранён", "Нет медицинского обещания"] };
    case "decision-trace":
      return { title: "Проверила, почему агент выбрал этот вариант", why: "Полезный ответ должен опираться на подтверждённые ответы, а не на скрытую догадку.", action: "Откройте один готовый ответ и попросите назвать три подтверждённых факта, которые повлияли на выбор. Затем измените один факт и повторите проверку.", expected: ["Названы три подтверждённых факта", "После изменения решение обновилось", "Нет придуманной причины"] };
    case "missing-info":
      return { title: "Оставила неизвестное неизвестным", why: "Если заказчик не дал факт, хороший проект просит уточнение и не заполняет пробел красивой догадкой.", action: "Пропустите один обязательный ответ в тестовом брифе. Проверьте, что агент задаёт ровно один вопрос и до ответа не создаёт уверенный итог.", expected: ["Задан один короткий вопрос", "Пропуск не заполнен догадкой", "После ответа итог обновился"] };
    case "revision-loop":
      return { title: "Приняла одну правку без переписывания всего", why: "Клиентская работа часто меняется по одной правке. Уже утверждённые части должны остаться на месте.", action: "Попросите изменить только один заголовок или один пункт готового результата. Сравните экран до и после.", expected: ["Изменён только выбранный фрагмент", "Утверждённые части сохранились", "Новая версия снова проверена"] };
    case "permission-boundary":
      return { title: "Проверила действие, которое нельзя делать без разрешения", why: "Агент должен остановиться перед удалением, отправкой, публикацией или изменением чужих данных.", action: "Попросите выполнить безопасную имитацию внешнего действия. Сначала ответьте «Нет», затем повторите с точной фразой «Да, подтверждаю».", expected: ["На «Нет» ничего не изменилось", "До согласия показан черновик", "Принята только точная фраза"] };
    case "handoff":
      return { title: "Передала сложный случай человеку", why: "Полный путь включает момент, когда агент честно останавливается и сохраняет контекст для специалиста.", action: "Отправьте один запрос за границей роли агента. Откройте подготовленную передачу и проверьте, что человеку видны подтверждённые факты и один следующий вопрос.", expected: ["Агент остановился", "Контекст не потерян", "Понятно, кто продолжает"] };
    case "load":
      return { title: "Проверила несколько обращений подряд", why: "Проект не должен смешивать людей и ответы, когда сообщения приходят почти одновременно.", action: "Отправьте пять коротких вымышленных обращений подряд с разными метками А–Д. Затем откройте итоговый список.", expected: ["Сохранены все пять обращений", "Ответы не смешались", "Каждому обращению присвоен статус"] };
    case "audit-trail":
      return { title: "Проверила историю важного действия", why: "Для спорного изменения нужно видеть, что произошло, когда и после какого подтверждения — без публикации секретов.", action: "Выполните одно безопасное тестовое изменение и откройте его историю. Сверьте время, тип действия и отметку подтверждения.", expected: ["Действие появилось в истории", "Видна отметка подтверждения", "Секреты не записаны"] };
    case "originality":
      return { title: "Проверила, что дизайн не копирует референс", why: "Референс помогает выбрать принцип, но готовый проект должен иметь свою структуру, палитру и фирменную деталь.", action: "Положите рядом три референса и готовый первый экран. Для каждого отметьте один взятый принцип и два заметных отличия.", expected: ["У каждого референса взят только принцип", "Есть минимум два отличия", "Свой дизайн узнаваем без подписи"] };
    case "contact-route":
      return { title: "Прошла путь до реального контакта", why: "Сайт готов только тогда, когда посетитель понимает, как связаться, и контакт открывается без ошибки.", action: "Откройте опубликованный сайт с телефона, дойдите до контакта и нажмите главную кнопку связи один раз. Сообщение не отправляйте, если это реальный адрес.", expected: ["Способ связи найден без поиска", "Кнопка открывает правильный адрес", "Реальный контакт подтверждён владельцем"] };
    case "claims":
      return { title: "Убрала обещания, которых нельзя подтвердить", why: "Публичный сайт не должен обещать лечение, гарантированный результат, доход или другой неподтверждённый эффект.", action: "Попросите Codex найти все обещания результата. Оставьте только факты об услуге, процессе и подтверждённых ограничениях.", expected: ["Неподтверждённые обещания удалены", "Факты сохранились", "Ограничение видно до обращения"] };
    case "booking":
      return { title: "Проверила запись на свободное время", why: "Запись должна показывать только доступное время и не создавать две заявки на один слот.", action: "Выберите один тестовый слот, создайте запись и сразу попробуйте выбрать его повторно.", expected: ["Первая запись подтверждена", "Занятый слот больше недоступен", "Понятно, как отменить тест"] };
    case "case-rights":
      return { title: "Проверила права на картинки и примеры", why: "Портфолио и контент можно публиковать только с разрешёнными изображениями и честно подписанным статусом работы.", action: "Откройте каждый финальный кадр и укажите источник или своё авторство. Учебный пример подпишите как учебный.", expected: ["У каждого кадра понятен источник", "Учебные работы подписаны", "Чужие закрытые материалы не опубликованы"] };
    case "form-delivery":
      return { title: "Проверила доставку одной тестовой заявки", why: "Форма считается рабочей, только если заявка не просто исчезла с экрана, а дошла в выбранное место.", action: "Отправьте одну тестовую заявку с адресом test@example.com. Откройте место получения и найдите её по времени отправки.", expected: ["Форма показала подтверждение", "Заявка найдена у получателя", "Повторной заявки нет"] };
    case "student-access":
      return { title: "Проверила вход и закрытый материал", why: "Закрытый материал не должен открываться постороннему человеку или пропадать после повторного входа ученицы.", action: "Откройте тестовый доступ ученицы, затем отдельное приватное окно без входа. Сравните доступ к одному закрытому материалу.", expected: ["Ученица видит материал", "Без входа материал закрыт", "После повторного входа прогресс сохранён"] };
    case "registration":
      return { title: "Проверила регистрацию и подтверждение", why: "Участник должен получить ясное подтверждение и не регистрироваться дважды на одно событие.", action: "Отправьте одну тестовую регистрацию, затем повторите её с тем же email и проверьте ответ.", expected: ["Первая регистрация подтверждена", "Дубль замечен", "Участник понимает следующий шаг"] };
    case "fact-check":
      return { title: "Сверила публичные даты, цены и условия", why: "Перед публикацией меняющиеся факты нужно проверить по актуальному источнику владельца проекта.", action: "Откройте исходный документ владельца и по очереди сверьте дату, цену и одно условие. Неподтверждённое скройте до уточнения.", expected: ["Дата подтверждена", "Цена подтверждена", "Неподтверждённое не опубликовано"] };
    case "catalog":
      return { title: "Проверила карточку товара от списка до деталей", why: "Каталог должен сохранять цену, наличие и выбранный вариант при переходе между списком и карточкой.", action: "Откройте один тестовый товар из каталога, выберите вариант и вернитесь назад. Затем снова откройте карточку.", expected: ["Открыт правильный товар", "Цена и наличие совпадают", "Выбранный вариант не перепутан"] };
    case "cart":
      return { title: "Проверила корзину и изменение количества", why: "Корзина должна пересчитывать итог без дублей и не терять товары после обновления.", action: "Добавьте два тестовых товара, измените количество одного и обновите страницу.", expected: ["В корзине два нужных товара", "Итог пересчитан", "После обновления корзина сохранилась"] };
    case "test-payment":
      return { title: "Проверила только тестовую оплату", why: "До запуска нельзя использовать реальный секрет или случайно списать деньги. Проверка проходит в тестовом режиме провайдера.", action: "Откройте тестовый режим оплаты, проведите один успешный и один отклонённый сценарий. Реальную карту и рабочий секрет не используйте.", expected: ["Успешный тест отмечен как тест", "Отказ показал понятную причину", "Реального списания и секрета нет"] };
    case "delivery":
      return { title: "Проверила выбор доставки и итог заказа", why: "Стоимость и способ доставки должны попасть в итог до подтверждения, а не появиться после него.", action: "Выберите один тестовый способ доставки, укажите безопасный демонстрационный адрес и откройте итог заказа.", expected: ["Способ доставки виден", "Стоимость вошла в итог", "Настоящий адрес не использован"] };
    case "link-audit":
      return { title: "Открыла каждую ссылку из портфолио", why: "Красивое портфолио не помогает, если работа, контакт или демонстрация ведут на ошибку.", action: "Откройте все ссылки по одной в приватном окне. Для каждой отметьте «открывается», «доступ закрыт» или «нужно заменить».", expected: ["Каждая ссылка получила статус", "Закрытые работы не обещают доступ", "Контакт открывается правильно"] };
    case "honest-status":
      return { title: "Подписала реальный статус каждой работы", why: "Учебная работа, личный проект и оплаченный заказ — разные доказательства навыка. Статус нельзя додумывать.", action: "Откройте карточки портфолио и выберите для каждой один статус: учебная, личная, тестовая адаптация или реальный заказ с разрешением.", expected: ["У каждой работы один честный статус", "Нет выдуманного клиента", "Нет неподтверждённого результата"] };
    case "request-route":
      return { title: "Прошла путь заказчика до обращения", why: "Будущий заказчик должен понять услугу, увидеть подходящую работу и отправить одно понятное обращение.", action: "Откройте сайт как новый посетитель, выберите одну услугу, одну связанную работу и дойдите до формы обращения.", expected: ["Услуга понятна", "Пример связан с услугой", "Обращение доходит в выбранное место"] };
    case "search-filter":
      return { title: "Проверила поиск и два фильтра вместе", why: "В большом каталоге поиск и фильтры должны сужать один список, а не показывать противоречивые результаты.", action: "Введите одно слово из тестового товара и включите два подходящих фильтра. Затем сбросьте только один фильтр.", expected: ["Найден правильный товар", "Два фильтра работают вместе", "Частичный сброс не очищает поиск"] };
    case "enrollment":
      return { title: "Проверила путь от программы до зачисления", why: "Школьный сайт должен связать выбранную программу, заявку, статус и доступ одного ученика без ручного переноса данных.", action: "Выберите тестовую программу, отправьте заявку и измените её статус на «зачислен» в безопасной панели проверки.", expected: ["Заявка связана с программой", "Статус изменился один раз", "Доступ получил правильный ученик"] };
    case "scheduling":
      return { title: "Проверила перенос и отмену записи", why: "Рабочая запись должна освобождать старое время после переноса и ясно показывать отмену.", action: "Создайте одну тестовую запись, перенесите её на свободное время и затем отмените.", expected: ["Старое время освободилось", "Новое время занято один раз", "Отмена получила понятный статус"] };
    case "restore":
      return { title: "Восстановила одну безопасную копию", why: "Резервная копия полезна только после отдельной проверки восстановления, которая не затрагивает рабочий оригинал.", action: "Попросите Codex восстановить тестовую копию в отдельное временное место и найти один заранее выбранный документ. Рабочий проект не заменяйте.", expected: ["Копия восстановлена отдельно", "Контрольный документ найден", "Рабочий оригинал не изменён"] };
  }
}

export function getJourneyLevelCount(slug: string): number {
  return questLevelCounts[slug as keyof typeof questLevelCounts] ?? 17;
}

export function getJourneyPlan(project: ProjectDefinition) {
  const checks = checksBySlug[project.slug as keyof typeof checksBySlug] ?? [];
  return {
    outcome: project.outcome,
    checks,
    levelCount: getJourneyLevelCount(project.slug),
    finalProof: project.journey === "setup"
      ? `Настройка «${project.title}» завершена и проверена по видимым признакам.`
      : `Личная и клиентская версии дают результат «${project.outcome}» и прошли предметные проверки.`,
  };
}

function checkStep(project: ProjectDefinition, key: JourneyCheckKey, mode: DataMode): QuestStep {
  const rawCopy = checkCopy(key, project);
  const safeRealText = (value: string) => mode === "real"
    ? value
      .replace(/вымышленн(?:ый|ая|ое|ые|ого|ому|ым|ом|ую|ой|ых|ыми)/giu, "обезличенный контрольный")
      .replace(/демонстрационн(?:ый|ая|ое|ые|ого|ому|ым|ом|ую|ой|ых|ыми)/giu, "обезличенный контрольный")
    : value;
  const copy = {
    ...rawCopy,
    why: safeRealText(rawCopy.why),
    action: safeRealText(rawCopy.action),
    expected: rawCopy.expected.map(safeRealText) as [string, string, string],
  };
  const modeRule = mode === "real"
    ? "РЕЖИМ РЕАЛЬНЫХ ДАННЫХ. Используй только уже подтверждённые ответы, не запрашивай лишние персональные данные и не начинай опрос заново."
    : `Используй только безопасные учебные примеры: ${project.demo.join("; ")}.`;
  return {
    id: 0,
    sourceStepId: 0,
    journeyCheck: key,
    title: copy.title,
    eyebrow: "Проверка именно этого проекта",
    why: copy.why,
    action: copy.action,
    kind: "prompt",
    prompt: `${modeRule}\n\nРаботай только внутри личной и клиентской версий проекта «${project.title}». ${copy.action} Техническую проверку, исправление и повторный тест выполни сам. Не проси ученицу писать код, создавать служебные файлы или менять настройки вручную. После проверки верни таблицу из трёх строк: ${copy.expected.join("; ")}. Если что-то не работает, исправь только найденную причину и повтори этот тест.`,
    expected: copy.expected,
    screenshot: "",
    screenshotKind: "prototype",
    beginnerTerms: [],
    help: {
      title: `Помощь: ${copy.title}`,
      body: "Не повторяйте весь квест и не создавайте новую копию. Codex найдёт одну причину, исправит только её и снова проведёт эту проверку.",
      prompt: `В проекте «${project.title}» не прошла проверка «${copy.title}». Не переделывай проект целиком. Воспроизведи только этот тест, найди одну причину, исправь её и покажи три признака готовности: ${copy.expected.join("; ")}.`,
    },
  };
}

function renumber(project: ProjectDefinition, steps: QuestStep[]): QuestStep[] {
  const total = steps.length;
  return steps.map((step, index) => {
    const id = index + 1;
    const screenshot = step.screenshotKind === "real" || step.screenshotKind === "placeholder"
      ? step.screenshot
      : `/screens/${project.slug}/step-${String(id).padStart(2, "0")}.png`;
    return {
      ...step,
      id,
      sourceStepId: step.sourceStepId || step.id,
      screenshot,
      reward: id === total ? "Фея полностью проверенного результата" : step.reward,
    };
  });
}

export function applyJourneyPlan(
  project: ProjectDefinition,
  baseSteps: QuestStep[],
  mode: DataMode,
): QuestStep[] {
  const plan = getJourneyPlan(project);
  if (project.journey === "setup") return renumber(project, baseSteps);
  const base = baseSteps
    .map((step) => ({ ...step, sourceStepId: step.sourceStepId ?? step.id }))
    .filter((step) => !compactSharedSlugs.has(project.slug) || step.sourceStepId !== 2);
  const portfolioIndex = base.findIndex((step) => step.sourceStepId === 17);
  const checks = plan.checks.map((key) => checkStep(project, key, mode));
  const withChecks = portfolioIndex < 0
    ? [...base, ...checks]
    : [...base.slice(0, portfolioIndex), ...checks, ...base.slice(portfolioIndex)];
  const result = renumber(project, withChecks);
  if (result.length !== plan.levelCount) {
    throw new Error(`Маршрут ${project.slug}: ожидалось ${plan.levelCount} уровней, собрано ${result.length}`);
  }
  return result;
}
