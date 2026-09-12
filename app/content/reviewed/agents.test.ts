import { describe, expect, it } from "vitest";
import { getQuestProject, questProjects } from "../projects";
import { getAgentContract } from "../agent-contracts";
import { buildAgentLessons } from "./agents";

const excluded = new Set(["day-planner-agent", "carousel-agent", "threads-agent", "webinar-moderator-agent"]);
const slugs = questProjects.filter((project) => project.kind === "agent" && !excluded.has(project.slug)).map((project) => project.slug);

describe("reviewed agent lessons", () => {
  it("covers every assigned agent and no excluded route", () => {
    expect(slugs).toHaveLength(16);
    for (const slug of slugs) expect(buildAgentLessons(getQuestProject(slug)!, "demo")).toBeDefined();
    for (const slug of excluded) expect(buildAgentLessons(getQuestProject(slug)!, "demo")).toBeUndefined();
    expect(buildAgentLessons(getQuestProject("planner")!, "demo")).toBeUndefined();
  });

  it.each(slugs)("%s is compact, ordered and separates build from manual checks", (slug) => {
    const lessons = buildAgentLessons(getQuestProject(slug)!, "demo")!;
    expect(lessons.length).toBeGreaterThanOrEqual(8);
    expect(lessons.length).toBeLessThanOrEqual(11);
    expect(lessons.map((lesson) => lesson.legacyMilestone)).toEqual(
      [...lessons.map((lesson) => lesson.legacyMilestone)].sort((a, b) => a - b),
    );
    expect(lessons[0].prompt).toMatch(/тестов|учебн/i);
    expect(lessons[0].prompt).toMatch(/не[\s\S]*Telegram/i);
    expect(lessons[1].prompt).toMatch(/Telegram/);
    expect(lessons[1].prompt).toMatch(/куратор/i);
    expect(lessons[1].prompt).toMatch(/ключ|секрет/i);
    expect(lessons[2].customization).toBe("agent");
    expect(lessons.filter((lesson) => !lesson.prompt).length).toBeGreaterThanOrEqual(2);
    expect(lessons.at(-1)?.title).toMatch(/портфолио/i);
    expect(lessons.at(-1)?.prompt).toMatch(/памятк/i);
    expect(lessons.at(-1)?.prompt).not.toMatch(/клиентск.*коп/i);
  });

  it.each(slugs)("%s provides facts, an explicit clarification answer and boundary checks", (slug) => {
    const text = buildAgentLessons(getQuestProject(slug)!, "demo")!.map((lesson) => lesson.prompt ?? lesson.action).join("\n");
    expect(text).toMatch(/ответ на уточнение/i);
    expect(text).toMatch(/измен/i);
    expect(text).toMatch(/неизвест/i);
    expect(text).toMatch(/подтвержд/i);
    expect(text).not.toMatch(/голосов(ое|ого) сообщен|распозна(й|вание).*аудио/i);
    expect(text).not.toMatch(/подключи.*календар/i);
  });

  it.each(slugs)("%s pairs its own exact question with a relevant answer", (slug) => {
    const first = buildAgentLessons(getQuestProject(slug)!, "demo")![0].prompt!;
    expect(first, slug).toMatch(/задай ровно одно уточнение/);
    expect(first, slug).toMatch(/Пара «[\s\S]+» → «[\s\S]+» согласована для этого учебного сценария/);
  });

  it("fixes the menu and family-schedule question-answer mismatches", () => {
    const meal = buildAgentLessons(getQuestProject("meal-planning-agent")!, "demo")![0].prompt!;
    expect(meal).toContain("Ребёнок ест яйца и курицу?");
    expect(meal).toContain("Ответ на уточнение: ребёнок ест яйца и курицу.");
    const family = buildAgentLessons(getQuestProject("family-schedule-agent")!, "demo")![0].prompt!;
    expect(family).toContain("Обоих детей сопровождает один взрослый?");
    expect(family).toContain("Ответ на уточнение: обоих детей сопровождает один взрослый.");
  });

  it.each(slugs)("%s configures safety before connection and cannot authorize a demo action", (slug) => {
    const project = getQuestProject(slug)!;
    const first = buildAgentLessons(project, "demo")![0].prompt!;
    expect(first).toContain(project.safety);
    expect(first).toContain(getAgentContract(slug).handoff);
    expect(first).toContain("покажи точный черновик");
    expect(first).toMatch(/только симуляц|только черновик/i);
    expect(first).toMatch(/даже если[\s\S]*команд/i);
    expect(first).toMatch(/не считается[\s\S]*разрешен/i);
  });

  it.each(slugs)("%s uses two-stage confirmation for real external actions", (slug) => {
    const first = buildAgentLessons(getQuestProject(slug)!, "real")![0].prompt!;
    expect(first).toMatch(/этап 1[\s\S]*черновик/i);
    expect(first).toMatch(/этап 2[\s\S]*подтвержд/i);
    expect(first).toMatch(/точн[\s\S]*действи[\s\S]*получател/i);
  });

  it("keeps real data real and supplies concrete demo knowledge", () => {
    for (const slug of slugs) {
      const project = getQuestProject(slug)!;
      const demo = buildAgentLessons(project, "demo")!.map((lesson) => lesson.prompt ?? "").join("\n");
      const real = buildAgentLessons(project, "real")!.map((lesson) => lesson.prompt ?? "").join("\n");
      expect(demo).toMatch(/УЧЕБНЫЙ НАБОР/);
      expect(real).toMatch(/не заменяй[\s\S]*учебн/i);
      expect(real).toMatch(/личн[\s\S]*не публикуй/i);
    }
  });

  it("gives every subject its own concrete scenario", () => {
    const markers: Record<string, RegExp> = {
      "idea-analysis-agent": /мини-курс|сторис/i,
      "expense-agent": /1 240|такси/i,
      "meal-planning-agent": /гречк|орех/i,
      "family-schedule-agent": /плавание|музык/i,
      "habit-agent": /прогулк|20 минут/i,
      "home-organizer-agent": /вода|детск/i,
      "brief-agent": /бьюти|маникюр/i,
      "study-agent": /воронк|интерес[\s\S]*покупк/i,
      "content-agent": /Анна|мастерск/i,
      "expert-assistant-agent": /встреч|диагност/i,
      "administrator-agent": /10:00|14:30/,
      "consultant-agent": /4 900|9 900/,
      "online-school-agent": /урок 2|шаблон/i,
      "event-organizer-agent": /2026|Europe\/Moscow/,
      "client-care-agent": /роль[\s\S]*подбирает услугу/i,
      "fairy-team-agent": /Исследователь|Редактор/,
    };
    for (const [slug, marker] of Object.entries(markers)) {
      const text = buildAgentLessons(getQuestProject(slug)!, "demo")!.map((lesson) => lesson.prompt ?? lesson.action).join("\n");
      expect(text, slug).toMatch(marker);
    }
  });

  it("requires three distinct roles, one final and a real conflict check for the fairy team", () => {
    const text = buildAgentLessons(getQuestProject("fairy-team-agent")!, "demo")!.map((lesson) => lesson.prompt ?? lesson.action).join("\n");
    expect(text).toMatch(/Исследователь/);
    expect(text).toMatch(/Автор/);
    expect(text).toMatch(/Редактор/);
    expect(text).toMatch(/один (единый )?финал/i);
    expect(text).toMatch(/конфликт/i);
    expect(text).toMatch(/расход/i);
  });
});
