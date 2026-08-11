import { describe, expect, it } from "vitest";
import { buildMobileQuest, getMobileCapability } from "./mobile";
import { getQuestProject, questProjects } from "./projects";
import { getAgentContract } from "./agent-contracts";
import { defaultCustomization } from "./customization";
import { buildQuest } from "./quests";

function stepText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stepText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(stepText).join(" ");
  return "";
}

describe("mobile quest builder", () => {
  it("builds seventeen phone-only steps for every project", () => {
    let total = 0;
    for (const project of questProjects) {
      const steps = buildMobileQuest(project, "demo");
      expect(steps, project.slug).toHaveLength(17);
      expect(steps.map((step) => step.id), project.slug).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
      expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" "), project.slug).not.toMatch(/терминал|npm|\bgit\b|папк.+компьютер/i);
      expect(steps.every((step) => step.screenshot === `/screens-mobile/${project.slug}/step-${String(step.id).padStart(2, "0")}.png`), project.slug).toBe(true);
      total += steps.length;
    }
    expect(total).toBe(833);
  });

  it("gives every project the actions needed for a phone workflow", () => {
    for (const project of questProjects) {
      const steps = buildMobileQuest(project, "demo");
      const tools = steps.map((step) => step.mobileAction.tool);
      expect(tools, project.slug).toContain("telegram");
      expect(tools, project.slug).toContain("screenshot");
      expect(tools.some((tool) => tool === "lovable" || tool === "chatium"), project.slug).toBe(true);
      expect(getMobileCapability(project).label.length, project.slug).toBeGreaterThan(5);
    }
  });

  it("routes advanced setup to a curator and keeps real prompts grounded", () => {
    for (const project of questProjects) {
      const steps = buildMobileQuest(project, "real");
      const prompts = steps.flatMap((step) => step.prompt ?? []);
      expect(prompts.join(" "), project.slug).toMatch(/голосом или текстом/i);
      expect(prompts.join(" "), project.slug).toMatch(/папки, файлы и поля.+создавай (?:их )?сам/i);
      expect(prompts.join(" "), project.slug).toMatch(/один короткий вопрос за раз|задавай строго по одному вопросу/i);
      if (project.kind === "advanced-site") {
        expect(steps.map((step) => step.mobileAction.tool), project.slug).toContain("curator");
      }
    }
  });

  it("collects pressure-diary answers in chat without a prepared source file", () => {
    const project = getQuestProject("pressure-diary")!;
    const steps = buildMobileQuest(project, "real");
    expect(steps[3].action).not.toContain("мои-измерения.csv");
    expect(steps[3].action).toMatch(/дата.+время.+верхн.+нижн.+пульс.+самочувств/i);
    expect(steps[3].action).toMatch(/по одному вопросу голосом или текстом/i);
    expect(steps.flatMap((step) => step.prompt ?? []).join(" ")).not.toContain("мои-измерения.csv");
  });

  it("gives the planner its own server-room and client-copy phone path", () => {
    const planner = getQuestProject("planner")!;
    const steps = buildMobileQuest(planner, "real");
    expect(steps[2].action).toMatch(/опрос.+по одному голосом или текстом/i);
    expect(steps[3].action).toMatch(/Codex сам создаст.+серверную комнату planner.+файлы и поля/i);
    expect(steps[3].action).not.toMatch(/откройте локальн.+папк/i);
    expect(steps[12].action).toMatch(/одной рукой.+добавьте дело.+перенесите/i);
    expect(steps[14].action).toContain("planner-client");
    expect(steps[15].action).toMatch(/planner-client.+восемь вопросов по одному голосом или текстом/i);
  });

  it("gives the idea vault a fast-capture and client-copy phone path", () => {
    const vault = getQuestProject("idea-vault")!;
    const steps = buildMobileQuest(vault, "real");
    expect(steps[2].action).toMatch(/опрос.+по одному голосом или текстом/i);
    expect(steps[3].action).toMatch(/Codex сам создаст.+серверную комнату idea-vault.+файлы и поля/i);
    expect(steps[12].action).toMatch(/одной рукой.+запишите идею.+поиск/i);
    expect(steps[14].action).toContain("idea-vault-client");
    expect(steps[15].action).toMatch(/idea-vault-client.+восемь вопросов по одному голосом или текстом/i);
  });

  it("gives the child schedule a private server-room and client-copy phone path", () => {
    const child = getQuestProject("child-schedule")!;
    const steps = buildMobileQuest(child, "real");
    expect(steps[2].action).toMatch(/опрос.+по одному голосом или текстом/i);
    expect(steps[3].action).toMatch(/Codex сам создаст.+серверную комнату child-schedule.+файлы и поля/i);
    expect(steps[12].action).toMatch(/телефоне.+Ребёнок А.+Что взять/i);
    expect(steps[14].action).toContain("child-schedule-client");
    expect(steps[15].action).toMatch(/child-schedule-client.+восемь вопросов по одному голосом или текстом/i);
    expect(steps.map((step) => `${step.action} ${step.prompt ?? ""}`).join(" ")).toMatch(/не спрашивай ФИО.+адрес.+геолокацию/i);
  });

  it("keeps every mobile agent path conversational and subject-specific", () => {
    const agents = questProjects.filter((project) => project.kind === "agent");
    expect(agents).toHaveLength(24);

    for (const project of agents) {
      const contract = getAgentContract(project.slug);
      const steps = buildMobileQuest(project, "real", defaultCustomization(project.slug));
      const text = stepText(steps);

      expect(text, project.slug).toContain(contract.inputExample);
      expect(text, project.slug).toContain(contract.firstQuestion);
      expect(text, project.slug).toContain(contract.resultTitle);
      expect(text, project.slug).toMatch(/голосом или текстом/i);
      expect(text, project.slug).toMatch(/один вопрос за раз/i);
      expect(text, project.slug).toMatch(/Да, подтверждаю/i);
      expect(text, project.slug).toContain(contract.handoff);
      for (const step of steps) {
        expect(step.action, `${project.slug}/step-${step.id}`).not.toMatch(/подготовьте.+файл|создайте.+папку/i);
      }
    }
  });

  it("uses the word agent publicly and keeps one exact Telegram technical explanation", () => {
    const allowed = "Telegram называет оболочку ботом, но внутри неё работает ваш ИИ-агент";
    const publicText = [
      stepText(questProjects),
      ...questProjects.map((project) => stepText(buildQuest(project))),
      ...questProjects.map((project) => stepText(buildMobileQuest(project))),
    ].join(" ").replaceAll(allowed, "");

    expect(publicText).not.toMatch(/(?:^|[^а-яё])бот[а-яё]*(?=$|[^а-яё])/iu);
  });
});
