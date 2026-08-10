import { makeAgentPreparationProfile } from "./agent-profile";
import type { PreparationProfileMap } from "./types";

const week3AgentSlugs = [
  "lead-agent",
  "booking-agent",
  "brief-agent",
  "selector-agent",
  "content-agent",
  "expert-assistant-agent",
  "sales-manager-agent",
  "administrator-agent",
  "consultant-agent",
  "online-school-agent",
  "event-organizer-agent",
  "client-care-agent",
  "fairy-team-agent",
] as const;

export const week3Profiles: PreparationProfileMap = Object.fromEntries(
  week3AgentSlugs.map((slug) => [slug, makeAgentPreparationProfile(slug)]),
);
