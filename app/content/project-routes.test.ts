import { describe, expect, it } from "vitest";
import { canonicalQuestQuery, resolvePublicProjectRoute } from "./project-routes";

describe("public project routes", () => {
  it("maps every old project address to its new card and format", () => {
    const cases = [
      ["planner", "planning", "service"],
      ["planner-bot", "planning", "agent"],
      ["day-planner-agent", "planning", "agent"],
      ["idea-vault", "ideas", "service"],
      ["idea-bot", "ideas", "agent"],
      ["idea-analysis-agent", "ideas", "agent"],
      ["family-expenses", "family-budget", "service"],
      ["expense-bot", "family-budget", "agent"],
      ["recipe-book", "recipes", "service"],
      ["recipe-bot", "recipes", "agent"],
      ["meal-planning-agent", "recipes", "agent"],
      ["child-schedule", "family-schedule", "service"],
      ["family-reminder-bot", "family-schedule", "agent"],
      ["fitness-tracker", "habits", "service"],
      ["habit-bot", "habits", "agent"],
      ["home-helper", "household", "service"],
      ["home-organizer-agent", "household", "agent"],
      ["consultant-bot", "consultant-agent", undefined],
      ["personal-content-agent", "content-agent", undefined],
      ["material-delivery-bot", "online-school-agent", undefined],
      ["faq-bot", "online-school-agent", undefined],
      ["lead-bot", "lead-agent", undefined],
      ["booking-bot", "booking-agent", undefined],
      ["questionnaire-bot", "brief-agent", undefined],
      ["quiz-bot", "selector-agent", undefined],
    ] as const;

    for (const [oldSlug, slug, output] of cases) {
      expect(resolvePublicProjectRoute(oldSlug)).toMatchObject({ slug, output });
    }
  });

  it("keeps standalone canonical agent addresses and rejects unknown projects", () => {
    expect(resolvePublicProjectRoute("consultant-agent")).toEqual({
      slug: "consultant-agent",
      output: undefined,
      legacy: false,
    });
    expect(resolvePublicProjectRoute("content-agent")).toEqual({
      slug: "content-agent",
      output: undefined,
      legacy: false,
    });
    expect(resolvePublicProjectRoute("online-school-agent")).toEqual({
      slug: "online-school-agent",
      output: undefined,
      legacy: false,
    });
    expect(resolvePublicProjectRoute("missing-project")).toBeUndefined();
  });

  it("builds canonical desktop and mobile queries and ignores broken output", () => {
    expect(canonicalQuestQuery({ slug: "planning", output: "agent", legacy: true }, false)).toBe(
      "?quest=planning&output=agent",
    );
    expect(canonicalQuestQuery({ slug: "recipes", output: "service", legacy: true }, true)).toBe(
      "?format=mobile&quest=recipes&output=service",
    );
    expect(resolvePublicProjectRoute("planning", "broken")).toEqual({
      slug: "planning",
      output: undefined,
      legacy: false,
    });
  });
});
