export type CourseChoice = { slug: string; label: string; output?: "service" | "agent" };
export type CourseWeek = { week: number; title: string; why: string; result: string; choices: CourseChoice[] };

const choice = (slug: string, label: string, output?: "service" | "agent"): CourseChoice => ({ slug, label, output });

/** The curriculum is deliberately smaller than the library. Slugs keep old links and progress valid. */
export const courseWeeks: CourseWeek[] = [
  { week: 1, title: "Полезный сервис для себя", why: "Выберите одну повседневную задачу. Не нужно делать семь приложений: важнее довести одно до состояния, когда им удобно пользоваться.", result: "Один работающий сервис со своими настройками и сохранением данных.", choices: [
    choice("planning", "Планировать день", "service"), choice("family-budget", "Вести семейный бюджет", "service"), choice("recipes", "Хранить рецепты", "service"), choice("family-schedule", "Собрать расписание семьи", "service"), choice("household", "Распределять домашние дела", "service"), choice("ideas", "Не терять идеи", "service"), choice("habits", "Отмечать привычки", "service"), choice("pressure-diary", "Записывать давление"),
  ] },
  { week: 2, title: "Мой личный ИИ-агент", why: "Та же понятная механика: вы пишете или говорите, помощник уточняет недостающее и выдаёт полезный результат. Выберите одну роль, а не проходите все варианты.", result: "Один агент с собственными правилами и проверенным диалогом. Telegram подключаем только после выдачи рабочего доступа.", choices: [
    choice("planning", "Помощник по планированию", "agent"), choice("recipes", "Помощник по меню", "agent"), choice("family-budget", "Помощник по расходам", "agent"), choice("household", "Помощник по домашним делам", "agent"), choice("ideas", "Помощник по идеям", "agent"), choice("family-schedule", "Помощник по расписанию", "agent"), choice("habits", "Помощник по привычкам", "agent"), choice("study-agent", "Помощник по учёбе"),
  ] },
  { week: 3, title: "ИИ-агент для заказчика", why: "Создаём одного агента для одной рабочей задачи. Для клиентского помощника выбирайте специализацию. Карусели и Threads — отдельные проекты с другой механикой.", result: "Демонстрация, понятные границы работы и инструкция для заказчика. Если заказчика нет, честно обозначьте учебный кейс.", choices: [
    choice("client-care-agent", "Работа с клиентами"), choice("brief-agent", "Сбор задания у клиента"), choice("administrator-agent", "Администратор и запись"), choice("consultant-agent", "Подбор услуги"), choice("expert-assistant-agent", "Ответы по материалам эксперта"), choice("online-school-agent", "Вопросы учеников школы"), choice("event-organizer-agent", "Вопросы участников события"), choice("content-agent", "Подготовка контента"), choice("carousel-agent", "Карусели в Telegram"), choice("threads-agent", "Контент для Threads"),
  ] },
  { week: 4, title: "Первый сайт", why: "Один маршрут, разные ниши. Меняются ваши тексты, предложения, изображения и стиль. Каталог, оплату и закрытый кабинет пока не добавляем.", result: "Опубликованный лендинг с понятным предложением и работающим способом связаться.", choices: [
    choice("expert-site", "Эксперт"), choice("psychologist-site", "Психолог"), choice("beauty-site", "Бьюти-мастер"), choice("photographer-site", "Фотограф"), choice("designer-site", "Дизайнер"), choice("consultation-site", "Консультация"), choice("course-site", "Курс"), choice("event-site", "Мероприятие"),
  ] },
  { week: 5, title: "Развиваем готовый проект", why: "Не начинаем ещё один сайт с нуля. Сохраняем копию сайта четвёртой недели и добавляем одну нужную функцию. Сервер, API и оплату подключаем только там, где они действительно требуются.", result: "Проверенное улучшение существующего проекта и возможность вернуться к предыдущей версии.", choices: [
    choice("expert-pro-site", "Заявки и материалы эксперта"), choice("service-pro-site", "Калькулятор и заявки"), choice("school-pro-site", "Учебные материалы и доступ"), choice("catalog-pro-site", "Каталог и тестовый заказ"),
  ] },
  { week: 6, title: "Портфолио и первая услуга", why: "Выберите 3–5 лучших результатов. Для каждого покажите, кому он помогает, что умеет и где его открыть. Не выдавайте учебный пример за выполненный заказ.", result: "Ссылки на работы, описание услуги, границы заказа и готовое сообщение потенциальному клиенту.", choices: [choice("graduate-portfolio", "Собрать выпускное портфолио")] },
];

export const advancedLibrarySlugs = ["family-health-hub", "webinar-moderator-agent", "fairy-team-agent", "small-shop-site"];
