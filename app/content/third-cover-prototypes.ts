export type ThirdCoverPrototypeSpec = {
  slug: string;
  theme: string;
  marker: string;
  eyebrow: string;
  headline: string;
  metric: string;
  status: string;
};

const thirdCoverPrototypeSpecs = [
  { slug: "online-school-agent", theme: "mint-school", marker: "course-route-lesson-help", eyebrow: "ПОМОЩНИК ОНЛАЙН-ШКОЛЫ", headline: "Показала, что делать дальше", metric: "3 шага", status: "до пятницы по программе курса" },
  { slug: "event-organizer-agent", theme: "orange-event", marker: "event-launch-control", eyebrow: "ИИ-ОРГАНИЗАТОР", headline: "Событие собрано без паники", metric: "24 часа", status: "до финальной проверки вебинара" },
  { slug: "client-care-agent", theme: "sage-client", marker: "client-dialog-next-step", eyebrow: "ЗАБОТА О КЛИЕНТАХ", headline: "Ни одно обещание не потерялось", metric: "3 пункта", status: "сохранены из переписки" },
  { slug: "fairy-team-agent", theme: "aurora-fairies", marker: "three-fairy-handoff", eyebrow: "КОМАНДА ИЗ ТРЁХ ИИ-ФЕЙ", headline: "Каждая фея делает свою часть", metric: "3 роли", status: "и одна финальная проверка" },
  { slug: "expert-site", theme: "wine-expert", marker: "expert-service-editorial", eyebrow: "САЙТ ЭКСПЕРТА", headline: "Услуга понятна с первого экрана", metric: "60 минут", status: "карьерная консультация" },
  { slug: "psychologist-site", theme: "lavender-psychology", marker: "psychology-safe-booking", eyebrow: "САЙТ ПСИХОЛОГА", headline: "Спокойно объясняет и ведёт к записи", metric: "50 минут", status: "бережная онлайн-встреча" },
  { slug: "beauty-site", theme: "onyx-beauty", marker: "beauty-gallery-booking", eyebrow: "САЙТ БЬЮТИ-МАСТЕРА", headline: "Работы говорят раньше текста", metric: "6 образов", status: "в портфолио с разрешением" },
  { slug: "photographer-site", theme: "sepia-photo", marker: "photographer-series-packages", eyebrow: "САЙТ ФОТОГРАФА", headline: "Истории показаны сериями", metric: "3 пакета", status: "и понятный запрос даты" },
  { slug: "designer-site", theme: "acid-designer", marker: "designer-case-study-brief", eyebrow: "САЙТ ДИЗАЙНЕРА", headline: "В каждом кейсе видна роль автора", metric: "4 этапа", status: "от задачи до результата" },
  { slug: "consultation-site", theme: "cobalt-consultation", marker: "consultation-result-booking", eyebrow: "САЙТ КОНСУЛЬТАЦИИ", headline: "Клиент знает, с чем уйдёт", metric: "1 встреча", status: "и готовый план следующих шагов" },
] as const satisfies readonly ThirdCoverPrototypeSpec[];

export const thirdCoverPrototypeSlugs = thirdCoverPrototypeSpecs.map((spec) => spec.slug);

const thirdCoverPrototypeBySlug = new Map<string, ThirdCoverPrototypeSpec>(
  thirdCoverPrototypeSpecs.map((spec) => [spec.slug, spec]),
);

export function hasThirdCoverPrototype(slug: string): boolean {
  return thirdCoverPrototypeBySlug.has(slug);
}

export function getThirdCoverPrototypeSpec(slug: string): ThirdCoverPrototypeSpec {
  const spec = thirdCoverPrototypeBySlug.get(slug);
  if (!spec) throw new Error(`Нет персональной обложки третьей десятки: ${slug}`);
  return spec;
}
