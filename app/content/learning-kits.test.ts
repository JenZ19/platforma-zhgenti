import { expect, it } from "vitest";
import { buildSpecialLessons } from "./reviewed/special";
import { getQuestProject } from "./projects";
import { buildMobileQuest } from "./mobile";

it.each(["carousel-agent", "threads-agent", "webinar-moderator-agent", "family-health-hub"])("offers the actual downloadable kit in %s", slug => {
  const step = buildSpecialLessons(getQuestProject(slug)!, "demo")![0];
  expect(step.links?.some(link => link.href === `/materials/learning-kits/${slug}-2026-09-08.1.zip`)).toBe(true);
  expect(step.action).toContain("Скачать учебный комплект");
  expect(step.prompt).toContain("START-HERE.md");
  expect(step.prompt).toContain("study_check.py");
  expect(step.prompt).toContain("не означает");
});

it("sends the archive to the school assistant on a phone, without local unpacking", () => {
  const step = buildMobileQuest(getQuestProject("carousel-agent")!, "demo")[0];
  expect(step.action).toContain("прикрепите ZIP");
  expect(step.action).not.toContain("Распакуйте ZIP");
});
