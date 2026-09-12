import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildQuest } from "./quests";

const text = (value: unknown) => JSON.stringify(value);

describe("quest builders", () => {
  it("builds complete sequential routes with an honest final result", () => {
    for (const project of questProjects) {
      const steps = buildQuest(project);
      expect(steps.length, project.slug).toBeGreaterThan(0);
      expect(steps.map((step) => step.id), project.slug).toEqual(steps.map((_, index) => index + 1));
      for (const step of steps) {
        expect(step.title.length, `${project.slug}/${step.id}`).toBeGreaterThan(5);
        expect(step.why.length, `${project.slug}/${step.id}`).toBeGreaterThan(20);
        expect(step.action.length, `${project.slug}/${step.id}`).toBeGreaterThan(15);
        expect(step.expected.length, `${project.slug}/${step.id}`).toBeGreaterThanOrEqual(2);
        expect(step.help.prompt.length, `${project.slug}/${step.id}`).toBeGreaterThan(40);
      }
      if (project.journey !== "setup" && project.kind !== "portfolio") expect(text(steps.at(-1))).toMatch(/портфолио|показываем|финал/i);
    }
  });

  it("uses the agreed sequence without requiring one course-wide length", () => {
    const lengths = new Set<number>();
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const steps = buildQuest(project);
      lengths.add(steps.length);
      const copy = text(steps);
      expect(copy, project.slug).toMatch(/созда|собер|основ/i);
      expect(copy, project.slug).toMatch(/провер/i);
      expect(copy, project.slug).toMatch(/портфолио|показываем/i);
      if (project.kind !== "portfolio") {
        const extension = steps.at(-1)?.extension;
        expect(extension, project.slug).toBeDefined();
        expect(`${extension?.title} ${extension?.description}`, project.slug).toMatch(/по желанию|можно пропустить|не обязатель/i);
      }
    }
    expect(lengths.size).toBeGreaterThan(2);
  });

  it("keeps demo fixtures separate from personal real-data entry", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      const real = text(buildQuest(project, "real"));
      const demo = text(buildQuest(project, "demo"));
      expect(real, project.slug).toMatch(/РЕЖИМ РЕАЛЬНЫХ ДАННЫХ|реальн/i);
      expect(demo, project.slug).toMatch(/РЕЖИМ УЧЕБНЫХ ДАННЫХ|учебн/i);
      expect(real, project.slug).toMatch(/не переписк|не в чат|защищённ|не проси секрет/i);
    }
  });

  it("does not ask learners to create technical preparation files by hand", () => {
    for (const project of questProjects) {
      const actions = buildQuest(project, "real").map((step) => step.action).join(" ");
      expect(actions, project.slug).not.toMatch(/создайте.+(?:\.txt|\.csv|json-файл|служебный файл)|вручную создайте.+файл/i);
    }
  });

  it("keeps medical, child and finance projects inside their boundaries", () => {
    expect(text(buildQuest(questProjects.find((p) => p.slug === "pressure-diary")!, "real"))).toMatch(/не ставит диагноз|не оценивай показатели/i);
    expect(text(buildQuest(questProjects.find((p) => p.slug === "family-health-hub")!, "real"))).toMatch(/не ставит диагноз|не ставь диагноз|не диагност/i);
    expect(text(buildQuest(questProjects.find((p) => p.slug === "child-schedule")!, "real"))).toMatch(/не (?:добавляй|сохраняем).+(?:ФИО|адрес|школ)/i);
    expect(text(buildQuest(questProjects.find((p) => p.slug === "family-expenses")!, "real"))).toMatch(/не подключай банк|банковской интеграции нет/i);
  });

  it("requires consent before publication, payments or external actions", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      expect(text(buildQuest(project, "real")), project.slug).toMatch(/согласован|согласия|подтвержден|дождись решения|не публикуй/i);
    }
  });
});
