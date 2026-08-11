import { describe, expect, it } from "vitest";
import { questProjects } from "./projects";
import { buildQuest, getQuest } from "./quests";
import { agentContracts, getAgentContract } from "./agent-contracts";
import { defaultCustomization } from "./customization";

const placeholder = /TODO|TBD|\[[^\]]+\]|<[^>]+>|вставьте название|название проекта сюда/i;

function stepText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stepText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(stepText).join(" ");
  return "";
}

describe("quest builders", () => {
  it("builds 17 complete sequential levels for every project", () => {
    let total = 0;
    for (const project of questProjects) {
      const steps = buildQuest(project);
      total += steps.length;
      expect(steps, project.slug).toHaveLength(17);
      expect(steps.map((step) => step.id), project.slug).toEqual(
        Array.from({ length: 17 }, (_, index) => index + 1),
      );
      for (const step of steps) {
        expect(step.title.length, `${project.slug}/${step.id}`).toBeGreaterThan(5);
        expect(step.why.length, `${project.slug}/${step.id}`).toBeGreaterThan(35);
        expect(step.action.length, `${project.slug}/${step.id}`).toBeGreaterThan(25);
        expect(step.expected.length, `${project.slug}/${step.id}`).toBeGreaterThanOrEqual(3);
        expect(step.help.body.length, `${project.slug}/${step.id}`).toBeGreaterThan(20);
        expect(step.help.prompt.length, `${project.slug}/${step.id}`).toBeGreaterThan(80);
        expect(step.screenshot).toBe(
          `/screens/${project.slug}/step-${String(step.id).padStart(2, "0")}.png`,
        );
        const text = stepText(step);
        expect(text, `${project.slug}/${step.id}`).not.toMatch(placeholder);
      }
    }
    expect(total).toBe(833);
  });

  it("uses detailed copy-ready Codex prompts", () => {
    for (const project of questProjects) {
      const prompts = buildQuest(project).flatMap((step) => step.prompt ?? []);
      expect(prompts.length, project.slug).toBeGreaterThanOrEqual(11);
      expect(prompts.every((prompt) => prompt.length > 150), project.slug).toBe(true);
      expect(prompts.join(" "), project.slug).toContain(project.title);
    }
  });

  it("switches every command to a conversational real-data mode", () => {
    for (const project of questProjects) {
      const realSteps = buildQuest(project, "real");
      const realStepText = stepText(realSteps);
      const prompts = realSteps.flatMap((step) => step.prompt ?? []);
      expect(prompts.every((prompt) => prompt.includes("РЕЖИМ РЕАЛЬНЫХ ДАННЫХ")), project.slug).toBe(true);
      expect(prompts.join(" "), project.slug).toMatch(/голосом или текстом/i);
      expect(prompts.join(" "), project.slug).toMatch(/папки, файлы и поля.+создавай (?:их )?сам/i);
      expect(prompts.join(" "), project.slug).toMatch(/один короткий вопрос за раз|задавай строго по одному вопросу/i);
      expect(prompts.join(" "), project.slug).not.toMatch(/используй (только )?(этот |эти )?вымышлен/i);
      expect(prompts.join(" "), project.slug).not.toMatch(/не добавляем.+реальные контакты в сообщения/i);
      expect(realStepText, project.slug).not.toMatch(/вымышлен|демонстрацион/i);
      expect(realStepText, project.slug).not.toContain(project.demo.join("; "));
    }
  });

  it("keeps real-data actions concrete instead of prefixing every step with a folder instruction", () => {
    for (const project of questProjects) {
      const steps = buildQuest(project, "real");
      const text = stepText(steps);
      expect(text, project.slug).not.toContain("Возьмите подходящий материал из подготовленной папки");
      expect(steps[13].action, project.slug).not.toMatch(/папк|подготовленн.+материал/i);
    }
  });

  it("explains the previously ambiguous open, paste, and phone actions click by click", () => {
    for (const project of questProjects) {
      const steps = buildQuest(project, "real");
      if (["home-helper", "family-expenses", "planner", "idea-vault", "child-schedule"].includes(project.slug)) continue;
      expect(steps[0].action, `${project.slug}/create`).toMatch(/Codex.+Новая задача.+команд.+Проект.+создан/is);
      expect(steps[0].action, `${project.slug}/create`).not.toMatch(/создайте.+папку|создайте.+файл/is);
      expect(steps[1].action, `${project.slug}/open`).toMatch(/ответ Codex.+Открыть проект.+название/is);
      expect(steps[2].action, `${project.slug}/paste`).toMatch(/Скопировать команду.+вернитесь в Codex.+вставьте.+отправ/is);
      expect(steps[13].action, `${project.slug}/phone`).toMatch(/Telegram.+телефон.+вертикально/is);
      expect(steps[13].action, `${project.slug}/phone`).not.toMatch(/узком экране/i);
    }

    const budget = buildQuest(questProjects.find((project) => project.slug === "family-expenses")!, "real");
    expect(budget[2].action).toMatch(/голосом или писать текстом/is);
    expect(budget[2].prompt).toMatch(/Всё верно/is);
    expect(budget[2].action).not.toMatch(/создайте.+файл|откройте.+папку/is);
    expect(budget[3].action).toMatch(/Скопировать команду.+Codex.+ничего создавать/is);
    expect(budget[4].action).toMatch(/Скопировать команду.+Codex.+сохранит/is);
    expect(budget[12].action).toMatch(/Telegram.+телефон/is);

    const planner = buildQuest(questProjects.find((project) => project.slug === "planner")!, "real");
    expect(planner[2].action).toMatch(/по одному вопросу.+голосом или текстом/is);
    expect(planner[3].action).toMatch(/Codex сам создал проект planner|Проект planner создан/is);
    expect(planner[3].action).not.toMatch(/создайте.+папку|откройте.+папку/is);
    expect(planner[4].action).toMatch(/Скопировать команду.+Codex.+вставьте.+отправьте/is);
    expect(planner[12].action).toMatch(/телефоне.+добавьте дело.+перенесите/is);

    const ideas = buildQuest(questProjects.find((project) => project.slug === "idea-vault")!, "real");
    expect(ideas[2].action).toMatch(/по одному вопросу.+голосом или текстом/is);
    expect(ideas[3].action).toMatch(/Проект idea-vault создан/is);
    expect(ideas[3].action).not.toMatch(/создайте.+папку|откройте.+папку/is);
    expect(ideas[4].action).toMatch(/Скопировать команду.+Codex.+вставьте.+отправьте/is);
    expect(ideas[12].action).toMatch(/телефоне.+запишите идею.+найдите/is);

    const child = buildQuest(questProjects.find((project) => project.slug === "child-schedule")!, "real");
    expect(child[2].action).toMatch(/по одному вопросу.+голосом или текстом/is);
    expect(child[3].action).toMatch(/Проект child-schedule создан/is);
    expect(child[3].action).not.toMatch(/создайте.+папку|откройте.+папку/is);
    expect(child[4].action).toMatch(/Скопировать команду.+Codex.+вставьте.+отправьте/is);
    expect(child[12].action).toMatch(/телефоне.+Ребёнок А.+Что взять/is);
  });

  it("asks pressure-diary questions without making the learner prepare a file", () => {
    const steps = buildQuest(questProjects.find((project) => project.slug === "pressure-diary")!, "real");
    const prompts = steps.flatMap((step) => step.prompt ?? []).join(" ");
    expect(prompts).not.toContain("мои-измерения.csv");
    expect(prompts).toMatch(/дата.+время.+верхн.+нижн.+пульс.+самочувств/i);
    expect(prompts).not.toMatch(/логотип|подтверждённые цены|публичные контакты/i);
  });

  it("never forces the course brand palette onto a learner project", () => {
    const project = questProjects.find((item) => item.slug === "pressure-diary")!;
    const styling = buildQuest(project)[12];
    expect(styling.prompt).not.toMatch(/стиле SUBMARINE/i);
    expect(styling.prompt).toMatch(/выбранн.+цветов.+гамм/i);
  });

  it("builds a click-by-click guide for every home-helper level", () => {
    for (const mode of ["demo", "real"] as const) {
      const steps = buildQuest(questProjects.find((project) => project.slug === "home-helper")!, mode);
      expect(steps).toHaveLength(17);
      for (const step of steps) {
        expect(step.guide?.length, `${mode}/${step.id}`).toBeGreaterThanOrEqual(3);
        expect(step.guide?.map((frame) => frame.id), `${mode}/${step.id}`).toEqual(
          Array.from({ length: step.guide!.length }, (_, index) => index + 1),
        );
        for (const frame of step.guide ?? []) {
          expect(frame.app.length, `${mode}/${step.id}/${frame.id}`).toBeGreaterThan(2);
          expect(frame.action.length, `${mode}/${step.id}/${frame.id}`).toBeGreaterThan(12);
          expect(frame.after.length, `${mode}/${step.id}/${frame.id}`).toBeGreaterThan(12);
          expect(frame.doneWhen.length, `${mode}/${step.id}/${frame.id}`).toBeGreaterThan(12);
          expect(frame.fallback.length, `${mode}/${step.id}/${frame.id}`).toBeGreaterThan(20);
          expect(frame.screenshot, `${mode}/${step.id}/${frame.id}`).toBe(
            `/guides/home-helper/${mode}/step-${String(step.id).padStart(2, "0")}-frame-${String(frame.id).padStart(2, "0")}.png`,
          );
        }
      }
    }
  });

  it("shows automatic creation before the one-question-at-a-time interview", () => {
    const steps = buildQuest(questProjects.find((project) => project.slug === "home-helper")!, "real");
    const allTitles = steps.flatMap((step) => step.guide ?? []).map((frame) => frame.title);
    expect(allTitles.indexOf("Откройте Codex")).toBeLessThan(allTitles.indexOf("Проверьте название проекта"));
    expect(steps[2].guide?.map((frame) => frame.title)).toEqual([
      "Скопируйте команду опроса",
      "Запустите разговор",
      "Ответьте обычными словами",
      "Добавьте ещё несколько дел",
      "Подтвердите сводку",
    ]);
  });

  it("never mixes training wording into the real home-helper guide", () => {
    const guideText = stepText(buildQuest(questProjects.find((project) => project.slug === "home-helper")!, "real").flatMap((step) => step.guide ?? []));
    expect(guideText).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(guideText).toMatch(/голосом или текстом/i);
    expect(guideText).not.toMatch(/мои-дела\.txt|создайте папку|откройте подготовленные материалы/i);
  });

  it("keeps health and child projects inside their safety boundary", () => {
    const pressure = stepText(getQuest("pressure-diary"));
    const fitness = stepText(getQuest("fitness-tracker"));
    const child = stepText(getQuest("child-schedule"));
    expect(pressure).toContain("не ставит диагноз");
    expect(pressure).toContain("не заменяет врача");
    expect(fitness).toContain("не даёт медицинских рекомендаций");
    expect(child).toMatch(/не называйте полные имена и адреса/i);
    expect(child).not.toMatch(/домашний адрес ребёнка|геолокация ребёнка/i);
  });

  it("returns no quest for an unknown project", () => {
    expect(getQuest("missing-project")).toBeUndefined();
  });

  it("turns every agent contract into a unique 17-level working path", () => {
    expect(agentContracts).toHaveLength(24);

    for (const contract of agentContracts) {
      const project = questProjects.find((item) => item.slug === contract.slug)!;
      const customization = defaultCustomization(project.slug)!;
      const steps = buildQuest(project, "demo", customization);
      const text = stepText(steps);

      expect(steps, project.slug).toHaveLength(17);
      expect(text, project.slug).toContain(contract.inputExample);
      expect(text, project.slug).toContain(contract.firstQuestion);
      expect(text, project.slug).toContain(contract.resultTitle);
      expect(text, project.slug).toContain(contract.handoff);
      expect(text, project.slug).toMatch(/свободн.+текст/i);
      expect(text, project.slug).toMatch(/голос/i);
      expect(text, project.slug).toMatch(/один вопрос за раз/i);
      expect(text, project.slug).toMatch(/самопроверк/i);
      expect(text, project.slug).toContain("Да, подтверждаю");
      expect(text, project.slug).not.toMatch(/нажми(?:те)? кнопку с ответом|сценарий кнопок/i);
      expect(text, project.slug).toContain(customization.name);
      expect(text, project.slug).toContain(customization.audience);
      expect(text, project.slug).toContain(customization.tone);
      expect(text, project.slug).toContain(customization.feature);
      expect(text, project.slug).toContain(customization.palette.name);
    }
  });

  it.each(["expense-agent", "booking-agent", "online-school-agent", "content-agent"])(
    "keeps the %s agent inside its own data, action, and handoff rules",
    (slug) => {
      const project = questProjects.find((item) => item.slug === slug)!;
      const contract = getAgentContract(slug);
      const steps = buildQuest(project, "real", defaultCustomization(slug)!);
      const text = stepText(steps);

      for (const field of contract.requiredFields) expect(text, `${slug}/${field}`).toContain(field);
      expect(text, slug).toContain(contract.confirmationRule);
      expect(text, slug).toContain(contract.handoff);
      expect(steps[15].title, slug).toMatch(/клиент/i);
      expect(steps[15].prompt, slug).toMatch(/восемь вопросов|8 вопросов/i);
      expect(steps[15].prompt, slug).toMatch(/было.+станет/is);
      expect(steps[15].prompt, slug).toMatch(/до подтверждения/i);
    },
  );

  it("teaches every non-agent project as a personal version and a client copy", () => {
    const nonAgents = questProjects.filter((project) => project.kind !== "agent");
    expect(nonAgents).toHaveLength(25);
    const originalSlugs = new Set(["family-expenses", "planner", "idea-vault", "child-schedule"]);
    const genericNonAgents = nonAgents.filter((project) => !originalSlugs.has(project.slug));
    expect(genericNonAgents).toHaveLength(21);

    for (const project of genericNonAgents) {
      const customization = defaultCustomization(project.slug)!;
      const steps = buildQuest(project, "demo", customization);
      const text = stepText(steps);

      expect(text, project.slug).toContain(customization.name);
      expect(text, project.slug).toContain(customization.audience);
      expect(text, project.slug).toContain(customization.palette.name);
      expect(steps[14].title, project.slug).toMatch(/личн.+верси|аудит и публикац/i);
      expect(steps[15].title, project.slug).toMatch(/клиентск.+копи|заказчик/i);
      expect(steps[15].prompt, project.slug).toMatch(/восемь вопросов|8 вопросов/i);
      expect(steps[15].prompt, project.slug).toMatch(/по одному вопросу/i);
      expect(steps[15].prompt, project.slug).toMatch(/было.+станет/is);
      expect(steps[16].prompt, project.slug).toMatch(/личн.+верси.+клиентск.+верси/is);
    }

    for (const slug of originalSlugs) {
      const project = questProjects.find((item) => item.slug === slug)!;
      const steps = buildQuest(project, "demo", defaultCustomization(project.slug));
      expect(steps[13].title, slug).toMatch(/опубликовал/i);
      expect(steps[14].title, slug).toMatch(/клиентск.+копи/i);
      expect(steps[15].title, slug).toMatch(/бриф|адаптировал/i);
      expect(steps[16].title, slug).toMatch(/упаковал|портфолио/i);
    }
  });
});
