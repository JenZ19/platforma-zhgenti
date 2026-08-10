import { makeAgentPreparationProfile } from "./agent-profile";
import type { PreparationProfileMap } from "./types";

const week2AgentSlugs = [
  "day-planner-agent",
  "idea-analysis-agent",
  "expense-agent",
  "meal-planning-agent",
  "family-schedule-agent",
  "habit-agent",
  "home-organizer-agent",
  "study-agent",
] as const;

export const week2Profiles: PreparationProfileMap = Object.fromEntries(
  week2AgentSlugs.map((slug) => [slug, makeAgentPreparationProfile(slug)]),
);
