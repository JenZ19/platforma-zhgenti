import { describe, expect, it } from "vitest";
import { defaultCustomization } from "../customization";
import { getQuestProject } from "../projects";
import { buildQuest } from "../quests";
import { buildMobileQuest } from "../mobile";
import { getProjectLevelCount } from "../../lib/progress";

function sourceStep(steps: ReturnType<typeof buildQuest>, id: number) {
  return steps.find((step) => step.sourceStepId === id)!;
}

function questText(slug: string): string {
  const project = getQuestProject(slug)!;
  return buildQuest(project, "real", defaultCustomization(slug))
    .flatMap((step) => [step.title, step.why, step.action, step.prompt ?? "", ...step.expected])
    .join(" ");
}

describe("source-backed project quests", () => {
  it.each([
    ["carousel-agent", ["40 знаков", "11 арт-направлений", "Сюрприз", "PNG-альбом", "переделать один слайд"]],
    ["threads-agent", ["10 тредов", "500 знаков", "Не беру", "Уже выложила", "Ещё 5", "внешний источник"]],
    ["webinar-moderator-agent", ["observe", "assist", "auto", "4 секунд", "10 минут", "30 автоответов", "не удаляет"]],
    ["family-health-hub", ["людей и животных", "5–10 значений", "неразобранные", "не ставит диагноз", "резервную копию"]],
  ])("repeats the verified mechanics of %s", (slug, phrases) => {
    const project = getQuestProject(slug)!;
    const steps = buildQuest(project, "real", defaultCustomization(slug));
    const text = questText(slug);

    expect(steps).toHaveLength(getProjectLevelCount(project));
    expect(steps.map((step) => step.id)).toEqual(Array.from({ length: steps.length }, (_, index) => index + 1));
    expect(new Set(steps.map((step) => step.title)).size).toBe(steps.length);
    for (const phrase of phrases) expect(text).toMatch(new RegExp(phrase, "i"));
    expect(text).not.toMatch(/создайте.+(?:csv|txt)|вручную создайте.+файл/i);
  });

  it("finishes every source-backed path with an independent client copy and honest portfolio case", () => {
    for (const slug of ["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"]) {
      const steps = buildQuest(getQuestProject(slug)!, "real", defaultCustomization(slug));
      expect(`${sourceStep(steps, 16).action} ${sourceStep(steps, 16).prompt}`).toMatch(/клиент|заказчик/i);
      expect(`${sourceStep(steps, 17).action} ${sourceStep(steps, 17).prompt}`).toMatch(/портфолио/i);
      expect(`${sourceStep(steps, 17).action} ${sourceStep(steps, 17).prompt}`).toMatch(/не придумывай|без выдуман/i);
    }
  });

  it("keeps the exact source mechanics in every phone-only path", () => {
    const expectations = [
      ["carousel-agent", /11 арт-направлений.+PNG-альбом.+Переделать один слайд/is],
      ["threads-agent", /\/now.+Не беру.+Уже выложила.+Ещё 5/is],
      ["webinar-moderator-agent", /observe.+assist.+auto.+30/is],
      ["family-health-hub", /людей и животных.+5–10 значений.+резервную копию/is],
    ] as const;

    for (const [slug, pattern] of expectations) {
      const steps = buildMobileQuest(getQuestProject(slug)!, "real", defaultCustomization(slug));
      const text = steps.map((step) => `${step.action} ${step.prompt}`).join(" ");
      expect(steps).toHaveLength(getProjectLevelCount(getQuestProject(slug)!));
      expect(text, slug).toMatch(pattern);
      for (const step of steps) {
        expect(step.action, `${slug}/step-${step.id}`).not.toMatch(/создайте.+(?:csv|txt)|откройте.+локальн.+папк/i);
      }
    }
  });
});
