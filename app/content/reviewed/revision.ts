/** Explicit counts keep catalog/progress independent from content builders. */
export const CURRICULUM_REVISION = "curriculum-20260908";
export const reviewedLevelCounts: Record<string, number> = {
  "api-keys": 8,
  "family-expenses": 8, "idea-vault": 7, "child-schedule": 8,
  "pressure-diary": 7, "fitness-tracker": 7, "recipe-book": 8,
  "personal-organizer": 6, "home-helper": 7,
  "carousel-agent": 14, "threads-agent": 14, "webinar-moderator-agent": 13, "family-health-hub": 13,
  "unique-design": 7,
  "expert-site": 8, "psychologist-site": 8, "beauty-site": 8, "photographer-site": 8,
  "designer-site": 8, "consultation-site": 8, "course-site": 8, "event-site": 8,
  "small-shop-site": 8, "portfolio-site": 8,
  "expert-pro-site": 8, "school-pro-site": 8, "service-pro-site": 8, "catalog-pro-site": 8,
  "graduate-portfolio": 7,
  "idea-analysis-agent": 8, "expense-agent": 8, "meal-planning-agent": 8,
  "family-schedule-agent": 8, "habit-agent": 8, "home-organizer-agent": 8,
  "brief-agent": 8, "study-agent": 8, "content-agent": 8,
  "expert-assistant-agent": 8, "administrator-agent": 8, "consultant-agent": 8,
  "online-school-agent": 8, "event-organizer-agent": 8, "client-care-agent": 8,
  "fairy-team-agent": 8,
};

const aliases: Record<string,string> = {
  "planning:service":"planner", "planning:agent":"day-planner-agent",
  "ideas:service":"idea-vault", "ideas:agent":"idea-analysis-agent",
  "family-budget:service":"family-expenses", "family-budget:agent":"expense-agent",
  "recipes:service":"recipe-book", "recipes:agent":"meal-planning-agent",
  "family-schedule:service":"child-schedule", "family-schedule:agent":"family-schedule-agent",
  "habits:service":"fitness-tracker", "habits:agent":"habit-agent",
  "household:service":"home-helper", "household:agent":"home-organizer-agent",
};
export function concreteProgressSlug(slug:string):string {
  const route=slug.replace(/^mobile:/, "");
  return aliases[route] ?? route;
}
