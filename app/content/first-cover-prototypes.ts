export type FirstCoverPrototypeSpec = {
  slug: string;
  theme: string;
  marker: string;
  eyebrow: string;
  headline: string;
  metric: string;
  status: string;
};

const firstCoverPrototypeSpecs = [
  { slug: "family-expenses", theme: "teal-budget", marker: "family-budget-dashboard", eyebrow: "СЕМЕЙНЫЙ БЮДЖЕТ", headline: "Весь месяц — как на ладони", metric: "95 260 ₽", status: "осталось из 100 000 ₽" },
  { slug: "planner", theme: "rose-planner", marker: "weekly-planner-board", eyebrow: "СПОКОЙНЫЙ ПЛАН", headline: "Сегодня всё поместится", metric: "3 дела", status: "без перегруженного дня" },
  { slug: "idea-vault", theme: "violet-vault", marker: "visual-idea-vault", eyebrow: "КОПИЛКА ИДЕЙ", headline: "Ни одна идея не потеряется", metric: "12 идей", status: "по темам и статусам" },
  { slug: "child-schedule", theme: "sky-schedule", marker: "child-week-timetable", eyebrow: "РАСПИСАНИЕ РЕБЁНКА", headline: "Вся неделя перед глазами", metric: "2 занятия", status: "с адресами и подсказками" },
  { slug: "pressure-diary", theme: "berry-diary", marker: "pressure-history-log", eyebrow: "ДНЕВНИК ИЗМЕРЕНИЙ", headline: "Записи аккуратно сохранены", metric: "120 / 80", status: "последняя запись · 09:00" },
  { slug: "fitness-tracker", theme: "lime-fitness", marker: "wellness-week-tracker", eyebrow: "МОЯ АКТИВНОСТЬ", headline: "Маленькие шаги тоже считаются", metric: "35 минут", status: "прогулка сегодня" },
  { slug: "recipe-book", theme: "tomato-recipes", marker: "recipe-gallery-shopping", eyebrow: "МОИ РЕЦЕПТЫ", headline: "Ужин найден за минуту", metric: "25 минут", status: "сырники уже в избранном" },
  { slug: "personal-organizer", theme: "indigo-organizer", marker: "personal-command-center", eyebrow: "ЛИЧНЫЙ ОРГАНАЙЗЕР", headline: "Важное всегда под рукой", metric: "5 разделов", status: "дела, события, ссылки и заметки" },
  { slug: "home-helper", theme: "terracotta-home", marker: "home-chores-board", eyebrow: "ДОМАШНИЕ ДЕЛА", headline: "Дом не держится в голове", metric: "3 задачи", status: "распределены между близкими" },
  { slug: "day-planner-agent", theme: "midnight-agent", marker: "ai-day-plan-timeline", eyebrow: "ИИ-ПЛАНИРОВЩИК", headline: "Собрала реалистичный день", metric: "30 минут", status: "оставлено про запас" },
] as const satisfies readonly FirstCoverPrototypeSpec[];

export const firstCoverPrototypeSlugs = firstCoverPrototypeSpecs.map((spec) => spec.slug);

const firstCoverPrototypeBySlug = new Map<string, FirstCoverPrototypeSpec>(
  firstCoverPrototypeSpecs.map((spec) => [spec.slug, spec]),
);

export function hasFirstCoverPrototype(slug: string): boolean {
  return firstCoverPrototypeBySlug.has(slug);
}

export function getFirstCoverPrototypeSpec(slug: string): FirstCoverPrototypeSpec {
  const spec = firstCoverPrototypeBySlug.get(slug);
  if (!spec) throw new Error(`Нет персональной обложки для проекта: ${slug}`);
  return spec;
}
