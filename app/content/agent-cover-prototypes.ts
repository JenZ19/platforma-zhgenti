export type AgentCoverPrototypeSpec = {
  slug: string;
  theme: string;
  marker: string;
  eyebrow: string;
  headline: string;
  metric: string;
  status: string;
};

const agentCoverPrototypeSpecs = [
  { slug: "home-organizer-agent", theme: "clay-home", marker: "home-week-plan", eyebrow: "ДОМАШНИЙ ОРГАНИЗАТОР", headline: "Разложила быт по полочкам", metric: "20 минут", status: "на домашние дела в будни" },
  { slug: "meal-planning-agent", theme: "olive-menu", marker: "three-day-family-menu", eyebrow: "ПОМОЩНИК ПО ПИТАНИЮ", headline: "Меню без сложных рецептов", metric: "3 дня", status: "и готовый список покупок" },
  { slug: "study-agent", theme: "blue-study", marker: "learning-explanation-test", eyebrow: "ПОМОЩНИК ПО ОБУЧЕНИЮ", headline: "Объяснила как новичку", metric: "3 вопроса", status: "чтобы проверить понимание" },
  { slug: "idea-analysis-agent", theme: "plum-analysis", marker: "idea-clusters-score", eyebrow: "РАЗБОР ИДЕЙ", headline: "Превратила хаос в решение", metric: "3 идеи", status: "выбраны на эту неделю" },
  { slug: "personal-content-agent", theme: "rose-author", marker: "personal-story-content-plan", eyebrow: "ЛИЧНЫЙ КОНТЕНТ", headline: "Сохранила голос автора", metric: "5 публикаций", status: "из одной настоящей истории" },
  { slug: "content-agent", theme: "coral-content", marker: "expert-material-drafts", eyebrow: "КОНТЕНТ-АССИСТЕНТ", headline: "Материалы стали контентом", metric: "7 черновиков", status: "без выдуманных фактов" },
  { slug: "expert-assistant-agent", theme: "indigo-expert", marker: "expert-base-meeting-answer", eyebrow: "ПОМОЩНИК ЭКСПЕРТА", headline: "Нашла ответ в базе", metric: "1 источник", status: "прикреплён к каждому ответу" },
  { slug: "sales-manager-agent", theme: "emerald-sales", marker: "ethical-sales-route", eyebrow: "МЕНЕДЖЕР ПО ПРОДАЖАМ", headline: "Подобрала следующий шаг", metric: "4 вопроса", status: "без давления на клиента" },
  { slug: "administrator-agent", theme: "amber-admin", marker: "admin-rules-handoff", eyebrow: "ИИ-АДМИНИСТРАТОР", headline: "Ответила по правилам студии", metric: "1 минута", status: "до передачи человеку" },
  { slug: "consultant-agent", theme: "navy-consultant", marker: "knowledge-answer-escalation", eyebrow: "ИИ-КОНСУЛЬТАНТ", headline: "Дала ответ по памятке", metric: "2 источника", status: "и честно обозначила границы" },
] as const satisfies readonly AgentCoverPrototypeSpec[];

export const agentCoverPrototypeSlugs = agentCoverPrototypeSpecs.map((spec) => spec.slug);

const agentCoverPrototypeBySlug = new Map<string, AgentCoverPrototypeSpec>(
  agentCoverPrototypeSpecs.map((spec) => [spec.slug, spec]),
);

export function hasAgentCoverPrototype(slug: string): boolean {
  return agentCoverPrototypeBySlug.has(slug);
}

export function getAgentCoverPrototypeSpec(slug: string): AgentCoverPrototypeSpec {
  const spec = agentCoverPrototypeBySlug.get(slug);
  if (!spec) throw new Error(`Нет персональной обложки для агента: ${slug}`);
  return spec;
}
