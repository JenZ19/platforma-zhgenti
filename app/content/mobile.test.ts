import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildMobileQuest, getMobileCapability } from "./mobile";
import { buildQuest } from "./quests";
import { defaultCustomization } from "./customization";

describe("mobile quests", () => {
  it("points every Fairy command to its public fictional dataset without asking the curator for sample data", () => {
    for (const project of questProjects) for (const mode of ["demo", "real"] as const) {
      for (const step of buildMobileQuest(project, mode)) {
        for (const prompt of [step.prompt, step.help.prompt, step.extension?.prompt].filter(Boolean)) {
          expect(prompt, `${project.slug}/${step.id}`).toContain(`https://ezhgenti.ru/data/sets/${project.slug}/dataset.json`);
          expect(prompt).toContain("Не проси учебные данные у куратора");
          expect(prompt).toContain("не перезаписывай мои сохранённые записи");
          if (mode === "real") expect(prompt).toContain("только в отдельной демонстрации");
        }
      }
    }
  });
  it("clarifies ownership and template-only data in the health hub command", () => {
    const project = questProjects.find(p => p.slug === "family-health-hub")!;
    const prompt = buildMobileQuest(project)[0].prompt!;
    expect(prompt.split("\n")[0]).toBe("Хаб здоровья семьи");
    expect(prompt).toContain("Это мой учебный проект в текущем чате");
    expect(prompt).toContain("комплект содержит только вымышленные учебные данные");
    expect(prompt).not.toContain("чужих данных");
    expect(prompt).toContain("Не отправляй медицинские документы внешнему ИИ");
  });
  it("adapts every copyable command, including help and client practice, in both data modes", () => {
    for (const project of questProjects) {
      for (const mode of ["demo", "real"] as const) {
        const custom = { ...defaultCustomization(project.slug)!, name: "Мой личный проект" };
        for (const step of buildMobileQuest(project, mode, project.journey === "setup" ? undefined : custom)) {
          const name = project.journey === "setup" ? project.title : custom.name;
          for (const prompt of [step.prompt, step.help.prompt, step.extension?.prompt].filter(Boolean)) {
            expect(prompt!.split("\n")[0], `${project.slug}/${step.id}/${mode}`).toBe(name);
            expect(prompt).not.toContain("ФОРМАТ: С ТЕЛЕФОНА");
            if (project.journey !== "setup") {
              expect(prompt).toContain("Это сервер школы, а не мой компьютер");
              expect(prompt).toContain("Моём портфолио");
              expect(prompt).toContain("Не выдумывай ссылку");
            }
          }
          if (project.journey !== "setup") {
            expect(step.help.prompt).toContain("Не начинай проект заново");
            expect(step.help.prompt).not.toContain("Если файлов ещё нет, создай их");
            if (step.extension) expect(step.extension.prompt).toContain("Отдельная копия разрешена только для этой дополнительной практики");
          }
        }
      }
    }
  });

  it("does not pretend that setup commands can install apps on a learner's phone", () => {
    for (const project of questProjects.filter(p => p.journey === "setup")) {
      const source = buildQuest(project);
      for (const step of buildMobileQuest(project)) {
        expect(step.mobileAction.label).toBe("Продолжить на компьютере");
        expect(step.help.prompt).toContain("Не выполняй настройку своего сервера вместо моего устройства");
        if (source[step.id - 1].prompt) expect(step.prompt).toContain(source[step.id - 1].prompt);
      }
    }
  });

  it("does not require an unrelated constructor to work through the school bot", () => {
    const project = questProjects.find(p => p.slug === "recipe-book")!;
    expect(getMobileCapability(project).detail).toContain("Феечка");
    expect(getMobileCapability(project).detail).not.toContain("конструктор");
  });

  it("continues the current mobile workspace without an unnecessary start-over question", () => {
    for (const project of questProjects.filter(p => p.journey !== "setup")) {
      const step = buildMobileQuest(project).find(s => s.prompt)!;
      expect(step.prompt, project.slug).not.toContain("сначала спроси, продолжить его или сделать отдельную копию");
    }
  });

  it("does not replace desktop commands or manual check steps", () => {
    for (const project of questProjects) {
      const before = buildQuest(project);
      const mobile = buildMobileQuest(project);
      expect(buildQuest(project)).toEqual(before);
      expect(mobile.map(s => Boolean(s.prompt))).toEqual(before.map(s => Boolean(s.prompt)));
      expect(mobile.map(s => s.expected)).toEqual(before.map(s => s.expected));
    }
  });
  it("uses the learner's chosen service name in the first line", () => {
    const project = questProjects.find(p => p.slug === "recipe-book")!;
    const custom = { ...defaultCustomization(project.slug)!, name: "Рецепты нашей семьи" };
    const prompt = buildMobileQuest(project, "demo", custom).find(step => step.prompt)!.prompt!;
    expect(prompt.split("\n")[0]).toBe("Рецепты нашей семьи");
    expect(prompt).toContain("Название сервиса — «Рецепты нашей семьи»");
  });
  it("starts copied tasks with the product name, then an actionable request", () => {
    for (const project of questProjects.filter(p => p.journey !== "setup")) {
      for (const step of buildMobileQuest(project, "demo")) {
        if (!step.prompt) continue;
        expect(step.prompt.split("\n")[0], project.slug).toBe(project.title);
        expect(step.prompt).not.toContain("ФОРМАТ: С ТЕЛЕФОНА");
        expect(step.prompt).toContain("Начни выполнять задание сейчас");
        expect(step.prompt).toContain("Это сервер школы, а не мой компьютер");
        if (project.kind !== "agent") expect(step.prompt).toContain("адаптивный веб-сервис");
        expect(step.prompt).not.toContain("Если безопасный доступ не настроен, остановись");
      }
    }
  });
  it("preserves each route's sequential checks on phone", () => {
    for (const project of questProjects) {
      const steps = buildMobileQuest(project, "demo");
      expect(steps.length, project.slug).toBeGreaterThan(0);
      expect(steps.map((step) => step.id), project.slug).toEqual(steps.map((_, index) => index + 1));
      expect(steps.every((step) => step.expected.length >= 2), project.slug).toBe(true);
    }
  });

  it("does not turn phone lessons into local computer file instructions", () => {
    for (const project of questProjects) {
      const copy = buildMobileQuest(project, "real").map((step) => `${step.action} ${step.prompt ?? ""}`).join(" ");
      expect(copy, project.slug).not.toMatch(/FILE:|создайте.+(?:\.txt|\.csv)|откройте локальную папку|запустите терминал/i);
    }
  });

  it("keeps real records and secrets out of the course chat", () => {
    for (const project of questProjects.filter((item) => item.journey !== "setup")) {
      expect(JSON.stringify(buildMobileQuest(project, "real")), project.slug).toMatch(/не проси парол|не проси секрет|не в чат|не в переписк|защищён/i);
    }
  });
});
