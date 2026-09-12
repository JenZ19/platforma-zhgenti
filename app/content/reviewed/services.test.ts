import { describe, expect, it } from "vitest";
import { questProjects } from "../projects";
import { buildServiceLessons } from "./services";

const serviceSlugs = [
  "family-expenses", "idea-vault", "child-schedule", "pressure-diary",
  "fitness-tracker", "recipe-book", "personal-organizer", "home-helper",
] as const;

function lessons(slug: (typeof serviceSlugs)[number], mode: "demo" | "real" = "demo") {
  const project = questProjects.find((item) => item.slug === slug)!;
  return buildServiceLessons(project, mode)!;
}

describe("buildServiceLessons", () => {
  it("owns only the eight reviewed household services", () => {
    expect(serviceSlugs.map((slug) => [slug, lessons(slug).length])).toEqual([
      ["family-expenses", 8], ["idea-vault", 7], ["child-schedule", 8],
      ["pressure-diary", 7], ["fitness-tracker", 7], ["recipe-book", 8],
      ["personal-organizer", 6], ["home-helper", 7],
    ]);
    expect(buildServiceLessons(questProjects.find((item) => item.slug === "planner")!, "demo")).toBeUndefined();
    expect(buildServiceLessons(questProjects.find((item) => item.slug === "family-health-hub")!, "demo")).toBeUndefined();
  });

  it.each(serviceSlugs)("starts %s with a working local service and customizes it only after the first test", (slug) => {
    const route = lessons(slug);
    expect(route[0].prompt).toMatch(/создай|собери/i);
    expect(route[0].prompt).toMatch(/локальн|браузер|предпросмотр/i);
    expect(route[0].expected.join(" ")).toMatch(/откры|страниц|экран/i);
    expect(route[1].customization).not.toBe("service");
    expect(route[2].customization).toBe("service");
    expect(route.at(-1)?.title).toMatch(/портфолио/i);
    expect(route.map((step) => step.legacyMilestone)).toEqual([...route.map((step) => step.legacyMilestone)].sort((a, b) => a - b));
  });

  it("checks exact budget arithmetic and keeps real expenses out of AI chat", () => {
    const demo = lessons("family-expenses");
    expect(JSON.stringify(demo)).toContain("200 + 300 = 500");
    expect(JSON.stringify(demo)).toContain("550");
    const real = JSON.stringify(lessons("family-expenses", "real"));
    expect(real).toMatch(/форму/i);
    expect(real).toMatch(/не (вставляйте|отправляйте|пересылайте).+(чат|Codex)/i);
    expect(real).toMatch(/банк|банковск/i);
  });

  it("gives every service a concrete domain scenario and correction check", () => {
    expect(JSON.stringify(lessons("idea-vault"))).toMatch(/утренн.+подар.+маршрут/is);
    expect(JSON.stringify(lessons("idea-vault"))).toMatch(/поиск.+утрен/is);
    expect(JSON.stringify(lessons("child-schedule"))).toMatch(/перенос.+одно посещение|одно перенесённое занятие/is);
    expect(JSON.stringify(lessons("pressure-diary"))).toMatch(/120.+80.+72/is);
    expect(JSON.stringify(lessons("pressure-diary"))).toMatch(/исправ.+врем/is);
    expect(JSON.stringify(lessons("fitness-tracker"))).toMatch(/ошибоч.+отметк|отмен.+отметк/is);
    expect(JSON.stringify(lessons("recipe-book"))).toMatch(/сырник.+порц.+25 минут/is);
    expect(JSON.stringify(lessons("recipe-book"))).toMatch(/найд.+сырник|поиск.+сырник/is);
    expect(JSON.stringify(lessons("personal-organizer"))).toMatch(/необязательно.+два/is);
    expect(JSON.stringify(lessons("home-helper"))).toMatch(/купить молоко.+постельн.+ежеднев/is);
  });

  it.each(serviceSlugs)("checks persistence, invalid input and a backup for %s", (slug) => {
    const route = lessons(slug);
    const text = JSON.stringify(route);
    expect(text).toMatch(/обнов.+страниц|после обновления/is);
    expect(text).toMatch(/ошиб|пуст|неверн|некоррект/is);
    expect(text).toMatch(/копи|выгруз|экспорт/is);
    expect(route[0].prompt).toMatch(/копи|выгруз/i);
  });

  it("keeps the real pressure diary empty while providing a separate test fixture", () => {
    const first = lessons("pressure-diary", "real")[0];
    expect(first.prompt).toMatch(/личный дневник.+пуст/is);
    expect(first.prompt).toMatch(/отдельн.+учебн.+120\/80/is);
    expect(lessons("pressure-diary", "real")[1].action).toContain("Учебная проверка");
  });

  it("builds the budget arithmetic from the existing 200 + 300 fixture without double entry", () => {
    const route = lessons("family-expenses");
    expect(route[0].prompt).toContain("200 ₽ и 300 ₽");
    expect(route[1].action).toMatch(/добавьте только 100 ₽/i);
    expect(route[1].action).not.toMatch(/добавьте 100 ₽, 200 ₽ и 300 ₽/i);
    expect(route[0].prompt).toMatch(/фильтр.+месяц.+категор/i);
  });

  it("uses a search stem that finds the seeded morning idea and creates the next-step field up front", () => {
    const route = lessons("idea-vault");
    expect(route[0].prompt).toMatch(/следующ.+маленьк.+шаг/i);
    expect(route[1].action).toContain("«утрен»");
  });

  it("creates organizer ordering and requires two verified existing links in both modes", () => {
    for (const mode of ["demo", "real"] as const) {
      const route = lessons("personal-organizer", mode);
      expect(route[0].prompt).toMatch(/две.+проверенн.+ссылк/i);
      expect(route[0].prompt).toMatch(/если.+ссылок нет.+верн/is);
      expect(route[0].prompt).toMatch(/менять порядок|смен.+поряд/i);
      expect(route[0].prompt).not.toMatch(/учебные карточки «Планер» и «Копилка идей»/i);
    }
  });

  it("creates the home-helper date switch before testing recurrence", () => {
    expect(lessons("home-helper")[0].prompt).toMatch(/учебн.+дат/i);
  });

  it("opens the separate fitness test mode before changing seeded marks in real mode", () => {
    const route = lessons("fitness-tracker", "real");
    expect(route[1].action).toMatch(/откройте.+учебн.+режим/i);
  });

  it("keeps later budget and idea fixtures out of the personal real-data views", () => {
    const budget = lessons("family-expenses", "real");
    expect(budget[3].action).toMatch(/откройте.+учебн.+режим/i);
    expect(budget[3].action).toMatch(/вернитесь.+личн/i);
    const ideas = lessons("idea-vault", "real");
    expect(ideas[1].action).toMatch(/откройте.+учебн.+режим/i);
    expect(ideas[1].action).toMatch(/вернитесь.+личн/i);
  });

  it("does not promise publishing private records or forbidden integrations", () => {
    for (const slug of serviceSlugs) {
      const text = JSON.stringify(lessons(slug));
      expect(text).toMatch(/не публи|не опублик|нет публич|без личн|обезлич/i);
      expect(text).not.toMatch(/(?:^|[.!?]\s)(?:подключи(?:ть)? банк|добавь автоуведомления|подключи(?:ть)? внешний календар)/i);
    }
    expect(JSON.stringify(lessons("pressure-diary"))).toMatch(/не ставит диагноз|не оценивает показатели/i);
  });
});
