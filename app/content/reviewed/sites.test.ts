import { describe, expect, it } from "vitest";
import { questProjects, getQuestProject } from "../projects";
import { buildSiteLessons } from "./sites";

describe("reviewed website journeys", () => {
  it.each(questProjects.filter(p => p.slug !== "unique-design" && ["simple-site", "advanced-site", "portfolio"].includes(p.kind)).map(p => p.slug))("has a scoped, testable journey for %s", slug => {
    const lessons = buildSiteLessons(getQuestProject(slug)!, "demo")!;
    expect(lessons.length).toBeGreaterThanOrEqual(6);
    expect(lessons.length).toBeLessThan(13);
    expect(lessons.every(s => s.why && s.action && s.expected.length >= 2)).toBe(true);
    expect(lessons.some(s => !s.prompt)).toBe(true);
    expect(lessons.map(s => s.expected.join(" ")).join(" ")).not.toMatch(/обе версии|две версии/);
  });
  it("does not turn a beauty landing into a booking system", () => {
    const text = JSON.stringify(buildSiteLessons(getQuestProject("beauty-site")!, "real"));
    expect(text).toContain("длительность");
    expect(text).not.toMatch(/забронируйте|проверьте свободный слот/i);
  });
  it("improves an existing site and gives a reproducible calculator test", () => {
    const lessons = buildSiteLessons(getQuestProject("service-pro-site")!, "demo")!;
    expect(lessons[0].prompt).toMatch(/копию.*существующего/is);
    expect(JSON.stringify(lessons)).toContain("27 000");
    expect(JSON.stringify(lessons)).not.toMatch(/перенесите запись|отмените запись/);
  });
  it("keeps invented examples out of an actual portfolio", () => {
    const text = JSON.stringify(buildSiteLessons(getQuestProject("graduate-portfolio")!, "demo"));
    expect(text).toContain("три");
    expect(text).toMatch(/существующ|готовые работы/);
    expect(text).toContain("не отправляй");
  });
});
