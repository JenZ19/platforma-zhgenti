import { describe, expect, it } from "vitest";
import { buildMobileQuest, getMobileCapability } from "./mobile";
import { buildQuest } from "./quests";
import { questProjects, getQuestProject } from "./projects";
import { getProjectLevelCount } from "../lib/progress";

describe("consistent mobile journey", () => {
  it("preserves every project's actual task and checks on both devices", () => {
    for (const project of questProjects) for (const mode of ["real", "demo"] as const) {
      const desktop = buildQuest(project, mode);
      const mobile = buildMobileQuest(project, mode);
      expect(mobile, project.slug).toHaveLength(getProjectLevelCount(project));
      mobile.forEach((step, i) => {
        expect(step.id).toBe(desktop[i].id);
        expect(step.title).toBe(desktop[i].title);
        expect(step.expected).toEqual(desktop[i].expected);
        if (project.journey !== "setup") {
          expect(step.prompt).toContain(desktop[i].prompt ?? desktop[i].action);
          expect(step.prompt).toContain("ТЕКУЩАЯ ЗАДАЧА: " + step.title);
          expect(step.prompt).toContain("Не создавай ещё один проект");
          expect(step.action).not.toMatch(/создайте.*файл|откройте.*терминал/i);
          expect(step.showScreenshot).toBe(step.screenshotKind === "real" || step.screenshotKind === "placeholder");
          expect(step.mobileAction.note).toContain("не отправляется автоматически");
        }
      });
    }
  });
  it("does not invent server rooms or automatic transfers", () => {
    for (const project of questProjects.filter((p) => p.journey !== "setup")) {
      const steps = buildMobileQuest(project, "real");
      expect(steps.map((s) => s.action).join(" ")).not.toMatch(/Фея откроет именно|ссылка появится|серверную комнату/i);
      expect(steps[0].prompt).toContain("Не утверждай, что подключение или перенос");
      expect(steps[0].prompt).toMatch(/РЕЖИМ РЕАЛЬНЫХ ДАННЫХ/);
    }
  });
  it("labels difficult phone projects as curator-assisted", () => {
    for (const slug of ["family-health-hub", "webinar-moderator-agent", "fairy-team-agent", "school-pro-site"]) {
      expect(getMobileCapability(getQuestProject(slug)!).id).toBe("curator");
    }
    expect(getMobileCapability(getQuestProject("planner")!).label).toBe("С телефона после настройки");
  });
  it("keeps setup on the computer without simulated mobile actions", () => {
    for (const project of questProjects.filter((p) => p.journey === "setup")) {
      const steps = buildMobileQuest(project);
      expect(steps.every((step) => step.mobileAction.tool === "curator")).toBe(true);
      expect(steps.every((step) => step.mobileAction.note?.includes("Mac или Windows"))).toBe(true);
    }
  });
});
