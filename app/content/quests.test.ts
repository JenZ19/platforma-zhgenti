import { describe, expect, it } from "vitest";
import { projects } from "./projects";
import { buildQuest, getQuest } from "./quests";

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
    for (const project of projects) {
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
    expect(total).toBe(884);
  });

  it("uses detailed copy-ready Codex prompts", () => {
    for (const project of projects) {
      const prompts = buildQuest(project).flatMap((step) => step.prompt ?? []);
      expect(prompts.length, project.slug).toBeGreaterThanOrEqual(11);
      expect(prompts.every((prompt) => prompt.length > 150), project.slug).toBe(true);
      expect(prompts.join(" "), project.slug).toContain(project.title);
    }
  });

  it("switches every command to the prepared folder in real-data mode", () => {
    for (const project of projects) {
      const prompts = buildQuest(project, "real").flatMap((step) => step.prompt ?? []);
      expect(prompts.every((prompt) => prompt.includes("РЕЖИМ РЕАЛЬНЫХ ДАННЫХ")), project.slug).toBe(true);
      expect(prompts.join(" "), project.slug).toMatch(/подготовленн.+папк/i);
      expect(prompts.join(" "), project.slug).not.toMatch(/используй (только )?(этот |эти )?вымышлен/i);
      expect(stepText(buildQuest(project, "real")), project.slug).not.toMatch(/вымышлен|демонстрацион/i);
    }
  });

  it("builds a click-by-click guide for every home-helper level", () => {
    for (const mode of ["demo", "real"] as const) {
      const steps = buildQuest(projects.find((project) => project.slug === "home-helper")!, mode);
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

  it("shows creation before opening and splits questionnaire copy, paste, send, and result", () => {
    const steps = buildQuest(projects.find((project) => project.slug === "home-helper")!, "real");
    const allTitles = steps.flatMap((step) => step.guide ?? []).map((frame) => frame.title);
    expect(allTitles.indexOf("Создайте папку home-helper")).toBeLessThan(allTitles.indexOf("Откройте home-helper в Codex"));
    expect(steps[2].guide?.map((frame) => frame.title)).toEqual([
      "Откройте проект home-helper",
      "Откройте подготовленные материалы",
      "Скопируйте анкету на сайте",
      "Вставьте анкету в Codex",
      "Отправьте анкету",
      "Дождитесь паспорта проекта",
    ]);
  });

  it("never mixes training wording into the real home-helper guide", () => {
    const guideText = stepText(buildQuest(projects.find((project) => project.slug === "home-helper")!, "real").flatMap((step) => step.guide ?? []));
    expect(guideText).not.toMatch(/вымышлен|демонстрацион|учебн/i);
    expect(guideText).toContain("мои-дела.txt");
  });

  it("keeps health and child projects inside their safety boundary", () => {
    const pressure = stepText(getQuest("pressure-diary"));
    const fitness = stepText(getQuest("fitness-tracker"));
    const child = stepText(getQuest("child-schedule"));
    expect(pressure).toContain("не ставит диагноз");
    expect(pressure).toContain("не заменяет врача");
    expect(fitness).toContain("не даёт медицинских рекомендаций");
    expect(child).toMatch(/не сохраняем ФИО ребёнка/i);
    expect(child).not.toMatch(/домашний адрес ребёнка|геолокация ребёнка/i);
  });

  it("returns no quest for an unknown project", () => {
    expect(getQuest("missing-project")).toBeUndefined();
  });
});
