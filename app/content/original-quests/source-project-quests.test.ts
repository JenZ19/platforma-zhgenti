import { describe, expect, it } from "vitest";
import { getQuestProject } from "../projects";
import { buildQuest } from "../quests";
import { buildMobileQuest } from "../mobile";

const sourceSlugs = ["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"] as const;

describe("source-backed project quests", () => {
  it.each([
    ["carousel-agent", ["10 направлений", "Сюрприз", "PNG-альбом", "один слайд"]],
    ["threads-agent", ["10 тредов", "Не беру", "Уже выложила", "Ещё 5"]],
    ["webinar-moderator-agent", ["observe", "assist", "auto", "удален"]],
    ["family-health-hub", ["неразобран", "не став.+диагноз", "резервн.+коп"]],
  ])("preserves verified mechanics of %s", (slug, phrases) => {
    const steps = buildQuest(getQuestProject(slug)!, "real");
    const copy = JSON.stringify(steps);
    expect(steps.map((step) => step.id)).toEqual(steps.map((_, index) => index + 1));
    for (const phrase of phrases) expect(copy, `${slug}: ${phrase}`).toMatch(new RegExp(phrase, "i"));
    expect(copy).not.toMatch(/вручную создайте.+файл|создайте.+(?:csv|txt)/i);
  });

  it("ends with an honest portfolio result and optional client extension", () => {
    for (const slug of sourceSlugs) {
      const last = buildQuest(getQuestProject(slug)!, "real").at(-1)!;
      expect(JSON.stringify(last), slug).toMatch(/портфолио|показываем/i);
      expect(`${last.extension?.title} ${last.extension?.description}`, slug).toMatch(/по желанию|можно пропустить/i);
      expect(last.extension?.prompt, slug).toMatch(/не выдумывай|не придумывай/i);
    }
  });

  it("keeps source mechanics and no manual files on phone", () => {
    for (const slug of sourceSlugs) {
      const steps = buildMobileQuest(getQuestProject(slug)!, "real");
      const copy = JSON.stringify(steps);
      expect(steps.length, slug).toBeGreaterThan(0);
      expect(copy, slug).not.toMatch(/вручную создайте.+файл|создайте.+(?:csv|txt)|откройте локальную папку/i);
      expect(copy, slug).toMatch(/провер/i);
    }
  });
});
