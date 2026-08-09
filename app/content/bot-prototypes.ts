export type BotPrototypeSpec = {
  slug: string;
  theme: string;
  marker: string;
  eyebrow: string;
  headline: string;
  metric: string;
  status: string;
};

const botPrototypeSpecs = [
  { slug: "planner-bot", theme: "sage-planner", marker: "daily-plan", eyebrow: "ПЛАН НА СЕГОДНЯ", headline: "Главное — закончить презентацию", metric: "3 из 4", status: "дела выполнено" },
  { slug: "idea-bot", theme: "lilac-ideas", marker: "idea-cards", eyebrow: "КОПИЛКА ИДЕЙ", headline: "12 идей ждут своего часа", metric: "12", status: "идей сохранено" },
  { slug: "expense-bot", theme: "coral-expenses", marker: "expense-total", eyebrow: "РАСХОДЫ · АВГУСТ", headline: "Сегодня всё записано", metric: "5 360 ₽", status: "за месяц" },
  { slug: "recipe-bot", theme: "apricot-recipe", marker: "recipe-card", eyebrow: "УЖИН ДО 30 МИНУТ", headline: "Паста с овощами", metric: "25 мин", status: "время приготовления" },
  { slug: "habit-bot", theme: "mint-habits", marker: "habit-week", eyebrow: "МЯГКИЙ ТРЕКЕР", headline: "Прогулка 20 минут", metric: "4 дня", status: "серия без давления" },
  { slug: "family-reminder-bot", theme: "sky-family", marker: "family-timeline", eyebrow: "СЕМЕЙНЫЙ ДЕНЬ", headline: "Ближайшие напоминания", metric: "3 дела", status: "сегодня для семьи" },
  { slug: "lead-bot", theme: "rose-leads", marker: "lead-funnel", eyebrow: "НОВАЯ ЗАЯВКА", headline: "Анна выбрала консультацию", metric: "3/3", status: "вопроса заполнено" },
  { slug: "booking-bot", theme: "lavender-booking", marker: "booking-calendar", eyebrow: "ОНЛАЙН-ЗАПИСЬ", headline: "Консультация 60 минут", metric: "14:00", status: "15 августа · свободно" },
  { slug: "questionnaire-bot", theme: "paper-questionnaire", marker: "brief-progress", eyebrow: "КОРОТКИЙ БРИФ", headline: "Расскажите о задаче", metric: "4 из 6", status: "ответа готовы" },
  { slug: "quiz-bot", theme: "violet-quiz", marker: "quiz-result", eyebrow: "КВИЗ · ВОПРОС 3", headline: "Какой формат вам ближе?", metric: "75%", status: "к результату" },
  { slug: "material-delivery-bot", theme: "green-library", marker: "material-library", eyebrow: "ВАШИ МАТЕРИАЛЫ", headline: "Полезная библиотека", metric: "3 файла", status: "готовы к скачиванию" },
  { slug: "faq-bot", theme: "navy-faq", marker: "faq-answer", eyebrow: "ЦЕНТР ПОМОЩИ", headline: "Как проходит оплата?", metric: "8 тем", status: "с быстрыми ответами" },
  { slug: "consultant-bot", theme: "wine-consultant", marker: "service-route", eyebrow: "ПОДБОР УСЛУГИ", headline: "Вам подойдёт вводная консультация", metric: "1 шаг", status: "до связи с экспертом" },
] as const satisfies readonly BotPrototypeSpec[];

export const botPrototypeSlugs = botPrototypeSpecs.map((spec) => spec.slug);

const botPrototypeBySlug = new Map<string, BotPrototypeSpec>(
  botPrototypeSpecs.map((spec) => [spec.slug, spec]),
);

export function getBotPrototypeSpec(slug: string): BotPrototypeSpec {
  const spec = botPrototypeBySlug.get(slug);
  if (!spec) throw new Error(`Нет персонального прототипа для бота: ${slug}`);
  return spec;
}
