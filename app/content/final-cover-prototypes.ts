export type FinalCoverPrototypeSpec = {
  slug: string;
  theme: string;
  marker: string;
  eyebrow: string;
  headline: string;
  metric: string;
  status: string;
};

const finalCoverPrototypeSpecs = [
  { slug: "course-site", theme: "apricot-course", marker: "course-modules-tariffs", eyebrow: "САЙТ ОНЛАЙН-КУРСА", headline: "Программа понятна до покупки", metric: "6 модулей", status: "и два прозрачных тарифа" },
  { slug: "event-site", theme: "violet-event-site", marker: "event-date-program-registration", eyebrow: "САЙТ МЕРОПРИЯТИЯ", headline: "Главное невозможно пропустить", metric: "28 августа", status: "19:00 по Москве · онлайн" },
  { slug: "small-shop-site", theme: "ceramic-shop", marker: "ceramic-collection-order", eyebrow: "САЙТ НЕБОЛЬШОГО МАГАЗИНА", headline: "Тёплая витрина ведёт к заказу", metric: "8 изделий", status: "из коллекции «Тёплый дом»" },
  { slug: "portfolio-site", theme: "electric-portfolio", marker: "ai-specialist-project-grid", eyebrow: "ЛИЧНОЕ ПОРТФОЛИО", headline: "Навыки доказаны готовыми работами", metric: "5 проектов", status: "честно отмечены как учебные" },
  { slug: "expert-pro-site", theme: "ruby-expert-pro", marker: "expert-lead-payment-gift", eyebrow: "САЙТ ЭКСПЕРТА · ПОЛНЫЙ МАРШРУТ", headline: "От заявки до подарка — один путь", metric: "5 шагов", status: "проверены на тестовых данных" },
  { slug: "school-pro-site", theme: "aqua-school-pro", marker: "school-tariffs-payment-material", eyebrow: "САЙТ ОНЛАЙН-ШКОЛЫ", headline: "Тарифы легко сравнить", metric: "3 тарифа", status: "с тестовой оплатой и материалом" },
  { slug: "service-pro-site", theme: "indigo-calculator", marker: "service-area-calculation-request", eyebrow: "САЙТ УСЛУГИ С КАЛЬКУЛЯТОРОМ", headline: "Расчёт сразу ведёт к заявке", metric: "27 000 ₽", status: "ориентир для площади 45 м²" },
  { slug: "catalog-pro-site", theme: "plum-catalog", marker: "catalog-filter-cart-order", eyebrow: "КАТАЛОГ С КОРЗИНОЙ-ЗАЯВКОЙ", headline: "Товар найден и добавлен в заказ", metric: "12 товаров", status: "с фильтрами и тестовой корзиной" },
  { slug: "graduate-portfolio", theme: "gold-graduate", marker: "graduate-portfolio-first-offer", eyebrow: "ФИНАЛЬНОЕ ПОРТФОЛИО", headline: "Новая профессия собрана в одну витрину", metric: "5 работ", status: "и готовая услуга «Сайт за 7 дней»" },
] as const satisfies readonly FinalCoverPrototypeSpec[];

export const finalCoverPrototypeSlugs = finalCoverPrototypeSpecs.map((spec) => spec.slug);

const finalCoverPrototypeBySlug = new Map<string, FinalCoverPrototypeSpec>(
  finalCoverPrototypeSpecs.map((spec) => [spec.slug, spec]),
);

export function hasFinalCoverPrototype(slug: string): boolean {
  return finalCoverPrototypeBySlug.has(slug);
}

export function getFinalCoverPrototypeSpec(slug: string): FinalCoverPrototypeSpec {
  const spec = finalCoverPrototypeBySlug.get(slug);
  if (!spec) throw new Error(`Нет персональной обложки финальной части: ${slug}`);
  return spec;
}
