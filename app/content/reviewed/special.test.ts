import { describe, expect, it } from "vitest";
import { getQuestProject } from "../projects";
import { buildSpecialLessons } from "./special";

describe("source-based lessons", () => {
  it.each(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"])("requires the actual school template for %s", slug => {
    const s = buildSpecialLessons(getQuestProject(slug)!, "real")!;
    expect(s[0].prompt).toMatch(/нет.*шаблон.*остановись/is);
    expect(s[0].prompt).toMatch(/не.*создавай.*похож/is);
    expect(s.every(x => x.expected.length >= 2)).toBe(true);
    expect(s.at(-1)?.title).not.toMatch(/двух|два/);
    expect(s.every(x => !x.guide)).toBe(true);
  });
  it("works on an existing design, three references and an optional skill", () => {
    const s = buildSpecialLessons(getQuestProject("unique-design")!, "demo")!;
    expect(s[0].prompt).toContain("копию");
    expect(JSON.stringify(s)).toMatch(/тр[иё]х|три/);
    expect(JSON.stringify(s)).toContain("без установки");
  });
});
