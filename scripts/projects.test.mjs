import assert from "node:assert/strict";
import test from "node:test";
import { projectSlugs, projectStepCount } from "./projects.mjs";

const expected = [
  "install-codex", "server-152fz", "api-keys",
  "family-expenses", "planner", "idea-vault", "child-schedule", "pressure-diary", "fitness-tracker", "recipe-book", "personal-organizer", "home-helper", "family-health-hub",
  "day-planner-agent", "home-organizer-agent", "meal-planning-agent", "study-agent", "idea-analysis-agent", "expense-agent", "family-schedule-agent", "habit-agent",
  "brief-agent", "content-agent", "expert-assistant-agent", "administrator-agent", "consultant-agent", "online-school-agent", "event-organizer-agent", "client-care-agent", "fairy-team-agent", "carousel-agent", "threads-agent", "webinar-moderator-agent",
  "unique-design", "expert-site", "psychologist-site", "beauty-site", "photographer-site", "designer-site", "consultation-site", "course-site", "event-site", "small-shop-site", "portfolio-site",
  "expert-pro-site", "school-pro-site", "service-pro-site", "catalog-pro-site", "graduate-portfolio",
];

test("capture manifest contains all 49 concrete quest paths and no legacy duplicates", () => {
  const actual = projectSlugs();
  assert.equal(actual.length, 49);
  assert.deepEqual(actual, expected);
  for (const removed of [
    "planner-bot", "idea-bot", "expense-bot", "recipe-bot", "habit-bot", "family-reminder-bot",
    "lead-agent", "selector-agent", "booking-agent", "sales-manager-agent", "lead-bot", "booking-bot", "questionnaire-bot", "quiz-bot", "personal-content-agent", "material-delivery-bot", "faq-bot", "consultant-bot",
  ]) assert.equal(actual.includes(removed), false, removed);
});

test("capture counts follow each full project path instead of one shared number", () => {
  assert.equal(projectStepCount("server-152fz"), 9);
  assert.equal(projectStepCount("api-keys"), 14);
  assert.equal(projectStepCount("install-codex"), 6);
  assert.equal(projectStepCount("pressure-diary"), 19);
  assert.equal(projectStepCount("client-care-agent"), 20);
  assert.equal(projectStepCount("catalog-pro-site"), 22);
  assert.ok(new Set(projectSlugs().map(projectStepCount)).size >= 8);
});
