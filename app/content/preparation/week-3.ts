import { makeAgentPreparationProfile } from "./agent-profile";
import type { PreparationProfileMap } from "./types";

const week3AgentSlugs = [
  "brief-agent",
  "content-agent",
  "expert-assistant-agent",
  "administrator-agent",
  "consultant-agent",
  "online-school-agent",
  "event-organizer-agent",
  "client-care-agent",
  "fairy-team-agent",
  "carousel-agent",
  "threads-agent",
  "webinar-moderator-agent",
] as const;

export const week3Profiles: PreparationProfileMap = Object.fromEntries(
  week3AgentSlugs.map((slug) => [slug, makeAgentPreparationProfile(slug)]),
);
