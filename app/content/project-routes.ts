import { getProject, isProjectBundle } from "./projects";
import type { ProjectFormat } from "./types";

export type ResolvedProjectRoute = {
  slug: string;
  output?: ProjectFormat;
  legacy: boolean;
};

const aliases = new Map<string, Omit<ResolvedProjectRoute, "legacy">>([
  ["planner", { slug: "planning", output: "service" }],
  ["planner-bot", { slug: "planning", output: "agent" }],
  ["day-planner-agent", { slug: "planning", output: "agent" }],
  ["idea-vault", { slug: "ideas", output: "service" }],
  ["idea-bot", { slug: "ideas", output: "agent" }],
  ["idea-analysis-agent", { slug: "ideas", output: "agent" }],
  ["family-expenses", { slug: "family-budget", output: "service" }],
  ["expense-bot", { slug: "family-budget", output: "agent" }],
  ["recipe-book", { slug: "recipes", output: "service" }],
  ["recipe-bot", { slug: "recipes", output: "agent" }],
  ["meal-planning-agent", { slug: "recipes", output: "agent" }],
  ["child-schedule", { slug: "family-schedule", output: "service" }],
  ["family-reminder-bot", { slug: "family-schedule", output: "agent" }],
  ["fitness-tracker", { slug: "habits", output: "service" }],
  ["habit-bot", { slug: "habits", output: "agent" }],
  ["home-helper", { slug: "household", output: "service" }],
  ["home-organizer-agent", { slug: "household", output: "agent" }],
  ["consultant-bot", { slug: "consultant-agent", output: undefined }],
  ["personal-content-agent", { slug: "content-agent", output: undefined }],
  ["material-delivery-bot", { slug: "online-school-agent", output: undefined }],
  ["faq-bot", { slug: "online-school-agent", output: undefined }],
  ["lead-agent", { slug: "client-care-agent", output: undefined }],
  ["selector-agent", { slug: "client-care-agent", output: undefined }],
  ["booking-agent", { slug: "client-care-agent", output: undefined }],
  ["sales-manager-agent", { slug: "client-care-agent", output: undefined }],
  ["lead-bot", { slug: "client-care-agent", output: undefined }],
  ["booking-bot", { slug: "client-care-agent", output: undefined }],
  ["questionnaire-bot", { slug: "brief-agent", output: undefined }],
  ["quiz-bot", { slug: "client-care-agent", output: undefined }],
]);

export function resolvePublicProjectRoute(
  slug: string,
  output?: string,
): ResolvedProjectRoute | undefined {
  const direct = getProject(slug);
  if (direct) {
    const safeOutput =
      isProjectBundle(direct) && (output === "service" || output === "agent")
        ? output
        : undefined;
    return { slug, output: safeOutput, legacy: false };
  }

  const alias = aliases.get(slug);
  return alias ? { ...alias, legacy: true } : undefined;
}

export function canonicalQuestQuery(route: ResolvedProjectRoute, mobile: boolean): string {
  const query = new URLSearchParams();
  if (mobile) query.set("format", "mobile");
  query.set("quest", route.slug);
  if (route.output) query.set("output", route.output);
  return `?${query.toString()}`;
}
