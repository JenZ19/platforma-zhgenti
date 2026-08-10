import { describe, expect, it } from "vitest";
import { buildMobileQuest, getMobileCapability } from "./mobile";
import { projects } from "./projects";
import { getPreparationProfile } from "./preparation";

describe("mobile quest builder", () => {
  it("builds seventeen phone-only steps for every project", () => {
    let total = 0;
    for (const project of projects) {
      const steps = buildMobileQuest(project, "demo");
      expect(steps, project.slug).toHaveLength(17);
      expect(steps.map((step) => step.id), project.slug).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
      expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" "), project.slug).not.toMatch(/терминал|npm|\bgit\b|папк.+компьютер/i);
      expect(steps.every((step) => step.screenshot === `/screens-mobile/${project.slug}/step-${String(step.id).padStart(2, "0")}.png`), project.slug).toBe(true);
      total += steps.length;
    }
    expect(total).toBe(884);
  });

  it("gives every project the actions needed for a phone workflow", () => {
    for (const project of projects) {
      const steps = buildMobileQuest(project, "demo");
      const tools = steps.map((step) => step.mobileAction.tool);
      expect(tools, project.slug).toContain("telegram");
      expect(tools, project.slug).toContain("screenshot");
      expect(tools.some((tool) => tool === "lovable" || tool === "chatium"), project.slug).toBe(true);
      expect(getMobileCapability(project).label.length, project.slug).toBeGreaterThan(5);
    }
  });

  it("routes advanced setup to a curator and keeps real prompts grounded", () => {
    for (const project of projects) {
      const steps = buildMobileQuest(project, "real");
      const prompts = steps.flatMap((step) => step.prompt ?? []);
      expect(prompts.join(" "), project.slug).toContain(getPreparationProfile(project.slug).sourceFile);
      if (project.kind === "advanced-site") {
        expect(steps.map((step) => step.mobileAction.tool), project.slug).toContain("curator");
      }
    }
  });

  it("names the exact source in the phone route instead of asking for generic materials", () => {
    const project = projects.find((item) => item.slug === "pressure-diary")!;
    const steps = buildMobileQuest(project, "real");
    expect(steps[3].action).toContain("мои-измерения.csv");
    expect(steps[3].action).toMatch(/дата.+время.+верхн.+нижн.+пульс.+самочувств/i);
    expect(steps[3].action).not.toMatch(/текст, фотографии или документы/i);
    expect(steps.flatMap((step) => step.prompt ?? []).join(" ")).toContain("мои-измерения.csv");
  });

  it("gives the planner its own server-room and client-copy phone path", () => {
    const planner = projects.find((item) => item.slug === "planner")!;
    const steps = buildMobileQuest(planner, "real");
    expect(steps[3].action).toMatch(/Telegram.+Новый проект.+planner.+серверн/i);
    expect(steps[3].action).not.toMatch(/откройте локальн.+папк/i);
    expect(steps[12].action).toMatch(/одной рукой.+добавьте дело.+перенесите/i);
    expect(steps[14].action).toContain("planner-client");
    expect(steps[15].action).toMatch(/восемь ответов.+planner-client/i);
  });

  it("gives the idea vault a fast-capture and client-copy phone path", () => {
    const vault = projects.find((item) => item.slug === "idea-vault")!;
    const steps = buildMobileQuest(vault, "real");
    expect(steps[3].action).toMatch(/Telegram.+Новый проект.+idea-vault.+серверн/i);
    expect(steps[12].action).toMatch(/одной рукой.+запишите идею.+поиск/i);
    expect(steps[14].action).toContain("idea-vault-client");
    expect(steps[15].action).toMatch(/восемь ответов.+idea-vault-client/i);
  });

  it("gives the child schedule a private server-room and client-copy phone path", () => {
    const child = projects.find((item) => item.slug === "child-schedule")!;
    const steps = buildMobileQuest(child, "real");
    expect(steps[3].action).toMatch(/Telegram.+Новый проект.+child-schedule.+серверн/i);
    expect(steps[12].action).toMatch(/телефоне.+Ребёнок А.+Что взять/i);
    expect(steps[14].action).toContain("child-schedule-client");
    expect(steps[15].action).toMatch(/восемь ответов.+child-schedule-client/i);
    expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" ")).toMatch(/не сохраняем ФИО ребёнка.+домашний адрес.+геолокацию/i);
  });
});
