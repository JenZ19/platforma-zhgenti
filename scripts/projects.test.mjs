import assert from "node:assert/strict";
import test from "node:test";
import { projectSlugs } from "./projects.mjs";

const expected = [
  "family-expenses", "planner", "idea-vault", "child-schedule", "pressure-diary", "fitness-tracker", "recipe-book", "personal-organizer", "home-helper", "family-health-hub",
  "day-planner-agent", "home-organizer-agent", "meal-planning-agent", "study-agent", "idea-analysis-agent", "expense-agent", "family-schedule-agent", "habit-agent",
  "lead-agent", "booking-agent", "brief-agent", "selector-agent", "content-agent", "expert-assistant-agent", "sales-manager-agent", "administrator-agent", "consultant-agent", "online-school-agent", "event-organizer-agent", "client-care-agent", "fairy-team-agent", "carousel-agent", "threads-agent", "webinar-moderator-agent",
  "expert-site", "psychologist-site", "beauty-site", "photographer-site", "designer-site", "consultation-site", "course-site", "event-site", "small-shop-site", "portfolio-site",
  "expert-pro-site", "school-pro-site", "service-pro-site", "catalog-pro-site", "graduate-portfolio",
];

test("capture manifest contains all 49 concrete quest paths and no legacy duplicates", () => {
  const actual = projectSlugs();
  assert.equal(actual.length, 49);
  assert.deepEqual(actual, expected);
  for (const removed of [
    "planner-bot", "idea-bot", "expense-bot", "recipe-bot", "habit-bot", "family-reminder-bot",
    "lead-bot", "booking-bot", "questionnaire-bot", "quiz-bot", "personal-content-agent", "material-delivery-bot", "faq-bot", "consultant-bot",
  ]) assert.equal(actual.includes(removed), false, removed);
});
