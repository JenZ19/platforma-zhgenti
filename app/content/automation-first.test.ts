import { describe, expect, it } from "vitest";
import { buildRealDataChecklist } from "../lib/preparation";
import { buildMobileQuest } from "./mobile";
import { projects } from "./projects";
import { getPreparationProfile } from "./preparation";
import { buildQuest } from "./quests";

function learnerText(value: ReturnType<typeof buildQuest>[number]): string {
  return [
    value.title,
    value.why,
    value.action,
    value.help.body,
    ...(value.guide ?? []).flatMap((frame) => [frame.title, frame.action, frame.fallback]),
  ].join(" ");
}

const manualPreparation = /создайте[^.!?\n]{0,100}(?:папк|файл)|запишите[^.!?\n]{0,100}в файл|откройте[^.!?\n]{0,100}(?:\.txt|\.csv|файл)|ФАЙЛ:/i;

describe("Codex-first preparation across every track", () => {
  it("never asks a learner to create preparation folders, text files or tables", () => {
    for (const project of projects) {
      for (const surface of ["desktop", "mobile"] as const) {
        const checklist = buildRealDataChecklist(project, surface);
        const copy = JSON.stringify(checklist);
        expect(copy, `${project.slug}/${surface}`).not.toMatch(manualPreparation);
        expect(copy, `${project.slug}/${surface}`).not.toMatch(/\.(?:txt|csv)/i);
        expect(copy, `${project.slug}/${surface}`).toMatch(/Codex/i);
        expect(copy, `${project.slug}/${surface}`).toMatch(/голосом или текстом/i);
      }
    }
  });

  it("collects real information in dialogue and lets Codex create every service file", () => {
    for (const project of projects) {
      const profile = getPreparationProfile(project.slug);
      const steps = buildQuest(project, "real");
      const prompts = steps.flatMap((step) => step.prompt ?? []).join(" ");
      const openingLearnerCopy = steps.slice(0, 6).map(learnerText).join(" ");

      expect(prompts, project.slug).toMatch(/один короткий вопрос за раз/i);
      expect(prompts, project.slug).toMatch(/голосом или текстом/i);
      expect(prompts, project.slug).toMatch(/папки, файлы и поля.+создавай (?:их )?сам/i);
      expect(prompts, project.slug).not.toContain(profile.sourceFile);
      expect(prompts, project.slug).not.toContain(profile.rulesFile);
      expect(openingLearnerCopy, project.slug).not.toMatch(manualPreparation);
      expect(steps[0].prompt, `${project.slug}/step-1`).toMatch(/не начинай опрос/i);
      expect(steps[1].prompt, `${project.slug}/step-2`).toMatch(/не начинай опрос/i);
      expect(steps[2].prompt, `${project.slug}/step-3`).toMatch(/один раз собери|задавай строго один короткий вопрос за раз/i);
      expect(steps[3].prompt, `${project.slug}/step-4`).toMatch(/не начинай опрос заново|используй уже подтверждённые ответы/i);
    }
  });

  it("keeps the phone path conversational instead of asking for FILE messages", () => {
    for (const project of projects) {
      const profile = getPreparationProfile(project.slug);
      const steps = buildMobileQuest(project, "real");
      const openingLearnerCopy = steps.slice(0, 6).map(learnerText).join(" ");
      const prompts = steps.flatMap((step) => step.prompt ?? []).join(" ");

      expect(openingLearnerCopy, project.slug).not.toMatch(manualPreparation);
      expect(openingLearnerCopy, project.slug).not.toContain(profile.sourceFile);
      expect(prompts, project.slug).toMatch(/один короткий вопрос за раз/i);
      expect(prompts, project.slug).toMatch(/голосом или текстом/i);
      expect(prompts, project.slug).toMatch(/папки, файлы и поля.+создавай (?:их )?сам/i);
      expect(steps.slice(4).map((step) => step.prompt ?? "").join(" "), project.slug).toMatch(/не начинай опрос заново/i);
    }
  });
});
