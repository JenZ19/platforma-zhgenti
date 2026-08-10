import type {
  QuestColorPalette,
  QuestCustomization,
  QuestCustomizationAxis,
  QuestCustomizationProfile,
} from "./types";

export const originalQuestSlugs = [
  "family-expenses",
  "planner",
  "idea-vault",
  "child-schedule",
] as const;

export type OriginalQuestSlug = (typeof originalQuestSlugs)[number];

export const questColorPalettes: QuestColorPalette[] = [
  { name: "Мятная свежесть", background: "#F3F8F5", surface: "#FFFFFF", accent: "#2F6B5D", text: "#20352F" },
  { name: "Пудровое тепло", background: "#FFF5F4", surface: "#FFFFFF", accent: "#8E4F5B", text: "#3F2C33" },
  { name: "Лавандовый вечер", background: "#F7F3FC", surface: "#FFFFFF", accent: "#66517F", text: "#342B42" },
  { name: "Солнечный блокнот", background: "#FFF8E8", surface: "#FFFFFF", accent: "#915B1B", text: "#3F3021" },
  { name: "Голубой порядок", background: "#F1F7FB", surface: "#FFFFFF", accent: "#356B86", text: "#253841" },
  { name: "Спокойный монохром", background: "#F5F3EF", surface: "#FFFFFF", accent: "#2F2A27", text: "#24201E" },
];

export function paletteDescription(palette: QuestColorPalette): string {
  return `${palette.name}: фон ${palette.background}, карточки ${palette.surface}, кнопки и акценты ${palette.accent}, основной текст ${palette.text}`;
}

const profiles: Record<OriginalQuestSlug, QuestCustomizationProfile> = {
  "family-expenses": {
    slug: "family-expenses",
    title: "Соберите свой семейный бюджет",
    promise: "Выберите, для кого он создаётся, что показывает первым и чем будет отличаться от чужих шаблонов.",
    axes: {
      audience: { label: "Кто будет пользоваться", hint: "От этого зависят тексты и главный экран.", options: ["Я сама", "Мы вдвоём", "Семья с детьми", "Семья, которая копит на большую покупку"] },
      goal: { label: "Что важнее увидеть сразу", hint: "На главном экране останется один главный ответ.", options: ["Остаток до конца месяца", "Самые крупные категории", "Недельный лимит", "Сколько уже накоплено на цель"] },
      name: { label: "Как будет называться сервис", hint: "Название можно изменить позднее.", options: ["Наш семейный бюджет", "Куда ушли деньги", "Спокойный бюджет", "Копим вместе"] },
      style: { label: "Как устроен экран", hint: "Здесь выбираем форму карточек. Цвета выберете отдельно ниже.", options: ["Воздушные карточки", "Мягкие округлые блоки", "Домашний блокнот", "Чёткий дашборд"] },
      tone: { label: "Как сервис разговаривает", hint: "Тон относится к подсказкам и подтверждениям.", options: ["Мягко и заботливо", "Коротко и нейтрально", "Бодро и мотивирующе"] },
      feature: { label: "Одна особенная функция", hint: "Берём только одну, чтобы проект остался понятным.", options: ["Дни без покупок", "Недельные конверты", "Цель накопления", "Быстрый повтор расхода", "Семейная заметка"] },
    },
  },
  planner: {
    slug: "planner",
    title: "Соберите планер под свой ритм",
    promise: "Решите, что он показывает утром, как называет дела и какая одна функция снимает нагрузку.",
    axes: {
      audience: { label: "Для кого планер", hint: "Выберите самый близкий ритм жизни.", options: ["Мама с малышом", "Эксперт с клиентами", "Студентка", "Человек с гибким графиком"] },
      goal: { label: "Что планер должен облегчить", hint: "Это станет главным обещанием проекта.", options: ["Не забывать важное", "Разгрузить голову", "Видеть одно главное дело", "Разделить дом и работу"] },
      name: { label: "Как называется планер", hint: "Короткое название лучше видно на телефоне.", options: ["Мой спокойный день", "Сегодня главное", "Дела без паники", "Мой ритм"] },
      style: { label: "Как устроен экран", hint: "Выбираем форму блоков; цветовую гамму зададите отдельно.", options: ["Воздушный минимализм", "Стикеры", "Мягкий ежедневник", "Деловой порядок"] },
      tone: { label: "Как он подсказывает", hint: "Подсказки должны звучать естественно для владельца.", options: ["Заботливо", "Коротко и нейтрально", "Бодро"] },
      feature: { label: "Одна особенная функция", hint: "Она должна экономить время каждый день.", options: ["Режим одной руки", "Список «Можно позже»", "Зоны «Дом» и «Работа»", "Вечернее закрытие дня", "Перенести на завтра"] },
    },
  },
  "idea-vault": {
    slug: "idea-vault",
    title: "Соберите свою копилку идей",
    promise: "Выберите, какие мысли вы храните, как находите лучшее и что помогает перейти к действию.",
    axes: {
      audience: { label: "Для кого копилка", hint: "От этого зависят темы и примеры карточек.", options: ["Автор контента", "Рукодельница", "Предпринимательница", "Организатор семейных дел"] },
      goal: { label: "Что должно стать проще", hint: "Это главное действие на первом экране.", options: ["Не терять мысли", "Выбирать лучшую идею", "Раскладывать хаос по темам", "Превращать идеи в действия"] },
      name: { label: "Как называется копилка", hint: "Название задаёт характер всему проекту.", options: ["Лови мысль", "Моя сокровищница", "Банк идей", "Когда-нибудь сделаю"] },
      style: { label: "Как выглядят идеи", hint: "Выбираем форму карточек; цвета будут отдельным решением.", options: ["Творческие карточки", "Чистый каталог", "Доска вдохновения", "Уютный блокнот"] },
      tone: { label: "Как копилка поддерживает", hint: "Без давления и оценок личности.", options: ["Вдохновляюще", "Спокойно", "По-деловому"] },
      feature: { label: "Одна особенная функция", hint: "Она помогает выбрать или развить мысль.", options: ["Случайная идея дня", "Оценка по простоте и пользе", "Следующий маленький шаг", "Голосовая заготовка", "Коллекции"] },
    },
  },
  "child-schedule": {
    slug: "child-schedule",
    title: "Соберите безопасное семейное расписание",
    promise: "Выберите утренний сценарий и удобные обозначения без ФИО, адреса и других лишних данных ребёнка.",
    axes: {
      audience: { label: "Для какой семьи", hint: "Полные имена детей указывать не нужно.", options: ["Один ребёнок", "Двое детей", "Семья с несколькими секциями", "Семья с переменным расписанием"] },
      goal: { label: "Что важнее утром", hint: "Это будет видно сразу после открытия.", options: ["Ничего не забыть", "Увидеть пересечения", "Собрать нужные вещи", "Разделить расписания без имён"] },
      name: { label: "Как называется расписание", hint: "Используйте семейное, но обезличенное название.", options: ["Сегодня у нас", "Неделя без спешки", "Собрались и пошли", "Наши занятия"] },
      style: { label: "Как выглядит неделя", hint: "Выбираем расположение и форму; гамму зададим отдельно.", options: ["Лента недели", "Школьная доска", "Спокойные карточки", "Игровые секции"] },
      tone: { label: "Как звучат подсказки", hint: "Подсказки видит родитель, не ребёнок.", options: ["Заботливо", "Коротко по-семейному", "Игрово"] },
      feature: { label: "Одна особенная функция", hint: "Она должна упростить сборы или проверку недели.", options: ["Список «Что взять»", "Отметка «Собрано»", "Цветовые символы без имён", "Предупреждение о пересечении", "Утренний режим"] },
    },
  },
};

const axes: QuestCustomizationAxis[] = ["audience", "goal", "name", "style", "tone", "feature"];

export function isOriginalQuestSlug(slug: string): slug is OriginalQuestSlug {
  return originalQuestSlugs.includes(slug as OriginalQuestSlug);
}

export function getCustomizationProfile(slug: string): QuestCustomizationProfile | undefined {
  const baseSlug = slug.replace(/^mobile:/, "");
  return isOriginalQuestSlug(baseSlug) ? profiles[baseSlug] : undefined;
}

export function defaultCustomization(slug: string): QuestCustomization | undefined {
  const profile = getCustomizationProfile(slug);
  if (!profile) return undefined;
  return {
    ...Object.fromEntries(axes.map((axis) => [axis, profile.axes[axis].options[0]])),
    palette: { ...questColorPalettes[0] },
  } as QuestCustomization;
}

export function customizationSummary(slug: string, selection: QuestCustomization): string {
  const project = getCustomizationProfile(slug);
  if (!project) return "";
  return `Я создаю «${selection.name}». Для кого: ${selection.audience}. Главная задача: ${selection.goal}. Устройство экрана: ${selection.style}. Цветовая гамма: ${paletteDescription(selection.palette)}. Тон подсказок: ${selection.tone}. Особенная функция: ${selection.feature}.`;
}
